const {
    conectarDB,
    sql
} = require("../config/database");

// =====================================
// OBTENER TODOS LOS SEGUIMIENTOS
// =====================================
async function obtenerSeguimientos() {
    const pool =
        await conectarDB();

    const resultado =
        await pool.request().query(`
            SELECT
                S.IdSeguimiento,
                S.IdAsignacion,
                S.Evento,
                S.EstadoAnterior,
                S.EstadoNuevo,
                S.Comentario,
                S.FechaEvento,
                S.IdUsuario,

                -- =====================================
                -- ORDEN
                -- =====================================
                OT.IdOrden,
                OT.CodigoOT,
                OT.Cliente,
                OT.Distrito,
                OT.Direccion,
                OT.FechaAgenda,
                OT.Horario,
                OT.EstadoOT,
                OT.EstadoAsignacion,

                -- =====================================
                -- ASIGNACIÓN
                -- =====================================
                A.TipoAsignacion,

                A.Estado
                    AS EstadoAsignacionTecnico,

                A.FechaAsignacion,

                -- =====================================
                -- TÉCNICO
                -- =====================================
                T.IdTecnico,
                T.CodigoTecnico,

                T.NombreCompleto
                    AS Tecnico,

                -- =====================================
                -- RESPONSABLE DEL EVENTO
                -- =====================================
                U.NombreCompleto
                    AS UsuarioResponsable,

                U.Usuario
                    AS NombreUsuarioResponsable,

                R.Nombre
                    AS RolResponsable,

                -- =====================================
                -- EVIDENCIAS
                -- =====================================
                ISNULL(
                    EV.CantidadEvidencias,
                    0
                ) AS CantidadEvidencias

            FROM dbo.SeguimientoOT S

            INNER JOIN dbo.Asignaciones A
                ON A.IdAsignacion =
                    S.IdAsignacion

            INNER JOIN dbo.OrdenesTrabajo OT
                ON OT.IdOrden =
                    A.IdOrden

            LEFT JOIN dbo.Tecnicos T
                ON T.IdTecnico =
                    A.IdTecnico

            LEFT JOIN dbo.Usuarios U
                ON U.IdUsuario =
                    S.IdUsuario

            LEFT JOIN dbo.Roles R
                ON R.IdRol =
                    U.IdRol

            OUTER APPLY
            (
                SELECT
                    COUNT(*) AS CantidadEvidencias

                FROM dbo.Evidencias E

                WHERE
                    E.IdSeguimiento =
                        S.IdSeguimiento
            ) EV

            ORDER BY
                S.FechaEvento DESC,
                S.IdSeguimiento DESC;
        `);

    return resultado.recordset;
}

// =====================================
// OBTENER SEGUIMIENTO POR ASIGNACIÓN
// =====================================
async function obtenerSeguimientoPorAsignacion(
    idAsignacionRecibido
) {
    const idAsignacion =
        Number(
            idAsignacionRecibido
        );

    if (
        !Number.isInteger(
            idAsignacion
        ) ||
        idAsignacion <= 0
    ) {
        const error =
            new Error(
                "El IdAsignacion no es válido."
            );

        error.statusCode = 400;

        throw error;
    }

    const pool =
        await conectarDB();

    const resultado =
        await pool.request()
            .input(
                "IdAsignacion",
                sql.Int,
                idAsignacion
            )
            .query(`
                SELECT
                    S.IdSeguimiento,
                    S.IdAsignacion,
                    S.Evento,
                    S.EstadoAnterior,
                    S.EstadoNuevo,
                    S.Comentario,
                    S.FechaEvento,
                    S.IdUsuario,

                    -- =====================================
                    -- ORDEN
                    -- =====================================
                    OT.IdOrden,
                    OT.CodigoOT,
                    OT.Cliente,
                    OT.Distrito,
                    OT.Direccion,
                    OT.FechaAgenda,
                    OT.Horario,
                    OT.EstadoOT,
                    OT.EstadoAsignacion,

                    -- =====================================
                    -- ASIGNACIÓN
                    -- =====================================
                    A.TipoAsignacion,

                    A.Estado
                        AS EstadoAsignacionTecnico,

                    A.FechaAsignacion,

                    -- =====================================
                    -- TÉCNICO
                    -- =====================================
                    T.IdTecnico,
                    T.CodigoTecnico,

                    T.NombreCompleto
                        AS Tecnico,

                    -- =====================================
                    -- RESPONSABLE DEL EVENTO
                    -- =====================================
                    U.NombreCompleto
                        AS UsuarioResponsable,

                    U.Usuario
                        AS NombreUsuarioResponsable,

                    R.Nombre
                        AS RolResponsable,

                    -- =====================================
                    -- EVIDENCIAS
                    -- =====================================
                    ISNULL(
                        EV.CantidadEvidencias,
                        0
                    ) AS CantidadEvidencias

                FROM dbo.SeguimientoOT S

                INNER JOIN dbo.Asignaciones A
                    ON A.IdAsignacion =
                        S.IdAsignacion

                INNER JOIN dbo.OrdenesTrabajo OT
                    ON OT.IdOrden =
                        A.IdOrden

                LEFT JOIN dbo.Tecnicos T
                    ON T.IdTecnico =
                        A.IdTecnico

                LEFT JOIN dbo.Usuarios U
                    ON U.IdUsuario =
                        S.IdUsuario

                LEFT JOIN dbo.Roles R
                    ON R.IdRol =
                        U.IdRol

                OUTER APPLY
                (
                    SELECT
                        COUNT(*) AS CantidadEvidencias

                    FROM dbo.Evidencias E

                    WHERE
                        E.IdSeguimiento =
                            S.IdSeguimiento
                ) EV

                WHERE
                    S.IdAsignacion =
                        @IdAsignacion

                ORDER BY
                    S.FechaEvento ASC,
                    S.IdSeguimiento ASC;
            `);

    return resultado.recordset;
}

module.exports = {
    obtenerSeguimientos,
    obtenerSeguimientoPorAsignacion
};