const { sql } = require("../config/database");
const { leerHistorialRecurso } = require("./resourceLogService");

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
    const dniEspecial = EQUIVALENCIAS_DNI[nombreBase];

    if (dniEspecial) {
        const resultado = await pool
            .request()
            .input("DNI", sql.VarChar(9), dniEspecial)
            .query(`
                SELECT
                    IdTecnico,
                    NombreCompleto,
                    DNI
                FROM dbo.Tecnicos
                WHERE DNI = @DNI
            `);

        return resultado.recordset[0] || null;
    }

    const nombreSIGOT =
        convertirNombreArchivoANombreSIGOT(nombreBase);

    const resultado = await pool
        .request()
        .input(
            "NombreCompleto",
            sql.VarChar(255),
            nombreSIGOT
        )
        .query(`
            SELECT
                IdTecnico,
                NombreCompleto,
                DNI
            FROM dbo.Tecnicos
            WHERE UPPER(NombreCompleto) = UPPER(@NombreCompleto)
        `);

    return resultado.recordset[0] || null;
}

async function importarArchivoHistorial(
    pool,
    transaction,
    archivo,
    nombreArchivo,
    idUsuarioImportacion
) {
    // =====================================
    // NORMALIZAR NOMBRE DEL ARCHIVO
    // =====================================

    let nombreArchivoNormalizado =
        nombreArchivo;

    if (
        nombreArchivoNormalizado.includes("Ã") ||
        nombreArchivoNormalizado.includes("Â")
    ) {
        nombreArchivoNormalizado =
            Buffer.from(
                nombreArchivoNormalizado,
                "latin1"
            ).toString("utf8");
    }

    // Corregir casos específicos de nombres
    // afectados por codificación del archivo.
    nombreArchivoNormalizado =
        nombreArchivoNormalizado.replace(
            /PEÃA/gi,
            "PEÑA"
        );

    // =====================================
    // OBTENER NOMBRE DEL ET
    // =====================================

    const nombreBase =
        nombreArchivoNormalizado
            .replace(
                /^exportResourceLog_HOME_/i,
                ""
            )
            .replace(
                /\.xlsx$/i,
                ""
            )
            .replace(
                /\s+\(\d+\)$/i,
                ""
            )
            .trim();


    const tecnico = await obtenerTecnico(
        pool,
        nombreBase
    );

    if (!tecnico) {
        throw new Error(
            `No se pudo identificar el ET del archivo: ${nombreArchivo}`
        );
    }

    const resultado =
        leerHistorialRecurso(
            archivo,
            nombreArchivo
        );

    let insertados = 0;
    let duplicados = 0;

    for (const evento of resultado.eventos) {
        const fechaLima =
            convertirAFechaLima(
                new Date(evento.fechaHoraAccion)
            );

        const request =
            new sql.Request(transaction);

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
                idUsuarioImportacion
            );

        const resultadoInsert =
            await request.query(`
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

        if (
            resultadoInsert.rowsAffected[0] > 0
        ) {
            insertados++;
        } else {
            duplicados++;
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

module.exports = {
    importarArchivoHistorial
};