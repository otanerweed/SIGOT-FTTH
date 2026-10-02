const {
    conectarDB,
    sql
} = require("../config/database");


/**
 * Devuelve los indicadores generales de SIGOT-FTTH.
 *
 * GET /api/dashboard
 */
async function obtenerResumen(
    req,
    res
) {
    try {
        console.log(
            "========== OBTENER DASHBOARD =========="
        );

        const pool =
            await conectarDB();


        /* =====================================================
           1. ESTADO GENERAL DE LAS ÓRDENES
           ===================================================== */

        const resultadoOrdenes =
            await pool.request().query(`
                SELECT
                    COUNT(*) AS TotalOT,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN EstadoAsignacion = 'ASIGNADA'
                                THEN 1
                                ELSE 0
                            END
                        ),
                        0
                    ) AS Asignadas,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN EstadoAsignacion = 'PENDIENTE'
                                THEN 1
                                ELSE 0
                            END
                        ),
                        0
                    ) AS Pendientes,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN EstadoAsignacion = 'FINALIZADA'
                                THEN 1
                                ELSE 0
                            END
                        ),
                        0
                    ) AS Finalizadas,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN EstadoAsignacion = 'CANCELADA'
                                THEN 1
                                ELSE 0
                            END
                        ),
                        0
                    ) AS Canceladas

                FROM dbo.OrdenesTrabajo;
            `);


        /* =====================================================
           1.1. ÓRDENES POR PROYECTO
           ===================================================== */

        const resultadoProyectos =
            await pool.request().query(`
                SELECT
                    COALESCE(
                        P.Codigo,
                        'SIN_PROYECTO'
                    ) AS Proyecto,

                    COUNT(*) AS Cantidad

                FROM dbo.OrdenesTrabajo OT

                LEFT JOIN dbo.Proyectos P
                    ON P.IdProyecto =
                        OT.IdProyecto

                GROUP BY
                    COALESCE(
                        P.Codigo,
                        'SIN_PROYECTO'
                    );
            `);


        /* =====================================================
           1.2. ESTADO DE ÓRDENES POR PROYECTO
           ===================================================== */

        const resultadoEstadosProyecto =
            await pool.request().query(`
                SELECT
                    COALESCE(
                        P.Codigo,
                        'SIN_PROYECTO'
                    ) AS Proyecto,

                    OT.EstadoAsignacion AS Estado,

                    COUNT(*) AS Cantidad

                FROM dbo.OrdenesTrabajo OT

                LEFT JOIN dbo.Proyectos P
                    ON P.IdProyecto =
                        OT.IdProyecto

                GROUP BY
                    COALESCE(
                        P.Codigo,
                        'SIN_PROYECTO'
                    ),
                    OT.EstadoAsignacion;
            `);


        /* =====================================================
           2. TÉCNICOS
           ===================================================== */

        const resultadoTecnicos =
            await pool.request().query(`
                SELECT
                    COUNT(*) AS TecnicosActivos,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN Disponible = 1
                                THEN 1
                                ELSE 0
                            END
                        ),
                        0
                    ) AS TecnicosDisponibles

                FROM dbo.Tecnicos

                WHERE Activo = 1;
            `);


        /* =====================================================
           3. OPERACIONES
           ===================================================== */

        const resultadoOperaciones =
            await pool.request().query(`
                SELECT
                    COUNT(*) AS TotalOperaciones,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN Estado = 'ABIERTA'
                                THEN 1
                                ELSE 0
                            END
                        ),
                        0
                    ) AS OperacionesAbiertas,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN Estado = 'CERRADA'
                                THEN 1
                                ELSE 0
                            END
                        ),
                        0
                    ) AS OperacionesCerradas

                FROM dbo.Operaciones;
            `);


        /* =====================================================
           4. ÚLTIMA IMPORTACIÓN OFSC COMPLETADA
           ===================================================== */

        const resultadoUltimaImportacion =
            await pool.request().query(`
                SELECT TOP 1
                    IdOperacion,
                    NombreArchivo,
                    FechaImportacion,
                    CantidadNuevas,
                    CantidadActualizadas,
                    CantidadSinCambios,
                    CantidadErrores

                FROM dbo.Operaciones

                WHERE Estado = 'CERRADA'

                ORDER BY
                    FechaImportacion DESC,
                    IdOperacion DESC;
            `);


        /* =====================================================
           5. TSS PENDIENTES DE PROGRAMACIÓN
           ===================================================== */

        const resultadoTSS =
            await pool.request().query(`
                SELECT
                    COUNT(*) AS TSSPendientes

                FROM dbo.TSS

                WHERE EstadoTSS =
                    'PENDIENTE_PROGRAMACION';
            `);


        /* =====================================================
           6. PREPARAR RESULTADOS
           ===================================================== */

        const ordenes =
            resultadoOrdenes.recordset[0];

        const proyectos =
            resultadoProyectos.recordset;

        const estadosProyecto =
            resultadoEstadosProyecto.recordset;

        const tecnicos =
            resultadoTecnicos.recordset[0];

        const operaciones =
            resultadoOperaciones.recordset[0];

        const tss =
            resultadoTSS.recordset[0];

        const ultimaImportacion =
            resultadoUltimaImportacion.recordset[0] ||
            null;


        /* =====================================================
           7. CONSTRUIR ESTADOS POR PROYECTO
           ===================================================== */

        const estadoPorProyecto = {
            TODOS: {
                ASIGNADA: 0,
                PENDIENTE: 0,
                FINALIZADA: 0,
                CANCELADA: 0
            },

            RED_ENTEL: {
                ASIGNADA: 0,
                PENDIENTE: 0,
                FINALIZADA: 0,
                CANCELADA: 0
            },

            RED_WINET: {
                ASIGNADA: 0,
                PENDIENTE: 0,
                FINALIZADA: 0,
                CANCELADA: 0
            },

            SIN_PROYECTO: {
                ASIGNADA: 0,
                PENDIENTE: 0,
                FINALIZADA: 0,
                CANCELADA: 0
            }
        };


        /* =====================================================
           8. ACUMULAR ESTADOS
           ===================================================== */

        for (
            const registro
            of estadosProyecto
        ) {
            const proyecto =
                String(
                    registro.Proyecto ||
                    "SIN_PROYECTO"
                )
                    .trim()
                    .toUpperCase();

            const estado =
                String(
                    registro.Estado ||
                    ""
                )
                    .trim()
                    .toUpperCase();

            const cantidad =
                Number(
                    registro.Cantidad ||
                    0
                );


            /* ---------------------------------------------
               ACUMULADO GENERAL
            --------------------------------------------- */

            if (
                estadoPorProyecto.TODOS[
                    estado
                ] !== undefined
            ) {
                estadoPorProyecto.TODOS[
                    estado
                ] += cantidad;
            }


            /* ---------------------------------------------
               ACUMULADO POR PROYECTO
            --------------------------------------------- */

            if (
                estadoPorProyecto[
                    proyecto
                ] &&
                estadoPorProyecto[
                    proyecto
                ][estado] !== undefined
            ) {
                estadoPorProyecto[
                    proyecto
                ][estado] += cantidad;
            }
        }


        /* =====================================================
           9. RESPUESTA DEL DASHBOARD
           ===================================================== */

        return res
            .status(200)
            .json({

                /* ==========================================
                   MÉTRICAS GENERALES
                ========================================== */

                totalOT:
                    ordenes.TotalOT,

                asignadas:
                    ordenes.Asignadas,

                pendientes:
                    ordenes.Pendientes,

                finalizadas:
                    ordenes.Finalizadas,

                canceladas:
                    ordenes.Canceladas,


                /* ==========================================
                   MÉTRICAS POR PROYECTO
                ========================================== */

                proyectos: {

                    redEntel:
                        proyectos.find(
                            (item) =>
                                item.Proyecto ===
                                "RED_ENTEL"
                        )?.Cantidad ?? 0,

                    redWinet:
                        proyectos.find(
                            (item) =>
                                item.Proyecto ===
                                "RED_WINET"
                        )?.Cantidad ?? 0,

                    sinProyecto:
                        proyectos.find(
                            (item) =>
                                item.Proyecto ===
                                "SIN_PROYECTO"
                        )?.Cantidad ?? 0
                },


                /* ==========================================
                   ESTADOS POR PROYECTO
                ========================================== */

                estadoPorProyecto:
                    estadoPorProyecto,


                /* ==========================================
                   TÉCNICOS
                ========================================== */

                tecnicos:
                    tecnicos.TecnicosActivos,

                tecnicosDisponibles:
                    tecnicos.TecnicosDisponibles,


                /* ==========================================
                   OPERACIONES
                ========================================== */

                totalOperaciones:
                    operaciones.TotalOperaciones,

                operacionesAbiertas:
                    operaciones.OperacionesAbiertas,

                operacionesCerradas:
                    operaciones.OperacionesCerradas,


                /* ==========================================
                   ÚLTIMA IMPORTACIÓN
                ========================================== */

                otsNuevas:
                    ultimaImportacion
                        ?.CantidadNuevas ??
                    0,

                otsActualizadas:
                    ultimaImportacion
                        ?.CantidadActualizadas ??
                    0,

                otsSinCambios:
                    ultimaImportacion
                        ?.CantidadSinCambios ??
                    0,

                otsRechazadas:
                    ultimaImportacion
                        ?.CantidadErrores ??
                    0,


                /* ==========================================
                   TSS
                ========================================== */

                tssPendientes:
                    tss.TSSPendientes,


                /* ==========================================
                   INFORMACIÓN DE ÚLTIMA IMPORTACIÓN
                ========================================== */

                ultimaImportacion:
                    ultimaImportacion
                        ? {
                            idOperacion:
                                ultimaImportacion.IdOperacion,

                            nombreArchivo:
                                ultimaImportacion.NombreArchivo,

                            fechaImportacion:
                                ultimaImportacion.FechaImportacion
                        }
                        : null
            });

    } catch (error) {

        console.error(
            "Error al obtener el dashboard:",
            error
        );

        return res
            .status(500)
            .json({
                ok: false,

                mensaje:
                    "No se pudieron obtener los indicadores.",

                detalle:
                    error.message
            });
    }
}

