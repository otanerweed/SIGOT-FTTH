    const { conectarDB, sql } = require("../config/database");

    // =====================================
    // CONTROL OPERATIVO - INICIO Y CIERRE
    // =====================================

    async function obtenerControlRuta(req, res) {
        let pool;

        try {
            const fecha = String(
                req.query.fecha || ""
            ).trim();

            if (!fecha) {
                return res.status(400).json({
                    ok: false,
                    mensaje:
                        "Debe indicar la fecha. Ejemplo: 2026-09-10"
                });
            }

            pool = await conectarDB();

            const resultado = await pool
                .request()
                .input(
                    "Fecha",
                    sql.Date,
                    fecha
                )
                .query(`
                    SELECT
                        r.IdTecnico,
                        r.NombreCompleto,
                        r.DNI,

                        c.NombreCelula AS Celula,

                        s.NombreCompleto AS Supervisor,

                        CASE
                            WHEN cir.HoraInicioReal IS NOT NULL
                                THEN DATEADD(
                                    HOUR,
                                    5,
                                    DATEADD(
                                        SECOND,
                                        DATEDIFF(
                                            SECOND,
                                            CONVERT(time, '00:00:00'),
                                            cir.HoraInicioReal
                                        ),
                                        CAST(@Fecha AS datetime2)
                                    )
                                )
                            ELSE r.InicioRutaUTC
                        END AS InicioRutaUTC,

                                            CASE
                                                WHEN ccr.HoraCierreReal IS NOT NULL
                                                    THEN DATEADD(
                                                        HOUR,
                                                        5,
                                                        DATEADD(
                                                            SECOND,
                                                            DATEDIFF(
                                                                SECOND,
                                                                CONVERT(time, '00:00:00'),
                                                                ccr.HoraCierreReal
                                                            ),
                                                            CAST(@Fecha AS datetime2)
                                                        )
                                                    )
                                                ELSE r.FinRutaUTC
                                            END AS FinRutaUTC,

                                            CASE
                                                WHEN ccr.HoraCierreReal IS NOT NULL
                                                    THEN 1
                                                ELSE 0
                                            END AS FinRutaCorregido,

                                            ccr.Observacion AS ObservacionCierreRuta,

                                            cj.EstadoJornada,
                                            cj.Motivo AS MotivoJornada,
                                            cj.Observacion AS ObservacionJornada,

                                            CASE
                                                WHEN cir.HoraInicioReal IS NOT NULL
                                                    THEN CASE
                                                        WHEN cir.Estado = 'A_TIEMPO'
                                                            THEN 'A TIEMPO'
                                                        WHEN cir.Estado = 'TARDE'
                                                            THEN 'TARDE'
                                                        WHEN cir.Estado = 'NO_INICIO'
                                                            THEN 'SIN REGISTRO DE ACTIVACION'
                                                        ELSE cir.Estado
                                                    END

                                                WHEN r.InicioRutaUTC IS NULL
                                                    THEN 'SIN REGISTRO DE ACTIVACION'

                                                WHEN CAST(
                                                    DATEADD(
                                                        HOUR,
                                                        -5,
                                                        r.InicioRutaUTC
                                                    ) AS time
                                                ) <= '07:30:00'
                                                    THEN 'A TIEMPO'

                                                ELSE 'TARDE'
                                            END AS EstadoInicioRuta,

                        CASE
                            WHEN cir.HoraInicioReal IS NOT NULL
                                THEN 1
                            ELSE 0
                        END AS InicioRutaCorregido,

                        cir.Observacion AS ObservacionInicioRuta

                    FROM
                    (
                        SELECT
                            t.IdTecnico,
                            t.NombreCompleto,
                            t.DNI,

                            MIN(
                                CASE
                                    WHEN h.Valor = 'R_RUTA_ACTIVA: 1'
                                        THEN h.FechaHoraAccion
                                END
                            ) AS InicioRutaUTC,

                            MAX(
                                CASE
                                    WHEN h.Valor = 'R_RUTA_ACTIVA: 0'
                                        THEN h.FechaHoraAccion
                                END
                            ) AS FinRutaUTC

                        FROM dbo.Tecnicos t

                        LEFT JOIN dbo.HistorialRecursosOFSC h
                            ON h.IdTecnico = t.IdTecnico

                            AND h.FechaHoraAccion >= DATEADD(
                                HOUR,
                                5,
                                CAST(@Fecha AS datetime2)
                            )

                            AND h.FechaHoraAccion < DATEADD(
                                HOUR,
                                29,
                                CAST(@Fecha AS datetime2)
                            )

                        WHERE
                            t.Activo = 1
                            AND EXISTS (
                                SELECT 1
                                FROM dbo.AsignacionesCelulaET ace2
                                WHERE
                                    ace2.IdTecnico = t.IdTecnico
                                    AND ace2.Activo = 1
                                    AND ace2.FechaInicio <= @Fecha
                                    AND (
                                        ace2.FechaFin IS NULL
                                        OR ace2.FechaFin >= @Fecha
                                    )
                            )

                        GROUP BY
                            t.IdTecnico,
                            t.NombreCompleto,
                            t.DNI

                    ) r

                    LEFT JOIN dbo.AsignacionesCelulaET ace
                        ON ace.IdTecnico = r.IdTecnico

                        AND ace.Activo = 1

                        AND ace.FechaInicio <= @Fecha

                        AND (
                            ace.FechaFin IS NULL
                            OR ace.FechaFin >= @Fecha
                        )

                    LEFT JOIN dbo.Celulas c
                        ON c.IdCelula = ace.IdCelula

                    LEFT JOIN dbo.SupervisoresOperativos s
                        ON s.IdSupervisor = c.IdSupervisor

                    LEFT JOIN dbo.ControlInicioRuta cir
                        ON cir.IdTecnico = r.IdTecnico
                        AND cir.FechaControl = @Fecha

                    LEFT JOIN dbo.ControlCierreRuta ccr
                        ON ccr.IdTecnico = r.IdTecnico
                        AND ccr.FechaControl = @Fecha

                    LEFT JOIN dbo.ControlJornada cj
                        ON cj.IdTecnico = r.IdTecnico
                        AND cj.FechaControl = @Fecha

                    ORDER BY
                        CASE
                            WHEN cir.HoraInicioReal IS NOT NULL
                                THEN CASE
                                    WHEN cir.Estado = 'A_TIEMPO' THEN 2
                                    WHEN cir.Estado = 'TARDE' THEN 3
                                    ELSE 1
                                END

                            WHEN r.InicioRutaUTC IS NULL
                                THEN 1

                            WHEN CAST(
                                DATEADD(
                                    HOUR,
                                    -5,
                                    r.InicioRutaUTC
                                ) AS time
                            ) <= '07:30:00'
                                THEN 2

                            ELSE 3
                        END,

                        CASE
                            WHEN cir.HoraInicioReal IS NOT NULL
                                THEN DATEADD(
                                    HOUR,
                                    5,
                                    DATEADD(
                                        SECOND,
                                        DATEDIFF(
                                            SECOND,
                                            CONVERT(time, '00:00:00'),
                                            cir.HoraInicioReal
                                        ),
                                        CAST(@Fecha AS datetime2)
                                    )
                                )

                            ELSE r.InicioRutaUTC
                        END;
                `);

            const datos = resultado.recordset;

            // =====================================
            // RESUMEN POR CÃ‰LULA Y SUPERVISOR
            // =====================================

            const resumenCelulas = [];

            for (const item of datos) {
                let resumen = resumenCelulas.find(
                    (r) =>
                        r.Celula === item.Celula &&
                        r.Supervisor === item.Supervisor
                );

                if (!resumen) {
                    resumen = {
                        Celula: item.Celula,
                        Supervisor: item.Supervisor,
                        TotalET: 0,
                        A_Tiempo: 0,
                        Tarde: 0,
                        SinRegistro: 0,
                        CerroRuta: 0,
                        SinCierre: 0
                    };

                    resumenCelulas.push(resumen);
                }

                resumen.TotalET++;

                if (item.EstadoInicioRuta === "A TIEMPO") {
                    resumen.A_Tiempo++;
                }

                if (item.EstadoInicioRuta === "TARDE") {
                    resumen.Tarde++;
                }

                if (
                    item.EstadoInicioRuta ===
                    "SIN REGISTRO DE ACTIVACION"
                ) {
                    resumen.SinRegistro++;
                }

                if (item.FinRutaUTC) {
                    resumen.CerroRuta++;
                } else {
                    resumen.SinCierre++;
                }
            }

            return res.status(200).json({
                ok: true,
                fecha,
                horaObjetivo: "07:30:00",
                totalET: datos.length,
                datos,
                resumenCelulas
            });

        } catch (error) {
            console.error(
                "Error al obtener control de ruta:",
                error
            );

            return res.status(500).json({
                ok: false,
                mensaje:
                    "No se pudo obtener el control operativo de ruta.",
                detalle: error.message
            });

        } finally {
            if (pool) {
                await pool.close();
            }
        }
    }
