const {
    asignarOrdenesAutomaticamente,
    obtenerAsignaciones
} = require("../services/asignacionService");

/**
 * Lista las asignaciones registradas.
 *
 * GET /api/asignaciones
 */
async function listarAsignaciones(req, res) {
    try {
        const asignaciones =
            await obtenerAsignaciones();

        return res.status(200).json(
            asignaciones
        );
    } catch (error) {
        console.error(
            "Error al listar asignaciones:",
            error
        );

        return res.status(500).json({
            ok: false,
            mensaje:
                "No se pudieron obtener las asignaciones.",
            detalle: error.message
        });
    }
}

/**
 * Ejecuta el proceso de asignación automática.
 *
 * POST /api/asignaciones/automatica
 */
async function ejecutarAsignacion(req, res) {
    try {
        const resultado =
            await asignarOrdenesAutomaticamente();

        const cantidadErrores =
            resultado.errores.length;

        return res.status(200).json({
            ok: true,

            mensaje:
                cantidadErrores > 0
                    ? "Asignación completada con observaciones."
                    : "Asignación automática completada correctamente.",

            resumen: {
                totalAsignadas:
                    resultado.total,

                sinTecnicoDisponible:
                    resultado.sinTecnico,

                sinFechaOHorario:
                    resultado.sinAgenda,

                totalErrores:
                    cantidadErrores
            },

            errores: resultado.errores
        });
    } catch (error) {
        console.error(
            "Error general en la asignación automática:",
            error
        );

        return res.status(500).json({
            ok: false,
            mensaje:
                "No se pudo ejecutar la asignación automática.",
            detalle: error.message
        });
    }
}

module.exports = {
    listarAsignaciones,
    ejecutarAsignacion
};