const {
    conectarDB
} = require("../config/database");

const {
    cambiarEstadoOrden
} = require(
    "../services/estadoOrdenService"
);

// =====================================
// OBTENER USUARIO DEL JWT
// =====================================
function obtenerIdUsuarioAutenticado(
    req
) {
    const idUsuario = Number(
        req.usuario?.idUsuario
    );

    return (
        Number.isInteger(
            idUsuario
        ) &&
        idUsuario > 0
    )
        ? idUsuario
        : null;
}

// =====================================
// LISTAR ÓRDENES
// =====================================
async function listarOrdenes(
    req,
    res
) {
    try {
        console.log(
            "========== LISTAR ÓRDENES =========="
        );

        const pool =
            await conectarDB();

        const resultado =
            await pool.request().query(`
                SELECT
                    OT.IdOrden,
                    OT.IdOperacion,
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
                    OT.PuertoNAP,
                    OT.RFS,
                    OT.FechaAgenda,
                    OT.Horario,
                    OT.EstadoOT,
                    OT.EstadoAsignacion,
                    OT.FechaImportacion,
                    OT.FechaActualizacion,

                    O.FechaOperacion,
                    O.NombreArchivo,

                    ACT.IdActividad,
                    ACT.IdActividadOFSC,
                    ACT.EstadoActividad,
                    ACT.FechaActividad,

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
                    ACT.TipoSuspension,

                    ACT.FechaImportacion
                        AS FechaImportacionActividad,

                    ACT.FechaActualizacion
                        AS FechaActualizacionActividad,

                    A.IdAsignacion,
                    A.TipoAsignacion,

                    A.Estado
                        AS EstadoAsignacionTecnico,

                    A.FechaAsignacion,

                    A.Observaciones
                        AS ObservacionesAsignacion,

                    T.IdTecnico,
                    T.CodigoTecnico,

                    T.NombreCompleto
                        AS Tecnico,

                    T.DistritoBase
                        AS DistritoTecnico,

                    /*
                    * Última asignación histórica.
                    */
                    ULT.IdAsignacion
                        AS IdUltimaAsignacion,

                    ULT.TipoAsignacion
                        AS UltimoTipoAsignacion,

                    ULT.Estado
                        AS UltimoEstadoAsignacionTecnico,

                    ULT.FechaAsignacion
                        AS UltimaFechaAsignacion,

                    ULT.Observaciones
                        AS UltimasObservacionesAsignacion,

                    TU.IdTecnico
                        AS IdUltimoTecnico,

                    TU.CodigoTecnico
                        AS CodigoUltimoTecnico,

                    TU.NombreCompleto
                        AS UltimoTecnico

                FROM dbo.OrdenesTrabajo OT

                LEFT JOIN dbo.Operaciones O
                    ON O.IdOperacion =
                        OT.IdOperacion

                OUTER APPLY
                (
                    SELECT TOP (1)
                        AOFSC.IdActividad,
                        AOFSC.IdActividadOFSC,
                        AOFSC.EstadoActividad,
                        AOFSC.FechaActividad,
                        AOFSC.HoraInicio,
                        AOFSC.HoraFin,
                        AOFSC.FlagReagenda,
                        AOFSC.RazonReagenda,
                        AOFSC.ResultadoNoRealizado,
                        AOFSC.Motivo,
                        AOFSC.MotivoCancelacion,
                        AOFSC.TipoCierre,
                        AOFSC.ResultadoGlobal,
                        AOFSC.ResponsableSuspension,
                        AOFSC.TipoSuspension,
                        AOFSC.FechaImportacion,
                        AOFSC.FechaActualizacion

                    FROM dbo.ActividadesOFSC AOFSC

                    WHERE
                        AOFSC.IdOrden =
                            OT.IdOrden

                    ORDER BY
                        COALESCE(
                            AOFSC.FechaActualizacion,
                            AOFSC.FechaImportacion
                        ) DESC,

                        AOFSC.IdActividad DESC
                ) ACT

                OUTER APPLY
                (
                    SELECT TOP (1)
                        A2.IdAsignacion,
                        A2.IdTecnico,
                        A2.TipoAsignacion,
                        A2.Estado,
                        A2.FechaAsignacion,
                        A2.Observaciones

                    FROM dbo.Asignaciones A2

                    WHERE
                        A2.IdOrden = OT.IdOrden
                        AND A2.Estado = 'ACTIVA'

                    ORDER BY
                        A2.FechaAsignacion DESC,
                        A2.IdAsignacion DESC
                ) A

                OUTER APPLY
                (
                    SELECT TOP (1)
                        AH.IdAsignacion,
                        AH.IdTecnico,
                        AH.TipoAsignacion,
                        AH.Estado,
                        AH.FechaAsignacion,
                        AH.Observaciones

                    FROM dbo.Asignaciones AH

                    WHERE
                        AH.IdOrden = OT.IdOrden

                    ORDER BY
                        AH.FechaAsignacion DESC,
                        AH.IdAsignacion DESC
                ) ULT

                LEFT JOIN dbo.Tecnicos T
                    ON T.IdTecnico =
                        A.IdTecnico
                LEFT JOIN dbo.Tecnicos TU
                    ON TU.IdTecnico =
                        ULT.IdTecnico
                ORDER BY
                    OT.IdOrden DESC;
            `);

        console.log(
            (
                `Total de órdenes consultadas: ` +
                `${resultado.recordset.length}`
            )
        );

        return res
            .status(200)
            .json(
                resultado.recordset
            );
    } catch (error) {
        console.error(
            "Error al listar las órdenes:",
            error
        );

        return res
            .status(500)
            .json({
                ok: false,

                mensaje:
                    "No se pudieron obtener las órdenes.",

                detalle:
                    error.message
            });
    }
}

