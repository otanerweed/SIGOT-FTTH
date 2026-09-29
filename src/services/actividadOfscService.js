const { sql } = require("../config/database");

/**
 * Limpia valores de texto.
 */
function limpiarTexto(valor) {
    if (valor === undefined || valor === null) {
        return null;
    }

    const texto = String(valor).trim();

    return texto === "" ? null : texto;
}

/**
 * Normaliza texto para realizar comparaciones.
 */
function textoComparable(valor) {
    return limpiarTexto(valor);
}

/**
 * Convierte una fecha a YYYY-MM-DD.
 */
function fechaComparable(valor) {
    if (!valor) {
        return null;
    }

    if (valor instanceof Date) {
        if (Number.isNaN(valor.getTime())) {
            return null;
        }

        const anio = valor.getFullYear();

        const mes = String(
            valor.getMonth() + 1
        ).padStart(2, "0");

        const dia = String(
            valor.getDate()
        ).padStart(2, "0");

        return `${anio}-${mes}-${dia}`;
    }

    const texto = String(valor).trim();

    const formatoISO = texto.match(
        /^(\d{4})-(\d{2})-(\d{2})/
    );

    return formatoISO
        ? `${formatoISO[1]}-${formatoISO[2]}-${formatoISO[3]}`
        : null;
}

/**
 * Convierte una hora a HH:mm:ss.
 */
function horaComparable(valor) {
    if (!valor) {
        return null;
    }

    if (valor instanceof Date) {
        if (Number.isNaN(valor.getTime())) {
            return null;
        }

        const horas = String(
            valor.getUTCHours()
        ).padStart(2, "0");

        const minutos = String(
            valor.getUTCMinutes()
        ).padStart(2, "0");

        const segundos = String(
            valor.getUTCSeconds()
        ).padStart(2, "0");

        return `${horas}:${minutos}:${segundos}`;
    }

    const texto = String(valor).trim();

    const formatoHora = texto.match(
        /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/
    );

    if (!formatoHora) {
        return null;
    }

    const horas = Number(formatoHora[1]);
    const minutos = Number(formatoHora[2]);
    const segundos = Number(
        formatoHora[3] || 0
    );

    if (
        horas < 0 ||
        horas > 23 ||
        minutos < 0 ||
        minutos > 59 ||
        segundos < 0 ||
        segundos > 59
    ) {
        return null;
    }

    return [
        horas,
        minutos,
        segundos
    ]
        .map((numero) =>
            String(numero).padStart(2, "0")
        )
        .join(":");
}

/**
 * Convierte valores booleanos para compararlos.
 */
function booleanoComparable(valor) {
    if (valor === null || valor === undefined) {
        return null;
    }

    if (typeof valor === "boolean") {
        return valor;
    }

    if (typeof valor === "number") {
        return valor !== 0;
    }

    const texto = String(valor)
        .trim()
        .toUpperCase();

    if (
        ["1", "TRUE", "SI", "SÍ"].includes(texto)
    ) {
        return true;
    }

    if (
        ["0", "FALSE", "NO"].includes(texto)
    ) {
        return false;
    }

    return null;
}

/**
 * Determina el resultado final de una actividad
 * cuyo estado en OFSC es NO REALIZADO.
 *
 * Existen dos resultados:
 * - REPROGRAMADA.
 * - CIERRE_AUTOMATICO.
 */
function resolverResultadoNoRealizado(actividad) {
    if (
        actividad.estadoActividad !==
        "NO_REALIZADO"
    ) {
        return null;
    }

    if (
        actividad.tipoCierre ===
        "REPROGRAMADO"
    ) {
        return "REPROGRAMADA";
    }

    if (
        actividad.tipoCierre ===
        "CIERRE_AUTOMATICO"
    ) {
        return "CIERRE_AUTOMATICO";
    }

    /*
     * La actividad está NO REALIZADO,
     * pero todavía no se reconoce su resultado.
     */
    return null;
}

/**
 * Calcula el estado general de la OT a partir
 * del estado de la actividad OFSC.
 *
 * Reglas principales:
 *
 * CANCELADA:
 * - Siempre termina definitivamente la OT.
 *
 * NO_REALIZADO + REPROGRAMADO:
 * - La OT continuará en otra programación.
 *
 * NO_REALIZADO + CIERRE_AUTOMATICO:
 * - La OT queda cancelada definitivamente.
 */
