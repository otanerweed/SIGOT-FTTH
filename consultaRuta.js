const { conectarDB } = require("./src/config/database");

async function consultar() {
    let pool;

    try {
        pool = await conectarDB();

        const resultado = await pool.request().query(`
            WITH Rutas AS
            (
                SELECT
                    t.IdTecnico,
                    t.NombreCompleto,

                    MIN(
                        CASE
                            WHEN h.Valor = 'R_RUTA_ACTIVA: 1'
                            THEN h.FechaHoraAccion
                        END
                    ) AS InicioRutaUTC

                FROM dbo.Tecnicos t

                LEFT JOIN dbo.HistorialRecursosOFSC h
                    ON h.IdTecnico = t.IdTecnico
                    AND h.FechaHoraAccion >= '2026-09-10 05:00:00'
                    AND h.FechaHoraAccion < '2026-09-11 05:00:00'

                WHERE
                    t.IdTecnico BETWEEN 6 AND 23

                GROUP BY
                    t.IdTecnico,
                    t.NombreCompleto
            ),

            Control AS
            (
                SELECT
                    r.IdTecnico,
                    r.NombreCompleto,

                    c.NombreCelula AS Celula,

                    s.NombreCompleto AS Supervisor,

                    r.InicioRutaUTC

                FROM Rutas r

                INNER JOIN dbo.AsignacionesCelulaET ace
                    ON ace.IdTecnico = r.IdTecnico
                    AND ace.Activo = 1
                    AND ace.FechaInicio <= '2026-09-10'
                    AND (
                        ace.FechaFin IS NULL
                        OR ace.FechaFin >= '2026-09-10'
                    )

                INNER JOIN dbo.Celulas c
                    ON c.IdCelula = ace.IdCelula

                INNER JOIN dbo.SupervisoresOperativos s
                    ON s.IdSupervisor = c.IdSupervisor
            )

            SELECT
                Celula,
                Supervisor,

                COUNT(*) AS TotalET,

                SUM(
                    CASE
                        WHEN InicioRutaUTC IS NOT NULL
                         AND CAST(
                             DATEADD(
                                 HOUR,
                                 -5,
                                 InicioRutaUTC
                             ) AS time
                         ) <= '07:30:00'
                        THEN 1
                        ELSE 0
                    END
                ) AS A_Tiempo,

                SUM(
                    CASE
                        WHEN InicioRutaUTC IS NOT NULL
                         AND CAST(
                             DATEADD(
                                 HOUR,
                                 -5,
                                 InicioRutaUTC
                             ) AS time
                         ) > '07:30:00'
                        THEN 1
                        ELSE 0
                    END
                ) AS Tarde,

                SUM(
                    CASE
                        WHEN InicioRutaUTC IS NULL
                        THEN 1
                        ELSE 0
                    END
                ) AS SinRegistro

            FROM Control

            GROUP BY
                Celula,
                Supervisor

            ORDER BY
                Celula;
        `);

        console.table(resultado.recordset);

    } catch (error) {
        console.error("❌ Error:", error);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

consultar();