// =====================================
// CAMBIAR ESTADO DE OT
// =====================================
async function actualizarEstadoOrden(
    req,
    res
) {
    try {
        const idUsuario =
            obtenerIdUsuarioAutenticado(
                req
            );

        if (!idUsuario) {
            return res
                .status(401)
                .json({
                    ok: false,

                    mensaje:
                        "No se pudo identificar al usuario autenticado."
                });
        }

        const idOrden = Number(
            req.params.id
        );

        const estadoNuevo =
            String(
                req.body?.estadoNuevo ||
                ""
            ).trim();

        const motivo =
            String(
                req.body?.motivo ||
                ""
            ).trim();

        if (
            !Number.isInteger(
                idOrden
            ) ||
            idOrden <= 0
        ) {
            return res
                .status(400)
                .json({
                    ok: false,

                    mensaje:
                        "La orden seleccionada no es válida."
                });
        }

        if (!estadoNuevo) {
            return res
                .status(400)
                .json({
                    ok: false,

                    mensaje:
                        "Debe seleccionar un nuevo estado."
                });
        }

        const resultado =
            await cambiarEstadoOrden(
                idOrden,
                estadoNuevo,
                motivo,
                idUsuario
            );

        return res
            .status(200)
            .json({
                ok: true,

                mensaje:
                    (
                        `La OT ${resultado.codigoOT} ` +
                        `cambió de ${resultado.estadoAnterior} ` +
                        `a ${resultado.estadoNuevo} correctamente.`
                    ),

                cambio:
                    resultado
            });
    } catch (error) {
        console.error(
            "Error al cambiar estado de OT:",
            error
        );

        return res
            .status(
                error.statusCode ||
                500
            )
            .json({
                ok: false,

                mensaje:
                    error.statusCode
                        ? error.message
                        : "No se pudo cambiar el estado de la orden.",

                detalle:
                    error.statusCode
                        ? undefined
                        : error.message
            });
    }
}

module.exports = {
    listarOrdenes,
    actualizarEstadoOrden
};