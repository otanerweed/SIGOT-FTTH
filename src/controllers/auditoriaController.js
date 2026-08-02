const {
    conectarDB
} = require("../config/database");

/**
 * Obtiene los eventos generales del sistema:
 *
 * - Importaciones OFSC.
 * - Asignaciones de técnicos.
 * - Cambios de estado de las OT.
 *
 * GET /api/auditoria
 */
async function obtenerAuditoria(req, res) {
    try {
        console.log(
            "========== AUDITORÍA GENERAL =========="
        );

        const pool = await conectarDB();

        const resultado =
            await pool.request().query(`
                WITH AuditoriaGeneral AS
                (
                    -- =====================================
                    -- IMPORTACIONES OFSC
                    -- =====================================
                    SELECT
                        CAST(
                            CONCAT(
                                'IMP-',
                                O.IdOperacion
                            )
                            AS varchar(40)
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
                        ) AS Tecnico

                    FROM dbo.Operaciones O

                    LEFT JOIN dbo.Usuarios U
                        ON U.IdUsuario =
                            O.IdUsuario

                    LEFT JOIN dbo.Roles R
                        ON R.IdRol =
                            U.IdRol

                    UNION ALL

                    -- =====================================
                    -- ASIGNACIONES DE TÉCNICOS
                    -- =====================================
                    SELECT
                        CAST(
                            CONCAT(
                                'ASI-',
                                A.IdAsignacion
                            )
                            AS varchar(40)
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
                        ) AS Tecnico

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

                    UNION ALL

                    -- =====================================
                    -- CAMBIOS DE ESTADO DE LAS OT
                    -- =====================================
                    SELECT
                        CAST(
                            CONCAT(
                                'EST-',
                                H.IdHistorial
                            )
                            AS varchar(40)
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
                        ) AS Tecnico

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
                    Tecnico

                FROM AuditoriaGeneral

                ORDER BY
                    FechaEvento DESC,
                    IdEvento DESC;
            `);

        console.log(
            `Eventos encontrados: ${resultado.recordset.length}`
        );

        return res.status(200).json(
            resultado.recordset
        );
    } catch (error) {
        console.error(
            "Error al consultar la auditoría:",
            error
        );

        return res.status(500).json({
            ok: false,
            mensaje:
                "No se pudo consultar la auditoría general.",
            detalle: error.message
        });
    }
}

module.exports = {
    obtenerAuditoria
};