function resolverEstadoOrdenDesdeActividad(
    actividad
) {
    const estado =
        actividad.estadoActividad;

    const tipoCierre =
        actividad.tipoCierre;

    /*
     * Entel puede cancelar directamente
     * una actividad sin que el técnico
     * tenga que iniciarla.
     */
    if (estado === "CANCELADA") {
        return "CANCELADA";
    }

    if (estado === "FINALIZADA") {
        return "FINALIZADA";
    }

    if (estado === "NO_REALIZADO") {
        if (tipoCierre === "REPROGRAMADO") {
            return "REPROGRAMADA";
        }

        if (
            tipoCierre ===
            "CIERRE_AUTOMATICO"
        ) {
            return "CANCELADA";
        }

        /*
         * Todavía falta determinar si será
         * reprogramada o tendrá cierre automático.
         */
        return "NO_REALIZADO";
    }

    if (estado === "INICIADA") {
        return "INICIADA";
    }

    if (estado === "SUSPENDIDA") {
        return "SUSPENDIDA";
    }

    return "PENDIENTE";
}

/**
 * Define el evento que se registrará
 * posteriormente en HistorialEstadosOT.
 */
function resolverEventoActividad(actividad) {
    const estado =
        actividad.estadoActividad;

    const tipoCierre =
        actividad.tipoCierre;

    /*
     * CANCELADA tiene prioridad.
     * No se interpreta como reprogramación.
     */
    if (estado === "CANCELADA") {
        return "CANCELACION_ENTEL";
    }

    if (estado === "FINALIZADA") {
        return "FINALIZACION";
    }

    if (estado === "NO_REALIZADO") {
        if (tipoCierre === "REPROGRAMADO") {
            return "REPROGRAMACION";
        }

        if (
            tipoCierre ===
            "CIERRE_AUTOMATICO"
        ) {
            return "CIERRE_AUTOMATICO";
        }

        return "NO_REALIZADO";
    }

    if (estado === "INICIADA") {
        return "INICIO";
    }

    if (estado === "SUSPENDIDA") {
        return "SUSPENSION";
    }

    if (estado === "PENDIENTE") {
        return "ACTIVIDAD_PENDIENTE";
    }

    return "ACTUALIZACION_OFSC";
}

/**
 * Obtiene los cambios reales de una actividad
 * usando los mismos valores normalizados que
 * posteriormente se guardan en la base de datos.
 */
