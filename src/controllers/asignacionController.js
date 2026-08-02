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
        // =====================================
        // USUARIO AUTENTICADO DESDE EL JWT
        // =====================================
        const idUsuarioAutenticado = Number(
            req.usuario?.idUsuario
        );

        if (
            !Number.isInteger(
                idUsuarioAutenticado
            ) ||
            idUsuarioAutenticado <= 0
        ) {
            return res.status(401).json({
                ok: false,
                mensaje:
                    "No se pudo identificar al usuario autenticado."
            });
        }

        console.log(
            "========== ASIGNACIÓN AUTOMÁTICA =========="
        );

        console.log(
            `Usuario responsable: ${idUsuarioAutenticado}`
        );

        const resultado =
            await asignarOrdenesAutomaticamente(
                idUsuarioAutenticado
            );

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

            errores:
                resultado.errores
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