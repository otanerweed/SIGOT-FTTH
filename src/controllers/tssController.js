const {
    listarTSS,
    obtenerTSSPorId,
    programarTSS,
    cambiarEstadoTSS,
    actualizarContinuidadTSS
} = require("../services/tssService");

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

async function listar(req, res) {
    try {
        const resultado = await listarTSS(
            req.query
        );

        return res.status(200).json({
            ok: true,
            ...resultado
        });
    } catch (error) {
        console.error(
            "Error al listar TSS:",
            error.message
        );

        return res
            .status(error.statusCode || 500)
            .json({
                ok: false,
                mensaje: error.statusCode
                    ? error.message
                    : "No se pudo obtener la bandeja TSS."
            });
    }
}

async function obtener(req, res) {
    try {
        const resultado = await obtenerTSSPorId(
            req.params.id
        );

        return res.status(200).json({
            ok: true,
            ...resultado
        });
    } catch (error) {
        console.error(
            "Error al obtener TSS:",
            error.message
        );

        return res
            .status(error.statusCode || 500)
            .json({
                ok: false,
                mensaje: error.statusCode
                    ? error.message
                    : "No se pudo obtener el detalle TSS."
            });
    }
}

async function programar(req, res) {
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

        const resultado = await programarTSS(
            req.params.id,
            req.body,
            idUsuario
        );

        return res.status(200).json({
            ok: true,
            mensaje:
                "TSS programado correctamente.",
            programacion: resultado
        });
    } catch (error) {
        console.error(
            "Error al programar TSS:",
            error.message
        );

        return res
            .status(error.statusCode || 500)
            .json({
                ok: false,
                mensaje: error.statusCode
                    ? error.message
                    : "No se pudo programar el TSS."
            });
    }
}
async function cambiarEstado(req, res) {
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

        const resultado =
            await cambiarEstadoTSS(
                req.params.id,
                req.body,
                idUsuario
            );

        return res.status(200).json({
            ok: true,
            mensaje:
                "Estado TSS actualizado correctamente.",
            cambio: resultado
        });
    } catch (error) {
        console.error(
            "Error al cambiar estado TSS:",
            error.message
        );

        return res
            .status(error.statusCode || 500)
            .json({
                ok: false,
                mensaje: error.statusCode
                    ? error.message
                    : "No se pudo actualizar el estado TSS."
            });
    }
}
async function actualizarContinuidad(req, res) {
    try {
        const resultado =
            await actualizarContinuidadTSS(
                req.params.id,
                {
                    ...req.body,
                    idUsuario:
                        req.usuario?.idUsuario
                }
            );

        return res.status(200).json({
            ok: true,
            mensaje:
                "Continuidad de instalación actualizada correctamente.",
            continuidad: resultado
        });
    } catch (error) {
        console.error(
            "Error al actualizar continuidad TSS:",
            error.message
        );

        return res
            .status(error.statusCode || 500)
            .json({
                ok: false,
                mensaje: error.statusCode
                    ? error.message
                    : "No se pudo actualizar la continuidad del TSS."
            });
    }
}
module.exports = {
    listar,
    obtener,
    programar,
    cambiarEstado,
    actualizarContinuidad
};