const XLSX = require("xlsx");

// =====================================
// LIMPIAR TEXTO
// =====================================
function limpiarTexto(valor) {
    if (
        valor === undefined ||
        valor === null
    ) {
        return null;
    }

    const texto = String(valor).trim();

    return texto === ""
        ? null
        : texto;
}

// =====================================
// NORMALIZAR ENCABEZADO
// =====================================
function normalizarEncabezado(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
}

// =====================================
// OBTENER COLUMNA REAL
// =====================================
function obtenerNombreColumna(
    encabezados,
    nombreEsperado
) {
    const buscado =
        normalizarEncabezado(
            nombreEsperado
        );

    return encabezados.find(
        (encabezado) =>
            normalizarEncabezado(
                encabezado
            ) === buscado
    );
}

// =====================================
// CONVERTIR FECHA/HORA
// =====================================
function convertirFechaHora(valor) {
    if (
        valor === undefined ||
        valor === null ||
        valor === ""
    ) {
        return null;
    }

    if (valor instanceof Date) {
        if (Number.isNaN(valor.getTime())) {
            return null;
        }

        return valor;
    }

    const texto = String(valor).trim();

    /*
     * Formato esperado:
     * dd/mm/aa hh:mm
     * dd/mm/aaaa hh:mm
     */
    const coincidencia =
        texto.match(
            /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/
        );

    if (!coincidencia) {
        return null;
    }

    const dia = Number(
        coincidencia[1]
    );

    const mes = Number(
        coincidencia[2]
    );

    let anio = Number(
        coincidencia[3]
    );

    if (anio < 100) {
        anio += 2000;
    }

    const hora = Number(
        coincidencia[4]
    );

    const minuto = Number(
        coincidencia[5]
    );

    const segundo = Number(
        coincidencia[6] || 0
    );

    const fecha = new Date(
        anio,
        mes - 1,
        dia,
        hora,
        minuto,
        segundo
    );

    if (
        fecha.getFullYear() !== anio ||
        fecha.getMonth() !== mes - 1 ||
        fecha.getDate() !== dia ||
        fecha.getHours() !== hora ||
        fecha.getMinutes() !== minuto ||
        fecha.getSeconds() !== segundo
    ) {
        return null;
    }

    return fecha;
}

// =====================================
// SEPARAR EVENTO Y VALOR
// =====================================
function interpretarValor(valor) {
    const texto = limpiarTexto(valor);

    if (!texto) {
        return {
            evento: null,
            valorEvento: null
        };
    }

    const posicionDosPuntos =
        texto.indexOf(":");

    if (posicionDosPuntos === -1) {
        return {
            evento: texto,
            valorEvento: null
        };
    }

    return {
        evento: texto
            .slice(0, posicionDosPuntos)
            .trim(),

        valorEvento: texto
            .slice(posicionDosPuntos + 1)
            .trim() || null
    };
}

// =====================================
// LEER HISTORIAL DE RECURSO OFSC
// =====================================
function leerHistorialRecurso(
    rutaArchivo,
    nombreArchivoOriginal
) {
    const workbook =
        XLSX.readFile(
            rutaArchivo,
            {
                cellDates: true
            }
        );

    if (
        !workbook.SheetNames ||
        workbook.SheetNames.length === 0
    ) {
        throw new Error(
            "El archivo Excel no contiene hojas."
        );
    }

    const nombreHoja =
        workbook.SheetNames[0];

    const hoja =
        workbook.Sheets[nombreHoja];

    const filas =
        XLSX.utils.sheet_to_json(
            hoja,
            {
                defval: null,
                raw: true
            }
        );

    if (filas.length === 0) {
        return {
            nombreArchivo:
                nombreArchivoOriginal,

            nombreHoja,

            eventos: []
        };
    }

    const encabezados =
        Object.keys(filas[0]);

    const columnaAccion =
        obtenerNombreColumna(
            encabezados,
            "Acción"
        );

    const columnaValor =
        obtenerNombreColumna(
            encabezados,
            "Valor"
        );

    const columnaHora =
        obtenerNombreColumna(
            encabezados,
            "Hora de acción"
        );

    const columnaUsuario =
        obtenerNombreColumna(
            encabezados,
            "Usuario"
        );

    const columnasFaltantes = [];

    if (!columnaAccion) {
        columnasFaltantes.push(
            "Acción"
        );
    }

    if (!columnaValor) {
        columnasFaltantes.push(
            "Valor"
        );
    }

    if (!columnaHora) {
        columnasFaltantes.push(
            "Hora de acción"
        );
    }

    if (!columnaUsuario) {
        columnasFaltantes.push(
            "Usuario"
        );
    }

    if (columnasFaltantes.length > 0) {
        throw new Error(
            `El archivo no tiene las columnas requeridas: ${columnasFaltantes.join(", ")}.`
        );
    }

    const eventos = [];

    for (
        let indice = 0;
        indice < filas.length;
        indice++
    ) {
        const fila = filas[indice];

        const accion =
            limpiarTexto(
                fila[columnaAccion]
            );

        const valor =
            limpiarTexto(
                fila[columnaValor]
            );

        const fechaHoraAccion =
            convertirFechaHora(
                fila[columnaHora]
            );

        const usuarioOFSC =
            limpiarTexto(
                fila[columnaUsuario]
            );

        const interpretacion =
            interpretarValor(valor);

        if (
            !accion &&
            !valor &&
            !fechaHoraAccion &&
            !usuarioOFSC
        ) {
            continue;
        }

        eventos.push({
            numeroFilaExcel:
                indice + 2,

            accion,

            valor,

            evento:
                interpretacion.evento,

            valorEvento:
                interpretacion.valorEvento,

            fechaHoraAccion,

            usuarioOFSC
        });
    }

    return {
        nombreArchivo:
            nombreArchivoOriginal,

        nombreHoja,

        totalFilas:
            filas.length,

        totalEventos:
            eventos.length,

        eventos
    };
}

module.exports = {
    leerHistorialRecurso
};