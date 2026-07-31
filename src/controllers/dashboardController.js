const {
    conectarDB
} = require("../config/database");

/**
 * Devuelve los indicadores generales de SIGOT-FTTH.
 *
 * GET /api/dashboard
 */
async function obtenerResumen(req, res) {
    try {
        console.log(
            "========== OBTENER DASHBOARD =========="
        );

        const pool = await conectarDB();

        /*
         * Todos los estados de las OT se calculan
         * en una sola consulta para evitar múltiples
         * viajes hacia SQL Server.
         */
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
                                WHEN EstadoAsignacion = 'SIN ASIGNAR'
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

        /*
         * Técnicos activos y disponibles.
         */
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

        /*
         * Cantidad de operaciones registradas.
         */
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
                    ) AS OperacionesAbiertas

                FROM dbo.Operaciones;
            `);

        const ordenes =
            resultadoOrdenes.recordset[0];

        const tecnicos =
            resultadoTecnicos.recordset[0];

        const operaciones =
            resultadoOperaciones.recordset[0];

        return res.status(200).json({
            totalOT: ordenes.TotalOT,
            asignadas: ordenes.Asignadas,
            pendientes: ordenes.Pendientes,
            finalizadas: ordenes.Finalizadas,
            canceladas: ordenes.Canceladas,

            tecnicos: tecnicos.TecnicosActivos,
            tecnicosDisponibles:
                tecnicos.TecnicosDisponibles,

            totalOperaciones:
                operaciones.TotalOperaciones,

            operacionesAbiertas:
                operaciones.OperacionesAbiertas
        });
    } catch (error) {
        console.error(
            "❌ Error al obtener el dashboard:"
        );

        console.error(error);

        return res.status(500).json({
            ok: false,
            mensaje:
                "No se pudieron obtener los indicadores del dashboard.",
            detalle: error.message
        });
    }
}

module.exports = {
    obtenerResumen
};