/**
 * Devuelve los KPIs operativos de actividades OFSC.
 *
 * GET /api/dashboard/kpis
 *
 * Filtros:
 * - proyecto
 * - fechaDesde
 * - fechaHasta
 * - distrito
 */

function construirConsolidadoOT(actividades) {
    const mapaOT = new Map();

    for (const actividad of actividades) {
        const idOT =
            actividad.idOrden ??
            actividad.IdOrden ??
            null;

        if (!idOT) {
            continue;
        }

        if (!mapaOT.has(idOT)) {
            mapaOT.set(
                idOT,
                {
                    idOrden: idOT,
                    codigoOT:
                        actividad.codigoOT ??
                        null,
                    segmentos: []
                }
            );
        }

        mapaOT
            .get(idOT)
            .segmentos
            .push(actividad);
    }

    const consolidados = [];

    for (const ot of mapaOT.values()) {
        const segmentos = ot.segmentos
            .slice()
            .sort((a, b) => {

                const fechaA =
                    a.fechaActividad
                        ? new Date(a.fechaActividad)
                        : null;

                const horaA =
                    a.horaInicio
                        ? new Date(a.horaInicio)
                        : null;

                const fechaB =
                    b.fechaActividad
                        ? new Date(b.fechaActividad)
                        : null;

                const horaB =
                    b.horaInicio
                        ? new Date(b.horaInicio)
                        : null;

                if (
                    !fechaA ||
                    !horaA ||
                    Number.isNaN(fechaA.getTime()) ||
                    Number.isNaN(horaA.getTime())
                ) {
                    return 1;
                }

                if (
                    !fechaB ||
                    !horaB ||
                    Number.isNaN(fechaB.getTime()) ||
                    Number.isNaN(horaB.getTime())
                ) {
                    return -1;
                }

                const fechaHoraA =
                    Date.UTC(
                        fechaA.getUTCFullYear(),
                        fechaA.getUTCMonth(),
                        fechaA.getUTCDate(),
                        horaA.getUTCHours(),
                        horaA.getUTCMinutes(),
                        horaA.getUTCSeconds(),
                        horaA.getUTCMilliseconds()
                    );

                const fechaHoraB =
                    Date.UTC(
                        fechaB.getUTCFullYear(),
                        fechaB.getUTCMonth(),
                        fechaB.getUTCDate(),
                        horaB.getUTCHours(),
                        horaB.getUTCMinutes(),
                        horaB.getUTCSeconds(),
                        horaB.getUTCMilliseconds()
                    );

                return fechaHoraA - fechaHoraB;
            });

        const ciclos = [];
        let cicloActual = null;

        for (const segmento of segmentos) {
            const estado =
                String(
                    segmento.estado || ""
                )
                    .trim()
                    .toUpperCase();

            const resultado =
                String(
                    segmento.resultadoNoRealizado || ""
                )
                    .trim()
                    .toUpperCase();

            if (!cicloActual) {
                cicloActual = {
                    numeroCiclo:
                        ciclos.length + 1,

                    segmentos: [],

                    tiempoRegistradoMinutos: 0,
                    tiempoSuspendidoMinutos: 0,
                    tiempoNoClasificadoMinutos: 0,
                    tiempoTranscurridoMinutos: 0,

                    fechaInicio: null,
                    horaInicio: null,
                    fechaFin: null,
                    horaFin: null,

                    estadoCierre: null,
                    resultadoCierre: null
                };
            }

            cicloActual.segmentos.push(
                segmento
            );

            if (
                estado === "FINALIZADA"
            ) {
                cicloActual.estadoCierre =
                    "FINALIZADA";

                cicloActual.resultadoCierre =
                    null;

                ciclos.push(
                    cicloActual
                );

                cicloActual = null;

                continue;
            }

            if (
                estado === "NO_REALIZADO" &&
                resultado === "REPROGRAMADA"
            ) {
                cicloActual.estadoCierre =
                    "NO_REALIZADO";

                cicloActual.resultadoCierre =
                    "REPROGRAMADA";

                ciclos.push(
                    cicloActual
                );

                cicloActual = null;

                continue;
            }

            if (
                estado === "NO_REALIZADO" &&
                resultado === "CIERRE_AUTOMATICO"
            ) {
                cicloActual.estadoCierre =
                    "NO_REALIZADO";

                cicloActual.resultadoCierre =
                    "CIERRE_AUTOMATICO";

                ciclos.push(
                    cicloActual
                );

                cicloActual = null;

                continue;
            }
        }

        if (cicloActual) {
            ciclos.push(
                cicloActual
            );
        }
        for (const ciclo of ciclos) {

            const segmentosValidos =
                ciclo.segmentos
                    .map((segmento) => {

                        const inicio =
                            segmento.horaInicio
                                ? new Date(
                                    segmento.horaInicio
                                )
                                : null;

                        const fin =
                            segmento.horaFin
                                ? new Date(
                                    segmento.horaFin
                                )
                                : null;

                        return {
                            segmento,
                            inicio,
                            fin
                        };
                    })
                    .filter(
                        ({ inicio, fin }) =>
                            inicio &&
                            fin &&
                            !Number.isNaN(
                                inicio.getTime()
                            ) &&
                            !Number.isNaN(
                                fin.getTime()
                            ) &&
                            fin >= inicio
                    )
                    .sort(
                        (a, b) =>
                            a.inicio.getTime() -
                            b.inicio.getTime()
                    );

            let tiempoRegistrado = 0;
            let tiempoSuspendido = 0;
            let tiempoNoClasificado = 0;

            for (
                let i = 0;
                i < segmentosValidos.length;
                i++
            ) {

                const actual =
                    segmentosValidos[i];

                const estado =
                    String(
                        actual.segmento.estado || ""
                    )
                        .trim()
                        .toUpperCase();

                const duracion =
                    Math.round(
                        (
                            actual.fin.getTime() -
                            actual.inicio.getTime()
                        ) / 60000
                    );

                if (
                    estado === "SUSPENDIDA"
                ) {

                    tiempoSuspendido +=
                        duracion;
                }

                if (
                    estado !== "CANCELADA"
                ) {

                    tiempoRegistrado +=
                        duracion;
                }

                if (i > 0) {

                    const anterior =
                        segmentosValidos[
                            i - 1
                        ];

                    const hueco =
                        Math.round(
                            (
                                actual.inicio.getTime() -
                                anterior.fin.getTime()
                            ) / 60000
                        );

                    if (hueco > 0) {
                        tiempoNoClasificado +=
                            hueco;
                    }
                }
            }

            let tiempoTranscurrido = 0;

            if (
                segmentosValidos.length > 0
            ) {

                const primero =
                    segmentosValidos[0];

                const ultimo =
                    segmentosValidos[
                        segmentosValidos.length - 1
                    ];

                tiempoTranscurrido =
                    Math.round(
                        (
                            ultimo.fin.getTime() -
                            primero.inicio.getTime()
                        ) / 60000
                    );

                ciclo.fechaInicio =
                    primero.segmento.fechaActividad;

                ciclo.horaInicio =
                    primero.segmento.horaInicio;

                ciclo.fechaFin =
                    ultimo.segmento.fechaActividad;

                ciclo.horaFin =
                    ultimo.segmento.horaFin;
            }

            ciclo.tiempoRegistradoMinutos =
                tiempoRegistrado;

            ciclo.tiempoSuspendidoMinutos =
                tiempoSuspendido;

            ciclo.tiempoNoClasificadoMinutos =
                tiempoNoClasificado;

            ciclo.tiempoTranscurridoMinutos =
                tiempoTranscurrido;
        }
        const primerSegmento =
            segmentos[0] || null;

        const ultimoSegmento =
            segmentos[segmentos.length - 1] || null;

        const tiempoRegistradoTotal =
            ciclos.reduce(
                (total, ciclo) =>
                    total +
                    ciclo.tiempoRegistradoMinutos,
                0
            );

        const tiempoSuspendidoTotal =
            ciclos.reduce(
                (total, ciclo) =>
                    total +
                    ciclo.tiempoSuspendidoMinutos,
                0
            );

        const tiempoNoClasificadoTotal =
            ciclos.reduce(
                (total, ciclo) =>
                    total +
                    ciclo.tiempoNoClasificadoMinutos,
                0
            );

        const tiempoTranscurridoTotal =
            ciclos.reduce(
                (total, ciclo) =>
                    total +
                    ciclo.tiempoTranscurridoMinutos,
                0
            );

        const ultimoCiclo =
            ciclos[ciclos.length - 1] ||
            null;
        const combinarFechaHora =
            (fecha, hora) => {

                if (!fecha || !hora) {
                    return null;
                }

                const fechaUTC =
                    new Date(fecha);

                const horaUTC =
                    new Date(hora);

                if (
                    Number.isNaN(
                        fechaUTC.getTime()
                    ) ||
                    Number.isNaN(
                        horaUTC.getTime()
                    )
                ) {
                    return null;
                }

                return new Date(
                    Date.UTC(
                        fechaUTC.getUTCFullYear(),
                        fechaUTC.getUTCMonth(),
                        fechaUTC.getUTCDate(),
                        horaUTC.getUTCHours(),
                        horaUTC.getUTCMinutes(),
                        horaUTC.getUTCSeconds(),
                        horaUTC.getUTCMilliseconds()
                    )
                );
            };

        const primerInicio =
            combinarFechaHora(
                primerSegmento?.fechaActividad,
                primerSegmento?.horaInicio
            );

        const ultimoFin =
            combinarFechaHora(
                ultimoSegmento?.fechaActividad,
                ultimoSegmento?.horaFin
            );

        consolidados.push({
            idOrden:
                ot.idOrden,

            codigoOT:
                ot.codigoOT,

            idTecnico:
                ultimoSegmento?.idTecnico ??
                null,

            et:
                ultimoSegmento?.et ??
                null,

            idCelula:
                ultimoSegmento?.idCelula ??
                null,

            celula:
                ultimoSegmento?.celula ??
                null,

            idSupervisor:
                ultimoSegmento?.idSupervisor ??
                null,

            supervisor:
                ultimoSegmento?.supervisor ??
                null,

            estadoActual:
                ultimoSegmento?.estado ??
                null,

            resultadoCierreActual:
                ultimoCiclo?.resultadoCierre ??
                null,

            totalSegmentos:
                segmentos.length,

            primerInicio:
                primerInicio,

            ultimoFin:
                ultimoFin,

            tiempoRegistradoTotal,
            tiempoSuspendidoTotal,
            tiempoNoClasificadoTotal,
            tiempoTranscurridoTotal,

            distrito:
                ultimoSegmento?.distrito ??
                null,

            segmentos,
            ciclos
        });
    }

    return consolidados;
}
async function obtenerKPIs(
    req,
    res
) {
    try {
        console.log(
            "========== OBTENER KPIs OFSC =========="
        );

        console.log(
            ">>> KPI: solicitando conexión SQL"
        );

        const pool =
            await conectarDB();

        console.log(
            ">>> KPI: conexión SQL obtenida | connected:",
            pool?.connected,
            "| connecting:",
            pool?.connecting
        );

        const proyecto =
            String(
                req.query.proyecto || ""
            )
                .trim()
                .toUpperCase();

        const fechaDesde =
            String(
                req.query.fechaDesde || ""
            )
                .trim();

        const fechaHasta =
            String(
                req.query.fechaHasta || ""
            )
                .trim();

        const distrito =
            String(
                req.query.distrito || ""
            )
                .trim();

                /*
         * Distritos disponibles según el proyecto.
         */
        const solicitudDistritos =
            pool.request();

        solicitudDistritos.input(
            "ProyectoDistritos",
            sql.VarChar(30),
            proyecto || null
        );

        const resultadoDistritos =
            await solicitudDistritos.query(`
                SELECT DISTINCT
                    UPPER(
                        LTRIM(
                            RTRIM(
                                OT.Distrito
                            )
                        )
                    ) AS Distrito

                FROM dbo.ActividadesOFSC A

                INNER JOIN dbo.OrdenesTrabajo OT
                    ON OT.IdOrden =
                        A.IdOrden

                LEFT JOIN dbo.Proyectos P
                    ON P.IdProyecto =
                        OT.IdProyecto

                WHERE
                    OT.Distrito IS NOT NULL

                    AND LTRIM(
                        RTRIM(
                            OT.Distrito
                        )
                    ) <> ''

                    AND (
                        @ProyectoDistritos IS NULL

                        OR UPPER(
                            LTRIM(
                                RTRIM(
                                    COALESCE(
                                        P.Codigo,
                                        'SIN_PROYECTO'
                                    )
                                )
                            )
                        ) = @ProyectoDistritos
                    )

                ORDER BY
                    Distrito;
            `);

        const distritos =
            resultadoDistritos.recordset.map(
                (item) =>
                    item.Distrito
            );

        const solicitud =
            pool.request();

        /*
         * Proyecto.
         */
        solicitud.input(
            "Proyecto",
            require("../config/database").sql.VarChar(30),
            proyecto || null
        );

        /*
         * Fechas.
         */
        solicitud.input(
            "FechaDesde",
            require("../config/database").sql.Date,
            fechaDesde || null
        );

        solicitud.input(
            "FechaHasta",
            require("../config/database").sql.Date,
            fechaHasta || null
        );

        /*
         * Distrito.
         */
        solicitud.input(
            "Distrito",
            require("../config/database").sql.VarChar(60),
            distrito || null
        );
        const inicioKpiPrincipal =
            Date.now();

        console.log(
            ">>> KPI principal: iniciando consulta"
        );
        const resultado =
            await solicitud.query(`
                WITH ActividadesFiltradas AS
                (
                    SELECT
                        A.IdActividad,
                        A.IdActividadOFSC,
                        A.IdOrden,
                        A.EstadoActividad,
                        A.FechaActividad,
                        A.HoraInicio,
                        A.HoraFin,
                        A.ResultadoNoRealizado,
                        A.TipoCierre,
                        A.FlagReagenda,
                        OT.IdProyecto,
                        P.Codigo AS ProyectoCodigo,
                        P.Nombre AS ProyectoNombre,
                        OT.Distrito
                    FROM dbo.ActividadesOFSC A

                    INNER JOIN dbo.OrdenesTrabajo OT
                        ON OT.IdOrden =
                            A.IdOrden

                    LEFT JOIN dbo.Proyectos P
                        ON P.IdProyecto =
                            OT.IdProyecto

                    WHERE
                        /*
                         * CANCELADA:
                         * no entra al total.
                         */
                        UPPER(
                            LTRIM(
                                RTRIM(
                                    A.EstadoActividad
                                )
                            )
                        ) <> 'CANCELADA'

                        /*
                         * Proyecto.
                         */
                        AND (
                            @Proyecto IS NULL
                            OR UPPER(
                                LTRIM(
                                    RTRIM(
                                        COALESCE(
                                            P.Codigo,
                                            'SIN_PROYECTO'
                                        )
                                    )
                                )
                            ) = @Proyecto
                        )

                        /*
                         * Fecha OFSC.
                         */
                        AND (
                            @FechaDesde IS NULL
                            OR A.FechaActividad >=
                                @FechaDesde
                        )

                        AND (
                            @FechaHasta IS NULL
                            OR A.FechaActividad <=
                                @FechaHasta
                        )

                        /*
                         * Distrito.
                         */
                        AND (
                            @Distrito IS NULL
                            OR UPPER(
                                LTRIM(
                                    RTRIM(
                                        COALESCE(
                                            OT.Distrito,
                                            ''
                                        )
                                    )
                                )
                            ) = UPPER(
                                LTRIM(
                                    RTRIM(
                                        @Distrito
                                    )
                                )
                            )
                        )
                )

                SELECT
                    SUM(
                        CASE
                            WHEN EstadoActividad =
                                'FINALIZADA'
                            THEN 1
                            ELSE 0
                        END
                    )
                    +
                    SUM(
                        CASE
                            WHEN EstadoActividad =
                                'NO_REALIZADO'
                            THEN 1
                            ELSE 0
                        END
                    ) AS TotalActividades,

                    SUM(
                        CASE
                            WHEN EstadoActividad =
                                'FINALIZADA'
                            THEN 1
                            ELSE 0
                        END
                    ) AS Finalizadas,

                    SUM(
                        CASE
                            WHEN EstadoActividad =
                                'NO_REALIZADO'
                            THEN 1
                            ELSE 0
                        END
                    ) AS NoRealizados,

                    SUM(
                        CASE
                            WHEN EstadoActividad =
                                'PENDIENTE'
                            THEN 1
                            ELSE 0
                        END
                    ) AS Pendientes,

                    SUM(
                        CASE
                            WHEN EstadoActividad =
                                'EN_RUTA'
                            THEN 1
                            ELSE 0
                        END
                    ) AS EnRuta,

                    SUM(
                        CASE
                            WHEN EstadoActividad =
                                'INICIADA'
                            THEN 1
                            ELSE 0
                        END
                    ) AS Iniciadas,

                    (
                        SELECT COUNT(*)
                        FROM dbo.ActividadesOFSC AC
                        INNER JOIN dbo.OrdenesTrabajo OTC
                            ON OTC.IdOrden =
                                AC.IdOrden
                        LEFT JOIN dbo.Proyectos PC
                            ON PC.IdProyecto =
                                OTC.IdProyecto
                        WHERE
                            UPPER(
                                LTRIM(
                                    RTRIM(
                                        AC.EstadoActividad
                                    )
                                )
                            ) = 'CANCELADA'

                            AND (
                                @Proyecto IS NULL
                                OR UPPER(
                                    LTRIM(
                                        RTRIM(
                                            COALESCE(
                                                PC.Codigo,
                                                'SIN_PROYECTO'
                                            )
                                        )
                                    )
                                ) = @Proyecto
                            )

                            AND (
                                @FechaDesde IS NULL
                                OR AC.FechaActividad >=
                                    @FechaDesde
                            )

                            AND (
                                @FechaHasta IS NULL
                                OR AC.FechaActividad <=
                                    @FechaHasta
                            )

                            AND (
                                @Distrito IS NULL
                                OR UPPER(
                                    LTRIM(
                                        RTRIM(
                                            COALESCE(
                                                OTC.Distrito,
                                                ''
                                            )
                                        )
                                    )
                                ) = UPPER(
                                    LTRIM(
                                        RTRIM(
                                            @Distrito
                                        )
                                    )
                                )
                            )
                    ) AS Canceladas,

                    SUM(
                        CASE
                            WHEN EstadoActividad =
                                'NO_REALIZADO'
                             AND ResultadoNoRealizado =
                                'REPROGRAMADA'
                            THEN 1
                            ELSE 0
                        END
                    ) AS Reprogramadas,

                    SUM(
                        CASE
                            WHEN EstadoActividad =
                                'NO_REALIZADO'
                             AND ResultadoNoRealizado =
                                'CIERRE_AUTOMATICO'
                            THEN 1
                            ELSE 0
                        END
                    ) AS CierresAutomaticos,

                    CAST(
                        CASE
                            WHEN (
                                SUM(
                                    CASE
                                        WHEN EstadoActividad = 'FINALIZADA'
                                        THEN 1
                                        ELSE 0
                                    END
                                )
                                +
                                SUM(
                                    CASE
                                        WHEN EstadoActividad = 'NO_REALIZADO'
                                        THEN 1
                                        ELSE 0
                                    END
                                )
                            ) = 0
                            THEN 0
                            ELSE ROUND(
                                100.0 *
                                SUM(
                                    CASE
                                        WHEN EstadoActividad = 'FINALIZADA'
                                        THEN 1
                                        ELSE 0
                                    END
                                )
                                /
                                (
                                    SUM(
                                        CASE
                                            WHEN EstadoActividad = 'FINALIZADA'
                                            THEN 1
                                            ELSE 0
                                        END
                                    )
                                    +
                                    SUM(
                                        CASE
                                            WHEN EstadoActividad = 'NO_REALIZADO'
                                            THEN 1
                                            ELSE 0
                                        END
                                    )
                                ),
                                0
                            )
                        END
                        AS INT
                    ) AS Efectividad,

                    CAST(
                        (
                            SELECT AVG(TiemposOT.TiempoAtencionMinutos)
                            FROM
                            (
                                SELECT
                                    IdOrden,

                                    SUM(
                                        CASE
                                            WHEN HoraInicio IS NOT NULL
                                            AND HoraFin IS NOT NULL
                                            AND DATEDIFF(
                                                    SECOND,
                                                    HoraInicio,
                                                    HoraFin
                                                ) >= 0
                                            THEN DATEDIFF(
                                                    SECOND,
                                                    HoraInicio,
                                                    HoraFin
                                                ) / 60.0
                                            ELSE 0
                                        END
                                    ) AS TiempoAtencionMinutos,

                                    MAX(
                                        CASE
                                            WHEN EstadoActividad = 'FINALIZADA'
                                            THEN 1
                                            ELSE 0
                                        END
                                    ) AS TieneFinalizada

                                FROM ActividadesFiltradas

                                GROUP BY IdOrden
                            ) AS TiemposOT

                            WHERE TiemposOT.TieneFinalizada = 1
                            AND TiemposOT.TiempoAtencionMinutos > 0
                        )
                        AS DECIMAL(10,2)
                    ) AS PromedioDuracionMinutos

                FROM ActividadesFiltradas;
            `);
                 
        console.log(
            ">>> KPI principal: consulta terminada | Tiempo:",
            Date.now() - inicioKpiPrincipal,
            "ms"
        );
            
            
        let detalleWinet = [];
        let resumenWinetCelulas = [];
        let consolidadoOTWinet = [];

        let ahoraWinet = {
            fecha: null,
            pendientes: 0,
            enRuta: 0,
            iniciadas: 0,
            actividades: []
        };

        if (proyecto === "RED_WINET") {

            /* =====================================================
            DETALLE OPERATIVO WINET POR ET / CÉLULA / SUPERVISOR
            ===================================================== */

            const inicioDetalleWinet =
                Date.now();

            console.log(
                ">>> WINET: iniciando consulta detalle"
            );

            /*
            * =====================================================
            * 1. ACTIVIDADES WINET FILTRADAS
            * =====================================================
            */

            const solicitudActividadesWinet =
                pool.request();

            solicitudActividadesWinet.input(
                "FechaDesdeDetalleWinet",
                sql.Date,
                fechaDesde || null
            );

            solicitudActividadesWinet.input(
                "FechaHastaDetalleWinet",
                sql.Date,
                fechaHasta || null
            );

            solicitudActividadesWinet.input(
                "DistritoDetalleWinet",
                sql.VarChar(60),
                distrito || null
            );

            const resultadoActividadesWinet =
                await solicitudActividadesWinet.query(`

                    SELECT
                        A.IdActividad,

                        A.IdActividadOFSC,

                        A.IdOrden,

                        OT.CodigoOT,

                        A.EstadoActividad,

                        A.ResultadoNoRealizado,

                        A.RazonReagenda,

                        A.Motivo,

                        A.FechaActividad,

                        A.HoraInicio,

                        A.HoraFin,

                        A.TipoCierre,

                        A.ResultadoGlobal,

                        A.ResponsableSuspension,

                        A.TipoSuspension,

                        A.Recurso,

                        OT.Distrito

                    FROM dbo.ActividadesOFSC A

                    INNER JOIN dbo.OrdenesTrabajo OT
                        ON OT.IdOrden =
                            A.IdOrden

                    INNER JOIN dbo.Proyectos P
                        ON P.IdProyecto =
                            OT.IdProyecto

                    WHERE
                        P.Codigo = 'RED_WINET'

                        AND A.Recurso IS NOT NULL

                        AND LTRIM(
                            RTRIM(
                                A.Recurso
                            )
                        ) <> ''

                        AND UPPER(
                            LTRIM(
                                RTRIM(
                                    A.EstadoActividad
                                )
                            )
                        ) <> 'CANCELADA'

                        AND (
                            @FechaDesdeDetalleWinet IS NULL

                            OR A.FechaActividad >=
                                @FechaDesdeDetalleWinet
                        )

                        AND (
                            @FechaHastaDetalleWinet IS NULL

                            OR A.FechaActividad <=
                                @FechaHastaDetalleWinet
                        )

                        AND (
                            @DistritoDetalleWinet IS NULL

                            OR UPPER(
                                LTRIM(
                                    RTRIM(
                                        COALESCE(
                                            OT.Distrito,
                                            ''
                                        )
                                    )
                                )
                            ) =
                                UPPER(
                                    LTRIM(
                                        RTRIM(
                                            @DistritoDetalleWinet
                                        )
                                    )
                                )
                        );
                `);

            const actividadesWinet =
                resultadoActividadesWinet.recordset;


            /*
            * =====================================================
            * 2. TÉCNICOS ACTIVOS
            * =====================================================
            */

            const resultadoTecnicosWinet =
                await pool.request().query(`

                    SELECT
                        IdTecnico,
                        NombreCompleto

                    FROM dbo.Tecnicos

                    WHERE Activo = 1

                    ORDER BY
                        IdTecnico;
                `);

            const tecnicosWinet =
                resultadoTecnicosWinet.recordset;


            /*
            * =====================================================
            * 3. NORMALIZAR RECURSOS Y TÉCNICOS
            * =====================================================
            */

            const normalizarTexto =
                (valor) =>
                    String(valor || "")
                        .trim()
                        .toUpperCase()
                        .normalize("NFD")
                        .replace(
                            /[\u0300-\u036f]/g,
                            ""
                        )
                        .replace(
                            /HOME_/g,
                            ""
                        )
                        .replace(
                            /_/g,
                            " "
                        )
                        .replace(
                            /\s+/g,
                            " "
                        )
                        .trim();


            const mapaRecursos =
                new Map();


            const recursosUnicos =
                [
                    ...new Set(
                        actividadesWinet
                            .map(
                                (actividad) =>
                                    actividad.Recurso
                            )
                            .filter(
                                Boolean
                            )
                    )
                ];


            for (
                const recurso
                of recursosUnicos
            ) {

                const recursoNormalizado =
                    normalizarTexto(
                        recurso
                    );

                const textoRecurso =
                    ` ${recursoNormalizado} `;


                const tecnicoEncontrado =
                    tecnicosWinet.find(
                        (tecnico) => {

                            const palabrasTecnico =
                                normalizarTexto(
                                    tecnico.NombreCompleto
                                )
                                    .split(" ")
                                    .filter(
                                        Boolean
                                    );

                            return palabrasTecnico.every(
                                (palabra) =>
                                    textoRecurso.includes(
                                        ` ${palabra} `
                                    )
                            );

                        }
                    );


                mapaRecursos.set(
                    recurso,
                    tecnicoEncontrado || null
                );
            }


            /*
            * =====================================================
            * 4. ASIGNACIONES DE CÉLULA ACTIVAS
            * =====================================================
            */

            const resultadoAsignacionesCelula =
                await pool.request().query(`

                    SELECT
                        ACE.IdTecnico,
                        ACE.IdCelula,
                        ACE.FechaInicio,
                        ACE.FechaFin,

                        C.NombreCelula
                            AS Celula,

                        C.IdSupervisor,

                        S.NombreCompleto
                            AS Supervisor

                    FROM dbo.AsignacionesCelulaET ACE

                    LEFT JOIN dbo.Celulas C
                        ON C.IdCelula =
                            ACE.IdCelula

                    LEFT JOIN dbo.SupervisoresOperativos S
                        ON S.IdSupervisor =
                            C.IdSupervisor

                    WHERE
                        ACE.Activo = 1

                    ORDER BY
                        ACE.IdTecnico,
                        ACE.FechaInicio DESC;
                `);


            const asignacionesCelula =
                resultadoAsignacionesCelula.recordset;


            const asignacionesPorTecnico =
                new Map();


            for (
                const asignacion
                of asignacionesCelula
            ) {

                if (
                    !asignacionesPorTecnico.has(
                        asignacion.IdTecnico
                    )
                ) {

                    asignacionesPorTecnico.set(
                        asignacion.IdTecnico,
                        []
                    );

                }

                asignacionesPorTecnico
                    .get(
                        asignacion.IdTecnico
                    )
                    .push(
                        asignacion
                    );

            }

             /*
            * =====================================================
            * AHORA — ACTIVIDADES OPERATIVAS DEL DÍA ACTUAL
            * =====================================================
            */

            const fechaActualLima =
                new Intl.DateTimeFormat(
                    "en-CA",
                    {
                        timeZone: "America/Lima",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit"
                    }
                ).format(
                    new Date()
                );

            const solicitudAhoraWinet =
                pool.request();

            solicitudAhoraWinet.input(
                "FechaAhoraWinet",
                sql.Date,
                fechaActualLima
            );

            solicitudAhoraWinet.input(
                "DistritoAhoraWinet",
                sql.VarChar(60),
                distrito || null
            );

            const resultadoAhoraWinet =
                await solicitudAhoraWinet.query(`
                    SELECT
                        A.IdActividad,
                        A.IdActividadOFSC,
                        A.IdOrden,
                        OT.CodigoOT,
                        A.EstadoActividad,
                        A.ResultadoNoRealizado,
                        A.RazonReagenda,
                        A.Motivo,
                        A.FechaActividad,
                        A.HoraInicio,
                        A.HoraFin,
                        A.TipoCierre,
                        A.ResultadoGlobal,
                        A.ResponsableSuspension,
                        A.TipoSuspension,
                        A.Recurso,
                        OT.Distrito

                    FROM dbo.ActividadesOFSC A

                    INNER JOIN dbo.OrdenesTrabajo OT
                        ON OT.IdOrden =
                            A.IdOrden

                    INNER JOIN dbo.Proyectos P
                        ON P.IdProyecto =
                            OT.IdProyecto

                    WHERE
                        P.Codigo = 'RED_WINET'

                        AND A.Recurso IS NOT NULL

                        AND LTRIM(
                            RTRIM(
                                A.Recurso
                            )
                        ) <> ''

                        AND UPPER(
                            LTRIM(
                                RTRIM(
                                    A.EstadoActividad
                                )
                            )
                        ) IN (
                            'PENDIENTE',
                            'EN_RUTA',
                            'INICIADA'
                        )

                        AND CAST(
                            A.FechaActividad
                            AS DATE
                        ) =
                            @FechaAhoraWinet

                        AND (
                            @DistritoAhoraWinet IS NULL

                            OR UPPER(
                                LTRIM(
                                    RTRIM(
                                        COALESCE(
                                            OT.Distrito,
                                            ''
                                        )
                                    )
                                )
                            ) =
                                UPPER(
                                    LTRIM(
                                        RTRIM(
                                            @DistritoAhoraWinet
                                        )
                                    )
                                )
                        );
                `);

            const actividadesAhoraCrudas =
                resultadoAhoraWinet.recordset;

            const actividadesAhoraMapeadas =
                actividadesAhoraCrudas
                    .map(
                        (actividad) => {

                            const tecnico =
                                mapaRecursos.get(
                                    actividad.Recurso
                                );

                            if (
                                !tecnico ||
                                !tecnico.IdTecnico
                            ) {
                                return null;
                            }

                            const fechaActividad =
                                new Date(
                                    actividad.FechaActividad
                                );

                            const asignacionesTecnico =
                                asignacionesPorTecnico.get(
                                    tecnico.IdTecnico
                                ) || [];

                            const asignacionVigente =
                                asignacionesTecnico.find(
                                    (asignacion) => {

                                        const fechaInicio =
                                            asignacion.FechaInicio
                                                ? new Date(
                                                    asignacion.FechaInicio
                                                )
                                                : null;

                                        const fechaFin =
                                            asignacion.FechaFin
                                                ? new Date(
                                                    asignacion.FechaFin
                                                )
                                                : null;

                                        return (
                                            fechaInicio &&
                                            fechaInicio <=
                                                fechaActividad &&
                                            (
                                                !fechaFin ||
                                                fechaFin >=
                                                    fechaActividad
                                            )
                                        );
                                    }
                                ) || null;

                            return {
                                idActividad:
                                    actividad.IdActividad,

                                idActividadOFSC:
                                    actividad.IdActividadOFSC,

                                idOrden:
                                    actividad.IdOrden,

                                codigoOT:
                                    actividad.CodigoOT,

                                estado:
                                    actividad.EstadoActividad,

                                resultadoNoRealizado:
                                    actividad.ResultadoNoRealizado,

                                razonReagenda:
                                    actividad.RazonReagenda,

                                motivo:
                                    actividad.Motivo,

                                resultadoGlobal:
                                    actividad.ResultadoGlobal,

                                responsableSuspension:
                                    actividad.ResponsableSuspension,

                                tipoSuspension:
                                    actividad.TipoSuspension,

                                fechaActividad:
                                    actividad.FechaActividad,

                                horaInicio:
                                    actividad.HoraInicio,

                                horaFin:
                                    actividad.HoraFin,

                                tipoCierre:
                                    actividad.TipoCierre,

                                recurso:
                                    actividad.Recurso,

                                distrito:
                                    actividad.Distrito,

                                idTecnico:
                                    tecnico.IdTecnico,

                                et:
                                    tecnico.NombreCompleto,

                                idCelula:
                                    asignacionVigente?.IdCelula ??
                                    null,

                                celula:
                                    asignacionVigente?.Celula ??
                                    null,

                                idSupervisor:
                                    asignacionVigente?.IdSupervisor ??
                                    null,

                                supervisor:
                                    asignacionVigente?.Supervisor ??
                                    null
                            };
                        }
                    )
                    .filter(Boolean);

            ahoraWinet = {
                fecha:
                    fechaActualLima,

                pendientes:
                    actividadesAhoraMapeadas.filter(
                        (actividad) =>
                            String(
                                actividad.estado || ""
                            )
                                .trim()
                                .toUpperCase() ===
                            "PENDIENTE"
                    ).length,

                enRuta:
                    actividadesAhoraMapeadas.filter(
                        (actividad) =>
                            String(
                                actividad.estado || ""
                            )
                                .trim()
                                .toUpperCase() ===
                            "EN_RUTA"
                    ).length,

                iniciadas:
                    actividadesAhoraMapeadas.filter(
                        (actividad) =>
                            String(
                                actividad.estado || ""
                            )
                                .trim()
                                .toUpperCase() ===
                            "INICIADA"
                    ).length,

                actividades:
                    actividadesAhoraMapeadas
            };
            /*
            * =====================================================
            * 5. CONSTRUIR DETALLE POR ET
            * =====================================================
            */

            const acumulado =
                new Map();


            for (
                const actividad
                of actividadesWinet
            ) {

                const tecnico =
                    mapaRecursos.get(
                        actividad.Recurso
                    );


                if (
                    !tecnico ||
                    !tecnico.IdTecnico
                ) {
                    continue;
                }


                const fechaActividad =
                    new Date(
                        actividad.FechaActividad
                    );


                const asignacionesTecnico =
                    asignacionesPorTecnico.get(
                        tecnico.IdTecnico
                    ) || [];


                const asignacionVigente =
                    asignacionesTecnico.find(
                        (asignacion) => {

                            const fechaInicio =
                                asignacion.FechaInicio
                                    ? new Date(
                                        asignacion.FechaInicio
                                    )
                                    : null;

                            const fechaFin =
                                asignacion.FechaFin
                                    ? new Date(
                                        asignacion.FechaFin
                                    )
                                    : null;


                            return (
                                fechaInicio &&
                                fechaInicio <=
                                    fechaActividad &&
                                (
                                    !fechaFin ||
                                    fechaFin >=
                                        fechaActividad
                                )
                            );

                        }
                    ) || null;


                const idCelula =
                    asignacionVigente
                        ?.IdCelula ??
                    null;

                const celula =
                    asignacionVigente
                        ?.Celula ??
                    null;

                const idSupervisor =
                    asignacionVigente
                        ?.IdSupervisor ??
                    null;

                const supervisor =
                    asignacionVigente
                        ?.Supervisor ??
                    null;


                const clave =
                    `${tecnico.IdTecnico}-${idCelula ?? "SIN_CELULA"}`;


                if (
                    !acumulado.has(
                        clave
                    )
                ) {

                    acumulado.set(
                        clave,
                        {
                            idTecnico:
                                tecnico.IdTecnico,

                            et:
                                tecnico.NombreCompleto,

                            idCelula,

                            celula,

                            idSupervisor,

                            supervisor,

                            asignadas: 0,

                            finalizadas: 0,

                            noRealizadas: 0,

                            reprogramadas: 0,

                            cierresAutomaticos: 0,

                            suspensiones: 0,

                            minutosSuspendidos: 0,

                            actividades: []
                        }
                    );

                }


                const item =
                    acumulado.get(
                        clave
                    );


                const estado =
                    String(
                        actividad.EstadoActividad ||
                        ""
                    )
                        .trim()
                        .toUpperCase();

                if (
                    estado === "FINALIZADA" ||
                    estado === "NO_REALIZADO"
                ) {
                    item.asignadas += 1;
                }


                const resultadoNoRealizado =
                    String(
                        actividad.ResultadoNoRealizado ||
                        ""
                    )
                        .trim()
                        .toUpperCase();

                let duracionActividadMinutos = 0;

                /*
                * Calcular duración de la actividad
                * siempre que tenga inicio y fin válidos.
                */
                if (
                    actividad.HoraInicio &&
                    actividad.HoraFin
                ) {

                    const inicioActividad =
                        new Date(
                            actividad.HoraInicio
                        );

                    const finActividad =
                        new Date(
                            actividad.HoraFin
                        );

                    if (
                        !Number.isNaN(
                            inicioActividad.getTime()
                        ) &&
                        !Number.isNaN(
                            finActividad.getTime()
                        ) &&
                        finActividad >=
                            inicioActividad
                    ) {

                        duracionActividadMinutos =
                            Math.round(
                                (
                                    finActividad.getTime() -
                                    inicioActividad.getTime()
                                ) / 60000
                            );
                    }
                }

                /*
                * Las suspensiones además alimentan
                * el acumulado de minutos suspendidos.
                */
                if (
                    estado ===
                    "SUSPENDIDA"
                ) {

                    item.suspensiones +=
                        1;

                    item.minutosSuspendidos +=
                        duracionActividadMinutos;
                }


                if (
                    estado ===
                    "FINALIZADA"
                ) {

                    item.finalizadas += 1;

                }


                if (
                    estado ===
                    "NO_REALIZADO"
                ) {

                    item.noRealizadas += 1;

                    if (
                        resultadoNoRealizado ===
                        "REPROGRAMADA"
                    ) {
                        item.reprogramadas +=
                            1;
                    }

                    if (
                        resultadoNoRealizado ===
                        "CIERRE_AUTOMATICO"
                    ) {
                        item.cierresAutomaticos +=
                            1;
                    }

                }

                item.actividades.push({
                    idActividad:
                        actividad.IdActividad,

                    idActividadOFSC:
                        actividad.IdActividadOFSC,

                    idOrden:
                        actividad.IdOrden,

                    codigoOT:
                        actividad.CodigoOT,

                    estado:
                        actividad.EstadoActividad,

                    resultadoNoRealizado:
                        actividad.ResultadoNoRealizado,

                    razonReagenda:
                        actividad.RazonReagenda,

                    motivo:
                        actividad.Motivo,

                    resultadoGlobal:
                        actividad.ResultadoGlobal,

                    responsableSuspension:
                        actividad.ResponsableSuspension,

                    tipoSuspension:
                        actividad.TipoSuspension,

                    fechaActividad:
                        actividad.FechaActividad,

                    horaInicio:
                        actividad.HoraInicio,

                    horaFin:
                        actividad.HoraFin,

                    duracionMinutos:
                        duracionActividadMinutos,

                    tipoCierre:
                        actividad.TipoCierre,

                        

                    recurso:
                        actividad.Recurso,

                    distrito:
                        actividad.Distrito
                });

                }


            /*
            * =====================================================
            * 6. CALCULAR EFECTIVIDAD
            * =====================================================
            */

            detalleWinet =
                Array.from(
                    acumulado.values()
                )
                    .map(
                        (item) => ({

                            ...item,

                            efectividad:
                                item.asignadas > 0
                                    ? Math.round(
                                        (
                                            item.finalizadas /
                                            item.asignadas
                                        ) * 100
                                    )
                                    : 0

                        })
                    )
                    .sort(
                        (a, b) => {

                            const celulaA =
                                a.idCelula ??
                                0;

                            const celulaB =
                                b.idCelula ??
                                0;


                            if (
                                celulaA !==
                                celulaB
                            ) {

                                return (
                                    celulaA -
                                    celulaB
                                );

                            }


                            return String(
                                a.et || ""
                            ).localeCompare(
                                String(
                                    b.et || ""
                                ),
                                "es"
                            );

                        }
                    );

            const actividadesParaConsolidado =
                detalleWinet.flatMap(
                    (item) =>
                        (item.actividades || []).map(
                            (actividad) => ({
                                ...actividad,

                                idTecnico:
                                    item.idTecnico,

                                et:
                                    item.et,

                                idCelula:
                                    item.idCelula,

                                celula:
                                    item.celula,

                                idSupervisor:
                                    item.idSupervisor,

                                supervisor:
                                    item.supervisor
                            })
                        )
                );

            consolidadoOTWinet =
                construirConsolidadoOT(
                    actividadesParaConsolidado
                );

                console.log(
                    ">>> PRUEBA OT CONSOLIDADA:",
                    JSON.stringify(
                        consolidadoOTWinet
                            .filter(
                                (ot) =>
                                    ot.codigoOT ===
                                    "919991158"
                            )
                            .map(
                                (ot) => ({
                                    codigoOT:
                                        ot.codigoOT,

                                    et:
                                        ot.et,

                                    estadoActual:
                                        ot.estadoActual,

                                    totalSegmentos:
                                        ot.totalSegmentos,

                                    primerInicio:
                                        ot.primerInicio,

                                    ultimoFin:
                                        ot.ultimoFin,

                                    tiempoRegistradoTotal:
                                        ot.tiempoRegistradoTotal,

                                    tiempoSuspendidoTotal:
                                        ot.tiempoSuspendidoTotal,

                                    tiempoNoClasificadoTotal:
                                        ot.tiempoNoClasificadoTotal,

                                    tiempoTranscurridoTotal:
                                        ot.tiempoTranscurridoTotal,

                                    ciclos:
                                        ot.ciclos.length
                                })
                            ),
                        null,
                        2
                    )
                );
            /*
            * =====================================================
            * 7. RESUMEN POR CÉLULA
            * =====================================================
            */

            resumenWinetCelulas =
                Object.values(
                    detalleWinet.reduce(
                        (
                            acumuladoCelulas,
                            item
                        ) => {

                            const clave =
                                `${item.idCelula}-${item.idSupervisor}`;


                            if (
                                !acumuladoCelulas[
                                    clave
                                ]
                            ) {

                                acumuladoCelulas[
                                    clave
                                ] = {

                                    idCelula:
                                        item.idCelula,

                                    celula:
                                        item.celula,

                                    idSupervisor:
                                        item.idSupervisor,

                                    supervisor:
                                        item.supervisor,

                                    asignadas: 0,

                                    finalizadas: 0,

                                    noRealizadas: 0,

                                    reprogramadas: 0,

                                    cierresAutomaticos: 0,
                                    suspensiones: 0,
                                    minutosSuspendidos: 0

                                };

                            }


                            acumuladoCelulas[
                                clave
                            ].asignadas +=
                                item.asignadas;


                            acumuladoCelulas[
                                clave
                            ].finalizadas +=
                                item.finalizadas;


                            acumuladoCelulas[
                                clave
                            ].noRealizadas +=
                                item.noRealizadas;


                            acumuladoCelulas[
                                clave
                            ].reprogramadas +=
                                item.reprogramadas;


                            acumuladoCelulas[
                                clave
                            ].cierresAutomaticos +=
                                item.cierresAutomaticos;

                            acumuladoCelulas[
                                clave
                            ].suspensiones +=
                                item.suspensiones;


                            acumuladoCelulas[
                                clave
                            ].minutosSuspendidos +=
                                item.minutosSuspendidos;


                            return acumuladoCelulas;

                        },
                        {}
                    )
                )
                    .map(
                        (item) => ({

                            ...item,

                            efectividad:
                                item.asignadas > 0
                                    ? Math.round(
                                        (
                                            item.finalizadas /
                                            item.asignadas
                                        ) * 100
                                    )
                                    : 0

                        })
                    );


            console.log(
                ">>> WINET: consulta detalle terminada:",
                detalleWinet.length,
                "registros",
                "| Tiempo:",
                Date.now() -
                    inicioDetalleWinet,
                "ms"
            );
        }
        const inicioHistorico =
            Date.now();

        console.log(
            ">>> WINET: iniciando consulta histórico"
        );

        /*
        * Histórico diario de efectividad.
        * Usa un Request independiente para no
        * reutilizar el Request del KPI principal.
        */
        const solicitudHistorico =
            pool.request();

        solicitudHistorico.input(
            "Proyecto",
            sql.VarChar(30),
            proyecto || null
        );

        solicitudHistorico.input(
            "FechaDesde",
            sql.Date,
            fechaDesde || null
        );

        solicitudHistorico.input(
            "FechaHasta",
            sql.Date,
            fechaHasta || null
        );

        solicitudHistorico.input(
            "Distrito",
            sql.VarChar(60),
            distrito || null
        );

        const resultadoHistorico =
            await solicitudHistorico.query(`
                WITH ActividadesHistoricas AS
                (
                    SELECT
                        A.FechaActividad,
                        A.EstadoActividad,
                        A.ResultadoNoRealizado
                    FROM dbo.ActividadesOFSC A

                    INNER JOIN dbo.OrdenesTrabajo OT
                        ON OT.IdOrden =
                            A.IdOrden

                    LEFT JOIN dbo.Proyectos P
                        ON P.IdProyecto =
                            OT.IdProyecto

                    WHERE
                        A.FechaActividad IS NOT NULL

                        /*
                         * Canceladas no participan.
                         */
                        AND UPPER(
                            LTRIM(
                                RTRIM(
                                    A.EstadoActividad
                                )
                            )
                        ) <> 'CANCELADA'

                        /*
                         * Suspendidas todavía no
                         * tienen resultado final.
                         */
                        AND UPPER(
                            LTRIM(
                                RTRIM(
                                    A.EstadoActividad
                                )
                            )
                        ) <> 'SUSPENDIDA'

                        /*
                         * Proyecto.
                         */
                        AND (
                            @Proyecto IS NULL
                            OR UPPER(
                                LTRIM(
                                    RTRIM(
                                        COALESCE(
                                            P.Codigo,
                                            'SIN_PROYECTO'
                                        )
                                    )
                                )
                            ) = @Proyecto
                        )

                        /*
                         * Fecha desde.
                         */
                        AND (
                            @FechaDesde IS NULL
                            OR A.FechaActividad >=
                                @FechaDesde
                        )

                        /*
                         * Fecha hasta.
                         */
                        AND (
                            @FechaHasta IS NULL
                            OR A.FechaActividad <=
                                @FechaHasta
                        )

                        /*
                         * Distrito.
                         */
                        AND (
                            @Distrito IS NULL
                            OR UPPER(
                                LTRIM(
                                    RTRIM(
                                        COALESCE(
                                            OT.Distrito,
                                            ''
                                        )
                                    )
                                )
                            ) = UPPER(
                                LTRIM(
                                    RTRIM(
                                        @Distrito
                                    )
                                )
                            )
                        )
                )

                SELECT
                    FechaActividad,

                    COUNT(*) AS TotalActividades,

                    SUM(
                        CASE
                            WHEN EstadoActividad =
                                'FINALIZADA'
                            THEN 1
                            ELSE 0
                        END
                    ) AS Finalizadas,

                    SUM(
                        CASE
                            WHEN EstadoActividad =
                                'NO_REALIZADO'
                            THEN 1
                            ELSE 0
                        END
                    ) AS NoRealizados,

                    SUM(
                        CASE
                            WHEN EstadoActividad =
                                'NO_REALIZADO'
                             AND ResultadoNoRealizado =
                                'REPROGRAMADA'
                            THEN 1
                            ELSE 0
                        END
                    ) AS Reprogramadas,

                    SUM(
                        CASE
                            WHEN EstadoActividad =
                                'NO_REALIZADO'
                             AND ResultadoNoRealizado =
                                'CIERRE_AUTOMATICO'
                            THEN 1
                            ELSE 0
                        END
                    ) AS CierresAutomaticos,

                    CAST(
                        CASE
                            WHEN SUM(
                                CASE
                                    WHEN UPPER(
                                        LTRIM(
                                            RTRIM(
                                                EstadoActividad
                                            )
                                        )
                                    ) <> 'SUSPENDIDA'
                                    THEN 1
                                    ELSE 0
                                END
                            ) = 0
                            THEN 0
                            ELSE ROUND(
                                100.0 *
                                SUM(
                                    CASE
                                        WHEN EstadoActividad =
                                            'FINALIZADA'
                                        THEN 1
                                        ELSE 0
                                    END
                                )
                                /
                                SUM(
                                    CASE
                                        WHEN UPPER(
                                            LTRIM(
                                                RTRIM(
                                                    EstadoActividad
                                                )
                                            )
                                        ) <> 'SUSPENDIDA'
                                        THEN 1
                                        ELSE 0
                                    END
                                ),
                                0
                            )
                        END
                        AS INT
                    ) AS Efectividad

                FROM ActividadesHistoricas

                GROUP BY
                    FechaActividad

                ORDER BY
                    FechaActividad;
            `);

        console.log(
            ">>> WINET: consulta histórico terminada:",
            Date.now() - inicioHistorico,
            "ms"
        );

        const historicoEfectividad =
            resultadoHistorico.recordset.map(
                (registro) => ({
                    fecha:
                        registro.FechaActividad,

                    totalActividades:
                        Number(
                            registro.TotalActividades
                        ) || 0,

                    finalizadas:
                        Number(
                            registro.Finalizadas
                        ) || 0,

                    noRealizados:
                        Number(
                            registro.NoRealizados
                        ) || 0,

                    reprogramadas:
                        Number(
                            registro.Reprogramadas
                        ) || 0,

                    cierresAutomaticos:
                        Number(
                            registro.CierresAutomaticos
                        ) || 0,

                    efectividad:
                        Number(
                            registro.Efectividad
                        ) || 0
                })
            );            
        const datos =
            resultado.recordset[0] || {};

        return res
            .status(200)
            .json({
                ok: true,

                filtros: {
                    proyecto:
                        proyecto || null,

                    fechaDesde:
                        fechaDesde || null,

                    fechaHasta:
                        fechaHasta || null,

                    distrito:
                        distrito || null
                },

                kpis: {
                    totalActividades:
                        Number(
                            datos.TotalActividades
                        ) || 0,

                    finalizadas:
                        Number(
                            datos.Finalizadas
                        ) || 0,

                    noRealizados:
                        Number(
                            datos.NoRealizados
                        ) || 0,

                    pendientes:
                        Number(
                            datos.Pendientes
                        ) || 0,

                    enRuta:
                        Number(
                            datos.EnRuta
                        ) || 0,

                    iniciadas:
                        Number(
                            datos.Iniciadas
                        ) || 0,
                    canceladas:
                        Number(
                            datos.Canceladas
                        ) || 0,
                    reprogramadas:
                        Number(
                            datos.Reprogramadas
                        ) || 0,

                    cierresAutomaticos:
                        Number(
                            datos.CierresAutomaticos
                        ) || 0,

                    efectividad:
                        Number(
                            datos.Efectividad
                        ) || 0,

                    promedioDuracionMinutos:
                        datos.PromedioDuracionMinutos !== null &&
                        datos.PromedioDuracionMinutos !== undefined
                            ? Number(
                                datos.PromedioDuracionMinutos
                            )
                            : null
                },
                distritos:
                    distritos,
                historicoEfectividad:
                    historicoEfectividad,

                detalleWinet:
                    detalleWinet,

                consolidadoOTWinet:
                    consolidadoOTWinet,

                resumenWinetCelulas:
                    resumenWinetCelulas,

                ahoraWinet:
                    ahoraWinet
                            });

    } catch (error) {

        console.error(
            "Error al obtener los KPIs OFSC:",
            error
        );

        return res
            .status(500)
            .json({
                ok: false,

                mensaje:
                    "No se pudieron obtener los KPIs de actividades OFSC.",

                detalle:
                    error.message
            });
    }
}

