const fs = require("fs/promises");

const {
    leerExcel
} = require("../services/excelService");

const {
    guardarOrdenes
} = require("../services/ordenesService");

const {
    sincronizarOperacion
} = require("../services/operacionService");

const {
    conectarDB,
    sql
} = require("../config/database");

/**
 * Importa un archivo Excel de OFSC.
 *
 * POST /api/importador/ofsc
 */
async function importarOFSC(req, res) {
    let transaction;
    let transactionIniciada = false;

    try {
        // =====================================
        // USUARIO AUTENTICADO DESDE EL JWT
        // =====================================
        const idUsuarioAutenticado = Number(
            req.usuario?.idUsuario
        );

        if (
            !Number.isInteger(
                idUsuarioAutenticado
            ) ||
            idUsuarioAutenticado <= 0
        ) {
            return res.status(401).json({
                ok: false,
                mensaje:
                    "No se pudo identificar al usuario autenticado."
            });
        }

        console.log(
            "========== INICIO IMPORTACIÓN =========="
        );

        console.log(
            `Usuario responsable: ${idUsuarioAutenticado}`
        );

        if (!req.file) {
            return res.status(400).json({
                ok: false,
                mensaje:
                    "Debe seleccionar un archivo Excel."
            });
        }

        console.log(
            "Archivo recibido:",
            req.file.originalname
        );

        /*
         * Leer y transformar el Excel.
         */
        const ordenes = leerExcel(
            req.file.path
        );

        if (
            !Array.isArray(ordenes) ||
            ordenes.length === 0
        ) {
            return res.status(400).json({
                ok: false,
                mensaje:
                    "El archivo no contiene órdenes válidas para procesar."
            });
        }

        console.log(
            `Cantidad de órdenes válidas: ${ordenes.length}`
        );

        const pool = await conectarDB();

        transaction =
            new sql.Transaction(pool);

        await transaction.begin(
            sql.ISOLATION_LEVEL.SERIALIZABLE
        );

        transactionIniciada = true;

        /*
         * Registrar la importación del archivo.
         */
        const resultadoOperacion =
            await new sql.Request(transaction)

                .input(
                    "NombreArchivo",
                    sql.VarChar(255),
                    req.file.originalname
                )

                .input(
                    "IdUsuario",
                    sql.Int,
                    idUsuarioAutenticado
                )

                .query(`
                    INSERT INTO dbo.Operaciones
                    (
                        FechaOperacion,
                        NombreArchivo,
                        CantidadOT,
                        CantidadAsignadas,
                        CantidadPendientes,
                        CantidadFinalizadas,
                        IdUsuario,
                        FechaImportacion,
                        Estado,
                        Observaciones
                    )
                    OUTPUT INSERTED.IdOperacion
                    VALUES
                    (
                        CAST(GETDATE() AS date),
                        @NombreArchivo,
                        0,
                        0,
                        0,
                        0,
                        @IdUsuario,
                        GETDATE(),
                        'ABIERTA',
                        'Importación y sincronización desde Excel OFSC'
                    );
                `);

        const idOperacion =
            resultadoOperacion.recordset[0]
                .IdOperacion;

        /*
         * Insertar órdenes nuevas y actualizar
         * las órdenes existentes.
         *
         * También se envía el usuario autenticado
         * para registrar el historial.
         */
        const resumen = await guardarOrdenes(
            transaction,
            ordenes,
            idOperacion,
            idUsuarioAutenticado
        );

        const cantidadInsertadas =
            resumen.insertadas ?? 0;

        const cantidadActualizadas =
            resumen.actualizadas ?? 0;

        const cantidadSinCambios =
            resumen.sinCambios ??
            resumen.duplicadas ??
            0;

        const cantidadAplicadas =
            cantidadInsertadas +
            cantidadActualizadas;

        /*
         * Si no existen órdenes nuevas ni cambios,
         * eliminamos la operación vacía.
         */
        if (cantidadAplicadas === 0) {
            await transaction.rollback();

            transactionIniciada = false;

            return res.status(200).json({
                ok: true,
                mensaje:
                    "El archivo fue revisado, pero no contenía órdenes nuevas ni cambios.",
                idOperacion: null,
                resumen
            });
        }

        /*
         * Cuando existen órdenes nuevas, estas sí
         * pertenecen a la operación recién creada.
         */
        if (cantidadInsertadas > 0) {
            await sincronizarOperacion(
                transaction,
                idOperacion
            );

            await new sql.Request(transaction)

                .input(
                    "IdOperacion",
                    sql.Int,
                    idOperacion
                )

                .input(
                    "Observaciones",
                    sql.VarChar(500),
                    (
                        `Importación OFSC. ` +
                        `Nuevas: ${cantidadInsertadas}. ` +
                        `Actualizadas: ${cantidadActualizadas}. ` +
                        `Sin cambios: ${cantidadSinCambios}.`
                    )
                )

                .query(`
                    UPDATE dbo.Operaciones
                    SET
                        Observaciones =
                            @Observaciones
                    WHERE
                        IdOperacion =
                            @IdOperacion;
                `);
        } else {
            /*
             * Si solamente se actualizaron órdenes,
             * ninguna cambia su IdOperacion original.
             *
             * Conservamos esta operación como registro
             * de sincronización y la dejamos cerrada.
             */
            await new sql.Request(transaction)

                .input(
                    "IdOperacion",
                    sql.Int,
                    idOperacion
                )

                .input(
                    "CantidadActualizadas",
                    sql.Int,
                    cantidadActualizadas
                )

                .input(
                    "Observaciones",
                    sql.VarChar(500),
                    (
                        `Sincronización OFSC sin órdenes nuevas. ` +
                        `Actualizadas: ${cantidadActualizadas}. ` +
                        `Sin cambios: ${cantidadSinCambios}.`
                    )
                )

                .query(`
                    UPDATE dbo.Operaciones
                    SET
                        CantidadOT =
                            @CantidadActualizadas,

                        CantidadAsignadas = 0,

                        CantidadPendientes = 0,

                        CantidadFinalizadas = 0,

                        Estado = 'CERRADA',

                        Observaciones =
                            @Observaciones

                    WHERE
                        IdOperacion =
                            @IdOperacion;
                `);
        }

        await transaction.commit();

        transactionIniciada = false;

        let mensaje;

        if (
            cantidadInsertadas > 0 &&
            cantidadActualizadas > 0
        ) {
            mensaje =
                "Importación realizada. Se registraron órdenes nuevas y se actualizaron órdenes existentes.";
        } else if (
            cantidadInsertadas > 0
        ) {
            mensaje =
                "Importación realizada correctamente.";
        } else {
            mensaje =
                "Sincronización realizada. Las órdenes existentes fueron actualizadas.";
        }

        console.log(
            `✅ Proceso completado. Operación: ${idOperacion}`
        );

        console.log(
            `Usuario responsable: ${idUsuarioAutenticado}`
        );

        console.log(
            `Nuevas: ${cantidadInsertadas} | ` +
            `Actualizadas: ${cantidadActualizadas} | ` +
            `Sin cambios: ${cantidadSinCambios}`
        );

        return res
            .status(
                cantidadInsertadas > 0
                    ? 201
                    : 200
            )
            .json({
                ok: true,
                mensaje,
                idOperacion,
                resumen
            });
    } catch (error) {
        if (
            transactionIniciada &&
            transaction
        ) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error(
                    "Error al revertir la importación:",
                    rollbackError.message
                );
            }
        }

        console.error(
            "❌ ERROR IMPORTADOR"
        );

        console.error(error);

        return res.status(500).json({
            ok: false,
            mensaje:
                "No se pudo realizar la importación.",
            detalle: error.message
        });
    } finally {
        /*
         * Eliminar el Excel temporal después
         * de procesarlo.
         */
        if (req.file?.path) {
            try {
                await fs.unlink(
                    req.file.path
                );
            } catch (errorArchivo) {
                if (
                    errorArchivo.code !==
                    "ENOENT"
                ) {
                    console.error(
                        "No se pudo eliminar el archivo temporal:",
                        errorArchivo.message
                    );
                }
            }
        }
    }
}

