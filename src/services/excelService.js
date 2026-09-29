const XLSX = require("xlsx");

const mapa = require("../config/mapaColumnas");

function registrarResumenLectura(...valores) {
    if (process.env.NODE_ENV !== "test") {
        console.log(...valores);
    }
}

/**
 * Limpia valores de texto.
 */
function limpiarTexto(valor) {
    if (valor === undefined || valor === null) {
        return null;
    }

    const texto = String(valor).trim();

    return texto === "" ? null : texto;
}

/**
 * Busca el primer valor disponible entre los
 * posibles encabezados configurados.
 */
/**
 * Normaliza encabezados del Excel para compararlos.
 *
 * Soporta:
 * - Mayúsculas y minúsculas.
 * - Tildes.
 * - Espacios duplicados.
 * - Saltos de línea.
 * - Espacios ocultos al inicio o final.
 */
function normalizarEncabezado(valor) {
    if (valor === undefined || valor === null) {
        return "";
    }

    return String(valor)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
}

/**
 * Busca el primer valor disponible entre los
 * posibles encabezados configurados.
 */
function obtenerValor(fila, columnas) {
    const listaColumnas = Array.isArray(columnas)
        ? columnas
        : [columnas];

    const clavesFila = Object.keys(fila);

    for (const columnaBuscada of listaColumnas) {
        if (!columnaBuscada) {
            continue;
        }

        const encabezadoBuscado =
            normalizarEncabezado(columnaBuscada);

        const claveEncontrada =
            clavesFila.find(
                (clave) =>
                    normalizarEncabezado(clave) ===
                    encabezadoBuscado
            );

        if (!claveEncontrada) {
            continue;
        }

        const valor = fila[claveEncontrada];

        if (
            valor !== undefined &&
            valor !== null &&
            String(valor).trim() !== ""
        ) {
            return valor;
        }
    }

    return null;
}
/**
 * Normaliza una palabra:
 * - Elimina tildes.
 * - Convierte a mayúsculas.
 * - Elimina espacios externos.
 */
function normalizarPalabra(valor) {
    const texto = limpiarTexto(valor);

    if (!texto) {
        return null;
    }

    return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();
}

/**
 * Crea una fecha local segura.
 */
function crearFecha(anio, mes, dia) {
    const numeroAnio = Number(anio);
    const numeroMes = Number(mes);
    const numeroDia = Number(dia);

    if (
        !Number.isInteger(numeroAnio) ||
        !Number.isInteger(numeroMes) ||
        !Number.isInteger(numeroDia)
    ) {
        return null;
    }

    const fecha = new Date(
        numeroAnio,
        numeroMes - 1,
        numeroDia,
        12,
        0,
        0
    );

    if (
        fecha.getFullYear() !== numeroAnio ||
        fecha.getMonth() !== numeroMes - 1 ||
        fecha.getDate() !== numeroDia
    ) {
        return null;
    }

    return fecha;
}

/**
 * Convierte fechas provenientes del Excel.
 */
function convertirFecha(fechaExcel) {
    if (
        fechaExcel === undefined ||
        fechaExcel === null ||
        fechaExcel === ""
    ) {
        return null;
    }

    if (fechaExcel instanceof Date) {
        if (Number.isNaN(fechaExcel.getTime())) {
            return null;
        }

        return crearFecha(
            fechaExcel.getFullYear(),
            fechaExcel.getMonth() + 1,
            fechaExcel.getDate()
        );
    }

    if (typeof fechaExcel === "number") {
        const fechaInterpretada =
            XLSX.SSF.parse_date_code(fechaExcel);

        if (!fechaInterpretada) {
            return null;
        }

        return crearFecha(
            fechaInterpretada.y,
            fechaInterpretada.m,
            fechaInterpretada.d
        );
    }

    const texto = String(fechaExcel).trim();

    const formatoPeru = texto.match(
        /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})(?:\s.*)?$/
    );

    if (formatoPeru) {
        const dia = Number(formatoPeru[1]);
        const mes = Number(formatoPeru[2]);

        let anio = Number(formatoPeru[3]);

        if (anio < 100) {
            anio += 2000;
        }

        return crearFecha(anio, mes, dia);
    }

    const formatoISO = texto.match(
        /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/
    );

    if (formatoISO) {
        return crearFecha(
            Number(formatoISO[1]),
            Number(formatoISO[2]),
            Number(formatoISO[3])
        );
    }

    return null;
}

/**
 * Convierte horas a formato HH:mm:ss.
 */
