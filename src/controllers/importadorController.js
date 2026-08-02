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

        // =====================================
        // LEER Y TRANSFORMAR EL EXCEL
        // =====================================
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

        // =====================================
        // REGISTRAR OPERACIÓN DE IMPORTACIÓN
        // =====================================
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

        // =====================================
        // GUARDAR O ACTUALIZAR ÓRDENES
        // =====================================
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

        // =====================================
        // ARCHIVO SIN CAMBIOS
        // =====================================
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

        // =====================================
        // IMPORTACIÓN CON ÓRDENES NUEVAS
        // =====================================
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
            // =====================================
            // SINCRONIZACIÓN SIN ÓRDENES NUEVAS
            // =====================================
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
        // =====================================
        // ELIMINAR ARCHIVO TEMPORAL
        // =====================================
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
 * Consulta el historial de importaciones.
 *
 * GET /api/importador/historial
 */
async function obtenerHistorialImportaciones(
    req,
    res
) {
    try {
        console.log(
            "========== HISTORIAL DE IMPORTACIONES =========="
        );

        const pool = await conectarDB();

        const resultado =
            await pool.request().query(`
                SELECT
                    O.IdOperacion,
                    O.FechaOperacion,
                    O.NombreArchivo,
                    O.CantidadOT,
                    O.CantidadAsignadas,
                    O.CantidadPendientes,
                    O.CantidadFinalizadas,
                    O.IdUsuario,
                    O.FechaImportacion,
                    O.Estado,
                    O.Observaciones,

                    U.NombreCompleto
                        AS UsuarioResponsable,

                    U.Usuario
                        AS NombreUsuarioResponsable,

                    R.Nombre
                        AS RolResponsable

                FROM dbo.Operaciones O

                LEFT JOIN dbo.Usuarios U
                    ON U.IdUsuario =
                        O.IdUsuario

                LEFT JOIN dbo.Roles R
                    ON R.IdRol =
                        U.IdRol

                ORDER BY
                    O.FechaImportacion DESC,
                    O.IdOperacion DESC;
            `);

        return res.status(200).json(
            resultado.recordset
        );
    } catch (error) {
        console.error(
            "Error al consultar el historial de importaciones:",
            error
        );

        return res.status(500).json({
            ok: false,
            mensaje:
                "No se pudo consultar el historial de importaciones.",
            detalle: error.message
        });
    }
}

module.exports = {
    importarOFSC,
    obtenerHistorialImportaciones
};