const tecnicoModel = require("../models/tecnicoModel");

// ===============================
// LISTAR TÉCNICOS
// ===============================
async function listarTecnicos(req, res) {
    try {
        const tecnicos =
            await tecnicoModel.obtenerTecnicos();

        return res.status(200).json(tecnicos);
    } catch (error) {
        console.error(
            "Error al obtener técnicos:",
            error
        );

        return res.status(500).json({
            mensaje: "Error al obtener técnicos"
        });
    }
}

// ===============================
// OBTENER TÉCNICO POR ID
// ===============================
async function obtenerTecnico(req, res) {
    try {
        const { id } = req.params;

        const tecnico =
            await tecnicoModel.obtenerTecnicoPorId(id);

        if (!tecnico) {
            return res.status(404).json({
                mensaje: "Técnico no encontrado"
            });
        }

        return res.status(200).json(tecnico);
    } catch (error) {
        console.error(
            "Error al obtener el técnico:",
            error
        );

        return res.status(500).json({
            mensaje: "Error interno del servidor"
        });
    }
}

// ===============================
// CREAR TÉCNICO
// ===============================
async function crearTecnico(req, res) {
    try {
        const datos = req.body;

        if (
            !datos.CodigoTecnico ||
            !datos.NombreCompleto ||
            !datos.TipoTecnico ||
            !datos.DistritoBase ||
            datos.CapacidadMaxima === undefined
        ) {
            return res.status(400).json({
                mensaje:
                    "Complete todos los campos obligatorios."
            });
        }

        const resultado =
            await tecnicoModel.crearTecnico(datos);

        return res.status(201).json({
            mensaje:
                "Técnico registrado correctamente",
            IdTecnico: resultado.IdTecnico
        });
    } catch (error) {
        console.error(
            "Error al registrar el técnico:",
            error
        );

        return res.status(500).json({
            mensaje:
                "Error al registrar el técnico"
        });
    }
}

// ===============================
// ACTUALIZAR TÉCNICO
// ===============================
async function actualizarTecnico(req, res) {
    try {
        const { id } = req.params;
        const datos = req.body;

        const tecnicoExistente =
            await tecnicoModel.obtenerTecnicoPorId(id);

        if (!tecnicoExistente) {
            return res.status(404).json({
                mensaje: "Técnico no encontrado"
            });
        }

        if (
            !datos.CodigoTecnico ||
            !datos.NombreCompleto ||
            !datos.TipoTecnico ||
            !datos.DistritoBase ||
            datos.CapacidadMaxima === undefined
        ) {
            return res.status(400).json({
                mensaje:
                    "Complete todos los campos obligatorios."
            });
        }

        const resultado =
            await tecnicoModel.actualizarTecnico(
                id,
                datos
            );

        if (!resultado.FilasAfectadas) {
            return res.status(404).json({
                mensaje:
                    "No se pudo actualizar el técnico."
            });
        }

        return res.status(200).json({
            mensaje:
                "Técnico actualizado correctamente"
        });
    } catch (error) {
        console.error(
            "Error al actualizar el técnico:",
            error
        );

        return res.status(500).json({
            mensaje:
                "Error al actualizar el técnico"
        });
    }
}
// ===============================
// ACTIVAR O DESACTIVAR TÉCNICO
// ===============================
async function actualizarEstadoTecnico(req, res) {
    try {
        const { id } = req.params;
        const { Activo } = req.body;

        if (typeof Activo !== "boolean") {
            return res.status(400).json({
                mensaje:
                    "El campo Activo debe ser verdadero o falso."
            });
        }

        const tecnicoExistente =
            await tecnicoModel.obtenerTecnicoPorId(id);

        if (!tecnicoExistente) {
            return res.status(404).json({
                mensaje: "Técnico no encontrado"
            });
        }

        const resultado =
            await tecnicoModel.actualizarEstadoTecnico(
                id,
                Activo
            );

        if (!resultado.FilasAfectadas) {
            return res.status(404).json({
                mensaje:
                    "No se pudo actualizar el estado del técnico."
            });
        }

        return res.status(200).json({
            mensaje: Activo
                ? "Técnico activado correctamente"
                : "Técnico desactivado correctamente"
        });
    } catch (error) {
        console.error(
            "Error al actualizar el estado del técnico:",
            error
        );

        return res.status(500).json({
            mensaje:
                "Error al actualizar el estado del técnico"
        });
    }
}
module.exports = {
    listarTecnicos,
    obtenerTecnico,
    crearTecnico,
    actualizarTecnico,
    actualizarEstadoTecnico
};