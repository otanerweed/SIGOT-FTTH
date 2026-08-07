const {
    conectarDB,
    sql
} = require("../config/database");

const {
    sincronizarOperacion
} = require("./operacionService");

// =====================================
// ESTADOS PERMITIDOS
// =====================================
const ESTADOS_PERMITIDOS = [
    "PENDIENTE",
    "INICIADA",
    "SUSPENDIDA",
    "NO_REALIZADO",
    "REPROGRAMADA",
    "FINALIZADA",
    "CANCELADA"
];

// =====================================
// CREAR ERROR DE NEGOCIO
// =====================================
function crearErrorNegocio(
    mensaje,
    statusCode = 400
) {
    const error = new Error(mensaje);

    error.statusCode = statusCode;

    return error;
}

// =====================================
// VALIDAR ID
// =====================================
function validarId(valor) {
    const id = Number(valor);

    return Number.isInteger(id) &&
        id > 0
        ? id
        : null;
}

// =====================================
// NORMALIZAR TEXTO
// =====================================
function normalizarTexto(valor) {
    return String(
        valor ?? ""
    )
        .trim()
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toUpperCase();
}

// =====================================
// NORMALIZAR ESTADO OT
// =====================================
function normalizarEstadoOT(valor) {
    const estado =
        normalizarTexto(valor);

    const equivalencias = {
        PENDIENTE:
            "PENDIENTE",

        INICIADO:
            "INICIADA",

        INICIADA:
            "INICIADA",

        SUSPENDIDO:
            "SUSPENDIDA",

        SUSPENDIDA:
            "SUSPENDIDA",

        "NO REALIZADO":
            "NO_REALIZADO",

        NO_REALIZADO:
            "NO_REALIZADO",

        REPROGRAMADO:
            "REPROGRAMADA",

        REPROGRAMADA:
            "REPROGRAMADA",

        FINALIZADO:
            "FINALIZADA",

        FINALIZADA:
            "FINALIZADA",

        CANCELADO:
            "CANCELADA",

        CANCELADA:
            "CANCELADA"
    };

    return equivalencias[estado] ||
        estado;
}

// =====================================
// VALIDAR MOTIVO
// =====================================
function validarMotivo(
    motivoRecibido
) {
    const motivo = String(
        motivoRecibido ?? ""
    ).trim();

    if (motivo.length < 5) {
        throw crearErrorNegocio(
            "El motivo debe contener al menos 5 caracteres."
        );
    }

    if (motivo.length > 500) {
        throw crearErrorNegocio(
            "El motivo no puede superar los 500 caracteres."
        );
    }

    return motivo;
}

// =====================================
// RESOLVER ESTADO DE ASIGNACIÓN
// =====================================
function resolverEstadoAsignacionOrden(
    estadoOT,
    tieneAsignacionActiva
) {
    if (
        estadoOT === "FINALIZADA"
    ) {
        return "FINALIZADA";
    }

    if (
        estadoOT === "CANCELADA"
    ) {
        return "CANCELADA";
    }

    if (
        estadoOT === "REPROGRAMADA"
    ) {
        return "PENDIENTE";
    }

    return tieneAsignacionActiva
        ? "ASIGNADA"
        : "PENDIENTE";
}