/**
 * Consulta todas las órdenes.
 *
 * GET /api/importador/ordenes
 */
async function obtenerOrdenes(req, res) {
    try {
        console.log(
            "========== OBTENER ÓRDENES =========="
        );

        const pool = await conectarDB();

        const resultado =
            await pool.request().query(`
                SELECT
                    IdOrden,
                    IdOperacion,
                    CodigoOT,
                    CodigoServicio,
                    ProductoPlan,
                    TipoServicio,
                    Cliente,
                    DNI,
                    Telefono,
                    Direccion,
                    Distrito,
                    LatitudCliente,
                    LongitudCliente,
                    PuertoNAP,
                    RFS,
                    FechaAgenda,
                    Horario,
                    EstadoOT,
                    EstadoAsignacion,
                    FechaImportacion,
                    FechaActualizacion
                FROM dbo.OrdenesTrabajo
                ORDER BY IdOrden DESC;
            `);

        console.log(
            `✅ Total órdenes: ${resultado.recordset.length}`
        );

        return res.status(200).json(
            resultado.recordset
        );
    } catch (error) {
        console.error(
            "❌ ERROR obtenerOrdenes"
        );

        console.error(error);

        return res.status(500).json({
            ok: false,
            mensaje:
                "No se pudieron consultar las órdenes.",
            detalle: error.message
        });
    }
}

module.exports = {
    importarOFSC,
    obtenerOrdenes
};