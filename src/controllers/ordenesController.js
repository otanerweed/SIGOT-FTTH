const {
    conectarDB
} = require("../config/database");

/**
 * Lista todas las órdenes registradas.
 *
 * Incluye:
 * - Datos principales de la OT.
 * - Operación de importación.
 * - Última actividad OFSC.
 * - Asignación vigente o última asignación.
 * - Técnico relacionado.
 *
 * GET /api/importador/ordenes
 */
async function listarOrdenes(req, res) {
    try {
        console.log(
            "========== LISTAR ÓRDENES =========="
        );

        const pool = await conectarDB();

        const resultado = await pool.request().query(`
            SELECT
                /*
                 * Datos principales de la OT.
                 */
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

                /*
                 * Datos de la operación.
                 */
                O.FechaOperacion,
                O.NombreArchivo,

                /*
                 * Última actividad registrada desde OFSC.
                 */
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

                /*
                 * Asignación vigente o última registrada.
                 */
                A.IdAsignacion,
                A.TipoAsignacion,
                A.Estado
                    AS EstadoAsignacionTecnico,
                A.FechaAsignacion,
                A.Observaciones
                    AS ObservacionesAsignacion,

                /*
                 * Técnico relacionado.
                 */
                T.IdTecnico,
                T.CodigoTecnico,
                T.NombreCompleto AS Tecnico,
                T.DistritoBase AS DistritoTecnico

            FROM dbo.OrdenesTrabajo OT

            LEFT JOIN dbo.Operaciones O
                ON O.IdOperacion = OT.IdOperacion

            /*
             * Obtiene la actividad OFSC más reciente
             * relacionada con la OT.
             */
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

                WHERE AOFSC.IdOrden = OT.IdOrden

                ORDER BY
                    COALESCE(
                        AOFSC.FechaActualizacion,
                        AOFSC.FechaImportacion
                    ) DESC,
                    AOFSC.IdActividad DESC
            ) ACT

            /*
             * Obtiene una sola asignación por OT.
             *
             * Prioridad:
             * 1. ACTIVA
             * 2. FINALIZADA
             * 3. CANCELADA
             */
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

                WHERE A2.IdOrden = OT.IdOrden

                ORDER BY
                    CASE
                        WHEN A2.Estado = 'ACTIVA'
                            THEN 1
                        WHEN A2.Estado = 'FINALIZADA'
                            THEN 2
                        WHEN A2.Estado = 'CANCELADA'
                            THEN 3
                        ELSE 4
                    END,
                    A2.FechaAsignacion DESC,
                    A2.IdAsignacion DESC
            ) A

            LEFT JOIN dbo.Tecnicos T
                ON T.IdTecnico = A.IdTecnico

            ORDER BY
                OT.IdOrden DESC;
        `);

        console.log(
            `✅ Total de órdenes consultadas: ` +
            `${resultado.recordset.length}`
        );

        return res.status(200).json(
            resultado.recordset
        );
    } catch (error) {
        console.error(
            "❌ Error al listar las órdenes:"
        );

        console.error(error);

        return res.status(500).json({
            ok: false,
            mensaje:
                "No se pudieron obtener las órdenes.",
            detalle: error.message
        });
    }
}

module.exports = {
    listarOrdenes
};