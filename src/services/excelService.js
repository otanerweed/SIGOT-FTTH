const XLSX = require("xlsx");
const mapa = require("../config/mapaColumnas");

function convertirFecha(fechaExcel) {

    if (!fechaExcel) return null;

    // Si ya viene como Date
    if (fechaExcel instanceof Date) {
        return fechaExcel;
    }

    // Si viene como texto: 12/08/26
    const partes = fechaExcel.split("/");

    if (partes.length !== 3) {
        return null;
    }

    const dia = partes[0];
    const mes = partes[1];
    const anio = "20" + partes[2];

    return `${anio}-${mes}-${dia}`;
}

function leerExcel(rutaArchivo) {

    const workbook = XLSX.readFile(rutaArchivo);

    const hoja = workbook.Sheets[workbook.SheetNames[0]];

    const filas = XLSX.utils.sheet_to_json(hoja);

    console.log("PRIMERA FILA DEL EXCEL");
    console.log(filas[0]);

    const ordenes = filas.map(fila => ({

        codigoOT: fila[mapa.codigoOT] || null,

        codigoServicio: fila[mapa.codigoServicio] || null,

        productoPlan: fila[mapa.productoPlan] || null,

        tipoServicio: fila[mapa.tipoServicio] || null,

        cliente: fila[mapa.cliente] || null,

        dni: fila[mapa.dni] || null,

        telefono: fila[mapa.telefono] || null,

        direccion: fila[mapa.direccion] || null,

        distrito: fila[mapa.distrito] || null,

        latitud: fila[mapa.latitud] || null,

        longitud: fila[mapa.longitud] || null,

        recursosXML: fila[mapa.recursosXML] || null,

        rfs: fila[mapa.rfs] || null,

        fechaAgenda: convertirFecha(fila[mapa.fechaAgenda]),

        horario: fila[mapa.horario] || null,

        estadoOT: fila[mapa.estadoOT] || null

    }));

    return ordenes;
}

module.exports = {
    leerExcel
};