const {
    conectarDB,
    sql
} = require("../config/database");

const ESTADOS_TSS = new Set([
    "PENDIENTE_PROGRAMACION",
    "PROGRAMADO",
    "EN_EJECUCION",
    "FACTIBLE",
    "PDT_LPU",
    "NO_CONCLUIDO",
    "FALLIDO_CAMPO",
    "FALLIDO_ESCRITORIO",
    "REPROGRAMAR"
]);

const TURNOS_TSS = new Set([
    "AM",
    "PM",
    "NOCTURNO"
]);

const PROYECTOS_TSS = new Set([
    "RED_ENTEL",
    "RED_WINET",
    "SIN_PROYECTO"
]);

function crearErrorValidacion(mensaje) {
    const error = new Error(mensaje);
    error.statusCode = 400;
    return error;
}

function obtenerValorUnico(valor, nombre) {
    if (Array.isArray(valor)) {
        throw crearErrorValidacion(
            `El filtro ${nombre} no puede repetirse.`
        );
    }

    return valor;
}

function normalizarEntero(
    valor,
    {
        nombre,
        minimo = 1,
        maximo = 2147483647,
        predeterminado
    }
) {
    const valorUnico = obtenerValorUnico(
        valor,
        nombre
    );

    if (
        valorUnico === undefined ||
        valorUnico === null ||
        String(valorUnico).trim() === ""
    ) {
        if (predeterminado !== undefined) {
            return predeterminado;
        }

        return null;
    }

    const texto = String(valorUnico).trim();

    if (!/^\d+$/.test(texto)) {
        throw crearErrorValidacion(
            `${nombre} debe ser un nÃºmero entero vÃ¡lido.`
        );
    }

    const numero = Number(texto);

    if (
        !Number.isSafeInteger(numero) ||
        numero < minimo ||
        numero > maximo
    ) {
        throw crearErrorValidacion(
            `${nombre} estÃ¡ fuera del rango permitido.`
        );
    }

    return numero;
}

function normalizarFecha(valor, nombre) {
    const valorUnico = obtenerValorUnico(
        valor,
        nombre
    );

    if (
        valorUnico === undefined ||
        valorUnico === null ||
        String(valorUnico).trim() === ""
    ) {
        return null;
    }

    const texto = String(valorUnico).trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
        throw crearErrorValidacion(
            `${nombre} debe tener el formato AAAA-MM-DD.`
        );
    }

    const [anio, mes, dia] = texto
        .split("-")
        .map(Number);

    const fecha = new Date(
        Date.UTC(anio, mes - 1, dia)
    );

    if (
        fecha.getUTCFullYear() !== anio ||
        fecha.getUTCMonth() !== mes - 1 ||
        fecha.getUTCDate() !== dia
    ) {
        throw crearErrorValidacion(
            `${nombre} no contiene una fecha vÃ¡lida.`
        );
    }

    return texto;
}

function normalizarOpcion(
    valor,
    nombre,
    permitidos
) {
    const valorUnico = obtenerValorUnico(
        valor,
        nombre
    );

    if (
        valorUnico === undefined ||
        valorUnico === null ||
        String(valorUnico).trim() === ""
    ) {
        return null;
    }

    const opcion = String(valorUnico)
        .trim()
        .toUpperCase();

    if (!permitidos.has(opcion)) {
        throw crearErrorValidacion(
            `El filtro ${nombre} no es vÃ¡lido.`
        );
    }

    return opcion;
}

function escaparLike(valor) {
    return String(valor)
        .replaceAll("!", "!!")
        .replaceAll("%", "!%")
        .replaceAll("_", "!_")
        .replaceAll("[", "![");
}

function normalizarConsultaTSS(consulta = {}) {
    const pagina = normalizarEntero(
        consulta.pagina,
        {
            nombre: "pagina",
            maximo: 1000000,
            predeterminado: 1
        }
    );

    const limite = normalizarEntero(
        consulta.limite,
        {
            nombre: "limite",
            maximo: 100,
            predeterminado: 20
        }
    );

    const estado = normalizarOpcion(
        consulta.estado,
        "estado",
        ESTADOS_TSS
    );

    const turno = normalizarOpcion(
        consulta.turno,
        "turno",
        TURNOS_TSS
    );

    const proyecto = normalizarOpcion(
        consulta.proyecto,
        "proyecto",
        PROYECTOS_TSS
    );

    const idTecnico = normalizarEntero(
        consulta.idTecnico,
        {
            nombre: "idTecnico"
        }
    );

    const desde = normalizarFecha(
        consulta.desde,
        "desde"
    );

    const hasta = normalizarFecha(
        consulta.hasta,
        "hasta"
    );

    if (desde && hasta && desde > hasta) {
        throw crearErrorValidacion(
            "La fecha desde no puede ser posterior a la fecha hasta."
        );
    }

    const buscarRecibido = obtenerValorUnico(
        consulta.buscar,
        "buscar"
    );

    const buscar = String(
        buscarRecibido || ""
    ).trim();

    if (buscar.length > 120) {
        throw crearErrorValidacion(
            "La bÃºsqueda no puede superar 120 caracteres."
        );
    }

    const ordenRecibido = obtenerValorUnico(
        consulta.orden,
        "orden"
    );

    const orden = String(
        ordenRecibido || "agenda"
    )
        .trim()
        .toLowerCase();

    if (![
        "agenda",
        "recientes"
    ].includes(orden)) {
        throw crearErrorValidacion(
            "El orden solicitado no es vÃ¡lido."
        );
    }

    return {
        pagina,
        limite,
        estado,
        turno,
        proyecto,
        idTecnico,
        desde,
        hasta,
        buscar,
        patronBuscar: buscar
            ? `%${escaparLike(buscar)}%`
            : null,
        orden
    };
}

function normalizarIdTSS(valor) {
    const idTSS = normalizarEntero(
        valor,
        {
            nombre: "idTSS"
        }
    );

    if (!idTSS) {
        throw crearErrorValidacion(
            "Debe indicar un TSS vÃ¡lido."
        );
    }

    return idTSS;
}

function soloNombreArchivo(valor) {
    const nombre = String(valor || "")
        .trim()
        .split(/[\\/]/)
        .pop();

    return nombre || null;
}

