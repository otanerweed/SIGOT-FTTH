const {
    conectarDB,
    sql
} = require("../config/database");

// =====================================
// LISTAR USUARIOS
// =====================================
async function listarUsuarios() {
    const pool = await conectarDB();

    const resultado = await pool.request()
        .query(`
            SELECT
                U.IdUsuario,
                U.IdRol,
                U.NombreCompleto,
                U.Usuario,
                U.Correo,
                U.Estado,
                U.FechaRegistro,
                R.Nombre AS Rol
            FROM dbo.Usuarios U
            INNER JOIN dbo.Roles R
                ON R.IdRol = U.IdRol
            ORDER BY
                U.Estado DESC,
                U.NombreCompleto ASC;
        `);

    return resultado.recordset;
}

// =====================================
// OBTENER USUARIO POR ID
// =====================================
async function obtenerUsuarioPorId(idUsuario) {
    const pool = await conectarDB();

    const resultado = await pool.request()
        .input(
            "IdUsuario",
            sql.Int,
            idUsuario
        )
        .query(`
            SELECT TOP (1)
                U.IdUsuario,
                U.IdRol,
                U.NombreCompleto,
                U.Usuario,
                U.Correo,
                U.Estado,
                U.FechaRegistro,
                R.Nombre AS Rol
            FROM dbo.Usuarios U
            INNER JOIN dbo.Roles R
                ON R.IdRol = U.IdRol
            WHERE U.IdUsuario = @IdUsuario;
        `);

    return resultado.recordset[0] || null;
}

// =====================================
// BUSCAR USUARIO POR NOMBRE
// =====================================
async function obtenerUsuarioPorNombre(
    usuario,
    idExcluir = null
) {
    const pool = await conectarDB();

    const resultado = await pool.request()
        .input(
            "Usuario",
            sql.VarChar(50),
            usuario
        )
        .input(
            "IdExcluir",
            sql.Int,
            idExcluir
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
                U.FechaRegistro,
                R.Nombre AS Rol
            FROM dbo.Usuarios U
            INNER JOIN dbo.Roles R
                ON R.IdRol = U.IdRol
            WHERE
                UPPER(LTRIM(RTRIM(U.Usuario))) =
                UPPER(LTRIM(RTRIM(@Usuario)))
                AND (
                    @IdExcluir IS NULL
                    OR U.IdUsuario <> @IdExcluir
                );
        `);

    return resultado.recordset[0] || null;
}

// =====================================
// LISTAR ROLES
// =====================================
async function listarRoles() {
    const pool = await conectarDB();

    const resultado = await pool.request()
        .query(`
            SELECT
                IdRol,
                Nombre,
                Descripcion
            FROM dbo.Roles
            ORDER BY IdRol ASC;
        `);

    return resultado.recordset;
}

// =====================================
// OBTENER ROL POR ID
// =====================================
async function obtenerRolPorId(idRol) {
    const pool = await conectarDB();

    const resultado = await pool.request()
        .input(
            "IdRol",
            sql.Int,
            idRol
        )
        .query(`
            SELECT TOP (1)
                IdRol,
                Nombre,
                Descripcion
            FROM dbo.Roles
            WHERE IdRol = @IdRol;
        `);

    return resultado.recordset[0] || null;
}

// =====================================
// CREAR USUARIO
// =====================================
async function crearUsuario(datos) {
    const pool = await conectarDB();

    const resultado = await pool.request()
        .input(
            "IdRol",
            sql.Int,
            datos.IdRol
        )
        .input(
            "NombreCompleto",
            sql.VarChar(150),
            datos.NombreCompleto
        )
        .input(
            "Usuario",
            sql.VarChar(50),
            datos.Usuario
        )
        .input(
            "PasswordHash",
            sql.VarChar(255),
            datos.PasswordHash
        )
        .input(
            "Correo",
            sql.VarChar(100),
            datos.Correo
        )
        .input(
            "Estado",
            sql.Bit,
            datos.Estado
        )
        .query(`
            INSERT INTO dbo.Usuarios
            (
                IdRol,
                NombreCompleto,
                Usuario,
                PasswordHash,
                Correo,
                Estado,
                FechaRegistro
            )
            OUTPUT INSERTED.IdUsuario
            VALUES
            (
                @IdRol,
                @NombreCompleto,
                @Usuario,
                @PasswordHash,
                @Correo,
                @Estado,
                GETDATE()
            );
        `);

    return resultado.recordset[0]?.IdUsuario;
}

// =====================================
// ACTUALIZAR USUARIO
// =====================================
async function actualizarUsuario(
    idUsuario,
    datos
) {
    const pool = await conectarDB();

    await pool.request()
        .input(
            "IdUsuario",
            sql.Int,
            idUsuario
        )
        .input(
            "IdRol",
            sql.Int,
            datos.IdRol
        )
        .input(
            "NombreCompleto",
            sql.VarChar(150),
            datos.NombreCompleto
        )
        .input(
            "Usuario",
            sql.VarChar(50),
            datos.Usuario
        )
        .input(
            "Correo",
            sql.VarChar(100),
            datos.Correo
        )
        .input(
            "PasswordHash",
            sql.VarChar(255),
            datos.PasswordHash
        )
        .query(`
            UPDATE dbo.Usuarios
            SET
                IdRol = @IdRol,
                NombreCompleto = @NombreCompleto,
                Usuario = @Usuario,
                Correo = @Correo,
                PasswordHash =
                    COALESCE(
                        @PasswordHash,
                        PasswordHash
                    )
            WHERE IdUsuario = @IdUsuario;
        `);
}

// =====================================
// ACTIVAR O DESACTIVAR USUARIO
// =====================================
async function actualizarEstadoUsuario(
    idUsuario,
    estado
) {
    const pool = await conectarDB();

    await pool.request()
        .input(
            "IdUsuario",
            sql.Int,
            idUsuario
        )
        .input(
            "Estado",
            sql.Bit,
            estado
        )
        .query(`
            UPDATE dbo.Usuarios
            SET Estado = @Estado
            WHERE IdUsuario = @IdUsuario;
        `);
}

module.exports = {
    listarUsuarios,
    obtenerUsuarioPorId,
    obtenerUsuarioPorNombre,
    listarRoles,
    obtenerRolPorId,
    crearUsuario,
    actualizarUsuario,
    actualizarEstadoUsuario
};