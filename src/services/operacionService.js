const { sql } = require("../config/database");

/**
 * Recalcula los indicadores de una operación utilizando
 * el estado real de sus órdenes de trabajo.
 *
 * Debe ejecutarse dentro de una transacción existente.
 */
async function sincronizarOperacion(transaction, idOperacion) {
    if (!transaction) {
        throw new Error(
            "Se necesita una transacción para sincronizar la operación."
        );
    }

    if (!Number.isInteger(idOperacion) || idOperacion <= 0) {
        throw new Error("El IdOperacion no es válido.");
    }

    await new sql.Request(transaction)
        .input("IdOperacion", sql.Int, idOperacion)
        .query(`
            UPDATE O
            SET
                O.CantidadOT = R.CantidadOT,
                O.CantidadAsignadas = R.CantidadAsignadas,
                O.CantidadPendientes = R.CantidadPendientes,
                O.CantidadFinalizadas = R.CantidadFinalizadas
            FROM dbo.Operaciones O

            CROSS APPLY (
                SELECT
                    COUNT(OT.IdOrden) AS CantidadOT,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN OT.EstadoAsignacion = 'ASIGNADA'
                                THEN 1
                                ELSE 0
                            END
                        ),
                        0
                    ) AS CantidadAsignadas,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN OT.EstadoAsignacion = 'SIN ASIGNAR'
                                THEN 1
                                ELSE 0
                            END
                        ),
                        0
                    ) AS CantidadPendientes,

                    COALESCE(
                        SUM(
                            CASE
                                WHEN OT.EstadoAsignacion = 'FINALIZADA'
                                THEN 1
                                ELSE 0
                            END
                        ),
                        0
                    ) AS CantidadFinalizadas

                FROM dbo.OrdenesTrabajo OT
                WHERE OT.IdOperacion = O.IdOperacion
            ) R

            WHERE O.IdOperacion = @IdOperacion;
        `);
}

module.exports = {
    sincronizarOperacion
};