function convertirHora(valor) {
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

        const horas = String(
            valor.getHours()
        ).padStart(2, "0");

        const minutos = String(
            valor.getMinutes()
        ).padStart(2, "0");

        const segundos = String(
            valor.getSeconds()
        ).padStart(2, "0");

        return `${horas}:${minutos}:${segundos}`;
    }

    /*
     * Excel puede representar la hora como
     * una fracción numérica del día.
     */
    if (typeof valor === "number") {
        const totalSegundos = Math.round(
            valor * 24 * 60 * 60
        );

        const horas = Math.floor(
            totalSegundos / 3600
        ) % 24;

        const minutos = Math.floor(
            (totalSegundos % 3600) / 60
        );

        const segundos =
            totalSegundos % 60;

        return [
            horas,
            minutos,
            segundos
        ]
            .map((numero) =>
                String(numero).padStart(2, "0")
            )
            .join(":");
    }

    const texto = String(valor).trim();

    const formatoHora = texto.match(
        /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/
    );

    if (!formatoHora) {
        return null;
    }

    const horas = Number(formatoHora[1]);
    const minutos = Number(formatoHora[2]);
    const segundos = Number(
        formatoHora[3] || 0
    );

    if (
        horas < 0 ||
        horas > 23 ||
        minutos < 0 ||
        minutos > 59 ||
        segundos < 0 ||
        segundos > 59
    ) {
        return null;
    }

    return [
        horas,
        minutos,
        segundos
    ]
        .map((numero) =>
            String(numero).padStart(2, "0")
        )
        .join(":");
}

/**
 * Convierte valores como sí, si, verdadero,
 * 1 o una casilla marcada a booleano.
 */
function convertirBooleanoOFSC(valor) {
    if (
        valor === undefined ||
        valor === null ||
        valor === ""
    ) {
        return null;
    }

    if (typeof valor === "boolean") {
        return valor;
    }

    if (typeof valor === "number") {
        return valor !== 0;
    }

    const texto = normalizarPalabra(valor);

    if (
        [
            "SI",
            "TRUE",
            "VERDADERO",
            "1",
            "X"
        ].includes(texto)
    ) {
        return true;
    }

    if (
        [
            "NO",
            "FALSE",
            "FALSO",
            "0"
        ].includes(texto)
    ) {
        return false;
    }

    return null;
}

/**
 * Normaliza los estados exactos de las actividades OFSC.
 */
function normalizarEstadoActividad(valor) {
    const estado = normalizarPalabra(valor);

    const equivalencias = {
        PENDIENTE: "PENDIENTE",

        "EN RUTA": "EN_RUTA",

        INICIADO: "INICIADA",
        INICIADA: "INICIADA",

        SUSPENDIDO: "SUSPENDIDA",
        SUSPENDIDA: "SUSPENDIDA",

        "NO REALIZADO": "NO_REALIZADO",
        NO_REALIZADO: "NO_REALIZADO",

        "NO REALIZADA": "NO_REALIZADO",
        NO_REALIZADA: "NO_REALIZADO",

        FINALIZADO: "FINALIZADA",
        FINALIZADA: "FINALIZADA",

        CANCELADO: "CANCELADA",
        CANCELADA: "CANCELADA"
    };

    return equivalencias[estado] || null;
}

/**
 * Normaliza los tipos de cierre informados por OFSC.
 */
function normalizarTipoCierre(valor) {
    const tipoCierre = normalizarPalabra(valor);

    if (!tipoCierre) {
        return null;
    }

    const equivalencias = {
        /*
         * OFSC utiliza actualmente:
         * Tipo Cierre = Reagendamiento
         */
        REAGENDAMIENTO: "REPROGRAMADO",
        REAGENDADO: "REPROGRAMADO",
        REPROGRAMADO: "REPROGRAMADO",
        REPROGRAMADA: "REPROGRAMADO",

        /*
         * La OT ya no continuará.
         */
        "CIERRE AUTOMATICO": "CIERRE_AUTOMATICO",
        CIERRE_AUTOMATICO: "CIERRE_AUTOMATICO"
    };

    return equivalencias[tipoCierre] ||
        tipoCierre.replace(/\s+/g, "_");
}
/**
 * Lee el Excel exportado desde OFSC.
 *
 * Cada fila se interpreta como una actividad.
 * Una misma OT puede tener varias actividades.
 */
