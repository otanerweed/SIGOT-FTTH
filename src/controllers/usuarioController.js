const usuarioService = require(
    "../services/usuarioService"
);

function responderError(
    res,
    error,
    mensajePredeterminado
) {
    console.error(
        mensajePredeterminado,
        error
    );

    return res.status(
        error.statusCode || 500
    ).json({
        ok: false,
        mensaje:
            error.message ||
            mensajePredeterminado
    });
}

// =====================================
// LISTAR USUARIOS
// =====================================
async function listarUsuarios(req, res) {
    try {
        const usuarios =
            await usuarioService.listarUsuarios();

        return res.json(usuarios);
    } catch (error) {
        return responderError(
            res,
            error,
            "No se pudieron listar los usuarios."
        );
    }
}

// =====================================
// LISTAR ROLES
// =====================================
async function listarRoles(req, res) {
    try {
        const roles =
            await usuarioService.listarRoles();

        return res.json(roles);
    } catch (error) {
        return responderError(
            res,
            error,
            "No se pudieron listar los roles."
        );
    }
}

// =====================================
// OBTENER USUARIO
// =====================================
async function obtenerUsuario(req, res) {
    try {
        const usuario =
            await usuarioService.obtenerUsuario(
                req.params.id
            );

        return res.json(usuario);
    } catch (error) {
        return responderError(
            res,
            error,
            "No se pudo obtener el usuario."
        );
    }
}

// =====================================
// CREAR USUARIO
// =====================================
async function crearUsuario(req, res) {
    try {
        const usuario =
            await usuarioService.crearUsuario(
                req.body
            );

        return res.status(201).json({
            ok: true,
            mensaje:
                "Usuario registrado correctamente.",
            usuario
        });
    } catch (error) {
        return responderError(
            res,
            error,
            "No se pudo registrar el usuario."
        );
    }
}

// =====================================
// ACTUALIZAR USUARIO
// =====================================
async function actualizarUsuario(req, res) {
    try {
        const usuario =
            await usuarioService.actualizarUsuario(
                req.params.id,
                req.body
            );

        return res.json({
            ok: true,
            mensaje:
                "Usuario actualizado correctamente.",
            usuario
        });
    } catch (error) {
        return responderError(
            res,
            error,
            "No se pudo actualizar el usuario."
        );
    }
}

// =====================================
// ACTIVAR O DESACTIVAR USUARIO
// =====================================
async function actualizarEstadoUsuario(
    req,
    res
) {
    try {
        const usuario =
            await usuarioService
                .actualizarEstadoUsuario(
                    req.params.id,
                    req.body.Estado,
                    req.usuario.idUsuario
                );

        return res.json({
            ok: true,
            mensaje: usuario.Estado
                ? "Usuario activado correctamente."
                : "Usuario desactivado correctamente.",
            usuario
        });
    } catch (error) {
        return responderError(
            res,
            error,
            "No se pudo actualizar el estado del usuario."
        );
    }
}

module.exports = {
    listarUsuarios,
    listarRoles,
    obtenerUsuario,
    crearUsuario,
    actualizarUsuario,
    actualizarEstadoUsuario
};