const {
    asignarOrdenesAutomaticamente,
    asignarOrdenManualmente,
    obtenerAsignaciones,
    obtenerOpcionesAsignacionManual
} = require("../services/asignacionService");

// =====================================
// OBTENER USUARIO AUTENTICADO
// =====================================
function obtenerIdUsuarioAutenticado(req) {
    const idUsuario = Number(
        req.usuario?.idUsuario
    );

    return (
        Number.isInteger(idUsuario) &&
        idUsuario > 0
    )
        ? idUsuario
        : null;
}

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
 * Obtiene las órdenes pendientes y técnicos
 * disponibles para la asignación manual.
 *
 * GET /api/asignaciones/manual/opciones
 */
async function listarOpcionesManuales(
    req,
    res
) {
    try {
        const opciones =
            await obtenerOpcionesAsignacionManual();

        return res.status(200).json(
            opciones
        );
    } catch (error) {
        console.error(
            "Error al obtener opciones de asignación manual:",
            error
        );

        return res.status(500).json({
            ok: false,
            mensaje:
                "No se pudieron cargar las opciones de asignación manual.",
            detalle: error.message
        });
    }
}

/**
 * Registra una asignación manual.
 *
 * POST /api/asignaciones/manual
 */
async function ejecutarAsignacionManual(
    req,
    res
) {
    try {
        const idUsuario =
            obtenerIdUsuarioAutenticado(req);

        if (!idUsuario) {
            return res.status(401).json({
                ok: false,
                mensaje:
                    "No se pudo identificar al usuario autenticado."
            });
        }

        const idOrden = Number(
            req.body?.idOrden
        );

        const idTecnico = Number(
            req.body?.idTecnico
        );

        if (
            !Number.isInteger(idOrden) ||
            idOrden <= 0
        ) {
            return res.status(400).json({
                ok: false,
                mensaje:
                    "Debe seleccionar una orden válida."
            });
        }

        if (
            !Number.isInteger(idTecnico) ||
            idTecnico <= 0
        ) {
            return res.status(400).json({
                ok: false,
                mensaje:
                    "Debe seleccionar un técnico válido."
            });
        }

        console.log(
            "========== ASIGNACIÓN MANUAL =========="
        );

        console.log(
            `Usuario responsable: ${idUsuario}`
        );

        const resultado =
            await asignarOrdenManualmente(
                idOrden,
                idTecnico,
                idUsuario
            );

        return res.status(201).json({
            ok: true,
            mensaje:
                (
                    `La OT ${resultado.codigoOT} ` +
                    `fue asignada correctamente a ` +
                    `${resultado.tecnico}.`
                ),
            asignacion:
                resultado
        });
    } catch (error) {
        console.error(
            "Error al realizar la asignación manual:",
            error
        );

        return res
            .status(
                error.statusCode || 500
            )
            .json({
                ok: false,
                mensaje:
                    error.statusCode
                        ? error.message
                        : "No se pudo realizar la asignación manual.",
                detalle:
                    error.statusCode
                        ? undefined
                        : error.message
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
        const idUsuario =
            obtenerIdUsuarioAutenticado(req);

        if (!idUsuario) {
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
            `Usuario responsable: ${idUsuario}`
        );

        const resultado =
            await asignarOrdenesAutomaticamente(
                idUsuario
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
    listarOpcionesManuales,
    ejecutarAsignacionManual,
    ejecutarAsignacion
};