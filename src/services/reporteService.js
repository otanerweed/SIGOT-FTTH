const {
    conectarDB
} = require("../config/database");

/**
 * Obtiene la información general para el módulo
 * de reportes de SIGOT-FTTH.
 */
async function obtenerReporteGeneral() {
    const pool = await conectarDB();

    /*
     * Resumen general de órdenes.
     */
    const resumenOrdenes = await pool.request().query(`
        SELECT
            COUNT(*) AS TotalOrdenes,

            SUM(
                CASE
                    WHEN UPPER(ISNULL(EstadoOT, '')) = 'PENDIENTE'
                    THEN 1
                    ELSE 0
                END
            ) AS Pendientes,

            SUM(
                CASE
                    WHEN UPPER(ISNULL(EstadoOT, '')) = 'INICIADA'
                    THEN 1
                    ELSE 0
                END
            ) AS Iniciadas,

            SUM(
                CASE
                    WHEN UPPER(ISNULL(EstadoOT, '')) = 'SUSPENDIDA'
                    THEN 1
                    ELSE 0
                END
            ) AS Suspendidas,

            SUM(
                CASE
                    WHEN UPPER(ISNULL(EstadoOT, '')) = 'NO_REALIZADO'
                    THEN 1
                    ELSE 0
                END
            ) AS NoRealizadas,

            SUM(
                CASE
                    WHEN UPPER(ISNULL(EstadoOT, '')) = 'REPROGRAMADA'
                    THEN 1
                    ELSE 0
                END
            ) AS Reprogramadas,

            SUM(
                CASE
                    WHEN UPPER(ISNULL(EstadoOT, '')) = 'FINALIZADA'
                    THEN 1
                    ELSE 0
                END
            ) AS Finalizadas,

            SUM(
                CASE
                    WHEN UPPER(ISNULL(EstadoOT, '')) = 'CANCELADA'
                    THEN 1
                    ELSE 0
                END
            ) AS Canceladas

        FROM dbo.OrdenesTrabajo;
    `);

    /*
     * Resumen general de asignaciones.
     */
    const resumenAsignaciones =
        await pool.request().query(`
            SELECT
                COUNT(*) AS TotalAsignaciones,

                SUM(
                    CASE
                        WHEN UPPER(ISNULL(Estado, '')) = 'ACTIVA'
                        THEN 1
                        ELSE 0
                    END
                ) AS Activas,

                SUM(
                    CASE
                        WHEN UPPER(ISNULL(Estado, '')) = 'FINALIZADA'
                        THEN 1
                        ELSE 0
                    END
                ) AS Finalizadas,

                SUM(
                    CASE
                        WHEN UPPER(ISNULL(Estado, '')) = 'CANCELADA'
                        THEN 1
                        ELSE 0
                    END
                ) AS Canceladas

            FROM dbo.Asignaciones;
        `);

    /*
     * Cantidad de asignaciones por técnico.
     */
    const asignacionesPorTecnico =
        await pool.request().query(`
            SELECT
                T.IdTecnico,
                T.CodigoTecnico,
                T.NombreCompleto AS Tecnico,
                T.DistritoBase,
                T.CapacidadMaxima,
                T.Disponible,
                T.Activo,

                COUNT(A.IdAsignacion)
                    AS TotalAsignaciones,

                SUM(
                    CASE
                        WHEN A.Estado = 'ACTIVA'
                        THEN 1
                        ELSE 0
                    END
                ) AS Activas,

                SUM(
                    CASE
                        WHEN A.Estado = 'FINALIZADA'
                        THEN 1
                        ELSE 0
                    END
                ) AS Finalizadas,

                SUM(
                    CASE
                        WHEN A.Estado = 'CANCELADA'
                        THEN 1
                        ELSE 0
                    END
                ) AS Canceladas

            FROM dbo.Tecnicos T

            LEFT JOIN dbo.Asignaciones A
                ON A.IdTecnico = T.IdTecnico

            GROUP BY
                T.IdTecnico,
                T.CodigoTecnico,
                T.NombreCompleto,
                T.DistritoBase,
                T.CapacidadMaxima,
                T.Disponible,
                T.Activo

            ORDER BY
                Activas DESC,
                TotalAsignaciones DESC,
                T.NombreCompleto ASC;
        `);

    /*
     * Cantidad de órdenes por distrito.
     */
    const ordenesPorDistrito =
        await pool.request().query(`
            SELECT
                ISNULL(
                    NULLIF(
                        LTRIM(RTRIM(Distrito)),
                        ''
                    ),
                    'Sin distrito'
                ) AS Distrito,

                COUNT(*) AS TotalOrdenes,

                SUM(
                    CASE
                        WHEN UPPER(ISNULL(EstadoOT, '')) = 'PENDIENTE'
                        THEN 1
                        ELSE 0
                    END
                ) AS Pendientes,

                SUM(
                    CASE
                        WHEN UPPER(ISNULL(EstadoOT, '')) = 'REPROGRAMADA'
                        THEN 1
                        ELSE 0
                    END
                ) AS Reprogramadas,

                SUM(
                    CASE
                        WHEN UPPER(ISNULL(EstadoOT, '')) = 'FINALIZADA'
                        THEN 1
                        ELSE 0
                    END
                ) AS Finalizadas,

                SUM(
                    CASE
                        WHEN UPPER(ISNULL(EstadoOT, '')) = 'CANCELADA'
                        THEN 1
                        ELSE 0
                    END
                ) AS Canceladas

            FROM dbo.OrdenesTrabajo

            GROUP BY
                ISNULL(
                    NULLIF(
                        LTRIM(RTRIM(Distrito)),
                        ''
                    ),
                    'Sin distrito'
                )

            ORDER BY
                TotalOrdenes DESC,
                Distrito ASC;
        `);

    /*
     * Resultados no realizados provenientes de OFSC.
     */
    const resultadosOfsc =
        await pool.request().query(`
            SELECT
                SUM(
                    CASE
                        WHEN ResultadoNoRealizado = 'REPROGRAMADA'
                        THEN 1
                        ELSE 0
                    END
                ) AS Reprogramaciones,

                SUM(
                    CASE
                        WHEN ResultadoNoRealizado = 'CIERRE_AUTOMATICO'
                        THEN 1
                        ELSE 0
                    END
                ) AS CierresAutomaticos,

                SUM(
                    CASE
                        WHEN EstadoActividad = 'NO_REALIZADO'
                        THEN 1
                        ELSE 0
                    END
                ) AS TotalNoRealizadas,

                SUM(
                    CASE
                        WHEN EstadoActividad = 'FINALIZADA'
                        THEN 1
                        ELSE 0
                    END
                ) AS ActividadesFinalizadas,

                SUM(
                    CASE
                        WHEN EstadoActividad = 'CANCELADA'
                        THEN 1
                        ELSE 0
                    END
                ) AS ActividadesCanceladas

            FROM dbo.ActividadesOFSC;
        `);

    return {
        resumenOrdenes:
            resumenOrdenes.recordset[0],

        resumenAsignaciones:
            resumenAsignaciones.recordset[0],

        resultadosOfsc:
            resultadosOfsc.recordset[0],

        asignacionesPorTecnico:
            asignacionesPorTecnico.recordset,

        ordenesPorDistrito:
            ordenesPorDistrito.recordset
    };
}

module.exports = {
    obtenerReporteGeneral
};