/**
 * Consulta rápida de una OT WINET.
 *
 * GET /api/dashboard/ot?codigoOT=XXXXXXXXX
 */
async function buscarOT(
    req,
    res
) {
    try {

        const codigoOT =
            String(
                req.query.codigoOT || ""
            )
                .trim();

        if (!codigoOT) {
            return res
                .status(400)
                .json({
                    ok: false,
                    mensaje:
                        "Debe indicar el código de la OT."
                });
        }

        console.log(
            "========== CONSULTA RÁPIDA OT =========="
        );

        console.log(
            ">>> OT solicitada:",
            codigoOT
        );

        const pool =
            await conectarDB();

        /*
         * =====================================================
         * 1. OBTENER ACTIVIDADES DE LA OT
         * =====================================================
         */

        const solicitud =
            pool.request();

        solicitud.input(
            "CodigoOT",
            sql.VarChar(50),
            codigoOT
        );

        const resultado =
            await solicitud.query(`
                SELECT
                    A.IdActividad,
                    A.IdActividadOFSC,
                    A.IdOrden,
                    OT.CodigoOT,

                    A.EstadoActividad,
                    A.ResultadoNoRealizado,
                    A.RazonReagenda,
                    A.Motivo,

                    A.FechaActividad,
                    A.HoraInicio,
                    A.HoraFin,

                    A.TipoCierre,
                    A.ResultadoGlobal,

                    A.ResponsableSuspension,
                    A.TipoSuspension,

                    A.Recurso,

                    OT.Distrito

                FROM dbo.ActividadesOFSC A

                INNER JOIN dbo.OrdenesTrabajo OT
                    ON OT.IdOrden =
                        A.IdOrden

                INNER JOIN dbo.Proyectos P
                    ON P.IdProyecto =
                        OT.IdProyecto

                WHERE
                    P.Codigo = 'RED_WINET'

                    AND UPPER(
                        LTRIM(
                            RTRIM(
                                OT.CodigoOT
                            )
                        )
                    ) =
                    UPPER(
                        LTRIM(
                            RTRIM(
                                @CodigoOT
                            )
                        )
                    )

                ORDER BY
                    A.FechaActividad,
                    A.HoraInicio;
            `);

        const actividades =
            resultado.recordset;

        if (
            actividades.length === 0
        ) {

            return res
                .status(404)
                .json({
                    ok: false,
                    mensaje:
                        `No se encontró la OT ${codigoOT} en RED WINET.`
                });

        }

        /*
         * =====================================================
         * 2. TÉCNICOS ACTIVOS
         * =====================================================
         */

        const resultadoTecnicos =
            await pool
                .request()
                .query(`
                    SELECT
                        IdTecnico,
                        NombreCompleto

                    FROM dbo.Tecnicos

                    WHERE Activo = 1

                    ORDER BY
                        IdTecnico;
                `);

        const tecnicos =
            resultadoTecnicos.recordset;

        /*
         * =====================================================
         * 3. NORMALIZACIÓN DE RECURSO / ET
         * =====================================================
         */

        const normalizarTexto =
            (valor) =>
                String(valor || "")
                    .trim()
                    .toUpperCase()
                    .normalize("NFD")
                    .replace(
                        /[\u0300-\u036f]/g,
                        ""
                    )
                    .replace(
                        /HOME_/g,
                        ""
                    )
                    .replace(
                        /_/g,
                        " "
                    )
                    .replace(
                        /\s+/g,
                        " "
                    )
                    .trim();

        /*
         * =====================================================
         * 4. ASIGNACIONES DE CÉLULA
         * =====================================================
         */

        const resultadoAsignaciones =
            await pool
                .request()
                .query(`
                    SELECT
                        ACE.IdTecnico,
                        ACE.IdCelula,
                        ACE.FechaInicio,
                        ACE.FechaFin,

                        C.NombreCelula
                            AS Celula,

                        C.IdSupervisor,

                        S.NombreCompleto
                            AS Supervisor

                    FROM dbo.AsignacionesCelulaET ACE

                    LEFT JOIN dbo.Celulas C
                        ON C.IdCelula =
                            ACE.IdCelula

                    LEFT JOIN dbo.SupervisoresOperativos S
                        ON S.IdSupervisor =
                            C.IdSupervisor

                    WHERE
                        ACE.Activo = 1

                    ORDER BY
                        ACE.IdTecnico,
                        ACE.FechaInicio DESC;
                `);

        const asignaciones =
            resultadoAsignaciones.recordset;

        /*
         * =====================================================
         * 5. MAPEAR ET + CÉLULA + SUPERVISOR
         * =====================================================
         */

        const actividadesNormalizadas =
            actividades.map(
                (actividad) => {

                    const recursoNormalizado =
                        normalizarTexto(
                            actividad.Recurso
                        );

                    const textoRecurso =
                        ` ${recursoNormalizado} `;

                    const tecnicoEncontrado =
                        tecnicos.find(
                            (tecnico) => {

                                const palabrasTecnico =
                                    normalizarTexto(
                                        tecnico.NombreCompleto
                                    )
                                        .split(" ")
                                        .filter(
                                            Boolean
                                        );

                                return palabrasTecnico.every(
                                    (palabra) =>
                                        textoRecurso.includes(
                                            ` ${palabra} `
                                        )
                                );
                            }
                        );

                    const fechaActividad =
                        actividad.FechaActividad
                            ? new Date(
                                actividad.FechaActividad
                            )
                            : null;

                    const asignacionVigente =
                        tecnicoEncontrado
                            ? (
                                asignaciones.find(
                                    (asignacion) => {

                                        if (
                                            asignacion.IdTecnico !==
                                            tecnicoEncontrado.IdTecnico
                                        ) {
                                            return false;
                                        }

                                        const fechaInicio =
                                            asignacion.FechaInicio
                                                ? new Date(
                                                    asignacion.FechaInicio
                                                )
                                                : null;

                                        const fechaFin =
                                            asignacion.FechaFin
                                                ? new Date(
                                                    asignacion.FechaFin
                                                )
                                                : null;

                                        return (
                                            fechaActividad &&
                                            fechaInicio &&
                                            fechaInicio <=
                                                fechaActividad &&
                                            (
                                                !fechaFin ||
                                                fechaFin >=
                                                    fechaActividad
                                            )
                                        );
                                    }
                                ) || null
                            )
                            : null;

                    return {
                        idActividad:
                            actividad.IdActividad,

                        idActividadOFSC:
                            actividad.IdActividadOFSC,

                        idOrden:
                            actividad.IdOrden,

                        codigoOT:
                            actividad.CodigoOT,

                        estado:
                            actividad.EstadoActividad,

                        resultadoNoRealizado:
                            actividad.ResultadoNoRealizado,

                        razonReagenda:
                            actividad.RazonReagenda,

                        motivo:
                            actividad.Motivo,

                        resultadoGlobal:
                            actividad.ResultadoGlobal,

                        responsableSuspension:
                            actividad.ResponsableSuspension,

                        tipoSuspension:
                            actividad.TipoSuspension,

                        fechaActividad:
                            actividad.FechaActividad,

                        horaInicio:
                            actividad.HoraInicio,

                        horaFin:
                            actividad.HoraFin,

                        tipoCierre:
                            actividad.TipoCierre,

                        recurso:
                            actividad.Recurso,

                        distrito:
                            actividad.Distrito,

                        idTecnico:
                            tecnicoEncontrado
                                ?.IdTecnico ??
                            null,

                        et:
                            tecnicoEncontrado
                                ?.NombreCompleto ??
                            null,

                        idCelula:
                            asignacionVigente
                                ?.IdCelula ??
                            null,

                        celula:
                            asignacionVigente
                                ?.Celula ??
                            null,

                        idSupervisor:
                            asignacionVigente
                                ?.IdSupervisor ??
                            null,

                        supervisor:
                            asignacionVigente
                                ?.Supervisor ??
                            null
                    };
                }
            );

        /*
         * =====================================================
         * 6. CONSTRUIR OT CONSOLIDADA
         * =====================================================
         */

        const ots =
            construirConsolidadoOT(
                actividadesNormalizadas
            );

        const ot =
            ots.find(
                (item) =>
                    String(
                        item.codigoOT || ""
                    ).trim().toUpperCase() ===
                    codigoOT.trim().toUpperCase()
            );

        if (!ot) {
            return res
                .status(404)
                .json({
                    ok: false,
                    mensaje:
                        `No se pudo construir la trazabilidad de la OT ${codigoOT}.`
                });
        }

        return res
            .status(200)
            .json({
                ok: true,
                ot
            });

    } catch (error) {

        console.error(
            "Error al consultar OT:",
            error
        );

        return res
            .status(500)
            .json({
                ok: false,

                mensaje:
                    "No se pudo consultar la OT.",

                detalle:
                    error.message
            });
    }
}
module.exports = {
    obtenerResumen,
    obtenerKPIs,
    buscarOT
};