async function listarTSS(
    consulta = {},
    dependencias = {}
) {
    const filtros = normalizarConsultaTSS(
        consulta
    );

    const obtenerPool =
        dependencias.conectarDB ||
        conectarDB;

    const pool = await obtenerPool();
    const request = pool.request();

    request
        .input(
            "EstadoTSS",
            sql.VarChar(30),
            filtros.estado
        )
        .input(
            "Proyecto",
            sql.VarChar(30),
            filtros.proyecto
        )
        .input(
            "Turno",
            sql.VarChar(15),
            filtros.turno
        )
        .input(
            "IdTecnico",
            sql.Int,
            filtros.idTecnico
        )
        .input(
            "FechaDesde",
            sql.Date,
            filtros.desde
        )
        .input(
            "FechaHasta",
            sql.Date,
            filtros.hasta
        )
        .input(
            "Buscar",
            sql.VarChar(242),
            filtros.patronBuscar
        )
        .input(
            "Orden",
            sql.VarChar(10),
            filtros.orden === "recientes"
                ? "RECIENTES"
                : "AGENDA"
        )
        .input(
            "Offset",
            sql.Int,
            (
                filtros.pagina - 1
            ) * filtros.limite
        )
        .input(
            "Limite",
            sql.Int,
            filtros.limite
        );

    const resultado = await request.query(`
        SET NOCOUNT ON;

        SELECT COUNT_BIG(*) AS Total
        FROM dbo.TSS TS
        INNER JOIN dbo.OrdenesTrabajo OT
            ON OT.IdOrden = TS.IdOrden

        LEFT JOIN dbo.Proyectos P
            ON P.IdProyecto =
                OT.IdProyecto

        LEFT JOIN dbo.Tecnicos TEC
            ON TEC.IdTecnico = TS.IdTecnico
        LEFT JOIN dbo.NAPs NAP
            ON NAP.IdNAP = TS.IdNAP
        WHERE
            (@EstadoTSS IS NULL
                OR TS.EstadoTSS = @EstadoTSS)

            AND (
                @Proyecto IS NULL
                OR (
                    @Proyecto = 'SIN_PROYECTO'
                    AND OT.IdProyecto IS NULL
                )
                OR (
                    @Proyecto <> 'SIN_PROYECTO'
                    AND EXISTS
                    (
                        SELECT 1
                        FROM dbo.Proyectos P
                        WHERE
                            P.IdProyecto =
                                OT.IdProyecto
                            AND P.Codigo =
                                @Proyecto
                            AND P.Activo = 1
                    )
                )
            )

            AND (@Turno IS NULL
                OR TS.Turno = @Turno)
            AND (@IdTecnico IS NULL
                OR TS.IdTecnico = @IdTecnico)
            AND (@FechaDesde IS NULL
                OR TS.FechaAgenda >= @FechaDesde)
            AND (@FechaHasta IS NULL
                OR TS.FechaAgenda <= @FechaHasta)
            AND (
                @Buscar IS NULL
                OR OT.CodigoOT LIKE @Buscar ESCAPE '!'
                OR OT.CodigoServicio LIKE @Buscar ESCAPE '!'
                OR OT.Cliente LIKE @Buscar ESCAPE '!'
                OR OT.Distrito LIKE @Buscar ESCAPE '!'
                OR TEC.CodigoTecnico LIKE @Buscar ESCAPE '!'
                OR TEC.NombreCompleto LIKE @Buscar ESCAPE '!'
                OR NAP.CodigoNAP LIKE @Buscar ESCAPE '!'
            )
        OPTION (MAXDOP 1);

        SELECT
            TS.IdTSS,
            TS.IdOrden,
            OT.CodigoOT,
            OT.CodigoServicio,
            OT.Cliente,
            OT.Distrito,
            OT.EstadoOT,
            OT.EstadoAsignacion,

            OT.IdProyecto,

            P.Codigo AS ProyectoCodigo,
            P.Nombre AS ProyectoNombre,

            CONVERT(char(10), TS.FechaAgenda, 23)
                AS FechaAgenda,
            TS.Turno,
            TS.EstadoTSS,
            TS.ContinuidadInstalacion,
            TS.FormularioEnviado,
            TS.FechaActualizacion,
            TEC.IdTecnico,
            TEC.CodigoTecnico,
            TEC.NombreCompleto AS Tecnico,
            NAP.IdNAP,
            NAP.CodigoNAP,
            NAP.EsReferenciaHistorica,
            ACT.IdActividadOFSC,
            ACT.EstadoActividad,
            CONVERT(char(10), ACT.FechaActividad, 23)
                AS FechaActividad,
            ISNULL(EV.TotalRegistradas, 0)
                AS TotalEvidencias,
            ISNULL(EV.Completas, 0)
                AS EvidenciasCompletas,
            ISNULL(EV.NoAplica, 0)
                AS EvidenciasNoAplica,
            ISNULL(REQ.TotalObligatorias, 0)
                AS EvidenciasObligatorias,
            ISNULL(RES.ObligatoriasResueltas, 0)
                AS EvidenciasObligatoriasResueltas,
            CAST(
                CASE
                    WHEN ISNULL(
                        REQ.TotalObligatorias,
                        0
                    ) > 0
                    AND ISNULL(
                        RES.ObligatoriasResueltas,
                        0
                    ) = REQ.TotalObligatorias
                    THEN 1
                    ELSE 0
                END
                AS bit
            ) AS DocumentacionCompleta,
            TCE.IdValidacionTCE
                AS IdUltimaValidacionTCE,
            TCE.Resultado
                AS UltimoResultadoTCE
        FROM dbo.TSS TS
        INNER JOIN dbo.OrdenesTrabajo OT
            ON OT.IdOrden = TS.IdOrden

        LEFT JOIN dbo.Proyectos P
            ON P.IdProyecto =
                OT.IdProyecto

        LEFT JOIN dbo.Tecnicos TEC
            ON TEC.IdTecnico = TS.IdTecnico
        LEFT JOIN dbo.NAPs NAP
            ON NAP.IdNAP = TS.IdNAP
        OUTER APPLY
        (
            SELECT TOP (1)
                A.IdActividadOFSC,
                A.EstadoActividad,
                A.FechaActividad
            FROM dbo.ActividadesOFSC A
            WHERE A.IdOrden = TS.IdOrden
            ORDER BY
                COALESCE(
                    A.FechaActualizacion,
                    A.FechaImportacion
                ) DESC,
                A.IdActividad DESC
        ) ACT
        OUTER APPLY
        (
            SELECT
                COUNT(*) AS TotalRegistradas,
                SUM(
                    CASE
                        WHEN E.EstadoEvidencia = 'COMPLETA'
                        THEN 1 ELSE 0
                    END
                ) AS Completas,
                SUM(
                    CASE
                        WHEN E.EstadoEvidencia = 'NO_APLICA'
                        THEN 1 ELSE 0
                    END
                ) AS NoAplica
            FROM dbo.EvidenciasTSS E
            WHERE E.IdTSS = TS.IdTSS
        ) EV
        CROSS JOIN
        (
            SELECT COUNT(*) AS TotalObligatorias
            FROM dbo.TiposEvidenciaTSS TE
            WHERE
                TE.Activo = 1
                AND TE.Obligatoria = 1
        ) REQ
        OUTER APPLY
        (
            SELECT
                COUNT(DISTINCT E.IdTipoEvidencia)
                    AS ObligatoriasResueltas
            FROM dbo.EvidenciasTSS E
            INNER JOIN dbo.TiposEvidenciaTSS TE
                ON TE.IdTipoEvidencia =
                    E.IdTipoEvidencia
                AND TE.Activo = 1
                AND TE.Obligatoria = 1
            WHERE
                E.IdTSS = TS.IdTSS
                AND (
                    E.EstadoEvidencia = 'COMPLETA'
                    OR (
                        E.EstadoEvidencia = 'NO_APLICA'
                        AND NULLIF(
                            LTRIM(
                                RTRIM(
                                    E.MotivoNoAplica
                                )
                            ),
                            ''
                        ) IS NOT NULL
                    )
                )
        ) RES
        OUTER APPLY
        (
            SELECT TOP (1)
                V.IdValidacionTCE,
                V.Resultado
            FROM dbo.ValidacionesTCE V
            WHERE V.IdTSS = TS.IdTSS
            ORDER BY
                COALESCE(
                    V.FechaRespuesta,
                    V.FechaSolicitud
                ) DESC,
                V.IdValidacionTCE DESC
        ) TCE
        WHERE
            (@EstadoTSS IS NULL
                OR TS.EstadoTSS = @EstadoTSS)

            AND (
                @Proyecto IS NULL
                OR (
                    @Proyecto = 'SIN_PROYECTO'
                    AND OT.IdProyecto IS NULL
                )
                OR (
                    @Proyecto <> 'SIN_PROYECTO'
                    AND EXISTS
                    (
                        SELECT 1
                        FROM dbo.Proyectos P
                        WHERE
                            P.IdProyecto =
                                OT.IdProyecto
                            AND P.Codigo =
                                @Proyecto
                            AND P.Activo = 1
                    )
                )
            )

            AND (@Turno IS NULL
                OR TS.Turno = @Turno)
            AND (@IdTecnico IS NULL
                OR TS.IdTecnico = @IdTecnico)
            AND (@FechaDesde IS NULL
                OR TS.FechaAgenda >= @FechaDesde)
            AND (@FechaHasta IS NULL
                OR TS.FechaAgenda <= @FechaHasta)
            AND (
                @Buscar IS NULL
                OR OT.CodigoOT LIKE @Buscar ESCAPE '!'
                OR OT.CodigoServicio LIKE @Buscar ESCAPE '!'
                OR OT.Cliente LIKE @Buscar ESCAPE '!'
                OR OT.Distrito LIKE @Buscar ESCAPE '!'
                OR TEC.CodigoTecnico LIKE @Buscar ESCAPE '!'
                OR TEC.NombreCompleto LIKE @Buscar ESCAPE '!'
                OR NAP.CodigoNAP LIKE @Buscar ESCAPE '!'
            )
        ORDER BY
            CASE
                WHEN @Orden = 'AGENDA'
                    AND TS.FechaAgenda IS NULL
                THEN 1 ELSE 0
            END,
            CASE
                WHEN @Orden = 'AGENDA'
                THEN TS.FechaAgenda
            END ASC,
            CASE
                WHEN @Orden = 'AGENDA'
                THEN CASE TS.Turno
                    WHEN 'AM' THEN 1
                    WHEN 'PM' THEN 2
                    WHEN 'NOCTURNO' THEN 3
                    ELSE 4
                END
            END ASC,
            CASE
                WHEN @Orden = 'RECIENTES'
                THEN TS.FechaActualizacion
            END DESC,
            TS.IdTSS DESC
        OFFSET @Offset ROWS
        FETCH NEXT @Limite ROWS ONLY
        OPTION (MAXDOP 1);
    `);

    const total = Number(
        resultado.recordsets?.[0]?.[0]
            ?.Total || 0
    );

    return {
        tss: resultado.recordsets?.[1] || [],
        paginacion: {
            pagina: filtros.pagina,
            limite: filtros.limite,
            total,
            totalPaginas: total > 0
                ? Math.ceil(
                    total / filtros.limite
                )
                : 0
        }
    };
}

