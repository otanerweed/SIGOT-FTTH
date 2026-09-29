const fs = require("fs");
const path = require("path");
const { conectarDB, sql } = require("./src/config/database");
const { leerHistorialRecurso } = require("./src/services/resourceLogService");

const DIRECTORIO = path.join(
    process.env.USERPROFILE,
    "Downloads"
);

const ID_USUARIO_IMPORTACION = 1;

// Casos donde el nombre del archivo de OFSC
// no coincide exactamente con el nombre guardado en SIGOT.
const EQUIVALENCIAS_DNI = {
    "BLANCO JOSE GREGARIO": "006711932",
    "FRANCISCO ANTONIO YLASACA NICUDEMUS": "74504238",
    "GOMEZ QUILCATE PABLO CESAR": "41934890"
};

function convertirNombreArchivoANombreSIGOT(nombreArchivo) {
    const partes = nombreArchivo
        .trim()
        .replace(/\s+/g, " ")
        .split(" ");

    if (partes.length < 3) {
        return nombreArchivo.toUpperCase();
    }

    const nombres = partes.slice(2).join(" ");
    const apellidos = partes.slice(0, 2).join(" ");

    return `${nombres} ${apellidos}`.toUpperCase();
}

function convertirAFechaLima(fecha) {
    const partes = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Lima",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
    }).formatToParts(fecha);

    const valores = {};

    for (const parte of partes) {
        if (parte.type !== "literal") {
            valores[parte.type] = parte.value;
        }
    }

    return `${valores.year}-${valores.month}-${valores.day} ${valores.hour}:${valores.minute}:${valores.second}`;
}