// =====================================
// CAMBIAR ESTADO MANUAL DE LA OT
// =====================================
async function cambiarEstadoOrden(
    idOrdenRecibido,
    estadoNuevoRecibido,
    motivoRecibido,
    idUsuarioRecibido
) {
    const idOrden =
        validarId(idOrdenRecibido);

    const idUsuario =
        validarId(idUsuarioRecibido);

    const estadoNuevo =
        normalizarEstadoOT(
            estadoNuevoRecibido
        );

    const motivo =
        validarMotivo(
            motivoRecibido
        );

    if (!idOrden) {
        throw crearErrorNegocio(
            "La orden seleccionada no es válida."
        );
    }

    if (!idUsuario) {
        throw crearErrorNegocio(
            "No se pudo identificar al usuario autenticado.",
            401
        );
    }

    if (
        !ESTADOS_PERMITIDOS.includes(
            estadoNuevo
        )
    ) {
        throw crearErrorNegocio(
            "El estado seleccionado no es válido."
        );
    }

    const pool =
        await conectarDB();

    const transaction =
        new sql.Transaction(
            pool
        );

    let transactionIniciada =
        false;

    try {
        await transaction.begin(
            sql.ISOLATION_LEVEL
                .SERIALIZABLE
        );

        transactionIniciada =
            true;

        // =====================================
        // OBTENER Y BLOQUEAR ORDEN
        // =====================================
        const resultadoOrden =
            await new sql.Request(
                transaction
            )
                .input(
                    "IdOrden",
                    sql.Int,
                    idOrden
                )
                .query(`
                    SELECT
                        OT.IdOrden,
                        OT.IdOperacion,
                        OT.CodigoOT,
                        OT.Cliente,
                        OT.EstadoOT,
                        OT.EstadoAsignacion,

                        actividad.IdActividad,

                        asignacion.IdAsignacion,
                        asignacion.IdTecnico,
                        asignacion.Estado
                            AS EstadoAsignacionTecnico

                    FROM dbo.OrdenesTrabajo OT
                        WITH (
                            UPDLOCK,
                            HOLDLOCK
                        )

                    OUTER APPLY
                    (
                        SELECT TOP (1)
                            ACT.IdActividad

                        FROM dbo.ActividadesOFSC ACT

                        WHERE
                            ACT.IdOrden =
                                OT.IdOrden

                        ORDER BY
                            COALESCE(
                                ACT.FechaActualizacion,
                                ACT.FechaImportacion
                            ) DESC,
                            ACT.IdActividad DESC
                    ) actividad

                    OUTER APPLY
                    (
                        SELECT TOP (1)
                            A.IdAsignacion,
                            A.IdTecnico,
                            A.Estado

                        FROM dbo.Asignaciones A
                            WITH (
                                UPDLOCK,
                                HOLDLOCK
                            )

                        WHERE
                            A.IdOrden =
                                OT.IdOrden

                            AND A.Estado =
                                'ACTIVA'

                        ORDER BY
                            A.FechaAsignacion DESC,
                            A.IdAsignacion DESC
                    ) asignacion

                    WHERE
                        OT.IdOrden =
                            @IdOrden;
                `);

        if (
            resultadoOrden
                .recordset
                .length === 0
        ) {
            throw crearErrorNegocio(
                "La orden de trabajo no existe.",
                404
            );
        }

        const orden =
            resultadoOrden
                .recordset[0];

        const estadoAnterior =
            normalizarEstadoOT(
                orden.EstadoOT
            );

        // =====================================
        // VALIDACIONES
        // =====================================
        if (
            estadoAnterior ===
            estadoNuevo
        ) {
            throw crearErrorNegocio(
                (
                    `La OT ya se encuentra ` +
                    `en estado ${estadoNuevo}.`
                ),
                409
            );
        }

        /*
         * FINALIZADA y CANCELADA son
         * estados definitivos.
         */
        if (
            estadoAnterior ===
                "FINALIZADA" ||
            estadoAnterior ===
                "CANCELADA"
        ) {
            throw crearErrorNegocio(
                (
                    `La OT se encuentra en estado ` +
                    `${estadoAnterior} y ya no puede ` +
                    `modificarse manualmente.`
                ),
                409
            );
        }

        const tieneAsignacionActiva =
            Boolean(
                orden.IdAsignacion
            );

        const estadoAsignacionNuevo =
            resolverEstadoAsignacionOrden(
                estadoNuevo,
                tieneAsignacionActiva
            );

        // =====================================
        // ACTUALIZAR ASIGNACIÓN ACTIVA
        // =====================================
        if (
            orden.IdAsignacion &&
            (
                estadoNuevo ===
                    "REPROGRAMADA" ||
                estadoNuevo ===
                    "FINALIZADA" ||
                estadoNuevo ===
                    "CANCELADA"
            )
        ) {
            const nuevoEstadoAsignacion =
                estadoNuevo ===
                    "FINALIZADA"
                    ? "FINALIZADA"
                    : "CANCELADA";

            const textoObservacion =
                estadoNuevo ===
                    "FINALIZADA"
                    ? (
                        `Asignación finalizada por ` +
                        `cambio manual de estado. ` +
                        `Motivo: ${motivo}`
                    )
                    : (
                        `Asignación cancelada por ` +
                        `cambio manual de estado a ` +
                        `${estadoNuevo}. ` +
                        `Motivo: ${motivo}`
                    );

            await new sql.Request(
                transaction
            )
                .input(
                    "IdAsignacion",
                    sql.Int,
                    orden.IdAsignacion
                )
                .input(
                    "NuevoEstado",
                    sql.VarChar(20),
                    nuevoEstadoAsignacion
                )
                .input(
                    "Observacion",
                    sql.VarChar(500),
                    textoObservacion
                )
                .query(`
                    UPDATE dbo.Asignaciones
                    SET
                        Estado =
                            @NuevoEstado,

                        Observaciones =
                            LEFT(
                                CONCAT(
                                    ISNULL(
                                        Observaciones,
                                        ''
                                    ),

                                    CASE
                                        WHEN
                                            Observaciones IS NULL
                                            OR LTRIM(
                                                RTRIM(
                                                    Observaciones
                                                )
                                            ) = ''
                                        THEN ''

                                        ELSE ' | '
                                    END,

                                    @Observacion
                                ),
                                500
                            )

                    WHERE
                        IdAsignacion =
                            @IdAsignacion

                        AND Estado =
                            'ACTIVA';
                `);
        }

        // =====================================
        // ACTUALIZAR ORDEN
        // =====================================
        await new sql.Request(
            transaction
        )
            .input(
                "IdOrden",
                sql.Int,
                idOrden
            )
            .input(
                "EstadoOT",
                sql.VarChar(30),
                estadoNuevo
            )
            .input(
                "EstadoAsignacion",
                sql.VarChar(30),
                estadoAsignacionNuevo
            )
            .query(`
                UPDATE dbo.OrdenesTrabajo
                SET
                    EstadoOT =
                        @EstadoOT,

                    EstadoAsignacion =
                        @EstadoAsignacion,

                    FechaActualizacion =
                        GETDATE()

                WHERE
                    IdOrden =
                        @IdOrden;
            `);

        // =====================================
        // REGISTRAR HISTORIAL
        // =====================================
        await new sql.Request(
            transaction
        )
            .input(
                "IdOrden",
                sql.Int,
                idOrden
            )
            .input(
                "IdActividad",
                sql.Int,
                orden.IdActividad || null
            )
            .input(
                "IdOperacion",
                sql.Int,
                orden.IdOperacion
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
                "Evento",
                sql.VarChar(50),
                "CAMBIO_ESTADO_MANUAL"
            )
            .input(
                "Motivo",
                sql.VarChar(500),
                motivo
            )
            .input(
                "Fuente",
                sql.VarChar(20),
                "SIGOT"
            )
            .input(
                "IdUsuario",
                sql.Int,
                idUsuario
            )
            .query(`
                INSERT INTO dbo.HistorialEstadosOT
                (
                    IdOrden,
                    IdActividad,
                    IdOperacion,
                    EstadoAnterior,
                    EstadoNuevo,
                    Evento,
                    Motivo,
                    Fuente,
                    FechaEvento,
                    IdUsuario
                )
                VALUES
                (
                    @IdOrden,
                    @IdActividad,
                    @IdOperacion,
                    @EstadoAnterior,
                    @EstadoNuevo,
                    @Evento,
                    @Motivo,
                    @Fuente,
                    SYSDATETIME(),
                    @IdUsuario
                );
            `);

        // =====================================
        // SINCRONIZAR OPERACIÓN
        // =====================================
        await sincronizarOperacion(
            transaction,
            orden.IdOperacion
        );

        await transaction.commit();

        transactionIniciada =
            false;

        console.log(
            (
                `OT ${orden.CodigoOT}: ` +
                `${estadoAnterior} -> ` +
                `${estadoNuevo} ` +
                `por usuario ${idUsuario}.`
            )
        );

        return {
            idOrden,

            codigoOT:
                orden.CodigoOT,

            cliente:
                orden.Cliente,

            estadoAnterior,

            estadoNuevo,

            estadoAsignacion:
                estadoAsignacionNuevo,

            motivo
        };
    } catch (error) {
        if (transactionIniciada) {
            try {
                await transaction.rollback();
            } catch (
                rollbackError
            ) {
                console.error(
                    "Error al revertir cambio de estado:",
                    rollbackError.message
                );
            }
        }

        throw error;
    }
}

// =====================================
// EXPORTAR
// =====================================
module.exports = {
    cambiarEstadoOrden
};