function obtenerCambiosActividad(
    existente,
    actividad,
    resultadoNoRealizado,
    idActividadOFSC
) {
    const prefijoCampo =
        `ActividadOFSC[${idActividadOFSC}].`;

    const candidatosCambio = [
        {
            campo: "IdActividadOFSC",
            valorAnterior:
                textoComparable(
                    existente
                        ?.IdActividadOFSC
                ),
            valorNuevo:
                textoComparable(
                    idActividadOFSC
                )
        },
        {
            campo: "EstadoActividad",
            valorAnterior:
                textoComparable(
                    existente
                        ?.EstadoActividad
                ),
            valorNuevo:
                textoComparable(
                    actividad
                        .estadoActividad
                )
        },
        {
            campo: "FechaActividad",
            valorAnterior:
                fechaComparable(
                    existente
                        ?.FechaActividadISO
                ),
            valorNuevo:
                fechaComparable(
                    actividad
                        .fechaActividad
                )
        },
        {
            campo: "HoraInicio",
            valorAnterior:
                horaComparable(
                    existente
                        ?.HoraInicioTexto
                ),
            valorNuevo:
                horaComparable(
                    actividad
                        .horaInicio
                )
        },
        {
            campo: "HoraFin",
            valorAnterior:
                horaComparable(
                    existente
                        ?.HoraFinTexto
                ),
            valorNuevo:
                horaComparable(
                    actividad
                        .horaFin
                )
        },
        {
            campo: "FlagReagenda",
            valorAnterior:
                booleanoComparable(
                    existente
                        ?.FlagReagenda
                ),
            valorNuevo:
                booleanoComparable(
                    actividad
                        .flagReagenda
                )
        },
        {
            campo: "RazonReagenda",
            valorAnterior:
                textoComparable(
                    existente
                        ?.RazonReagenda
                ),
            valorNuevo:
                textoComparable(
                    actividad
                        .razonReagenda
                )
        },
        {
            campo:
                "ResultadoNoRealizado",
            valorAnterior:
                textoComparable(
                    existente
                        ?.ResultadoNoRealizado
                ),
            valorNuevo:
                textoComparable(
                    resultadoNoRealizado
                )
        },
        {
            campo: "Motivo",
            valorAnterior:
                textoComparable(
                    existente?.Motivo
                ),
            valorNuevo:
                textoComparable(
                    actividad.motivo
                )
        },
        {
            campo:
                "MotivoCancelacion",
            valorAnterior:
                textoComparable(
                    existente
                        ?.MotivoCancelacion
                ),
            valorNuevo:
                textoComparable(
                    actividad
                        .motivoCancelacion
                )
        },
        {
            campo: "TipoCierre",
            valorAnterior:
                textoComparable(
                    existente
                        ?.TipoCierre
                ),
            valorNuevo:
                textoComparable(
                    actividad
                        .tipoCierre
                )
        },
        {
            campo: "ResultadoGlobal",
            valorAnterior:
                textoComparable(
                    existente
                        ?.ResultadoGlobal
                ),
            valorNuevo:
                textoComparable(
                    actividad
                        .resultadoGlobal
                )
        },
        {
            campo:
                "ResponsableSuspension",
            valorAnterior:
                textoComparable(
                    existente
                        ?.ResponsableSuspension
                ),
            valorNuevo:
                textoComparable(
                    actividad
                        .responsableSuspension
                )
        },
        {
            campo: "TipoSuspension",
            valorAnterior:
                textoComparable(
                    existente
                        ?.TipoSuspension
                ),
            valorNuevo:
                textoComparable(
                    actividad
                        .tipoSuspension
                )
        },
        {
            campo: "Recurso",
            valorAnterior:
                textoComparable(
                    existente
                        ?.Recurso
                ),
            valorNuevo:
                textoComparable(
                    actividad
                        .recurso
                )
        }
        
    ];

    return candidatosCambio
        .filter(
            (cambio) =>
                cambio.valorAnterior !==
                cambio.valorNuevo
        )
        .map((cambio) => ({
            campo:
                prefijoCampo +
                cambio.campo,
            valorAnterior:
                cambio.valorAnterior,
            valorNuevo:
                cambio.valorNuevo
        }));
}

/**
 * Inserta o actualiza una actividad OFSC.
 */