async function obtenerTecnico(pool, nombreBase) {
    // Primero intentamos los casos especiales por DNI.
    const dniEspecial = EQUIVALENCIAS_DNI[nombreBase];

    if (dniEspecial) {
        const resultado = await pool
            .request()
            .query(`
                SELECT
                    IdTecnico,
                    NombreCompleto,
                    DNI
                FROM dbo.Tecnicos
                WHERE DNI = '${dniEspecial}'
            `);

        return resultado.recordset[0] || null;
    }

    // Para los demás ET usamos la transformación de:
    // APELLIDOS NOMBRES
    // a:
    // NOMBRES APELLIDOS
    const nombreSIGOT =
        convertirNombreArchivoANombreSIGOT(nombreBase);

    const nombreSeguro = nombreSIGOT.replace(/'/g, "''");

    const resultado = await pool
        .request()
        .query(`
            SELECT
                IdTecnico,
                NombreCompleto,
                DNI
            FROM dbo.Tecnicos
            WHERE UPPER(NombreCompleto) = '${nombreSeguro}'
        `);

    return resultado.recordset[0] || null;
}

async function importarArchivo(pool, transaction, archivo) {
    const nombreArchivo = path.basename(archivo);

    const nombreBase = nombreArchivo
        .replace(/^exportResourceLog_HOME_/i, "")
        .replace(/\.xlsx$/i, "");

    const tecnico = await obtenerTecnico(pool, nombreBase);

    if (!tecnico) {
        throw new Error(
            `No se pudo identificar el ET del archivo: ${nombreArchivo}`
        );
    }

    console.log("");
    console.log("=======================================");
    console.log(`Archivo: ${nombreArchivo}`);
    console.log(`ET: ${tecnico.NombreCompleto}`);
    console.log(`IdTecnico: ${tecnico.IdTecnico}`);
    console.log(`DNI: ${tecnico.DNI}`);
    console.log("=======================================");

    const resultado = leerHistorialRecurso(archivo);

    console.log(`Filas encontradas: ${resultado.totalFilas}`);
    console.log(`Eventos encontrados: ${resultado.totalEventos}`);

    let insertados = 0;
    let duplicados = 0;

    for (const evento of resultado.eventos) {
        const fechaLima = convertirAFechaLima(
            new Date(evento.fechaHoraAccion)
        );

        const request = new sql.Request(transaction);

        request
            .input(
                "IdTecnico",
                sql.Int,
                tecnico.IdTecnico
            )
            .input(
                "Accion",
                sql.VarChar(100),
                evento.accion
            )
            .input(
                "Valor",
                sql.VarChar(1000),
                evento.valor
            )
            .input(
                "FechaHoraAccion",
                sql.DateTime2,
                fechaLima
            )
            .input(
                "UsuarioOFSC",
                sql.VarChar(150),
                evento.usuarioOFSC
            )
            .input(
                "NombreArchivo",
                sql.VarChar(255),
                nombreArchivo
            )
            .input(
                "IdUsuarioImportacion",
                sql.Int,
                ID_USUARIO_IMPORTACION
            );

        const resultadoInsert = await request.query(`
            INSERT INTO dbo.HistorialRecursosOFSC
            (
                IdTecnico,
                Accion,
                Valor,
                FechaHoraAccion,
                UsuarioOFSC,
                NombreArchivo,
                IdUsuarioImportacion
            )
            SELECT
                @IdTecnico,
                @Accion,
                @Valor,
                @FechaHoraAccion,
                @UsuarioOFSC,
                @NombreArchivo,
                @IdUsuarioImportacion
            WHERE NOT EXISTS
            (
                SELECT 1
                FROM dbo.HistorialRecursosOFSC
                WHERE IdTecnico = @IdTecnico
                  AND Accion = @Accion
                  AND Valor = @Valor
                  AND FechaHoraAccion = @FechaHoraAccion
                  AND
                  (
                      UsuarioOFSC = @UsuarioOFSC
                      OR
                      (
                          UsuarioOFSC IS NULL
                          AND @UsuarioOFSC IS NULL
                      )
                  )
            );
        `);

        if (resultadoInsert.rowsAffected[0] > 0) {
            insertados++;

            console.log(
                `Insertado: ${evento.evento} = ${evento.valorEvento} | ${fechaLima}`
            );
        } else {
            duplicados++;

            console.log(
                `Duplicado omitido: ${evento.evento} = ${evento.valorEvento} | ${fechaLima}`
            );
        }
    }

    return {
        nombreArchivo,
        tecnico: tecnico.NombreCompleto,
        idTecnico: tecnico.IdTecnico,
        totalEventos: resultado.totalEventos,
        insertados,
        duplicados
    };
}

async function ejecutar() {
    let pool;
    let transaction;

    try {
        console.log("=======================================");
        console.log("IMPORTADOR MASIVO DE HISTORIAL OFSC");
        console.log("=======================================");

        if (!fs.existsSync(DIRECTORIO)) {
            throw new Error(
                `No existe el directorio: ${DIRECTORIO}`
            );
        }

        const archivos = fs
            .readdirSync(DIRECTORIO)
            .filter(
                (archivo) =>
                    archivo.startsWith("exportResourceLog_HOME") &&
                    archivo.toLowerCase().endsWith(".xlsx") &&
                    !archivo.includes(" (1)")
            )
            .map((archivo) =>
                path.join(DIRECTORIO, archivo)
            )
            .sort((a, b) =>
                path.basename(a).localeCompare(
                    path.basename(b),
                    "es"
                )
            );

        console.log(`Archivos encontrados: ${archivos.length}`);

        if (archivos.length === 0) {
            throw new Error(
                "No se encontraron archivos Resource Log en Downloads."
            );
        }

        pool = await conectarDB();

        transaction = new sql.Transaction(pool);

        await transaction.begin();

        const resumen = [];

        for (const archivo of archivos) {
            const resultado = await importarArchivo(
                pool,
                transaction,
                archivo
            );

            resumen.push(resultado);
        }

        await transaction.commit();

        console.log("");
        console.log("=======================================");
        console.log("✅ IMPORTACIÓN MASIVA COMPLETADA");
        console.log("=======================================");

        let totalEventos = 0;
        let totalInsertados = 0;
        let totalDuplicados = 0;

        for (const item of resumen) {
            totalEventos += item.totalEventos;
            totalInsertados += item.insertados;
            totalDuplicados += item.duplicados;
        }

        console.log(`Archivos procesados: ${resumen.length}`);
        console.log(`Eventos leídos: ${totalEventos}`);
        console.log(`Eventos nuevos insertados: ${totalInsertados}`);
        console.log(`Eventos duplicados omitidos: ${totalDuplicados}`);

        console.log("");
        console.log("Resumen por ET:");

        for (const item of resumen) {
            console.log(
                `${item.tecnico} | ` +
                `Eventos: ${item.totalEventos} | ` +
                `Nuevos: ${item.insertados} | ` +
                `Duplicados: ${item.duplicados}`
            );
        }
    } catch (error) {
        if (transaction) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error(
                    "Error haciendo rollback:",
                    rollbackError.message
                );
            }
        }

        console.error("");
        console.error("❌ IMPORTACIÓN CANCELADA");
        console.error(error);
    } finally {
        if (pool) {
            await pool.close();
        }
    }
}

ejecutar();