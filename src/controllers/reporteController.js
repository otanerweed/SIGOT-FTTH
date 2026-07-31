const {
    obtenerReporteGeneral
} = require("../services/reporteService");

// ===============================
// OBTENER REPORTE GENERAL
// ===============================
async function listarReporteGeneral(req, res) {
    try {
        const reporte =
            await obtenerReporteGeneral();

        return res.status(200).json({
            ok: true,
            reporte
        });
    } catch (error) {
        console.error(
            "Error al obtener el reporte general:",
            error
        );

        return res.status(500).json({
            ok: false,
            mensaje:
                "No se pudo obtener el reporte general.",
            detalle: error.message
        });
    }
}

module.exports = {
    listarReporteGeneral
};