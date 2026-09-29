const fs = require("fs/promises");

const {
    leerExcelConDetalle
} = require("../services/excelService");

const {
    guardarOrdenes
} = require("../services/ordenesService");

const {
    sincronizarOperacion
} = require("../services/operacionService");

const {
    actualizarResumenOperacion
} = require(
    "../services/importacionV2Service"
);

const {
    conectarDB,
    sql
} = require("../config/database");

const {
    importarArchivoHistorial
} = require("../services/historialRecursoService");

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

        const archivoOFSC =
            req.files?.archivo?.[0] || null;

        const archivosHistorial =
            req.files?.historialRecursos || [];

        if (
            !archivoOFSC &&
            archivosHistorial.length === 0
        ) {
            return res.status(400).json({
                ok: false,
                mensaje:
                    "Debe seleccionar al menos un archivo OFSC o un Historial de Recursos."
            });
        }

        if (archivoOFSC) {
            console.log(
                "Archivo recibido:",
                archivoOFSC.originalname
            );
        } else {
            console.log(
                "Sin archivo Excel OFSC. Se procesarán solo los Resource Log."
            );
        }
        
        // =====================================
        // IMPORTACIÓN SOLO DE HISTORIAL DE RECURSOS
        // =====================================
        if (
            !archivoOFSC &&
            archivosHistorial.length > 0
        ) {
            const poolHistorial =
                await conectarDB();

            transaction =
                new sql.Transaction(
                    poolHistorial
                );

            await transaction.begin(
                sql.ISOLATION_LEVEL.READ_COMMITTED
            );

            transactionIniciada = true;

            const resumenHistorialRecursos = [];

            for (
                const archivoHistorial
                of archivosHistorial
            ) {
                const resultadoHistorial =
                    await importarArchivoHistorial(
                        poolHistorial,
                        transaction,
                        archivoHistorial.path,
                        archivoHistorial.originalname,
                        idUsuarioAutenticado
                    );

                resumenHistorialRecursos.push(
                    resultadoHistorial
                );
            }

            await transaction.commit();

            transactionIniciada = false;

            let totalEventos = 0;
            let totalInsertados = 0;
            let totalDuplicados = 0;

            for (
                const item
                of resumenHistorialRecursos
            ) {
                totalEventos +=
                    item.totalEventos || 0;

                totalInsertados +=
                    item.insertados || 0;

                totalDuplicados +=
                    item.duplicados || 0;
            }

            return res.status(200).json({
                ok: true,
                mensaje:
                    "Historial de Recursos OFSC importado correctamente.",
                resumen: {
                    totalArchivos:
                        resumenHistorialRecursos.length,
                    totalEventos,
                    insertados:
                        totalInsertados,
                    duplicados:
                        totalDuplicados
                },
                historialRecursos:
                    resumenHistorialRecursos
            });
        }
        // =====================================
        // LEER Y TRANSFORMAR EL EXCEL
        // =====================================
        let lecturaExcel;

        try {
            lecturaExcel =
                leerExcelConDetalle(
                    archivoOFSC.path
                );
        } catch (errorLectura) {
            console.error(
                "No se pudo interpretar el Excel OFSC:",
                errorLectura.message
            );

            return res.status(400).json({
                ok: false,
                mensaje:
                    "No se pudo leer el archivo. Verifique que sea un Excel OFSC válido y que no esté dañado."
            });
        }

        const ordenes =
            lecturaExcel.actividades;

        const filasRechazadas =
            lecturaExcel.filasRechazadas;

        const totalFilasLeidas =
            lecturaExcel.totalFilasLeidas;

        if (
            !Number.isInteger(
                totalFilasLeidas
            ) ||
            totalFilasLeidas === 0
        ) {
            return res.status(400).json({
                ok: false,
                mensaje:
                    "El archivo no contiene filas para procesar."
            });
        }

        console.log(
            `Filas leídas: ${totalFilasLeidas} | ` +
            `Válidas: ${ordenes.length} | ` +
            `Rechazadas: ${filasRechazadas.length}`
        );

        const pool = await conectarDB();

        transaction =
            new sql.Transaction(pool);

        await transaction.begin(
            sql.ISOLATION_LEVEL.READ_COMMITTED
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
                    String(
                        archivoOFSC.originalname ||
                        "archivo-ofsc"
                    )
                        .trim()
                        .slice(0, 255)
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
            idUsuarioAutenticado,
            {
                filasRechazadas,
                totalFilasLeidas
            }
        );

        const cantidadInsertadas =
            resumen.insertadas ?? 0;

        const cantidadActualizadas =
            resumen.actualizadas ?? 0;

        const cantidadSinCambios =
            resumen.sinCambios ??
            resumen.duplicadas ??
            0;

        const cantidadRechazadas =
            resumen.rechazadas ?? 0;

        /*
         * Las órdenes nuevas mantienen la
         * sincronización operativa existente.
         */
        if (cantidadInsertadas > 0) {
            await sincronizarOperacion(
                transaction,
                idOperacion
            );
        }

        /*
         * Cerrar y conservar toda importación,
         * incluso cuando todas las filas estén
         * SIN_CAMBIOS.
         */
        await actualizarResumenOperacion(
            transaction,
            idOperacion,
            resumen
        );

        // =====================================
        // IMPORTAR HISTORIALES RESOURCE LOG
        // =====================================
        const resumenHistorialRecursos = [];

        for (const archivoHistorial of archivosHistorial) {
            const resultadoHistorial =
                await importarArchivoHistorial(
                    pool,
                    transaction,
                    archivoHistorial.path,
                    archivoHistorial.originalname,
                    idUsuarioAutenticado
                );

            resumenHistorialRecursos.push(
                resultadoHistorial
            );
        }

        await transaction.commit();

        transactionIniciada = false;

        let mensaje;

        if (
            cantidadRechazadas > 0 &&
            cantidadInsertadas === 0 &&
            cantidadActualizadas === 0 &&
            cantidadSinCambios === 0
        ) {
            mensaje =
                "Archivo revisado. Todas las filas fueron rechazadas; revise el detalle de errores.";
        } else if (cantidadRechazadas > 0) {
            mensaje =
                "Importación realizada con observaciones. Algunas filas fueron rechazadas.";
        } else if (
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
        } else if (
            cantidadActualizadas > 0
        ) {
            mensaje =
                "Sincronización realizada. Las órdenes existentes fueron actualizadas.";
        } else {
            mensaje =
                "El archivo fue revisado y no contenía órdenes nuevas ni cambios.";
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
            `Sin cambios: ${cantidadSinCambios} | ` +
            `Rechazadas: ${cantidadRechazadas}`
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
                resumen,
                historialRecursos: resumenHistorialRecursos
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
                "No se pudo realizar la importación. No se guardó ningún cambio."
        });
    } finally {
        // =====================================
        // ELIMINAR ARCHIVO TEMPORAL
        // =====================================
        const archivosTemporales =
            Object.values(
                req.files || {}
            ).flat();

        for (
            const archivoTemporal
            of archivosTemporales
        ) {
            if (!archivoTemporal?.path) {
                continue;
            }

            try {
                await fs.unlink(
                    archivoTemporal.path
                );

                console.log(
                    "✅ Archivo temporal eliminado:",
                    archivoTemporal.path
                );
                        } catch (errorArchivo) {
                console.error(
                    "❌ No se pudo eliminar archivo temporal:",
                    archivoTemporal.path,
                    errorArchivo.message
                );

                if (
                    errorArchivo.code !==
                    "ENOENT"
                ) {
                    console.error(
                        "Código de error:",
                        errorArchivo.code
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
                    O.CantidadNuevas,
                    O.CantidadActualizadas,
                    O.CantidadSinCambios,
                    O.CantidadErrores,

                    CAST(
                        CASE
                            WHEN EXISTS (
                                SELECT 1
                                FROM dbo.DetalleImportacionOFSC D
                                WHERE D.IdOperacion = O.IdOperacion
                            )
                            OR LTRIM(
                                ISNULL(O.Observaciones, '')
                            ) LIKE N'Importación OFSC V2.%'
                            THEN 1
                            ELSE 0
                        END
                        AS BIT
                    ) AS EsImportacionV2,

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
