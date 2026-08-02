const authService = require(
    "../services/authService"
);

// =====================================
// INICIAR SESIÓN
// =====================================
async function iniciarSesion(req, res) {
    try {
        const {
            usuario,
            password
        } = req.body;

        const resultado =
            await authService.iniciarSesion(
                usuario,
                password
            );

        return res.status(200).json({
            ok: true,
            mensaje:
                "Inicio de sesión correcto.",
            token: resultado.token,
            usuario: resultado.usuario
        });
    } catch (error) {
        console.error(
            "Error al iniciar sesión:",
            error.message
        );

        const estadoHttp =
            error.estadoHttp || 500;

        return res.status(estadoHttp).json({
            ok: false,
            mensaje:
                error.message ||
                "No se pudo iniciar sesión."
        });
    }
}

// =====================================
// OBTENER PERFIL AUTENTICADO
// =====================================
async function obtenerPerfil(req, res) {
    return res.status(200).json({
        ok: true,
        mensaje:
            "Token válido.",
        usuario: {
            IdUsuario:
                req.usuario.idUsuario,

            IdRol:
                req.usuario.idRol,

            Usuario:
                req.usuario.usuario,

            NombreCompleto:
                req.usuario.nombreCompleto,

            Rol:
                req.usuario.rol
        }
    });
}

module.exports = {
    iniciarSesion,
    obtenerPerfil
};