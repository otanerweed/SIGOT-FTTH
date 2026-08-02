const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const usuarioModel = require(
    "../models/usuarioModel"
);

// =====================================
// CREAR ERROR CONTROLADO
// =====================================
function crearError(mensaje, estadoHttp) {
    const error = new Error(mensaje);
    error.estadoHttp = estadoHttp;

    return error;
}

// =====================================
// INICIAR SESIÓN
// =====================================
async function iniciarSesion(usuario, password) {
    const nombreUsuario = String(
        usuario || ""
    ).trim();

    const claveIngresada = String(
        password || ""
    );

    if (!nombreUsuario || !claveIngresada) {
        throw crearError(
            "Ingrese el usuario y la contraseña.",
            400
        );
    }

    const usuarioEncontrado =
        await usuarioModel.obtenerUsuarioPorNombre(
            nombreUsuario
        );

    /*
     * Se utiliza un mensaje general para no revelar
     * si el usuario existe o si la contraseña falló.
     */
    if (!usuarioEncontrado) {
        throw crearError(
            "Usuario o contraseña incorrectos.",
            401
        );
    }

    if (!usuarioEncontrado.Estado) {
        throw crearError(
            "El usuario se encuentra desactivado.",
            403
        );
    }

    const passwordCorrecto =
        await bcrypt.compare(
            claveIngresada,
            usuarioEncontrado.PasswordHash
        );

    if (!passwordCorrecto) {
        throw crearError(
            "Usuario o contraseña incorrectos.",
            401
        );
    }

    if (!process.env.JWT_SECRET) {
        throw crearError(
            "La seguridad del servidor no está configurada.",
            500
        );
    }

    const datosToken = {
        idUsuario:
            usuarioEncontrado.IdUsuario,

        idRol:
            usuarioEncontrado.IdRol,

        usuario:
            usuarioEncontrado.Usuario,

        nombreCompleto:
            usuarioEncontrado.NombreCompleto,

        rol:
            usuarioEncontrado.Rol
    };

    const token = jwt.sign(
        datosToken,
        process.env.JWT_SECRET,
        {
            expiresIn:
                process.env.JWT_EXPIRES_IN ||
                "8h"
        }
    );

    return {
        token,

        usuario: {
            IdUsuario:
                usuarioEncontrado.IdUsuario,

            IdRol:
                usuarioEncontrado.IdRol,

            NombreCompleto:
                usuarioEncontrado.NombreCompleto,

            Usuario:
                usuarioEncontrado.Usuario,

            Correo:
                usuarioEncontrado.Correo,

            Rol:
                usuarioEncontrado.Rol
        }
    };
}

module.exports = {
    iniciarSesion
};