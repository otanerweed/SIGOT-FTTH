const { asignarOrdenesAutomaticamente } = require("../services/asignacionService");

async function ejecutarAsignacion(req, res) {

    try {

        const resultado = await asignarOrdenesAutomaticamente();

        res.json({
            ok: true,
            mensaje: "Asignación automática completada",
            totalAsignadas: resultado.total
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            ok: false,
            mensaje: error.message
        });

    }

}

module.exports = {
    ejecutarAsignacion
};