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
// OBTENER TÉCNICO POR CÓDIGO
// ===============================
async function obtenerTecnicoPorCodigo(
    codigoTecnico,
    idExcluir = null
) {
    const pool = await conectarDB();

    const resultado = await pool.request()
        .input(
            "CodigoTecnico",
            sql.VarChar(20),
            codigoTecnico
        )
        .input(
            "IdExcluir",
            sql.Int,
            idExcluir
        )
        .query(`
            SELECT TOP (1)
                IdTecnico,
                CodigoTecnico,
                NombreCompleto,
                Activo
            FROM dbo.Tecnicos
            WHERE
                UPPER(
                    LTRIM(
                        RTRIM(CodigoTecnico)
                    )
                ) =
                UPPER(
                    LTRIM(
                        RTRIM(@CodigoTecnico)
                    )
                )
                AND
                (
                    @IdExcluir IS NULL
                    OR IdTecnico <> @IdExcluir
                );
        `);

    return resultado.recordset[0] || null;
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
// OBTENER DISPONIBILIDAD
// ===============================
async function obtenerDisponibilidadTecnico(
    idTecnico
) {
    const pool = await conectarDB();

    const resultado = await pool.request()
        .input(
            "IdTecnico",
            sql.Int,
            idTecnico
        )
        .query(`
            SELECT
                D.IdDisponibilidad,
                D.IdTecnico,
                CONVERT(
                    char(10),
                    D.FechaVigencia,
                    23
                ) AS FechaVigencia,
                D.DisponibleAM,
                D.DisponiblePM,
                D.NocturnoConfirmado,
                D.Motivo,
                D.Observaciones,
                D.FechaRegistro,
                D.IdUsuarioRegistro,
                U.NombreCompleto AS UsuarioRegistro
            FROM dbo.DisponibilidadTecnicos D
            LEFT JOIN dbo.Usuarios U
                ON U.IdUsuario =
                    D.IdUsuarioRegistro
            WHERE
                D.IdTecnico = @IdTecnico
            ORDER BY
                D.FechaVigencia DESC,
                D.IdDisponibilidad DESC;
        `);

    return resultado.recordset;
}

// ===============================
// GUARDAR / ACTUALIZAR DISPONIBILIDAD
// ===============================
async function guardarDisponibilidadTecnico(
    idTecnico,
    datos,
    idUsuario
) {
    const pool = await conectarDB();

    const resultado = await pool.request()
        .input(
            "IdTecnico",
            sql.Int,
            idTecnico
        )
        .input(
            "FechaVigencia",
            sql.Date,
            datos.FechaVigencia
        )
        .input(
            "DisponibleAM",
            sql.Bit,
            datos.DisponibleAM
        )
        .input(
            "DisponiblePM",
            sql.Bit,
            datos.DisponiblePM
        )
        .input(
            "NocturnoConfirmado",
            sql.Bit,
            datos.NocturnoConfirmado
        )
        .input(
            "Motivo",
            sql.VarChar(250),
            datos.Motivo || null
        )
        .input(
            "Observaciones",
            sql.VarChar(500),
            datos.Observaciones || null
        )
        .input(
            "IdUsuario",
            sql.Int,
            idUsuario
        )
        .query(`
            SET NOCOUNT ON;

            IF EXISTS
            (
                SELECT 1
                FROM dbo.DisponibilidadTecnicos
                WHERE
                    IdTecnico = @IdTecnico
                    AND FechaVigencia =
                        @FechaVigencia
            )
            BEGIN
                UPDATE dbo.DisponibilidadTecnicos
                SET
                    DisponibleAM =
                        @DisponibleAM,
                    DisponiblePM =
                        @DisponiblePM,
                    NocturnoConfirmado =
                        @NocturnoConfirmado,
                    Motivo =
                        @Motivo,
                    Observaciones =
                        @Observaciones,
                    IdUsuarioRegistro =
                        @IdUsuario
                WHERE
                    IdTecnico = @IdTecnico
                    AND FechaVigencia =
                        @FechaVigencia;

                SELECT
                    IdDisponibilidad,
                    CAST(0 AS bit) AS Creado
                FROM dbo.DisponibilidadTecnicos
                WHERE
                    IdTecnico = @IdTecnico
                    AND FechaVigencia =
                        @FechaVigencia;
            END
            ELSE
            BEGIN
                INSERT INTO dbo.DisponibilidadTecnicos
                (
                    IdTecnico,
                    FechaVigencia,
                    DisponibleAM,
                    DisponiblePM,
                    NocturnoConfirmado,
                    Motivo,
                    Observaciones,
                    FechaRegistro,
                    IdUsuarioRegistro
                )
                OUTPUT
                    INSERTED.IdDisponibilidad,
                    CAST(1 AS bit) AS Creado
                VALUES
                (
                    @IdTecnico,
                    @FechaVigencia,
                    @DisponibleAM,
                    @DisponiblePM,
                    @NocturnoConfirmado,
                    @Motivo,
                    @Observaciones,
                    GETDATE(),
                    @IdUsuario
                );
            END
        `);

    return resultado.recordset?.[0] || null;
}
// ===============================
// EXPORTAR FUNCIONES
// ===============================
module.exports = {
    obtenerTecnicos,
    obtenerTecnicoPorId,
    obtenerTecnicoPorCodigo,
    crearTecnico,
    actualizarTecnico,
    actualizarEstadoTecnico,
    obtenerDisponibilidadTecnico,
    guardarDisponibilidadTecnico
};