// =====================================
// GUARDAR / CORREGIR INICIO DE RUTA
// =====================================

async function guardarCorreccionInicioRuta(req, res) {
    let pool;

    try {
        const {
            fecha,
            idTecnico,
            horaInicioReal,
            observacion
        } = req.body;

        if (!fecha) {
            return res.status(400).json({
                ok: false,
                mensaje: "Debe indicar la fecha."
            });
        }

        if (!idTecnico) {
            return res.status(400).json({
                ok: false,
                mensaje: "Debe indicar el tÃ©cnico."
            });
        }

        if (!horaInicioReal) {
            return res.status(400).json({
                ok: false,
                mensaje: "Debe indicar la hora real de inicio."
            });
        }

        pool = await conectarDB();

        // =====================================
        // OBTENER CÃ‰LULA Y SUPERVISOR DEL ET
        // =====================================

        const tecnico = await pool
            .request()
            .input("IdTecnico", sql.Int, idTecnico)
            .input("Fecha", sql.Date, fecha)
            .query(`
                SELECT TOP 1
                    ace.IdCelula,
                    c.IdSupervisor
                FROM dbo.AsignacionesCelulaET ace
                INNER JOIN dbo.Celulas c
                    ON c.IdCelula = ace.IdCelula
                WHERE
                    ace.IdTecnico = @IdTecnico
                    AND ace.Activo = 1
                    AND ace.FechaInicio <= @Fecha
                    AND (
                        ace.FechaFin IS NULL
                        OR ace.FechaFin >= @Fecha
                    )
                ORDER BY ace.FechaInicio DESC;
            `);

        if (tecnico.recordset.length === 0) {
            return res.status(400).json({
                ok: false,
                mensaje:
                    "El tÃ©cnico no tiene una cÃ©lula activa para la fecha indicada."
            });
        }

        const {
            IdCelula,
            IdSupervisor
        } = tecnico.recordset[0];

        // =====================================
        // DETERMINAR ESTADO
        // =====================================

        const estado =
            horaInicioReal <= "07:30:00"
                ? "A_TIEMPO"
                : "TARDE";

        // =====================================
        // USUARIO QUE REALIZA LA CORRECCIÃ“N
        // =====================================

        const IdUsuarioRegistro =
            req.usuario?.idUsuario || 1;

        // =====================================
        // INSERTAR O ACTUALIZAR
        // =====================================

        await pool
            .request()
            .input("FechaControl", sql.Date, fecha)
            .input("IdTecnico", sql.Int, idTecnico)
            .input("IdCelula", sql.Int, IdCelula)
            .input("IdSupervisor", sql.Int, IdSupervisor)
            .input("HoraObjetivo", sql.VarChar(8), "07:30:00")
            .input("HoraInicioReal", sql.VarChar(8), horaInicioReal)
            .input("Estado", sql.VarChar(20), estado)
            .input(
                "Observacion",
                sql.VarChar(500),
                observacion || "CorrecciÃ³n manual de inicio de ruta."
            )
            .input(
                "IdUsuarioRegistro",
                sql.Int,
                IdUsuarioRegistro
            )
            .query(`
                IF EXISTS (
                    SELECT 1
                    FROM dbo.ControlInicioRuta
                    WHERE
                        FechaControl = @FechaControl
                        AND IdTecnico = @IdTecnico
                )
                BEGIN
                    UPDATE dbo.ControlInicioRuta
                    SET
                        IdCelula = @IdCelula,
                        IdSupervisor = @IdSupervisor,
                        HoraObjetivo = CAST(@HoraObjetivo AS time),
                        HoraInicioReal = CAST(@HoraInicioReal AS time),
                        Estado = @Estado,
                        Observacion = @Observacion,
                        IdUsuarioRegistro = @IdUsuarioRegistro,
                        FechaHoraRegistro = SYSDATETIME()
                    WHERE
                        FechaControl = @FechaControl
                        AND IdTecnico = @IdTecnico;
                END
                ELSE
                BEGIN
                    INSERT INTO dbo.ControlInicioRuta
                    (
                        FechaControl,
                        IdTecnico,
                        IdCelula,
                        IdSupervisor,
                        HoraObjetivo,
                        HoraInicioReal,
                        Estado,
                        Observacion,
                        IdUsuarioRegistro,
                        FechaHoraRegistro
                    )
                    VALUES
                    (
                        @FechaControl,
                        @IdTecnico,
                        @IdCelula,
                        @IdSupervisor,
                        CAST(@HoraObjetivo AS time),
                        CAST(@HoraInicioReal AS time),
                        @Estado,
                        @Observacion,
                        @IdUsuarioRegistro,
                        SYSDATETIME()
                    );
                END
            `);

        return res.status(200).json({
            ok: true,
            mensaje: "CorrecciÃ³n de inicio de ruta guardada correctamente.",
            estado,
            horaInicioReal
        });

    } catch (error) {
        console.error(
            "Error al guardar correcciÃ³n de inicio de ruta:",
            error
        );

        return res.status(500).json({
            ok: false,
            mensaje:
                "No se pudo guardar la correcciÃ³n de inicio de ruta.",
            detalle: error.message
        });

    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

// =====================================
// GUARDAR / CORREGIR CIERRE DE RUTA
// =====================================

async function guardarCorreccionCierreRuta(req, res) {
    let pool;

    try {
        const {
            fecha,
            idTecnico,
            horaCierreReal,
            observacion
        } = req.body;

        if (!fecha) {
            return res.status(400).json({
                ok: false,
                mensaje: "Debe indicar la fecha."
            });
        }

        if (!idTecnico) {
            return res.status(400).json({
                ok: false,
                mensaje: "Debe indicar el tÃ©cnico."
            });
        }

        if (!horaCierreReal) {
            return res.status(400).json({
                ok: false,
                mensaje: "Debe indicar la hora real de cierre."
            });
        }

        pool = await conectarDB();

        // =====================================
        // USUARIO QUE REALIZA LA CORRECCIÃ“N
        // =====================================

        const IdUsuarioRegistro =
            req.usuario?.idUsuario || 1;

        // =====================================
        // INSERTAR O ACTUALIZAR
        // =====================================

        await pool
            .request()
            .input(
                "FechaControl",
                sql.Date,
                fecha
            )
            .input(
                "IdTecnico",
                sql.Int,
                idTecnico
            )
            .input(
                "HoraCierreReal",
                sql.VarChar(8),
                horaCierreReal
            )
            .input(
                "Observacion",
                sql.VarChar(500),
                observacion ||
                    "CorrecciÃ³n manual de cierre de ruta."
            )
            .input(
                "IdUsuarioRegistro",
                sql.Int,
                IdUsuarioRegistro
            )
            .query(`
                IF EXISTS (
                    SELECT 1
                    FROM dbo.ControlCierreRuta
                    WHERE
                        FechaControl = @FechaControl
                        AND IdTecnico = @IdTecnico
                )
                BEGIN
                    UPDATE dbo.ControlCierreRuta
                    SET
                        HoraCierreReal =
                            CAST(@HoraCierreReal AS time),
                        Observacion =
                            @Observacion,
                        IdUsuarioRegistro =
                            @IdUsuarioRegistro,
                        FechaHoraRegistro =
                            SYSDATETIME()
                    WHERE
                        FechaControl = @FechaControl
                        AND IdTecnico = @IdTecnico;
                END
                ELSE
                BEGIN
                    INSERT INTO dbo.ControlCierreRuta
                    (
                        FechaControl,
                        IdTecnico,
                        HoraCierreReal,
                        Observacion,
                        IdUsuarioRegistro,
                        FechaHoraRegistro
                    )
                    VALUES
                    (
                        @FechaControl,
                        @IdTecnico,
                        CAST(@HoraCierreReal AS time),
                        @Observacion,
                        @IdUsuarioRegistro,
                        SYSDATETIME()
                    );
                END
            `);

        return res.status(200).json({
            ok: true,
            mensaje:
                "CorrecciÃ³n de cierre de ruta guardada correctamente.",
            horaCierreReal
        });

    } catch (error) {
        console.error(
            "Error al guardar correcciÃ³n de cierre de ruta:",
            error
        );

        return res.status(500).json({
            ok: false,
            mensaje:
                "No se pudo guardar la correcciÃ³n de cierre de ruta.",
            detalle: error.message
        });

    } finally {
        if (pool) {
            await pool.close();
        }
    }
}
// =====================================
// GUARDAR / CORREGIR JORNADA
// =====================================

async function guardarControlJornada(req, res) {
    let pool;

    try {
        const {
            fecha,
            idTecnico,
            estadoJornada,
            motivo,
            observacion
        } = req.body;

        if (!fecha) {
            return res.status(400).json({
                ok: false,
                mensaje: "Debe indicar la fecha."
            });
        }

        if (!idTecnico) {
            return res.status(400).json({
                ok: false,
                mensaje: "Debe indicar el tÃ©cnico."
            });
        }

        if (!estadoJornada) {
            return res.status(400).json({
                ok: false,
                mensaje: "Debe indicar el estado de la jornada."
            });
        }

        if (
            !["LABORABLE", "NO LABORABLE"].includes(
                estadoJornada
            )
        ) {
            return res.status(400).json({
                ok: false,
                mensaje:
                    "El estado de jornada no es vÃ¡lido."
            });
        }

        pool = await conectarDB();

        // =====================================
        // USUARIO QUE REALIZA EL REGISTRO
        // =====================================

        const IdUsuarioRegistro =
            req.usuario?.idUsuario || 1;

        // =====================================
        // INSERTAR O ACTUALIZAR JORNADA
        // =====================================

        await pool
            .request()
            .input(
                "FechaControl",
                sql.Date,
                fecha
            )
            .input(
                "IdTecnico",
                sql.Int,
                idTecnico
            )
            .input(
                "EstadoJornada",
                sql.VarChar(30),
                estadoJornada
            )
            .input(
                "Motivo",
                sql.VarChar(200),
                motivo || null
            )
            .input(
                "Observacion",
                sql.VarChar(500),
                observacion || null
            )
            .input(
                "IdUsuarioRegistro",
                sql.Int,
                IdUsuarioRegistro
            )
            .query(`
                IF EXISTS (
                    SELECT 1
                    FROM dbo.ControlJornada
                    WHERE
                        FechaControl = @FechaControl
                        AND IdTecnico = @IdTecnico
                )
                BEGIN
                    UPDATE dbo.ControlJornada
                    SET
                        EstadoJornada = @EstadoJornada,
                        Motivo = @Motivo,
                        Observacion = @Observacion,
                        IdUsuarioRegistro = @IdUsuarioRegistro,
                        FechaHoraRegistro = SYSDATETIME()
                    WHERE
                        FechaControl = @FechaControl
                        AND IdTecnico = @IdTecnico;
                END
                ELSE
                BEGIN
                    INSERT INTO dbo.ControlJornada
                    (
                        FechaControl,
                        IdTecnico,
                        EstadoJornada,
                        Motivo,
                        Observacion,
                        IdUsuarioRegistro,
                        FechaHoraRegistro
                    )
                    VALUES
                    (
                        @FechaControl,
                        @IdTecnico,
                        @EstadoJornada,
                        @Motivo,
                        @Observacion,
                        @IdUsuarioRegistro,
                        SYSDATETIME()
                    );
                END
            `);

        return res.status(200).json({
            ok: true,
            mensaje:
                "Estado de jornada guardado correctamente.",
            estadoJornada,
            motivo,
            observacion
        });

    } catch (error) {
        console.error(
            "Error al guardar estado de jornada:",
            error
        );

        return res.status(500).json({
            ok: false,
            mensaje:
                "No se pudo guardar el estado de jornada.",
            detalle: error.message
        });

    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

async function obtenerReporteSemanal(req, res) {
    try {
        const { fechaInicio, fechaFin } = req.query;

        if (!fechaInicio || !fechaFin) {
            return res.status(400).json({
                ok: false,
                mensaje: "Debe indicar fechaInicio y fechaFin."
            });
        }

        const pool = await conectarDB();

        const resultado = await pool.request()
            .input("FechaInicio", sql.Date, fechaInicio)
            .input("FechaFin", sql.Date, fechaFin)
            .query(`
                ;WITH Fechas AS (
                    SELECT CAST(@FechaInicio AS DATE) AS FechaControl
                    UNION ALL
                    SELECT DATEADD(DAY, 1, FechaControl)
                    FROM Fechas
                    WHERE FechaControl < @FechaFin
                ),
                TecnicosActivos AS (
                    SELECT
                        t.IdTecnico,
                        t.CodigoTecnico,
                        t.NombreCompleto,
                        t.TipoTecnico,
                        ac.IdCelula,
                        c.NombreCelula,
                        c.IdSupervisor,
                        so.NombreCompleto AS NombreSupervisor
                    FROM dbo.Tecnicos t
                    INNER JOIN dbo.AsignacionesCelulaET ac
                        ON ac.IdTecnico = t.IdTecnico
                        AND ac.Activo = 1
                    INNER JOIN dbo.Celulas c
                        ON c.IdCelula = ac.IdCelula
                    INNER JOIN dbo.SupervisoresOperativos so
                        ON so.IdSupervisor = c.IdSupervisor
                    WHERE t.Activo = 1
                ),
                Base AS (
                    SELECT
                        f.FechaControl,
                        ta.*
                    FROM Fechas f
                    CROSS JOIN TecnicosActivos ta
                    WHERE
                        DATEDIFF(DAY, '19000101', f.FechaControl) % 7 <> 6
                ),
                Historial AS (
                    SELECT
                        b.FechaControl,
                        b.IdTecnico,

                        MIN(
                            CASE
                                WHEN h.Valor = 'R_RUTA_ACTIVA: 1'
                                THEN h.FechaHoraAccion
                            END
                        ) AS InicioRutaUTC,

                        MAX(
                            CASE
                                WHEN h.Valor = 'R_RUTA_ACTIVA: 0'
                                THEN h.FechaHoraAccion
                            END
                        ) AS FinRutaUTC

                    FROM Base b
                    LEFT JOIN dbo.HistorialRecursosOFSC h
                        ON h.IdTecnico = b.IdTecnico
                        AND h.FechaHoraAccion >=
                            DATEADD(HOUR, 5, CAST(b.FechaControl AS DATETIME2))
                        AND h.FechaHoraAccion <
                            DATEADD(HOUR, 29, CAST(b.FechaControl AS DATETIME2))
                    GROUP BY
                        b.FechaControl,
                        b.IdTecnico
                )
                SELECT
                    b.FechaControl,
                    b.IdTecnico,
                    b.CodigoTecnico,
                    b.NombreCompleto,
                    b.TipoTecnico,
                    b.IdCelula,
                    b.NombreCelula,
                    b.IdSupervisor,
                    b.NombreSupervisor,

                    h.InicioRutaUTC,
                    h.FinRutaUTC,

                    CONVERT(VARCHAR(8), cir.HoraInicioReal, 108) AS HoraInicioReal,
                    cir.Estado AS EstadoInicioManual,
                    cir.Observacion AS ObservacionInicioRuta,

                    CONVERT(VARCHAR(8), ccr.HoraCierreReal, 108) AS HoraCierreReal,
                    ccr.Observacion AS ObservacionCierreRuta,

                    cj.EstadoJornada,
                    cj.Motivo AS MotivoJornada,
                    cj.Observacion AS ObservacionJornada,

                    CASE
                        WHEN cj.EstadoJornada = 'NO LABORABLE'
                            THEN 'NO LABORABLE'

                        WHEN cir.HoraInicioReal IS NOT NULL
                            THEN cir.Estado

                        WHEN h.InicioRutaUTC IS NOT NULL
                            AND CONVERT(TIME, DATEADD(HOUR, -5, h.InicioRutaUTC)) <= '07:30'
                            THEN 'A_TIEMPO'

                        WHEN h.InicioRutaUTC IS NOT NULL
                            THEN 'TARDE'

                        ELSE 'SIN_REGISTRO'
                    END AS EstadoInicioRuta,

                    CASE
                        WHEN cj.EstadoJornada = 'NO LABORABLE'
                            THEN 'NO APLICA'

                        WHEN h.FinRutaUTC IS NOT NULL
                            OR ccr.HoraCierreReal IS NOT NULL
                            THEN 'CERRO'

                        ELSE 'SIN_CIERRE'
                    END AS EstadoCierreRuta

                FROM Base b

                LEFT JOIN Historial h
                    ON h.FechaControl = b.FechaControl
                    AND h.IdTecnico = b.IdTecnico

                LEFT JOIN dbo.ControlInicioRuta cir
                    ON cir.FechaControl = b.FechaControl
                    AND cir.IdTecnico = b.IdTecnico

                LEFT JOIN dbo.ControlCierreRuta ccr
                    ON ccr.FechaControl = b.FechaControl
                    AND ccr.IdTecnico = b.IdTecnico

                LEFT JOIN dbo.ControlJornada cj
                    ON cj.FechaControl = b.FechaControl
                    AND cj.IdTecnico = b.IdTecnico

                ORDER BY
                    b.FechaControl,
                    b.IdCelula,
                    b.NombreCompleto

                OPTION (MAXRECURSION 31);
            `);

        const detalle = resultado.recordset;

                // =====================================
                // DETALLE DIARIO PARA REPORTE SEMANAL
                // =====================================

                const reporteDiario = {};

                detalle.forEach(item => {

                    // Excluir domingos sin afectar el dÃ­a real
                    // de la fecha almacenada en SQL Server.
                    const fechaTexto =
                        String(item.FechaControl).slice(0, 10);

                    const [anio, mes, dia] =
                        fechaTexto.split("-").map(Number);

                    const diaSemana =
                        new Date(
                            Date.UTC(
                                anio,
                                mes - 1,
                                dia
                            )
                        ).getUTCDay();

                    if (diaSemana === 0) {
                        return;
                    }

                    const claveCelula = `${item.IdCelula}-${item.IdSupervisor}`;

                    if (!reporteDiario[claveCelula]) {
                        reporteDiario[claveCelula] = {
                            Celula: item.NombreCelula,
                            Supervisor: item.NombreSupervisor,
                            TotalET: 0,
                            tecnicos: {}
                        };
                    }

                    const grupo = reporteDiario[claveCelula];

                    if (!grupo.tecnicos[item.IdTecnico]) {
                        grupo.tecnicos[item.IdTecnico] = {
                            IdTecnico: item.IdTecnico,
                            CodigoTecnico: item.CodigoTecnico,
                            NombreCompleto: item.NombreCompleto,
                            TipoTecnico: item.TipoTecnico,
                            dias: []
                        };

                        grupo.TotalET++;
                    }

                    grupo.tecnicos[item.IdTecnico].dias.push({
                        fecha: item.FechaControl,
                        estadoInicio: item.EstadoInicioRuta,

                        // Hora registrada directamente en OFSC
                        inicioRuta: item.InicioRutaUTC,

                        // Hora corregida manualmente
                        inicioManual: item.HoraInicioReal,

                        estadoCierre: item.EstadoCierreRuta,

                        // Cierre registrado directamente en OFSC
                        finRuta: item.FinRutaUTC,

                        // Cierre corregido manualmente
                        cierreManual: item.HoraCierreReal,

                        estadoJornada: item.EstadoJornada
                    });
                });

                const detalleReporte = Object.values(reporteDiario).map(grupo => ({
                    ...grupo,
                    tecnicos: Object.values(grupo.tecnicos)
                }));

        const resumen = {
            totalRegistros: detalle.length,
            dias: new Set(detalle.map(x => x.FechaControl)).size,
            totalET: 0,
            noLaborable: 0,
            aTiempo: 0,
            tarde: 0,
            sinRegistro: 0,
            cerroRuta: 0,
            sinCierre: 0
        };

        detalle.forEach(item => {
            if (item.EstadoInicioRuta === "NO LABORABLE") {
                resumen.noLaborable++;
                return;
            }

            resumen.totalET++;

            if (item.EstadoInicioRuta === "A_TIEMPO") {
                resumen.aTiempo++;
            } else if (item.EstadoInicioRuta === "TARDE") {
                resumen.tarde++;
            } else if (item.EstadoInicioRuta === "SIN_REGISTRO") {
                resumen.sinRegistro++;
            }

            if (item.EstadoCierreRuta === "CERRO") {
                resumen.cerroRuta++;
            } else if (item.EstadoCierreRuta === "SIN_CIERRE") {
                resumen.sinCierre++;
            }
        });

        return res.json({
            ok: true,
            fechaInicio,
            fechaFin,
            resumen,
            detalle,
            detalleReporte
        });

    } catch (error) {
        console.error("ERROR REPORTE SEMANAL:", error);

        return res.status(500).json({
            ok: false,
            mensaje: "Error al obtener el reporte semanal.",
            error: error.message
        });
    }
}


module.exports = {
    obtenerControlRuta,
    guardarCorreccionInicioRuta,
    guardarCorreccionCierreRuta,
    guardarControlJornada,
    obtenerReporteSemanal
};
