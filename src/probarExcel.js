const path = require("path");
const { leerExcel } = require("./services/excelService");

// Ruta del archivo Excel
const rutaExcel = path.join(
    __dirname,
    "../uploads/ofsc.xlsx"
);

try {

    // Leer el Excel
    const datos = leerExcel(rutaExcel);

    console.log("===================================");
    console.log(" Excel leído correctamente");
    console.log("===================================");

    console.log(`Cantidad de registros: ${datos.length}`);

    console.log("\n===================================");
    console.log(" Primera orden convertida");
    console.log("===================================\n");

    console.dir(datos[0], {
        depth: null
    });

    const XLSX = require("xlsx");

const workbook = XLSX.readFile(rutaExcel);

const hoja = workbook.Sheets[workbook.SheetNames[0]];

const filasOriginales = XLSX.utils.sheet_to_json(hoja);

console.log("\n========== BUSCANDO COLUMNAS ==========\n");

Object.keys(filasOriginales[0]).forEach(col => {

    if (
        col.toLowerCase().includes("document") ||
        col.toLowerCase().includes("telefono") ||
        col.toLowerCase().includes("teléfono") ||
        col.toLowerCase().includes("tipo") ||
        col.toLowerCase().includes("rfs")
    ) {

        console.log(col);

    }

});

} catch (error) {

    console.error("Error al leer el archivo Excel:");
    console.error(error);

}