async function obtenerTSSPorId(
    idTSSRecibido,
    dependencias = {}
) {
    const idTSS = normalizarIdTSS(
        idTSSRecibido
    );

    const obtenerPool =
        dependencias.conectarDB ||
        conectarDB;

    const pool = await obtenerPool();
    const resultado = await pool.request()
        .input(
            "IdTSS",
            sql.Int,
            idTSS
        )
        .query(`
            SET NOCOUNT ON;

            SELECT
                TS.IdTSS,
                TS.IdOrden,
                OT.IdProyecto,
                P.Codigo AS ProyectoCodigo,
                P.Nombre AS ProyectoNombre,
                TS.EstadoTSS,
                CONVERT(char(10), TS.FechaAgenda, 23)
                    AS FechaAgendaTSS,
                TS.Turno,
                TS.IdTecnico,
                TEC.CodigoTecnico,
                TEC.NombreCompleto AS Tecnico,
                TEC.Telefono AS TelefonoTecnico,
                TEC.DistritoBase AS DistritoTecnico,
                TS.IdNAP AS IdNAPTSS,
                NAP.CodigoNAP,
                NAP.Proyecto AS ProyectoNAP,
                NAP.OLT,
                NAP.PuertoOLT,
                NAP.Coordenadas AS CoordenadasReferenciaNAP,
                NAP.Distrito AS DistritoNAP,
                NAP.EsReferenciaHistorica,
                NAP.FechaBaseReferencia,
                NAP.FuenteDatos,
                TS.PuertoNAP AS PuertoNAPTSS,
                TS.CoordenadasNAP,
                TS.RFS AS RFSTSS,
                TS.Observaciones,
                TS.ContinuidadInstalacion,
                TS.FormularioEnviado,
                TS.FechaEnvioFormulario,
                TS.IdUsuarioFormulario,
                UF.NombreCompleto AS UsuarioFormulario,
                TS.IdUsuarioRegistro,
                UR.NombreCompleto AS UsuarioRegistro,
                TS.FechaCreacion,
                TS.FechaActualizacion,
                OT.CodigoOT,
                OT.CodigoServicio,
                OT.ProductoPlan,
                OT.TipoServicio,
                OT.Cliente,
                OT.DNI,
                OT.Telefono,
                OT.Direccion,
                OT.Distrito,
                OT.LatitudCliente,
                OT.LongitudCliente,
                OT.EstadoOT,
                OT.EstadoAsignacion,
                CONVERT(char(10), OT.FechaAgenda, 23)
                    AS FechaAgendaOFSC,
                OT.Horario,
                OT.IdNAP AS IdNAPOrden,
                OT.PuertoNAP AS PuertoNAPOFSC,
                OT.RFS AS RFSOFSC,
                ACT.IdActividad,
                ACT.IdActividadOFSC,
                ACT.EstadoActividad,
                CONVERT(
                    char(10),
                    ACT.FechaActividad,
                    23
                ) AS FechaActividad,
                CONVERT(
                    varchar(8),
                    ACT.HoraInicio,
                    108
                ) AS HoraInicio,
                CONVERT(
                    varchar(8),
                    ACT.HoraFin,
                    108
                ) AS HoraFin,
                ACT.FlagReagenda,
                ACT.RazonReagenda,
                ACT.ResultadoNoRealizado,
                ACT.Motivo,
                ACT.MotivoCancelacion,
                ACT.TipoCierre,
                ACT.ResultadoGlobal,
                ACT.ResponsableSuspension,
                ACT.TipoSuspension
            FROM dbo.TSS TS
            INNER JOIN dbo.OrdenesTrabajo OT
                ON OT.IdOrden = TS.IdOrden
            LEFT JOIN dbo.Tecnicos TEC
                ON TEC.IdTecnico = TS.IdTecnico
            LEFT JOIN dbo.NAPs NAP
                ON NAP.IdNAP = TS.IdNAP
            LEFT JOIN dbo.Proyectos P
                ON P.IdProyecto = OT.IdProyecto
            LEFT JOIN dbo.Usuarios UF
                ON UF.IdUsuario =
                    TS.IdUsuarioFormulario
            LEFT JOIN dbo.Usuarios UR
                ON UR.IdUsuario =
                    TS.IdUsuarioRegistro
            OUTER APPLY
            (
                SELECT TOP (1)
                    A.IdActividad,
                    A.IdActividadOFSC,
                    A.EstadoActividad,
                    A.FechaActividad,
                    A.HoraInicio,
                    A.HoraFin,
                    A.FlagReagenda,
                    A.RazonReagenda,
                    A.ResultadoNoRealizado,
                    A.Motivo,
                    A.MotivoCancelacion,
                    A.TipoCierre,
                    A.ResultadoGlobal,
                    A.ResponsableSuspension,
                    A.TipoSuspension
                FROM dbo.ActividadesOFSC A
                WHERE A.IdOrden = TS.IdOrden
                ORDER BY
                    COALESCE(
                        A.FechaActualizacion,
                        A.FechaImportacion
                    ) DESC,
                    A.IdActividad DESC
            ) ACT
            WHERE TS.IdTSS = @IdTSS;

            SELECT
                TE.IdTipoEvidencia,
                TE.Nombre,
                TE.Descripcion,
                TE.EsBase,
                TE.Obligatoria,
                TE.OrdenVisual
            FROM dbo.TiposEvidenciaTSS TE
            WHERE TE.Activo = 1
            ORDER BY
                CASE
                    WHEN TE.OrdenVisual IS NULL
                    THEN 1 ELSE 0
                END,
                TE.OrdenVisual,
                TE.IdTipoEvidencia;

            SELECT
                E.IdEvidenciaTSS,
                E.IdTipoEvidencia,
                COALESCE(
                    NULLIF(
                        LTRIM(
                            RTRIM(E.NombreEvidencia)
                        ),
                        ''
                    ),
                    TE.Nombre
                ) AS NombreEvidencia,
                E.EstadoEvidencia,
                E.MotivoNoAplica,
                E.NombreArchivo,
                E.Extension,
                E.PesoKB,
                E.Observacion,
                E.FechaRegistro,
                E.IdUsuarioRegistro,
                U.NombreCompleto AS UsuarioRegistro,
                TE.EsBase,
                TE.Obligatoria,
                TE.Activo AS TipoActivo,
                TE.OrdenVisual
            FROM dbo.EvidenciasTSS E
            LEFT JOIN dbo.TiposEvidenciaTSS TE
                ON TE.IdTipoEvidencia =
                    E.IdTipoEvidencia
            LEFT JOIN dbo.Usuarios U
                ON U.IdUsuario = E.IdUsuarioRegistro
            WHERE E.IdTSS = @IdTSS
            ORDER BY
                CASE
                    WHEN TE.OrdenVisual IS NULL
                    THEN 1 ELSE 0
                END,
                TE.OrdenVisual,
                E.FechaRegistro,
                E.IdEvidenciaTSS;

            SELECT
                D.IdDocumentoTSS,
                D.TipoDocumento,
                D.NombreArchivo,
                D.FechaGeneracion,
                D.IdUsuarioGeneracion,
                U.NombreCompleto
                    AS UsuarioGeneracion,
                D.Vigente
            FROM dbo.DocumentosTSS D
            LEFT JOIN dbo.Usuarios U
                ON U.IdUsuario =
                    D.IdUsuarioGeneracion
            WHERE D.IdTSS = @IdTSS
            ORDER BY
                D.Vigente DESC,
                D.FechaGeneracion DESC,
                D.IdDocumentoTSS DESC;

            SELECT
                V.IdValidacionTCE,
                V.IdNAP,
                V.CodigoNAPValidado,
                V.PuertoConfirmado,
                V.Resultado,
                V.Observaciones,
                V.FechaSolicitud,
                V.FechaRespuesta,
                V.ValidadoPor,
                V.IdUsuarioRegistro,
                U.NombreCompleto AS UsuarioRegistro,
                N.CodigoNAP AS CodigoNAPReferencia,
                N.Distrito AS DistritoNAP,
                N.EsReferenciaHistorica,
                N.FechaBaseReferencia,
                N.FuenteDatos
            FROM dbo.ValidacionesTCE V
            LEFT JOIN dbo.Usuarios U
                ON U.IdUsuario = V.IdUsuarioRegistro
            LEFT JOIN dbo.NAPs N
                ON N.IdNAP = V.IdNAP
            WHERE V.IdTSS = @IdTSS
            ORDER BY
                COALESCE(
                    V.FechaRespuesta,
                    V.FechaSolicitud
                ) DESC,
                V.IdValidacionTCE DESC;

            SELECT
                H.IdHistorialTSS,
                H.EstadoAnterior,
                H.EstadoNuevo,
                H.Motivo,
                H.Observacion,
                H.FechaEvento,
                H.IdUsuario,
                U.NombreCompleto AS Usuario,
                U.Usuario AS NombreUsuario,
                R.Nombre AS RolUsuario
            FROM dbo.HistorialEstadosTSS H
            LEFT JOIN dbo.Usuarios U
                ON U.IdUsuario = H.IdUsuario
            LEFT JOIN dbo.Roles R
                ON R.IdRol = U.IdRol
            WHERE H.IdTSS = @IdTSS
            ORDER BY
                H.FechaEvento DESC,
                H.IdHistorialTSS DESC;

            SELECT
                A.IdAgenda,
                A.IdTecnico,
                T.CodigoTecnico,
                T.NombreCompleto AS Tecnico,
                CONVERT(
                    char(10),
                    A.FechaAgenda,
                    23
                ) AS FechaAgenda,
                A.Turno,
                A.TipoActividad,
                A.EstadoAgenda,
                A.OcupaTurno,
                A.Observaciones,
                A.FechaRegistro,
                A.FechaActualizacion,
                A.IdUsuarioRegistro,
                U.NombreCompleto AS UsuarioRegistro
            FROM dbo.AgendaTecnicos A
            INNER JOIN dbo.Tecnicos T
                ON T.IdTecnico = A.IdTecnico
            LEFT JOIN dbo.Usuarios U
                ON U.IdUsuario = A.IdUsuarioRegistro
            WHERE A.IdTSS = @IdTSS
            ORDER BY
                A.FechaAgenda DESC,
                A.FechaActualizacion DESC,
                A.IdAgenda DESC;

            SELECT
                D.IdDisponibilidad,
                D.IdTecnico,
                CONVERT(
                    char(10),
                    D.FechaVigencia,
                    23
                ) AS FechaVigencia,
                D.DisponibleAM,
                D.DisponiblePM,
                D.NocturnoConfirmado,
                D.Motivo,
                D.Observaciones,
                D.FechaRegistro,
                D.IdUsuarioRegistro,
                U.NombreCompleto AS UsuarioRegistro
            FROM dbo.TSS TS
            OUTER APPLY
            (
                SELECT TOP (1)
                    DISP.IdDisponibilidad,
                    DISP.IdTecnico,
                    DISP.FechaVigencia,
                    DISP.DisponibleAM,
                    DISP.DisponiblePM,
                    DISP.NocturnoConfirmado,
                    DISP.Motivo,
                    DISP.Observaciones,
                    DISP.FechaRegistro,
                    DISP.IdUsuarioRegistro
                FROM dbo.DisponibilidadTecnicos DISP
                WHERE
                    DISP.IdTecnico = TS.IdTecnico
                    AND DISP.FechaVigencia <= TS.FechaAgenda
                ORDER BY
                    DISP.FechaVigencia DESC,
                    DISP.IdDisponibilidad DESC
            ) D
            LEFT JOIN dbo.Usuarios U
                ON U.IdUsuario = D.IdUsuarioRegistro
            WHERE TS.IdTSS = @IdTSS;
        `);
    const seguimientoTSS =
    await pool.request()
        .input(
            "IdTSS",
            sql.Int,
            idTSS
        )
        .query(`
            SELECT
                ST.IdSeguimientoTSS,
                ST.IdTSS,
                ST.Evento,
                ST.EstadoAnterior,
                ST.EstadoNuevo,
                ST.Comentario,
                ST.FechaEvento,
                ST.IdUsuario,

                U.NombreCompleto
                    AS UsuarioResponsable,

                R.Nombre
                    AS RolResponsable

            FROM dbo.SeguimientoTSS ST

            LEFT JOIN dbo.Usuarios U
                ON U.IdUsuario =
                    ST.IdUsuario

            LEFT JOIN dbo.Roles R
                ON R.IdRol =
                    U.IdRol

            WHERE
                ST.IdTSS =
                    @IdTSS

            ORDER BY
                ST.FechaEvento DESC,
                ST.IdSeguimientoTSS DESC;
        `);        
    const tss = resultado.recordsets?.[0]?.[0];

    if (!tss) {
        const error = new Error(
            "El TSS solicitado no existe."
        );
        error.statusCode = 404;
        throw error;
    }

    const evidencias = (
        resultado.recordsets?.[2] || []
    ).map((evidencia) => ({
        ...evidencia,
        NombreArchivo: soloNombreArchivo(
            evidencia.NombreArchivo
        )
    }));

    const documentos = (
        resultado.recordsets?.[3] || []
    ).map((documento) => ({
        ...documento,
        NombreArchivo: soloNombreArchivo(
            documento.NombreArchivo
        )
    
    }));

    return {
    tss,
    tiposEvidencia:
        resultado.recordsets?.[1] || [],
    evidencias,
    documentos,
    validacionesTCE:
        resultado.recordsets?.[4] || [],
    historialEstados:
        resultado.recordsets?.[5] || [],
    agenda:
        resultado.recordsets?.[6] || [],
    disponibilidad:
        resultado.recordsets?.[7]?.[0] || null,
    seguimientoTSS:
        seguimientoTSS.recordset || []
};
}
async function programarTSS(    
    idTSSRecibido,
    datos = {},
    idUsuarioRecibido,
    dependencias = {}
) {
    const idTSS = normalizarIdTSS(idTSSRecibido);

    const idTecnico = normalizarEntero(
        datos.idTecnico,
        {
            nombre: "idTecnico"
        }
    );

    const fechaAgenda = normalizarFecha(
        datos.fechaAgenda,
        "fechaAgenda"
    );

    const turno = normalizarOpcion(
        datos.turno,
        "turno",
        TURNOS_TSS
    );

    const idUsuario = normalizarEntero(
        idUsuarioRecibido,
        {
            nombre: "idUsuario"
        }
    );

    const observaciones = String(
        datos.observaciones || ""
    ).trim();

    if (!idTecnico) {
        throw crearErrorValidacion(
            "Debe seleccionar un tÃ©cnico."
        );
    }

    if (!fechaAgenda) {
        throw crearErrorValidacion(
            "Debe indicar la fecha de programaciÃ³n."
        );
    }

    if (!turno) {
        throw crearErrorValidacion(
            "Debe seleccionar un turno."
        );
    }

    if (!idUsuario) {
        const error = new Error(
            "No se pudo identificar al usuario responsable."
        );
        error.statusCode = 401;
        throw error;
    }

    if (observaciones.length > 500) {
        throw crearErrorValidacion(
            "Las observaciones no pueden superar 500 caracteres."
        );
    }

    const obtenerPool =
        dependencias.conectarDB ||
        conectarDB;

    const pool = await obtenerPool();

    const transaction = new sql.Transaction(
        pool
    );

    try {
        await transaction.begin(
            sql.ISOLATION_LEVEL.SERIALIZABLE
        );

        /*
         * 1. Validar TSS.
         */
        const resultadoTSS =
            await new sql.Request(transaction)
                .input(
                    "IdTSS",
                    sql.Int,
                    idTSS
                )
                .query(`
                    SELECT
                        TS.IdTSS,
                        TS.IdOrden,
                        TS.EstadoTSS,
                        TS.IdTecnico,
                        TS.FechaAgenda,
                        TS.Turno,
                        OT.CodigoOT
                    FROM dbo.TSS TS WITH (
                        UPDLOCK,
                        HOLDLOCK
                    )
                    INNER JOIN dbo.OrdenesTrabajo OT
                        ON OT.IdOrden = TS.IdOrden
                    WHERE TS.IdTSS = @IdTSS;
                `);

        const tss =
            resultadoTSS.recordset?.[0];

        if (!tss) {
            const error = new Error(
                "El TSS solicitado no existe."
            );
            error.statusCode = 404;
            throw error;
        }

        const estadosProgramables = new Set([
            "PENDIENTE_PROGRAMACION",
            "REPROGRAMAR"
        ]);

        if (
            !estadosProgramables.has(
                String(
                    tss.EstadoTSS || ""
                ).toUpperCase()
            )
        ) {
            const error = new Error(
                `El TSS se encuentra en estado ${tss.EstadoTSS} y no puede programarse desde este flujo.`
            );
            error.statusCode = 409;
            throw error;
        }

        /*
         * 2. Validar tÃ©cnico activo.
         */
        const resultadoTecnico =
            await new sql.Request(transaction)
                .input(
                    "IdTecnico",
                    sql.Int,
                    idTecnico
                )
                .query(`
                    SELECT
                        IdTecnico,
                        CodigoTecnico,
                        NombreCompleto,
                        Activo
                    FROM dbo.Tecnicos
                    WHERE IdTecnico = @IdTecnico;
                `);

        const tecnico =
            resultadoTecnico.recordset?.[0];

        if (!tecnico) {
            const error = new Error(
                "El tÃ©cnico seleccionado no existe."
            );
            error.statusCode = 404;
            throw error;
        }

        if (!tecnico.Activo) {
            const error = new Error(
                "El tÃ©cnico seleccionado no estÃ¡ activo."
            );
            error.statusCode = 409;
            throw error;
        }

        /*
         * 3. Consultar disponibilidad.
         *
         * AM y PM:
         * si existe una actualizaciÃ³n de disponibilidad
         * anterior o igual a la fecha, se respeta.
         * Si nunca se registrÃ³ disponibilidad, se
         * considera disponible por defecto.
         *
         * NOCTURNO:
         * requiere confirmaciÃ³n expresa para esa fecha.
         */
        const resultadoDisponibilidad =
            await new sql.Request(transaction)
                .input(
                    "IdTecnico",
                    sql.Int,
                    idTecnico
                )
                .input(
                    "FechaAgenda",
                    sql.Date,
                    fechaAgenda
                )
                .query(`
                    SELECT TOP (1)
                        IdDisponibilidad,
                        CONVERT(
                            char(10),
                            FechaVigencia,
                            23
                        ) AS FechaVigencia,
                        DisponibleAM,
                        DisponiblePM,
                        NocturnoConfirmado,
                        Motivo,
                        Observaciones
                    FROM dbo.DisponibilidadTecnicos
                    WHERE
                        IdTecnico = @IdTecnico
                        AND FechaVigencia <= @FechaAgenda
                    ORDER BY
                        FechaVigencia DESC,
                        IdDisponibilidad DESC;

                    SELECT TOP (1)
                        IdDisponibilidad,
                        DisponibleAM,
                        DisponiblePM,
                        NocturnoConfirmado,
                        Motivo,
                        Observaciones
                    FROM dbo.DisponibilidadTecnicos
                    WHERE
                        IdTecnico = @IdTecnico
                        AND FechaVigencia = @FechaAgenda
                    ORDER BY
                        IdDisponibilidad DESC;
                `);

        const disponibilidadVigente =
            resultadoDisponibilidad
                .recordsets?.[0]?.[0] ||
            null;

        const disponibilidadFecha =
            resultadoDisponibilidad
                .recordsets?.[1]?.[0] ||
            null;

        if (
            turno === "AM" &&
            disponibilidadVigente &&
            !disponibilidadVigente.DisponibleAM
        ) {
            const error = new Error(
                "El tÃ©cnico no estÃ¡ disponible en turno AM para la fecha seleccionada."
            );
            error.statusCode = 409;
            throw error;
        }

        if (
            turno === "PM" &&
            disponibilidadVigente &&
            !disponibilidadVigente.DisponiblePM
        ) {
            const error = new Error(
                "El tÃ©cnico no estÃ¡ disponible en turno PM para la fecha seleccionada."
            );
            error.statusCode = 409;
            throw error;
        }

        if (
            turno === "NOCTURNO" &&
            (
                !disponibilidadFecha ||
                !disponibilidadFecha.NocturnoConfirmado
            )
        ) {
            const error = new Error(
                "El turno nocturno requiere disponibilidad confirmada expresamente para esa fecha."
            );
            error.statusCode = 409;
            throw error;
        }

        /*
         * 4. Verificar si el tÃ©cnico ya ocupa ese
         * turno con TSS o instalaciÃ³n.
         */
        const resultadoOcupacion =
            await new sql.Request(transaction)
                .input(
                    "IdTecnico",
                    sql.Int,
                    idTecnico
                )
                .input(
                    "FechaAgenda",
                    sql.Date,
                    fechaAgenda
                )
                .input(
                    "Turno",
                    sql.VarChar(15),
                    turno
                )
                .query(`
                    SELECT TOP (1)
                        A.IdAgenda,
                        A.TipoActividad,
                        A.IdTSS,
                        A.IdActividad,
                        A.EstadoAgenda
                    FROM dbo.AgendaTecnicos A
                        WITH (
                            UPDLOCK,
                            HOLDLOCK
                        )
                    WHERE
                        A.IdTecnico = @IdTecnico
                        AND A.FechaAgenda =
                            @FechaAgenda
                        AND A.Turno = @Turno
                        AND A.OcupaTurno = 1;
                `);

        const ocupacion =
            resultadoOcupacion.recordset?.[0];

        if (ocupacion) {
            const tipo =
                ocupacion.TipoActividad ===
                "INSTALACION"
                    ? "una instalaciÃ³n"
                    : "otro TSS";

            const error = new Error(
                `El tÃ©cnico ya tiene ${tipo} programado en ${turno} para la fecha seleccionada.`
            );
            error.statusCode = 409;
            throw error;
        }

        /*
         * 5. Comprobar que este TSS no tenga
         * otra agenda todavÃ­a activa.
         */
        const resultadoAgendaTSS =
            await new sql.Request(transaction)
                .input(
                    "IdTSS",
                    sql.Int,
                    idTSS
                )
                .query(`
                    SELECT TOP (1)
                        IdAgenda
                    FROM dbo.AgendaTecnicos
                        WITH (
                            UPDLOCK,
                            HOLDLOCK
                        )
                    WHERE
                        IdTSS = @IdTSS
                        AND OcupaTurno = 1;
                `);

        if (
            resultadoAgendaTSS
                .recordset?.length > 0
        ) {
            const error = new Error(
                "El TSS ya posee una programaciÃ³n activa."
            );
            error.statusCode = 409;
            throw error;
        }

        /*
         * 6. Registrar agenda.
         */
        const resultadoAgenda =
            await new sql.Request(transaction)
                .input(
                    "IdTecnico",
                    sql.Int,
                    idTecnico
                )
                .input(
                    "FechaAgenda",
                    sql.Date,
                    fechaAgenda
                )
                .input(
                    "Turno",
                    sql.VarChar(15),
                    turno
                )
                .input(
                    "IdTSS",
                    sql.Int,
                    idTSS
                )
                .input(
                    "Observaciones",
                    sql.VarChar(500),
                    observaciones || null
                )
                .input(
                    "IdUsuario",
                    sql.Int,
                    idUsuario
                )
                .query(`
                    INSERT INTO dbo.AgendaTecnicos
                    (
                        IdTecnico,
                        FechaAgenda,
                        Turno,
                        TipoActividad,
                        IdTSS,
                        IdActividad,
                        EstadoAgenda,
                        OcupaTurno,
                        Observaciones,
                        FechaRegistro,
                        FechaActualizacion,
                        IdUsuarioRegistro
                    )
                    OUTPUT INSERTED.IdAgenda
                    VALUES
                    (
                        @IdTecnico,
                        @FechaAgenda,
                        @Turno,
                        'TSS',
                        @IdTSS,
                        NULL,
                        'ACTIVA',
                        1,
                        @Observaciones,
                        GETDATE(),
                        GETDATE(),
                        @IdUsuario
                    );
                `);

        const idAgenda =
            resultadoAgenda.recordset?.[0]
                ?.IdAgenda;

        /*
         * 7. Actualizar la ficha TSS.
         */
        await new sql.Request(transaction)
            .input(
                "IdTSS",
                sql.Int,
                idTSS
            )
            .input(
                "IdTecnico",
                sql.Int,
                idTecnico
            )
            .input(
                "FechaAgenda",
                sql.Date,
                fechaAgenda
            )
            .input(
                "Turno",
                sql.VarChar(15),
                turno
            )
            .input(
                "IdUsuario",
                sql.Int,
                idUsuario
            )
            .query(`
                UPDATE dbo.TSS
                SET
                    IdTecnico = @IdTecnico,
                    FechaAgenda = @FechaAgenda,
                    Turno = @Turno,
                    EstadoTSS = 'PROGRAMADO',
                    FechaActualizacion = GETDATE()
                WHERE IdTSS = @IdTSS;
            `);

        /*
         * 8. Registrar trazabilidad del cambio.
         */
        await new sql.Request(transaction)
            .input(
                "IdTSS",
                sql.Int,
                idTSS
            )
            .input(
                "EstadoAnterior",
                sql.VarChar(30),
                tss.EstadoTSS
            )
            .input(
                "EstadoNuevo",
                sql.VarChar(30),
                "PROGRAMADO"
            )
            .input(
                "Motivo",
                sql.VarChar(250),
                "ProgramaciÃ³n tÃ©cnica del TSS"
            )
            .input(
                "Observacion",
                sql.VarChar(500),
                observaciones || null
            )
            .input(
                "IdUsuario",
                sql.Int,
                idUsuario
            )
            .query(`
                INSERT INTO dbo.HistorialEstadosTSS
                (
                    IdTSS,
                    EstadoAnterior,
                    EstadoNuevo,
                    Motivo,
                    Observacion,
                    FechaEvento,
                    IdUsuario
                )
                VALUES
                (
                    @IdTSS,
                    @EstadoAnterior,
                    @EstadoNuevo,
                    @Motivo,
                    @Observacion,
                    GETDATE(),
                    @IdUsuario
                );
            `);

        await transaction.commit();

        return {
            idTSS,
            idAgenda,
            codigoOT: tss.CodigoOT,
            estadoAnterior: tss.EstadoTSS,
            estadoTSS: "PROGRAMADO",
            tecnico: {
                idTecnico: tecnico.IdTecnico,
                codigoTecnico:
                    tecnico.CodigoTecnico,
                nombre:
                    tecnico.NombreCompleto
            },
            fechaAgenda,
            turno
        };
    } catch (error) {
        try {
            if (
                transaction._aborted !== true
            ) {
                await transaction.rollback();
            }
        } catch (errorRollback) {
            console.error(
                "Error al revertir programaciÃ³n TSS:",
                errorRollback.message
            );
        }

        /*
         * Respaldo ante colisiÃ³n de Ã­ndices UNIQUE
         * de AgendaTecnicos.
         */
        if (
            error.number === 2601 ||
            error.number === 2627
        ) {
            const conflicto = new Error(
                "No se pudo completar la programaciÃ³n porque el tÃ©cnico o el TSS ya tiene un turno ocupado."
            );

            conflicto.statusCode = 409;

            throw conflicto;
        }

        throw error;
    }
}
async function cambiarEstadoTSS(
    idTSSRecibido,
    datos = {},
    idUsuarioRecibido,
    dependencias = {}
) {
    const idTSS = normalizarIdTSS(
        idTSSRecibido
    );

    const estadoNuevo = normalizarOpcion(
        datos.estadoNuevo,
        "estadoNuevo",
        ESTADOS_TSS
    );

    const idUsuario = normalizarEntero(
        idUsuarioRecibido,
        {
            nombre: "idUsuario"
        }
    );

    const motivo = String(
        datos.motivo || ""
    ).trim();

    const observacion = String(
        datos.observacion || ""
    ).trim();

    if (!estadoNuevo) {
        throw crearErrorValidacion(
            "Debe indicar el nuevo estado TSS."
        );
    }

    if (!idUsuario) {
        const error = new Error(
            "No se pudo identificar al usuario responsable."
        );

        error.statusCode = 401;
        throw error;
    }

    if (motivo.length > 250) {
        throw crearErrorValidacion(
            "El motivo no puede superar 250 caracteres."
        );
    }

    if (observacion.length > 500) {
        throw crearErrorValidacion(
            "La observaciÃ³n no puede superar 500 caracteres."
        );
    }

    const transicionesPermitidas = {
        PROGRAMADO: [
            "EN_EJECUCION"
        ],

        EN_EJECUCION: [
            "FACTIBLE",
            "PDT_LPU",
            "NO_CONCLUIDO",
            "FALLIDO_CAMPO",
            "FALLIDO_ESCRITORIO",
            "REPROGRAMAR"
        ]
    };

    const obtenerPool =
        dependencias.conectarDB ||
        conectarDB;

    const pool = await obtenerPool();

    const transaction =
        new sql.Transaction(pool);

    try {
        await transaction.begin(
            sql.ISOLATION_LEVEL.SERIALIZABLE
        );

        const resultadoTSS =
            await new sql.Request(transaction)
                .input(
                    "IdTSS",
                    sql.Int,
                    idTSS
                )
                .query(`
                    SELECT
                        TS.IdTSS,
                        TS.IdOrden,
                        TS.EstadoTSS,
                        OT.CodigoOT
                    FROM dbo.TSS TS WITH (
                        UPDLOCK,
                        HOLDLOCK
                    )
                    INNER JOIN dbo.OrdenesTrabajo OT
                        ON OT.IdOrden = TS.IdOrden
                    WHERE TS.IdTSS = @IdTSS;
                `);

        const tss =
            resultadoTSS.recordset?.[0];

        if (!tss) {
            const error = new Error(
                "El TSS solicitado no existe."
            );

            error.statusCode = 404;
            throw error;
        }

        const estadoAnterior = String(
            tss.EstadoTSS || ""
        )
            .trim()
            .toUpperCase();

        if (
            estadoAnterior === estadoNuevo
        ) {
            const error = new Error(
                "El TSS ya se encuentra en el estado indicado."
            );

            error.statusCode = 409;
            throw error;
        }

        const permitidos =
            transicionesPermitidas[
                estadoAnterior
            ] || [];

        if (
            !permitidos.includes(
                estadoNuevo
            )
        ) {
            const error = new Error(
                `No se permite cambiar el TSS de ${estadoAnterior} a ${estadoNuevo}.`
            );

            error.statusCode = 409;
            throw error;
        }

        /*
         * Al iniciar ejecuciÃ³n, debe existir
         * una agenda activa.
         */
        if (
            estadoNuevo ===
            "EN_EJECUCION"
        ) {
            const resultadoAgenda =
                await new sql.Request(
                    transaction
                )
                    .input(
                        "IdTSS",
                        sql.Int,
                        idTSS
                    )
                    .query(`
                        SELECT TOP (1)
                            IdAgenda
                        FROM dbo.AgendaTecnicos
                        WHERE
                            IdTSS = @IdTSS
                            AND EstadoAgenda =
                                'ACTIVA'
                            AND OcupaTurno = 1;
                    `);

            if (
                !resultadoAgenda
                    .recordset?.length
            ) {
                const error =
                    new Error(
                        "El TSS no tiene una agenda tÃ©cnica activa."
                    );

                error.statusCode = 409;
                throw error;
            }
        }

        /*
         * Si termina en un resultado operativo,
         * marcamos la agenda como completada.
         */
        const estadosResultado = [
            "FACTIBLE",
            "PDT_LPU",
            "NO_CONCLUIDO",
            "FALLIDO_CAMPO",
            "FALLIDO_ESCRITORIO"
        ];

        if (
            estadosResultado.includes(
                estadoNuevo
            )
        ) {
            await new sql.Request(
                transaction
            )
                .input(
                    "IdTSS",
                    sql.Int,
                    idTSS
                )
                .query(`
                    UPDATE dbo.AgendaTecnicos
                    SET
                        EstadoAgenda =
                            'COMPLETADA',
                        FechaActualizacion =
                            GETDATE()
                    WHERE
                        IdTSS = @IdTSS
                        AND EstadoAgenda =
                            'ACTIVA';
                `);
        }

        /*
         * Si queda para reprogramar,
         * liberamos el turno.
         */
        if (
            estadoNuevo ===
            "REPROGRAMAR"
        ) {
            await new sql.Request(
                transaction
            )
                .input(
                    "IdTSS",
                    sql.Int,
                    idTSS
                )
                .query(`
                    UPDATE dbo.AgendaTecnicos
                    SET
                        EstadoAgenda =
                            'REPROGRAMADA',
                        OcupaTurno = 0,
                        FechaActualizacion =
                            GETDATE()
                    WHERE
                        IdTSS = @IdTSS
                        AND EstadoAgenda =
                            'ACTIVA';
                `);
        }

        await new sql.Request(transaction)
            .input(
                "IdTSS",
                sql.Int,
                idTSS
            )
            .input(
                "EstadoNuevo",
                sql.VarChar(30),
                estadoNuevo
            )
            .query(`
                UPDATE dbo.TSS
                SET
                    EstadoTSS =
                        @EstadoNuevo,
                    FechaActualizacion =
                        GETDATE()
                WHERE IdTSS = @IdTSS;
            `);

        await new sql.Request(transaction)
            .input(
                "IdTSS",
                sql.Int,
                idTSS
            )
            .input(
                "EstadoAnterior",
                sql.VarChar(30),
                estadoAnterior
            )
            .input(
                "EstadoNuevo",
                sql.VarChar(30),
                estadoNuevo
            )
            .input(
                "Motivo",
                sql.VarChar(250),
                motivo || null
            )
            .input(
                "Observacion",
                sql.VarChar(500),
                observacion || null
            )
            .input(
                "IdUsuario",
                sql.Int,
                idUsuario
            )
            .query(`
                INSERT INTO dbo.HistorialEstadosTSS
                (
                    IdTSS,
                    EstadoAnterior,
                    EstadoNuevo,
                    Motivo,
                    Observacion,
                    FechaEvento,
                    IdUsuario
                )
                VALUES
                (
                    @IdTSS,
                    @EstadoAnterior,
                    @EstadoNuevo,
                    @Motivo,
                    @Observacion,
                    GETDATE(),
                    @IdUsuario
                );
            `);

        await transaction.commit();

        return {
            idTSS,
            codigoOT: tss.CodigoOT,
            estadoAnterior,
            estadoTSS: estadoNuevo
        };
    } catch (error) {
        try {
            if (
                transaction._aborted !== true
            ) {
                await transaction.rollback();
            }
        } catch (errorRollback) {
            console.error(
                "Error al revertir cambio de estado TSS:",
                errorRollback.message
            );
        }

        throw error;
    }
}
const CONTINUIDADES_TSS = new Set([
    "INSTALACION_MOMENTO",
    "PENDIENTE_ENTEL",
    "POR_DEFINIR"
]);

