const {
    conectarDB,
    sql
} = require("../config/database");

// =====================================
// BUSCAR USUARIO PARA INICIAR SESIÓN
// =====================================
async function obtenerUsuarioPorNombre(usuario) {
    const pool = await conectarDB();

    const resultado = await pool.request()
        .input(
            "Usuario",
            sql.VarChar(50),
            usuario
        )
        .query(`
            SELECT TOP (1)
                U.IdUsuario,
                U.IdRol,
                U.NombreCompleto,
                U.Usuario,
                U.PasswordHash,
                U.Correo,
                U.Estado,
                R.Nombre AS Rol
            FROM dbo.Usuarios U
            INNER JOIN dbo.Roles R
                ON R.IdRol = U.IdRol
            WHERE
                UPPER(LTRIM(RTRIM(U.Usuario))) =
                UPPER(LTRIM(RTRIM(@Usuario)));
        `);

    return resultado.recordset[0] || null;
}

module.exports = {
    obtenerUsuarioPorNombre
};