const { sql } = require("../config/database");

/**
 * Registra un evento de asignación dentro de la
 * misma transacción que produjo el cambio.
 */
async function registrarHistorialAsignacion(
    transaction,
    {
        idAsignacion,
        idOrden,
        idTecnicoAnterior = null,
        idTecnicoNuevo = null,
        evento,
        estadoAnterior = null,
        estadoNuevo,
        motivo = null,
        fuente = "SIGOT",
        idUsuario,
        idActividad = null
    }
) {
    await new sql.Request(transaction)
        .input(
            "IdAsignacion",
            sql.Int,
            idAsignacion
        )
        .input(
            "IdOrden",
            sql.Int,
            idOrden
        )
        .input(
            "IdTecnicoAnterior",
            sql.Int,
            idTecnicoAnterior
        )
        .input(
            "IdTecnicoNuevo",
            sql.Int,
            idTecnicoNuevo
        )
        .input(
            "Evento",
            sql.VarChar(30),
            evento
        )
        .input(
            "EstadoAnterior",
            sql.VarChar(20),
            estadoAnterior
        )
        .input(
            "EstadoNuevo",
            sql.VarChar(20),
            estadoNuevo
        )
        .input(
            "Motivo",
            sql.VarChar(500),
            motivo
        )
        .input(
            "Fuente",
            sql.VarChar(20),
            fuente
        )
        .input(
            "IdUsuario",
            sql.Int,
            idUsuario
        )
        .input(
            "IdActividad",
            sql.Int,
            idActividad
        )
        .query(`
            INSERT INTO dbo.HistorialAsignaciones
            (
                IdAsignacion,
                IdOrden,
                IdTecnicoAnterior,
                IdTecnicoNuevo,
                Evento,
                EstadoAnterior,
                EstadoNuevo,
                Motivo,
                Fuente,
                FechaEvento,
                IdUsuario,
                IdActividad
            )
            VALUES
            (
                @IdAsignacion,
                @IdOrden,
                @IdTecnicoAnterior,
                @IdTecnicoNuevo,
                @Evento,
                @EstadoAnterior,
                @EstadoNuevo,
                @Motivo,
                @Fuente,
                SYSDATETIME(),
                @IdUsuario,
                @IdActividad
            );
        `);
}

module.exports = {
    registrarHistorialAsignacion
};
