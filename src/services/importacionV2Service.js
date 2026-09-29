const { sql } = require("../config/database");


/**
 * Convierte cualquier valor a texto seguro
 * para guardarlo en el historial.
 */
function convertirValorHistorial(valor) {
    if (
        valor === undefined ||
        valor === null
    ) {
        return null;
    }

    if (valor instanceof Date) {
        if (Number.isNaN(valor.getTime())) {
            return null;
        }

        return valor
            .toISOString()
            .slice(0, 10);
    }

    const texto = String(valor).trim();

    return texto === ""
        ? null
        : texto;
}


/**
 * Determina si una OT nueva necesita un TSS inicial.
 * Las órdenes terminales ya no requieren programación.
 */
function requiereTSSInicial(estadoOT) {
    const estado = String(
        estadoOT || ""
    )
        .trim()
        .toUpperCase();

    return ![
        "CANCELADA",
        "FINALIZADA"
    ].includes(estado);
}


/**
 * Registra qué ocurrió con una fila/OT
 * durante una importación OFSC.
 *
 * Resultado:
 * - NUEVA
 * - ACTUALIZADA
 * - SIN_CAMBIOS
 * - ERROR
 */
async function registrarDetalleImportacion(
    transaction,
    {
        idOperacion,
        idOrden = null,
        codigoOT = null,
        resultado,
        mensaje = null
    }
) {
    await new sql.Request(transaction)

        .input(
            "IdOperacion",
            sql.Int,
            idOperacion
        )

        .input(
            "IdOrden",
            sql.Int,
            idOrden
        )

        .input(
            "CodigoOT",
            sql.VarChar(30),
            codigoOT
        )

        .input(
            "Resultado",
            sql.VarChar(20),
            resultado
        )

        .input(
            "Mensaje",
            sql.VarChar(500),
            mensaje
        )

        .query(`
            INSERT INTO dbo.DetalleImportacionOFSC
            (
                IdOperacion,
                IdOrden,
                CodigoOT,
                Resultado,
                Mensaje
            )
            VALUES
            (
                @IdOperacion,
                @IdOrden,
                @CodigoOT,
                @Resultado,
                @Mensaje
            );
        `);
}


/**
 * Guarda un campo que cambió durante
 * una nueva importación OFSC.
 */
async function registrarCambioOFSC(
    transaction,
    {
        idOrden,
        idOperacion,
        campo,
        valorAnterior,
        valorNuevo
    }
) {
    const anterior =
        convertirValorHistorial(
            valorAnterior
        );

    const nuevo =
        convertirValorHistorial(
            valorNuevo
        );

    if (anterior === nuevo) {
        return;
    }

    await new sql.Request(transaction)

        .input(
            "IdOrden",
            sql.Int,
            idOrden
        )

        .input(
            "IdOperacion",
            sql.Int,
            idOperacion
        )

        .input(
            "Campo",
            sql.VarChar(100),
            campo
        )

        .input(
            "ValorAnterior",
            sql.VarChar(1000),
            anterior
        )

        .input(
            "ValorNuevo",
            sql.VarChar(1000),
            nuevo
        )

        .query(`
            INSERT INTO dbo.HistorialCambiosOFSC
            (
                IdOrden,
                IdOperacion,
                Campo,
                ValorAnterior,
                ValorNuevo
            )
            VALUES
            (
                @IdOrden,
                @IdOperacion,
                @Campo,
                @ValorAnterior,
                @ValorNuevo
            );
        `);
}


/**
 * Guarda varios cambios detectados
 * sobre una misma OT.
 */
async function registrarCambiosOFSC(
    transaction,
    idOrden,
    idOperacion,
    cambios = []
) {
    for (const cambio of cambios) {
        await registrarCambioOFSC(
            transaction,
            {
                idOrden,
                idOperacion,
                campo: cambio.campo,
                valorAnterior:
                    cambio.valorAnterior,
                valorNuevo:
                    cambio.valorNuevo
            }
        );
    }
}


/**
 * Crea el TSS inicial cuando el flujo de
 * importación determina que la OT requiere
 * programación.
 */
/**
 * Crea el TSS inicial únicamente para
 * órdenes pertenecientes a RED ENTEL.
 *
 * RED WINET no utiliza flujo TSS.
 */
async function crearTSSInicial(
    transaction,
    idOrden,
    idUsuario
) {
    await new sql.Request(transaction)

        .input(
            "IdOrden",
            sql.Int,
            idOrden
        )

        .input(
            "IdUsuario",
            sql.Int,
            idUsuario
        )

        .query(`
            IF EXISTS
            (
                SELECT 1
                FROM dbo.OrdenesTrabajo OT
                INNER JOIN dbo.Proyectos P
                    ON P.IdProyecto = OT.IdProyecto
                WHERE
                    OT.IdOrden = @IdOrden
                    AND P.Codigo = 'RED_ENTEL'
                    AND P.Activo = 1
            )
            AND NOT EXISTS
            (
                SELECT 1
                FROM dbo.TSS
                WHERE IdOrden = @IdOrden
            )
            BEGIN
                INSERT INTO dbo.TSS
                (
                    IdOrden,
                    EstadoTSS,
                    IdUsuarioRegistro
                )
                VALUES
                (
                    @IdOrden,
                    'PENDIENTE_PROGRAMACION',
                    @IdUsuario
                );
            END;
        `);
}


/**
 * Actualiza el resumen final de una
 * operación de importación.
 */
async function actualizarResumenOperacion(
    transaction,
    idOperacion,
    resumen
) {
    const nuevas =
        resumen.insertadas ?? 0;

    const actualizadas =
        resumen.actualizadas ?? 0;

    const sinCambios =
        resumen.sinCambios ?? 0;

    const errores =
        resumen.rechazadas ?? 0;

    const total =
        resumen.totalLeidas ?? 0;

    const observaciones =
        (
            `Importación OFSC V2. ` +
            `Nuevas: ${nuevas}. ` +
            `Actualizadas: ${actualizadas}. ` +
            `Sin cambios: ${sinCambios}. ` +
            `Errores: ${errores}.`
        );

    await new sql.Request(transaction)

        .input(
            "IdOperacion",
            sql.Int,
            idOperacion
        )

        .input(
            "CantidadOT",
            sql.Int,
            total
        )

        .input(
            "CantidadNuevas",
            sql.Int,
            nuevas
        )

        .input(
            "CantidadActualizadas",
            sql.Int,
            actualizadas
        )

        .input(
            "CantidadSinCambios",
            sql.Int,
            sinCambios
        )

        .input(
            "CantidadErrores",
            sql.Int,
            errores
        )

        .input(
            "Observaciones",
            sql.VarChar(500),
            observaciones
        )

        .query(`
            UPDATE dbo.Operaciones
            SET
                CantidadOT =
                    @CantidadOT,

                CantidadNuevas =
                    @CantidadNuevas,

                CantidadActualizadas =
                    @CantidadActualizadas,

                CantidadSinCambios =
                    @CantidadSinCambios,

                CantidadErrores =
                    @CantidadErrores,

                Estado =
                    'CERRADA',

                Observaciones =
                    @Observaciones

            WHERE
                IdOperacion =
                    @IdOperacion;
        `);
}


module.exports = {
    convertirValorHistorial,
    requiereTSSInicial,
    registrarDetalleImportacion,
    registrarCambioOFSC,
    registrarCambiosOFSC,
    crearTSSInicial,
    actualizarResumenOperacion
};
