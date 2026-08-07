const {
    conectarDB
} = require("../config/database");

/**
 * Obtiene los eventos generales del sistema:
 *
 * - Importaciones OFSC.
 * - Asignaciones antiguas.
 * - Historial de asignaciones.
 * - Cambios de estado de las OT.
 *
 * GET /api/auditoria
 */
async function obtenerAuditoria(
    req,
    res
) {
    try {
        console.log(
            "========== AUDITORÍA GENERAL =========="
        );

        const pool =
            await conectarDB();

        const resultado =
            await pool.request().query(`
                WITH AuditoriaGeneral AS
                (
                    -- =====================================
                    -- 1. IMPORTACIONES OFSC
                    -- =====================================
                    SELECT
                        CAST(
                            CONCAT(
                                'IMP-',
                                O.IdOperacion
                            )
                            AS varchar(50)
                        ) AS IdEvento,

                        CAST(
                            'IMPORTACION'
                            AS varchar(30)
                        ) AS TipoEvento,

                        CAST(
                            'Importador OFSC'
                            AS varchar(60)
                        ) AS Modulo,

                        O.FechaImportacion
                            AS FechaEvento,

                        CAST(
                            CONCAT(
                                'Operación #',
                                O.IdOperacion
                            )
                            AS varchar(120)
                        ) AS Referencia,

                        CAST(
                            NULL
                            AS varchar(30)
                        ) AS CodigoOT,

                        CAST(
                            'IMPORTACION_OFSC'
                            AS varchar(60)
                        ) AS Accion,

                        CAST(
                            O.Observaciones
                            AS varchar(500)
                        ) AS Detalle,

                        CAST(
                            NULL
                            AS varchar(30)
                        ) AS EstadoAnterior,

                        CAST(
                            O.Estado
                            AS varchar(30)
                        ) AS EstadoNuevo,

                        CAST(
                            'OFSC'
                            AS varchar(20)
                        ) AS Fuente,

                        O.IdUsuario,

                        U.NombreCompleto
                            AS UsuarioResponsable,

                        U.Usuario
                            AS NombreUsuarioResponsable,

                        R.Nombre
                            AS RolResponsable,

                        O.NombreArchivo,

                        CAST(
                            NULL
                            AS varchar(150)
                        ) AS Tecnico,

                        CAST(
                            NULL
                            AS varchar(150)
                        ) AS TecnicoAnterior,

                        CAST(
                            NULL
                            AS varchar(150)
                        ) AS TecnicoNuevo

                    FROM dbo.Operaciones O

                    LEFT JOIN dbo.Usuarios U
                        ON U.IdUsuario =
                            O.IdUsuario

                    LEFT JOIN dbo.Roles R
                        ON R.IdRol =
                            U.IdRol


                    UNION ALL


                    -- =====================================
                    -- 2. ASIGNACIONES LEGADAS
                    --
                    -- Solo aparecen aquí las asignaciones
                    -- que NO cuentan todavía con un registro
                    -- en HistorialAsignaciones.
                    -- =====================================
                    SELECT
                        CAST(
                            CONCAT(
                                'ASI-',
                                A.IdAsignacion
                            )
                            AS varchar(50)
                        ) AS IdEvento,

                        CAST(
                            'ASIGNACION'
                            AS varchar(30)
                        ) AS TipoEvento,

                        CAST(
                            'Asignaciones'
                            AS varchar(60)
                        ) AS Modulo,

                        A.FechaAsignacion
                            AS FechaEvento,

                        CAST(
                            CONCAT(
                                'OT ',
                                OT.CodigoOT
                            )
                            AS varchar(120)
                        ) AS Referencia,

                        CAST(
                            OT.CodigoOT
                            AS varchar(30)
                        ) AS CodigoOT,

                        CAST(
                            ISNULL(
                                A.TipoAsignacion,
                                'ASIGNACION'
                            )
                            AS varchar(60)
                        ) AS Accion,

                        CAST(
                            CONCAT(
                                'Técnico: ',
                                ISNULL(
                                    T.NombreCompleto,
                                    'Sin técnico'
                                ),

                                CASE
                                    WHEN
                                        A.Observaciones IS NULL
                                        OR LTRIM(
                                            RTRIM(
                                                A.Observaciones
                                            )
                                        ) = ''
                                    THEN ''

                                    ELSE CONCAT(
                                        '. ',
                                        A.Observaciones
                                    )
                                END
                            )
                            AS varchar(500)
                        ) AS Detalle,

                        CAST(
                            NULL
                            AS varchar(30)
                        ) AS EstadoAnterior,

                        CAST(
                            A.Estado
                            AS varchar(30)
                        ) AS EstadoNuevo,

                        CAST(
                            'SIGOT'
                            AS varchar(20)
                        ) AS Fuente,

                        A.IdUsuario,

                        U.NombreCompleto
                            AS UsuarioResponsable,

                        U.Usuario
                            AS NombreUsuarioResponsable,

                        R.Nombre
                            AS RolResponsable,

                        CAST(
                            NULL
                            AS varchar(255)
                        ) AS NombreArchivo,

                        CAST(
                            T.NombreCompleto
                            AS varchar(150)
                        ) AS Tecnico,

                        CAST(
                            NULL
                            AS varchar(150)
                        ) AS TecnicoAnterior,

                        CAST(
                            T.NombreCompleto
                            AS varchar(150)
                        ) AS TecnicoNuevo

                    FROM dbo.Asignaciones A

                    INNER JOIN dbo.OrdenesTrabajo OT
                        ON OT.IdOrden =
                            A.IdOrden

                    LEFT JOIN dbo.Tecnicos T
                        ON T.IdTecnico =
                            A.IdTecnico

                    LEFT JOIN dbo.Usuarios U
                        ON U.IdUsuario =
                            A.IdUsuario

                    LEFT JOIN dbo.Roles R
                        ON R.IdRol =
                            U.IdRol

                    WHERE NOT EXISTS
                    (
                        SELECT 1

                        FROM dbo.HistorialAsignaciones HA

                        WHERE
                            HA.IdAsignacion =
                                A.IdAsignacion
                    )


                    UNION ALL


                    -- =====================================
                    -- 3. HISTORIAL DE ASIGNACIONES
                    --
                    -- Registra con fecha real:
                    -- - ASIGNACION_MANUAL
                    -- - ASIGNACION_AUTOMATICA
                    -- - REASIGNACION
                    -- - CANCELACION
                    -- =====================================
                    SELECT
                        CAST(
                            CONCAT(
                                'HASI-',
                                H.IdHistorialAsignacion
                            )
                            AS varchar(50)
                        ) AS IdEvento,

                        CAST(
                            'ASIGNACION'
                            AS varchar(30)
                        ) AS TipoEvento,

                        CAST(
                            'Asignaciones'
                            AS varchar(60)
                        ) AS Modulo,

                        H.FechaEvento,

                        CAST(
                            CONCAT(
                                'OT ',
                                OT.CodigoOT
                            )
                            AS varchar(120)
                        ) AS Referencia,

                        CAST(
                            OT.CodigoOT
                            AS varchar(30)
                        ) AS CodigoOT,

                        CAST(
                            H.Evento
                            AS varchar(60)
                        ) AS Accion,

                        CAST(
                            CASE

                                -- ==========================
                                -- REASIGNACIÓN
                                -- ==========================
                                WHEN
                                    H.Evento =
                                        'REASIGNACION'
                                THEN
                                    CONCAT(
                                        'Cambio de técnico de ',
                                        ISNULL(
                                            TA.NombreCompleto,
                                            'Sin técnico anterior'
                                        ),
                                        ' a ',
                                        ISNULL(
                                            TN.NombreCompleto,
                                            'Sin técnico nuevo'
                                        ),

                                        CASE
                                            WHEN
                                                H.Motivo IS NULL
                                                OR LTRIM(
                                                    RTRIM(
                                                        H.Motivo
                                                    )
                                                ) = ''
                                            THEN ''

                                            ELSE CONCAT(
                                                '. Motivo: ',
                                                H.Motivo
                                            )
                                        END
                                    )

                                -- ==========================
                                -- CANCELACIÓN
                                -- ==========================
                                WHEN
                                    H.Evento =
                                        'CANCELACION'
                                THEN
                                    CONCAT(
                                        'Asignación cancelada',

                                        CASE
                                            WHEN
                                                TA.NombreCompleto
                                                    IS NULL
                                            THEN ''

                                            ELSE CONCAT(
                                                '. Técnico: ',
                                                TA.NombreCompleto
                                            )
                                        END,

                                        CASE
                                            WHEN
                                                H.Motivo IS NULL
                                                OR LTRIM(
                                                    RTRIM(
                                                        H.Motivo
                                                    )
                                                ) = ''
                                            THEN ''

                                            ELSE CONCAT(
                                                '. Motivo: ',
                                                H.Motivo
                                            )
                                        END
                                    )

                                -- ==========================
                                -- ASIGNACIÓN MANUAL
                                -- ==========================
                                WHEN
                                    H.Evento =
                                        'ASIGNACION_MANUAL'
                                THEN
                                    CONCAT(
                                        'Asignación manual',

                                        CASE
                                            WHEN
                                                TN.NombreCompleto
                                                    IS NULL
                                            THEN ''

                                            ELSE CONCAT(
                                                '. Técnico: ',
                                                TN.NombreCompleto
                                            )
                                        END,

                                        CASE
                                            WHEN
                                                H.Motivo IS NULL
                                                OR LTRIM(
                                                    RTRIM(
                                                        H.Motivo
                                                    )
                                                ) = ''
                                            THEN ''

                                            ELSE CONCAT(
                                                '. ',
                                                H.Motivo
                                            )
                                        END
                                    )

                                -- ==========================
                                -- ASIGNACIÓN AUTOMÁTICA
                                -- ==========================
                                WHEN
                                    H.Evento =
                                        'ASIGNACION_AUTOMATICA'
                                THEN
                                    CONCAT(
                                        'Asignación automática',

                                        CASE
                                            WHEN
                                                TN.NombreCompleto
                                                    IS NULL
                                            THEN ''

                                            ELSE CONCAT(
                                                '. Técnico: ',
                                                TN.NombreCompleto
                                            )
                                        END,

                                        CASE
                                            WHEN
                                                H.Motivo IS NULL
                                                OR LTRIM(
                                                    RTRIM(
                                                        H.Motivo
                                                    )
                                                ) = ''
                                            THEN ''

                                            ELSE CONCAT(
                                                '. ',
                                                H.Motivo
                                            )
                                        END
                                    )

                                -- ==========================
                                -- OTROS EVENTOS
                                -- ==========================
                                ELSE
                                    ISNULL(
                                        H.Motivo,
                                        'Evento de asignación'
                                    )
                            END
                            AS varchar(500)
                        ) AS Detalle,

                        CAST(
                            H.EstadoAnterior
                            AS varchar(30)
                        ) AS EstadoAnterior,

                        CAST(
                            H.EstadoNuevo
                            AS varchar(30)
                        ) AS EstadoNuevo,

                        CAST(
                            H.Fuente
                            AS varchar(20)
                        ) AS Fuente,

                        H.IdUsuario,

                        U.NombreCompleto
                            AS UsuarioResponsable,

                        U.Usuario
                            AS NombreUsuarioResponsable,

                        R.Nombre
                            AS RolResponsable,

                        CAST(
                            NULL
                            AS varchar(255)
                        ) AS NombreArchivo,

                        CAST(
                            COALESCE(
                                TN.NombreCompleto,
                                TA.NombreCompleto
                            )
                            AS varchar(150)
                        ) AS Tecnico,

                        CAST(
                            TA.NombreCompleto
                            AS varchar(150)
                        ) AS TecnicoAnterior,

                        CAST(
                            TN.NombreCompleto
                            AS varchar(150)
                        ) AS TecnicoNuevo

                    FROM dbo.HistorialAsignaciones H

                    INNER JOIN dbo.OrdenesTrabajo OT
                        ON OT.IdOrden =
                            H.IdOrden

                    LEFT JOIN dbo.Tecnicos TA
                        ON TA.IdTecnico =
                            H.IdTecnicoAnterior

                    LEFT JOIN dbo.Tecnicos TN
                        ON TN.IdTecnico =
                            H.IdTecnicoNuevo

                    LEFT JOIN dbo.Usuarios U
                        ON U.IdUsuario =
                            H.IdUsuario

                    LEFT JOIN dbo.Roles R
                        ON R.IdRol =
                            U.IdRol


                    UNION ALL


                    -- =====================================
                    -- 4. CAMBIOS DE ESTADO DE LAS OT
                    -- =====================================
                    SELECT
                        CAST(
                            CONCAT(
                                'EST-',
                                H.IdHistorial
                            )
                            AS varchar(50)
                        ) AS IdEvento,

                        CAST(
                            'CAMBIO_ESTADO'
                            AS varchar(30)
                        ) AS TipoEvento,

                        CAST(
                            'Órdenes'
                            AS varchar(60)
                        ) AS Modulo,

                        H.FechaEvento,

                        CAST(
                            CONCAT(
                                'OT ',
                                OT.CodigoOT
                            )
                            AS varchar(120)
                        ) AS Referencia,

                        CAST(
                            OT.CodigoOT
                            AS varchar(30)
                        ) AS CodigoOT,

                        CAST(
                            H.Evento
                            AS varchar(60)
                        ) AS Accion,

                        CAST(
                            H.Motivo
                            AS varchar(500)
                        ) AS Detalle,

                        CAST(
                            H.EstadoAnterior
                            AS varchar(30)
                        ) AS EstadoAnterior,

                        CAST(
                            H.EstadoNuevo
                            AS varchar(30)
                        ) AS EstadoNuevo,

                        CAST(
                            H.Fuente
                            AS varchar(20)
                        ) AS Fuente,

                        H.IdUsuario,

                        U.NombreCompleto
                            AS UsuarioResponsable,

                        U.Usuario
                            AS NombreUsuarioResponsable,

                        R.Nombre
                            AS RolResponsable,

                        CAST(
                            NULL
                            AS varchar(255)
                        ) AS NombreArchivo,

                        CAST(
                            NULL
                            AS varchar(150)
                        ) AS Tecnico,

                        CAST(
                            NULL
                            AS varchar(150)
                        ) AS TecnicoAnterior,

                        CAST(
                            NULL
                            AS varchar(150)
                        ) AS TecnicoNuevo

                    FROM dbo.HistorialEstadosOT H

                    INNER JOIN dbo.OrdenesTrabajo OT
                        ON OT.IdOrden =
                            H.IdOrden

                    LEFT JOIN dbo.Usuarios U
                        ON U.IdUsuario =
                            H.IdUsuario

                    LEFT JOIN dbo.Roles R
                        ON R.IdRol =
                            U.IdRol
                )

                SELECT
                    IdEvento,
                    TipoEvento,
                    Modulo,
                    FechaEvento,
                    Referencia,
                    CodigoOT,
                    Accion,
                    Detalle,
                    EstadoAnterior,
                    EstadoNuevo,
                    Fuente,
                    IdUsuario,
                    UsuarioResponsable,
                    NombreUsuarioResponsable,
                    RolResponsable,
                    NombreArchivo,
                    Tecnico,
                    TecnicoAnterior,
                    TecnicoNuevo

                FROM AuditoriaGeneral

                ORDER BY
                    FechaEvento DESC,
                    IdEvento DESC;
            `);

        console.log(
            (
                `Eventos encontrados: ` +
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
            "Error al consultar la auditoría:",
            error
        );

        return res
            .status(500)
            .json({
                ok: false,

                mensaje:
                    "No se pudo consultar la auditoría general.",

                detalle:
                    error.message
            });
    }
}

module.exports = {
    obtenerAuditoria
};