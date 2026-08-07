const {
    asignarOrdenesAutomaticamente,
    asignarOrdenManualmente,
    reasignarOrden,
    cancelarAsignacion,
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

// =====================================
// LISTAR ASIGNACIONES
// =====================================
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
            detalle:
                error.message
        });
    }
}

// =====================================
// OPCIONES DE ASIGNACIÓN MANUAL
// =====================================
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
            detalle:
                error.message
        });
    }
}

// =====================================
// EJECUTAR ASIGNACIÓN MANUAL
// =====================================
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

// =====================================
// REASIGNAR ORDEN
// =====================================
async function ejecutarReasignacion(
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

        const idAsignacion = Number(
            req.params.id
        );

        const idTecnicoNuevo = Number(
            req.body?.idTecnicoNuevo
        );

        const motivo = String(
            req.body?.motivo || ""
        ).trim();

        if (
            !Number.isInteger(idAsignacion) ||
            idAsignacion <= 0
        ) {
            return res.status(400).json({
                ok: false,
                mensaje:
                    "La asignación seleccionada no es válida."
            });
        }

        if (
            !Number.isInteger(idTecnicoNuevo) ||
            idTecnicoNuevo <= 0
        ) {
            return res.status(400).json({
                ok: false,
                mensaje:
                    "Debe seleccionar un técnico válido."
            });
        }

        const resultado =
            await reasignarOrden(
                idAsignacion,
                idTecnicoNuevo,
                motivo,
                idUsuario
            );

        return res.status(201).json({
            ok: true,

            mensaje:
                (
                    `La OT ${resultado.codigoOT} ` +
                    `fue reasignada correctamente a ` +
                    `${resultado.tecnicoNuevo}.`
                ),

            reasignacion:
                resultado
        });
    } catch (error) {
        console.error(
            "Error al reasignar la orden:",
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
                        : "No se pudo reasignar la orden.",

                detalle:
                    error.statusCode
                        ? undefined
                        : error.message
            });
    }
}

// =====================================
// CANCELAR ASIGNACIÓN
// =====================================
async function ejecutarCancelacion(
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

        const idAsignacion = Number(
            req.params.id
        );

        const motivo = String(
            req.body?.motivo || ""
        ).trim();

        if (
            !Number.isInteger(idAsignacion) ||
            idAsignacion <= 0
        ) {
            return res.status(400).json({
                ok: false,
                mensaje:
                    "La asignación seleccionada no es válida."
            });
        }

        const resultado =
            await cancelarAsignacion(
                idAsignacion,
                motivo,
                idUsuario
            );

        return res.status(200).json({
            ok: true,

            mensaje:
                (
                    `La asignación de la OT ` +
                    `${resultado.codigoOT} fue cancelada correctamente.`
                ),

            cancelacion:
                resultado
        });
    } catch (error) {
        console.error(
            "Error al cancelar la asignación:",
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
                        : "No se pudo cancelar la asignación.",

                detalle:
                    error.statusCode
                        ? undefined
                        : error.message
            });
    }
}

// =====================================
// EJECUTAR ASIGNACIÓN AUTOMÁTICA
// =====================================
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
            detalle:
                error.message
        });
    }
}

module.exports = {
    listarAsignaciones,
    listarOpcionesManuales,
    ejecutarAsignacionManual,
    ejecutarReasignacion,
    ejecutarCancelacion,
    ejecutarAsignacion
};