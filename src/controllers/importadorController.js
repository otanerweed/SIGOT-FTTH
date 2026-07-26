const { leerExcel } = require("../services/excelService");
const { guardarOrdenes } = require("../services/ordenesService");
const { sql } = require("../config/database");

async function importarOFSC(req, res) {
    try {

        console.log("========== INICIO IMPORTACIÓN ==========");

        if (!req.file) {
            return res.status(400).json({
                ok: false,
                mensaje: "Debe seleccionar un archivo Excel."
            });
        }

        console.log("Archivo recibido:");
        console.log(req.file.path);

        // Leer Excel
        const ordenes = leerExcel(req.file.path);

        console.log("Excel leído correctamente");
        console.log("Cantidad:", ordenes.length);

        // Guardar en SQL Server
        await guardarOrdenes(ordenes, 2);

        console.log("✅ Órdenes guardadas en SQL Server");

        return res.json({
            ok: true,
            mensaje: "Importación realizada correctamente",
            total: ordenes.length
        });

    } catch (error) {

        console.error("ERROR IMPORTADOR");
        console.error(error);

        return res.status(500).json({
            ok: false,
            mensaje: error.message
        });
    }
}

async function obtenerOrdenes(req, res) {

    try {

        const resultado = await sql.query(`
            SELECT
                IdOrden,
                CodigoOT,
                Cliente,
                Distrito,
                FechaAgenda,
                Horario,
                EstadoOT
            FROM OrdenesTrabajo
            ORDER BY IdOrden DESC
        `);

        res.json(resultado.recordset);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: "Error al obtener las órdenes."
        });

    }

}

module.exports = {
    importarOFSC,
    obtenerOrdenes
};