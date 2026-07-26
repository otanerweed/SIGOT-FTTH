const tecnicoModel = require("../models/tecnicoModel");

async function listarTecnicos(req, res) {

    try {

        const tecnicos = await tecnicoModel.obtenerTecnicos();

        res.status(200).json(tecnicos);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error al obtener técnicos"
        });

    }

}

module.exports = {
    listarTecnicos,
    obtenerTecnico,
    crearTecnico
};
async function obtenerTecnico(req, res) {

    try {

        const { id } = req.params;

        const tecnico = await tecnicoModel.obtenerTecnicoPorId(id);

        if (!tecnico) {

            return res.status(404).json({
                mensaje: "Técnico no encontrado"
            });

        }

        res.json(tecnico);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error interno del servidor"
        });

    }

}

async function crearTecnico(req, res) {

    try {

        const datos = req.body;

        const resultado = await tecnicoModel.crearTecnico(datos);

        res.status(201).json({
            mensaje: "Técnico registrado correctamente",
            IdTecnico: resultado.IdTecnico
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error al registrar el técnico"
        });

    }

}