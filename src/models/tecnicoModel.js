const { conectarDB, sql } = require("../config/database");

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
            Disponible
        FROM Tecnicos
        WHERE Activo = 1
        ORDER BY NombreCompleto
    `);

    return resultado.recordset;

}

// ===============================
// OBTENER TÉCNICO POR ID
// ===============================
async function obtenerTecnicoPorId(id) {

    const pool = await conectarDB();

    const resultado = await pool.request()
        .input("id", sql.Int, id)
        .query(`
            SELECT
                IdTecnico,
                CodigoTecnico,
                NombreCompleto,
                Telefono,
                TipoTecnico,
                DistritoBase,
                CapacidadMaxima,
                Disponible
            FROM Tecnicos
            WHERE IdTecnico = @id
            AND Activo = 1
        `);

    return resultado.recordset[0];

}

// ===============================
// CREAR TÉCNICO
// ===============================
async function crearTecnico(datos) {

    const pool = await conectarDB();

    const resultado = await pool.request()

        .input("CodigoTecnico", sql.VarChar(20), datos.CodigoTecnico)
        .input("NombreCompleto", sql.VarChar(150), datos.NombreCompleto)
        .input("Telefono", sql.VarChar(20), datos.Telefono)
        .input("TipoTecnico", sql.VarChar(50), datos.TipoTecnico)
        .input("DistritoBase", sql.VarChar(50), datos.DistritoBase)
        .input("CapacidadMaxima", sql.Int, datos.CapacidadMaxima)
        .input("Disponible", sql.Bit, datos.Disponible)

        .query(`
            INSERT INTO Tecnicos
            (
                CodigoTecnico,
                NombreCompleto,
                Telefono,
                TipoTecnico,
                DistritoBase,
                CapacidadMaxima,
                Disponible
            )
            VALUES
            (
                @CodigoTecnico,
                @NombreCompleto,
                @Telefono,
                @TipoTecnico,
                @DistritoBase,
                @CapacidadMaxima,
                @Disponible
            );

            SELECT SCOPE_IDENTITY() AS IdTecnico;
        `);

    return resultado.recordset[0];

}

// ===============================
// EXPORTAR FUNCIONES
// ===============================
module.exports = {
    obtenerTecnicos,
    obtenerTecnicoPorId,
    crearTecnico
};