function leerExcelConDetalle(rutaArchivo) {
    const workbook = XLSX.readFile(
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

    const filas = XLSX.utils.sheet_to_json(
        hoja,
        {
            defval: null,
            raw: true
        }
    );

    if (filas.length === 0) {
        return {
            actividades: [],
            filasRechazadas: [],
            totalFilasLeidas: 0,
            nombreHoja
        };
    }

    const actividades = [];
    const filasRechazadas = [];

    let omitidasSinActividad = 0;
    let omitidasSinOT = 0;
    let omitidasSinEstado = 0;
    let omitidasEstadoDesconocido = 0;

    const estadosNoReconocidos =
        new Set();

    const conteoEstados = {
    PENDIENTE: 0,
    INICIADA: 0,
    SUSPENDIDA: 0,
    NO_REALIZADO: 0,
    FINALIZADA: 0,
    CANCELADA: 0,
    EN_RUTA: 0
};

    for (
        let indice = 0;
        indice < filas.length;
        indice++
    ) {
        const fila = filas[indice];

        const numeroFilaExcel =
            Number.isInteger(fila.__rowNum__)
                ? fila.__rowNum__ + 1
                : indice + 2;

        const idActividadOFSC = limpiarTexto(
            obtenerValor(
                fila,
                mapa.idActividadOFSC
            )
        );

        const codigoOT = limpiarTexto(
            obtenerValor(
                fila,
                mapa.codigoOT
            )
        );

        const estadoOriginal = limpiarTexto(
            obtenerValor(
                fila,
                mapa.estadoActividad ||
                mapa.estadoOT
            )
        );

        if (!idActividadOFSC) {
            omitidasSinActividad++;

            filasRechazadas.push({
                fila: numeroFilaExcel,
                codigoOT,
                idActividadOFSC: null,
                motivo:
                    "La fila no contiene ID de actividad OFSC."
            });

            continue;
        }

        if (!codigoOT) {
            omitidasSinOT++;

            filasRechazadas.push({
                fila: numeroFilaExcel,
                codigoOT: null,
                idActividadOFSC,
                motivo:
                    "La fila no contiene Código OT."
            });

            continue;
        }

        if (!estadoOriginal) {
            omitidasSinEstado++;

            filasRechazadas.push({
                fila: numeroFilaExcel,
                codigoOT,
                idActividadOFSC,
                motivo:
                    "La fila no contiene estado de actividad OFSC."
            });

            continue;
        }

        const estadoActividad =
            normalizarEstadoActividad(
                estadoOriginal
            );

        if (!estadoActividad) {
            omitidasEstadoDesconocido++;

            estadosNoReconocidos.add(
                estadoOriginal
            );

            filasRechazadas.push({
                fila: numeroFilaExcel,
                codigoOT,
                idActividadOFSC,
                motivo:
                    `El estado OFSC "${estadoOriginal}" no es reconocido.`
            });

            continue;
        }

        conteoEstados[estadoActividad]++;

        const tipoCierreOriginal =
            limpiarTexto(
                obtenerValor(
                    fila,
                    mapa.tipoCierre
                )
            );
  
        actividades.push({
            numeroFilaExcel,

            /*
             * Identificación de actividad y OT.
             */
            idActividadOFSC,
            codigoOT,

            /*
             * Datos generales de la orden.
             */
            codigoServicio: limpiarTexto(
                obtenerValor(
                    fila,
                    mapa.codigoServicio
                )
            ),
            codigoPuntoVenta: limpiarTexto(
                obtenerValor(
                    fila,
                    mapa.codigoPuntoVenta
                )
            ),
            productoPlan: limpiarTexto(
                obtenerValor(
                    fila,
                    mapa.productoPlan
                )
            ),

            tipoServicio: limpiarTexto(
                obtenerValor(
                    fila,
                    mapa.tipoServicio
                )
            ),

            tipoActividad: limpiarTexto(
                obtenerValor(
                    fila,
                    mapa.tipoActividad
                )
            ),

            cliente: limpiarTexto(
                obtenerValor(
                    fila,
                    mapa.cliente
                )
            ),

            dni: limpiarTexto(
                obtenerValor(
                    fila,
                    mapa.dni
                )
            ),

            telefono: limpiarTexto(
                obtenerValor(
                    fila,
                    mapa.telefono
                )
            ),

            direccion: limpiarTexto(
                obtenerValor(
                    fila,
                    mapa.direccion
                )
            ),

            distrito: limpiarTexto(
                obtenerValor(
                    fila,
                    mapa.distrito
                )
            ),

            latitud: limpiarTexto(
                obtenerValor(
                    fila,
                    mapa.latitud
                )
            ),

            longitud: limpiarTexto(
                obtenerValor(
                    fila,
                    mapa.longitud
                )
            ),

            recursosXML: limpiarTexto(
                obtenerValor(
                    fila,
                    mapa.recursosXML
                )
            ),
            
            recurso: limpiarTexto(
                obtenerValor(
                    fila,
                    mapa.recurso
                )
            ),
            
            rfs: limpiarTexto(
                obtenerValor(
                    fila,
                    mapa.rfs
                )
            ),

            /*
             * Agenda.
             */
            fechaAgenda: convertirFecha(
                obtenerValor(
                    fila,
                    mapa.fechaAgenda
                )
            ),

            horario: limpiarTexto(
                obtenerValor(
                    fila,
                    mapa.horario
                )
            ),

            /*
             * Datos específicos de la actividad.
             */
            fechaActividad: convertirFecha(
                obtenerValor(
                    fila,
                    mapa.fechaActividad
                )
            ),

            horaInicio: convertirHora(
                obtenerValor(
                    fila,
                    mapa.horaInicio
                )
            ),

            horaFin: convertirHora(
                obtenerValor(
                    fila,
                    mapa.horaFin
                )
            ),

            estadoActividad,
            estadoActividadOriginal:
                estadoOriginal,

            /*
             * Compatibilidad temporal.
             * Luego ordenesService dejará de utilizar
             * directamente este campo.
             */
            estadoOT: estadoActividad,

            /*
             * Reagenda y cierre.
             */
            flagReagenda:
                convertirBooleanoOFSC(
                    obtenerValor(
                        fila,
                        mapa.flagReagenda
                    )
                ),

            razonReagenda: limpiarTexto(
                obtenerValor(
                    fila,
                    mapa.razonReagenda
                )
            ),

            reagendamiento: limpiarTexto(
                obtenerValor(
                    fila,
                    mapa.reagendamiento
                )
            ),

            solicitaReagendamiento:
                limpiarTexto(
                    obtenerValor(
                        fila,
                        mapa.solicitaReagendamiento
                    )
                ),

            motivo: limpiarTexto(
                obtenerValor(
                    fila,
                    mapa.motivo
                )
            ),

            motivoCancelacion:
                limpiarTexto(
                    obtenerValor(
                        fila,
                        mapa.motivoCancelacion
                    )
                ),

            resultadoGlobal:
                limpiarTexto(
                    obtenerValor(
                        fila,
                        mapa.resultadoGlobal
                    )
                ),

            resultadoActivacion:
                limpiarTexto(
                    obtenerValor(
                        fila,
                        mapa.resultadoActivacion
                    )
                ),

            tipoCierre:
                normalizarTipoCierre(
                    tipoCierreOriginal
                ),

            tipoCierreOriginal,

            responsableSuspension:
                limpiarTexto(
                    obtenerValor(
                        fila,
                        mapa.responsableSuspension
                    )
                ),

            tipoSuspension:
                limpiarTexto(
                    obtenerValor(
                        fila,
                        mapa.tipoSuspension
                    )
                )
        });
    }

    registrarResumenLectura(
        "========== RESUMEN LECTURA OFSC =========="
    );

    registrarResumenLectura(
        `Hoja procesada: ${nombreHoja}`
    );

    registrarResumenLectura(
        `Filas encontradas: ${filas.length}`
    );

    registrarResumenLectura(
        `Actividades válidas: ${actividades.length}`
    );

    registrarResumenLectura(
        "Estados encontrados:",
        conteoEstados
    );

    registrarResumenLectura(
        `Omitidas sin ID de actividad: ${omitidasSinActividad}`
    );

    registrarResumenLectura(
        `Omitidas sin Código OT: ${omitidasSinOT}`
    );

    registrarResumenLectura(
        `Omitidas sin estado: ${omitidasSinEstado}`
    );

    registrarResumenLectura(
        `Omitidas por estado desconocido: ${omitidasEstadoDesconocido}`
    );

    if (estadosNoReconocidos.size > 0) {
        registrarResumenLectura(
            "Estados no reconocidos:",
            [...estadosNoReconocidos]
        );
    }

    registrarResumenLectura(
        "==========================================="
    );

    return {
        actividades,
        filasRechazadas,
        totalFilasLeidas:
            filas.length,
        nombreHoja
    };
}

/**
 * Mantiene la respuesta histórica para cualquier
 * consumidor que solo necesite actividades válidas.
 */
function leerExcel(rutaArchivo) {
    return leerExcelConDetalle(
        rutaArchivo
    ).actividades;
}

module.exports = {
    leerExcel,
    leerExcelConDetalle
};