async function guardarActividadOFSC(
    transaction,
    actividad,
    idOrden,
    idOperacion
) {
    if (!transaction) {
        throw new Error(
            "Se necesita una transacción para guardar la actividad OFSC."
        );
    }

    const idActividadOFSC = limpiarTexto(
        actividad.idActividadOFSC
    );

    if (!idActividadOFSC) {
        throw new Error(
            "La actividad no contiene ID de OFSC."
        );
    }

    if (
        !Number.isInteger(idOrden) ||
        idOrden <= 0
    ) {
        throw new Error(
            "El IdOrden de la actividad no es válido."
        );
    }

    if (
        !Number.isInteger(idOperacion) ||
        idOperacion <= 0
    ) {
        throw new Error(
            "El IdOperacion de la actividad no es válido."
        );
    }

    const resultadoNoRealizado =
        resolverResultadoNoRealizado(
            actividad
        );

    const resultadoExistente =
        await new sql.Request(transaction)

            .input(
                "IdActividadOFSC",
                sql.VarChar(50),
                idActividadOFSC
            )

            .query(`
                SELECT
                    IdActividad,
                    IdActividadOFSC,
                    IdOrden,
                    IdOperacion,
                    EstadoActividad,

                    CONVERT(
                        varchar(10),
                        FechaActividad,
                        23
                    ) AS FechaActividadISO,

                    CONVERT(
                        varchar(8),
                        HoraInicio,
                        108
                    ) AS HoraInicioTexto,

                    CONVERT(
                        varchar(8),
                        HoraFin,
                        108
                    ) AS HoraFinTexto,

                    FlagReagenda,
                    RazonReagenda,
                    ResultadoNoRealizado,
                    Motivo,
                    MotivoCancelacion,
                    TipoCierre,
                    ResultadoGlobal,
                    ResponsableSuspension,
                    TipoSuspension,
                    Recurso

                FROM dbo.ActividadesOFSC

                WHERE IdActividadOFSC =
                    @IdActividadOFSC;
            `);

    const actividadExistente =
        resultadoExistente.recordset[0];

    /*
     * Un ID de actividad de OFSC no debe
     * cambiar de una OT a otra.
     */
    if (
        actividadExistente &&
        Number(actividadExistente.IdOrden) !==
            Number(idOrden)
    ) {
        throw new Error(
            `La actividad OFSC ${idActividadOFSC} ya está vinculada ` +
            `a otra orden de trabajo.`
        );
    }

    const cambiosActividad =
        obtenerCambiosActividad(
            actividadExistente,
            actividad,
            resultadoNoRealizado,
            idActividadOFSC
        );

    /*
     * Insertar actividad nueva.
     */
    if (!actividadExistente) {
        const resultadoInsercion =
            await new sql.Request(transaction)

                .input(
                    "IdActividadOFSC",
                    sql.VarChar(50),
                    idActividadOFSC
                )

                .input(
                    "IdOrden",
                    sql.Int,
                    idOrden
                )

                .input(
                    "IdOperacion",
                    sql.Int,
                    idOperacion
                )

                .input(
                    "EstadoActividad",
                    sql.VarChar(30),
                    actividad.estadoActividad
                )

                .input(
                    "FechaActividad",
                    sql.Date,
                    actividad.fechaActividad
                )

                .input(
                    "HoraInicio",
                    sql.VarChar(8),
                    horaComparable(
                        actividad.horaInicio
                    )
                )

                .input(
                    "HoraFin",
                    sql.VarChar(8),
                    horaComparable(
                        actividad.horaFin
                    )
                )

                .input(
                    "FlagReagenda",
                    sql.Bit,
                    actividad.flagReagenda
                )

                .input(
                    "RazonReagenda",
                    sql.VarChar(250),
                    limpiarTexto(
                        actividad.razonReagenda
                    )
                )

                .input(
                    "ResultadoNoRealizado",
                    sql.VarChar(30),
                    resultadoNoRealizado
                )

                .input(
                    "Motivo",
                    sql.VarChar(500),
                    limpiarTexto(
                        actividad.motivo
                    )
                )

                .input(
                    "MotivoCancelacion",
                    sql.VarChar(500),
                    limpiarTexto(
                        actividad.motivoCancelacion
                    )
                )

                .input(
                    "TipoCierre",
                    sql.VarChar(100),
                    limpiarTexto(
                        actividad.tipoCierre
                    )
                )

                .input(
                    "ResultadoGlobal",
                    sql.VarChar(100),
                    limpiarTexto(
                        actividad.resultadoGlobal
                    )
                )

                .input(
                    "ResponsableSuspension",
                    sql.VarChar(150),
                    limpiarTexto(
                        actividad.responsableSuspension
                    )
                )

                .input(
                    "TipoSuspension",
                    sql.VarChar(100),
                    limpiarTexto(
                        actividad.tipoSuspension
                    )
                )

                .input(
                    "Recurso",
                    sql.VarChar(150),
                    limpiarTexto(
                        actividad.recurso
                    )
                )

                .query(`
                    INSERT INTO dbo.ActividadesOFSC
                    (
                        IdActividadOFSC,
                        IdOrden,
                        IdOperacion,
                        EstadoActividad,
                        FechaActividad,
                        HoraInicio,
                        HoraFin,
                        FlagReagenda,
                        RazonReagenda,
                        ResultadoNoRealizado,
                        Motivo,
                        MotivoCancelacion,
                        TipoCierre,
                        ResultadoGlobal,
                        ResponsableSuspension,
                        TipoSuspension,
                        Recurso
                    )
                    OUTPUT INSERTED.IdActividad
                    VALUES
                    (
                        @IdActividadOFSC,
                        @IdOrden,
                        @IdOperacion,
                        @EstadoActividad,
                        @FechaActividad,

                        TRY_CONVERT(
                            time(0),
                            @HoraInicio
                        ),

                        TRY_CONVERT(
                            time(0),
                            @HoraFin
                        ),

                        @FlagReagenda,
                        @RazonReagenda,
                        @ResultadoNoRealizado,
                        @Motivo,
                        @MotivoCancelacion,
                        @TipoCierre,
                        @ResultadoGlobal,
                        @ResponsableSuspension,
                        @TipoSuspension,
                        @Recurso
                    );
                `);

        return {
            idActividad:
                resultadoInsercion.recordset[0]
                    .IdActividad,

            insertada: true,
            actualizada: false,
            sinCambios: false,
            cambios:
                cambiosActividad,

            estadoOT:
                resolverEstadoOrdenDesdeActividad(
                    actividad
                ),

            evento:
                resolverEventoActividad(
                    actividad
                ),

            resultadoNoRealizado
        };
    }

    const hayCambios =
        cambiosActividad.length > 0;

    /*
     * La actividad ya existe y no cambió.
     */
    if (!hayCambios) {
        return {
            idActividad:
                actividadExistente.IdActividad,

            insertada: false,
            actualizada: false,
            sinCambios: true,
            cambios: [],

            estadoOT:
                resolverEstadoOrdenDesdeActividad(
                    actividad
                ),

            evento:
                resolverEventoActividad(
                    actividad
                ),

            resultadoNoRealizado
        };
    }

    /*
     * Actualizar actividad existente.
     */
    await new sql.Request(transaction)

        .input(
            "IdActividad",
            sql.Int,
            actividadExistente.IdActividad
        )

        .input(
            "IdOperacion",
            sql.Int,
            idOperacion
        )

        .input(
            "EstadoActividad",
            sql.VarChar(30),
            actividad.estadoActividad
        )

        .input(
            "FechaActividad",
            sql.Date,
            actividad.fechaActividad
        )

        .input(
            "HoraInicio",
            sql.VarChar(8),
            horaComparable(
                actividad.horaInicio
            )
        )

        .input(
            "HoraFin",
            sql.VarChar(8),
            horaComparable(
                actividad.horaFin
            )
        )

        .input(
            "FlagReagenda",
            sql.Bit,
            actividad.flagReagenda
        )

        .input(
            "RazonReagenda",
            sql.VarChar(250),
            limpiarTexto(
                actividad.razonReagenda
            )
        )

        .input(
            "ResultadoNoRealizado",
            sql.VarChar(30),
            resultadoNoRealizado
        )

        .input(
            "Motivo",
            sql.VarChar(500),
            limpiarTexto(
                actividad.motivo
            )
        )

        .input(
            "MotivoCancelacion",
            sql.VarChar(500),
            limpiarTexto(
                actividad.motivoCancelacion
            )
        )

        .input(
            "TipoCierre",
            sql.VarChar(100),
            limpiarTexto(
                actividad.tipoCierre
            )
        )

        .input(
            "ResultadoGlobal",
            sql.VarChar(100),
            limpiarTexto(
                actividad.resultadoGlobal
            )
        )

        .input(
            "ResponsableSuspension",
            sql.VarChar(150),
            limpiarTexto(
                actividad.responsableSuspension
            )
        )

        .input(
            "TipoSuspension",
            sql.VarChar(100),
            limpiarTexto(
                actividad.tipoSuspension
            )
        )


        .input(
            "Recurso",
            sql.VarChar(150),
            limpiarTexto(
                actividad.recurso
            )
        )
        .query(`
            UPDATE dbo.ActividadesOFSC
            SET
                IdOperacion =
                    @IdOperacion,

                EstadoActividad =
                    @EstadoActividad,

                FechaActividad =
                    @FechaActividad,

                HoraInicio =
                    TRY_CONVERT(
                        time(0),
                        @HoraInicio
                    ),

                HoraFin =
                    TRY_CONVERT(
                        time(0),
                        @HoraFin
                    ),

                FlagReagenda =
                    @FlagReagenda,

                RazonReagenda =
                    @RazonReagenda,

                ResultadoNoRealizado =
                    @ResultadoNoRealizado,

                Motivo =
                    @Motivo,

                MotivoCancelacion =
                    @MotivoCancelacion,

                TipoCierre =
                    @TipoCierre,

                ResultadoGlobal =
                    @ResultadoGlobal,

                ResponsableSuspension =
                    @ResponsableSuspension,

                TipoSuspension =
                    @TipoSuspension,
                
                Recurso =
                @Recurso,

                FechaActualizacion =
                    SYSDATETIME()

            WHERE IdActividad =
                @IdActividad;
        `);

    return {
        idActividad:
            actividadExistente.IdActividad,

        insertada: false,
        actualizada: true,
        sinCambios: false,
        cambios:
            cambiosActividad,

        estadoOT:
            resolverEstadoOrdenDesdeActividad(
                actividad
            ),

        evento:
            resolverEventoActividad(
                actividad
            ),

        resultadoNoRealizado
    };
}

module.exports = {
    guardarActividadOFSC,
    obtenerCambiosActividad,
    resolverEstadoOrdenDesdeActividad,
    resolverEventoActividad,
    resolverResultadoNoRealizado
};
