const {
    conectarDB,
    sql
} = require("../config/database");

// ===============================
// LISTAR TÉCNICOS
// ===============================
async function obtenerTecnicos() {
    const pool = await conectarDB();

    const resultado = await pool.request().query(`
        SELECT
            IdTecnico,
            CodigoTecnico,
            NombreCompleto,
            Telefono,
            TipoTecnico,
            DistritoBase,
            CapacidadMaxima,
            Disponible,
            Activo
        FROM dbo.Tecnicos
        ORDER BY
            Activo DESC,
            NombreCompleto ASC
    `);

    return resultado.recordset;
}

// ===============================
// OBTENER TÉCNICO POR ID
// ===============================
async function obtenerTecnicoPorId(id) {
    const pool = await conectarDB();

    const resultado = await pool.request()
        .input(
            "id",
            sql.Int,
            id
        )
        .query(`
            SELECT
                IdTecnico,
                CodigoTecnico,
                NombreCompleto,
                Telefono,
                TipoTecnico,
                DistritoBase,
                CapacidadMaxima,
                Disponible,
                Activo
            FROM dbo.Tecnicos
            WHERE IdTecnico = @id
        `);

    return resultado.recordset[0];
}

// ===============================
// CREAR TÉCNICO
// ===============================
async function crearTecnico(datos) {
    const pool = await conectarDB();

    const resultado = await pool.request()
        .input(
            "CodigoTecnico",
            sql.VarChar(20),
            datos.CodigoTecnico
        )
        .input(
            "NombreCompleto",
            sql.VarChar(150),
            datos.NombreCompleto
        )
        .input(
            "Telefono",
            sql.VarChar(20),
            datos.Telefono || null
        )
        .input(
            "TipoTecnico",
            sql.VarChar(50),
            datos.TipoTecnico
        )
        .input(
            "DistritoBase",
            sql.VarChar(50),
            datos.DistritoBase
        )
        .input(
            "CapacidadMaxima",
            sql.Int,
            datos.CapacidadMaxima
        )
        .input(
            "Disponible",
            sql.Bit,
            datos.Disponible
        )
        .query(`
            INSERT INTO dbo.Tecnicos
            (
                CodigoTecnico,
                NombreCompleto,
                Telefono,
                TipoTecnico,
                DistritoBase,
                CapacidadMaxima,
                Disponible,
                Activo
            )
            VALUES
            (
                @CodigoTecnico,
                @NombreCompleto,
                @Telefono,
                @TipoTecnico,
                @DistritoBase,
                @CapacidadMaxima,
                @Disponible,
                1
            );

            SELECT
                SCOPE_IDENTITY() AS IdTecnico;
        `);

    return resultado.recordset[0];
}
// ===============================
// ACTUALIZAR TÉCNICO
// ===============================
async function actualizarTecnico(id, datos) {
    const pool = await conectarDB();

    const resultado = await pool.request()
        .input(
            "IdTecnico",
            sql.Int,
            id
        )
        .input(
            "CodigoTecnico",
            sql.VarChar(20),
            datos.CodigoTecnico
        )
        .input(
            "NombreCompleto",
            sql.VarChar(150),
            datos.NombreCompleto
        )
        .input(
            "Telefono",
            sql.VarChar(20),
            datos.Telefono || null
        )
        .input(
            "TipoTecnico",
            sql.VarChar(50),
            datos.TipoTecnico
        )
        .input(
            "DistritoBase",
            sql.VarChar(50),
            datos.DistritoBase
        )
        .input(
            "CapacidadMaxima",
            sql.Int,
            datos.CapacidadMaxima
        )
        .input(
            "Disponible",
            sql.Bit,
            datos.Disponible
        )
        .query(`
            UPDATE dbo.Tecnicos
            SET
                CodigoTecnico = @CodigoTecnico,
                NombreCompleto = @NombreCompleto,
                Telefono = @Telefono,
                TipoTecnico = @TipoTecnico,
                DistritoBase = @DistritoBase,
                CapacidadMaxima = @CapacidadMaxima,
                Disponible = @Disponible
            WHERE IdTecnico = @IdTecnico;

            SELECT @@ROWCOUNT AS FilasAfectadas;
        `);

    return resultado.recordset[0];
}
// ===============================
// ACTIVAR O DESACTIVAR TÉCNICO
// ===============================
async function actualizarEstadoTecnico(id, activo) {
    const pool = await conectarDB();

    const resultado = await pool.request()
        .input(
            "IdTecnico",
            sql.Int,
            id
        )
        .input(
            "Activo",
            sql.Bit,
            activo
        )
        .query(`
            UPDATE dbo.Tecnicos
            SET
                Activo = @Activo,

                /*
                 * Si el técnico se desactiva,
                 * también deja de estar disponible
                 * para nuevas asignaciones.
                 */
                Disponible =
                    CASE
                        WHEN @Activo = 0 THEN 0
                        ELSE Disponible
                    END
            WHERE IdTecnico = @IdTecnico;

            SELECT @@ROWCOUNT AS FilasAfectadas;
        `);

    return resultado.recordset[0];
}
// ===============================
// EXPORTAR FUNCIONES
// ===============================
module.exports = {
    obtenerTecnicos,
    obtenerTecnicoPorId,
    crearTecnico,
    actualizarTecnico,
    actualizarEstadoTecnico
};