async function actualizarContinuidadTSS(
    idTSSRecibido,
    datos = {},
    dependencias = {}
) {
    const idTSS =
        normalizarIdTSS(idTSSRecibido);

    const continuidad =
        normalizarOpcion(
            datos.continuidad,
            "continuidad",
            CONTINUIDADES_TSS
        );

    if (!continuidad) {
        throw crearErrorValidacion(
            "Debe seleccionar la continuidad de instalaciÃ³n."
        );
    }

    const idUsuario =
        Number(datos.idUsuario);

    if (
        !Number.isInteger(idUsuario) ||
        idUsuario <= 0
    ) {
        const error = new Error(
            "El usuario responsable no es vÃ¡lido."
        );

        error.statusCode = 400;

        throw error;
    }

    const obtenerPool =
        dependencias.conectarDB ||
        conectarDB;

    const pool =
        await obtenerPool();

    const transaction =
        new sql.Transaction(pool);

    await transaction.begin(
        sql.ISOLATION_LEVEL.SERIALIZABLE
    );

    try {
        const resultadoActual =
            await new sql.Request(
                transaction
            )
                .input(
                    "IdTSS",
                    sql.Int,
                    idTSS
                )
                .query(`
                    SELECT
                        TS.IdTSS,
                        TS.IdOrden,
                        TS.EstadoTSS,
                        TS.ContinuidadInstalacion,
                        OT.CodigoOT
                    FROM dbo.TSS TS
                        WITH (
                            UPDLOCK,
                            HOLDLOCK
                        )
                    INNER JOIN dbo.OrdenesTrabajo OT
                        ON OT.IdOrden =
                            TS.IdOrden
                    WHERE
                        TS.IdTSS =
                            @IdTSS;
                `);

        const tss =
            resultadoActual.recordset?.[0];

        if (!tss) {
            const error =
                new Error(
                    "El TSS solicitado no existe."
                );

            error.statusCode = 404;

            throw error;
        }

        if (
            String(
                tss.EstadoTSS || ""
            )
                .trim()
                .toUpperCase() !==
            "FACTIBLE"
        ) {
            const error =
                new Error(
                    "La continuidad de instalaciÃ³n solo puede registrarse para un TSS factible."
                );

            error.statusCode = 409;

            throw error;
        }

        const continuidadAnterior =
            tss.ContinuidadInstalacion ||
            null;

        if (
            continuidadAnterior ===
            continuidad
        ) {
            const error =
                new Error(
                    "El TSS ya tiene registrada esa continuidad."
                );

            error.statusCode = 409;

            throw error;
        }

        await new sql.Request(
            transaction
        )
            .input(
                "IdTSS",
                sql.Int,
                idTSS
            )
            .input(
                "Continuidad",
                sql.VarChar(30),
                continuidad
            )
            .query(`
                UPDATE dbo.TSS
                SET
                    ContinuidadInstalacion =
                        @Continuidad,
                    FechaActualizacion =
                        GETDATE()
                WHERE
                    IdTSS =
                        @IdTSS;
            `);

        await new sql.Request(
            transaction
        )
            .input(
                "IdTSS",
                sql.Int,
                idTSS
            )
            .input(
                "Evento",
                sql.VarChar(50),
                "CONTINUIDAD_ACTUALIZADA"
            )
            .input(
                "EstadoAnterior",
                sql.VarChar(50),
                continuidadAnterior
            )
            .input(
                "EstadoNuevo",
                sql.VarChar(50),
                continuidad
            )
            .input(
                "Comentario",
                sql.VarChar(500),
                (
                    `Continuidad TSS actualizada de ` +
                    `${continuidadAnterior || "SIN DEFINIR"} ` +
                    `a ${continuidad}.`
                ).slice(0, 500)
            )
            .input(
                "IdUsuario",
                sql.Int,
                idUsuario
            )
            .query(`
                INSERT INTO dbo.SeguimientoTSS
                (
                    IdTSS,
                    Evento,
                    EstadoAnterior,
                    EstadoNuevo,
                    Comentario,
                    FechaEvento,
                    IdUsuario
                )
                VALUES
                (
                    @IdTSS,
                    @Evento,
                    @EstadoAnterior,
                    @EstadoNuevo,
                    @Comentario,
                    GETDATE(),
                    @IdUsuario
                );
            `);

        await transaction.commit();

        return {
            idTSS,
            codigoOT:
                tss.CodigoOT,
            continuidadAnterior,
            continuidad
        };
    } catch (error) {
        try {
            await transaction.rollback();
        } catch {
            // La transacciÃ³n ya pudo haberse cerrado.
        }

        throw error;
    }
}
module.exports = {
    ESTADOS_TSS,
    TURNOS_TSS,
    PROYECTOS_TSS,
    escaparLike,
    normalizarConsultaTSS,
    normalizarIdTSS,
    soloNombreArchivo,
    listarTSS,
    obtenerTSSPorId,
    programarTSS,
    cambiarEstadoTSS,
    CONTINUIDADES_TSS,
    actualizarContinuidadTSS
};
