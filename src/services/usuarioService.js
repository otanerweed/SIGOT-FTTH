const bcrypt = require("bcryptjs");

const usuarioModel = require(
    "../models/usuarioModel"
);

function crearError(
    mensaje,
    estado = 400
) {
    const error = new Error(mensaje);
    error.statusCode = estado;

    return error;
}

function normalizarTexto(valor) {
    return String(valor ?? "").trim();
}

function normalizarUsuario(valor) {
    return normalizarTexto(valor)
        .toLowerCase();
}

function normalizarCorreo(valor) {
    const correo = normalizarTexto(valor);

    return correo
        ? correo.toLowerCase()
        : null;
}

function validarCorreo(correo) {
    if (!correo) {
        return;
    }

    const formatoCorreo =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formatoCorreo.test(correo)) {
        throw crearError(
            "El correo ingresado no es válido."
        );
    }
}

async function listarUsuarios() {
    return usuarioModel.listarUsuarios();
}

async function listarRoles() {
    return usuarioModel.listarRoles();
}

async function obtenerUsuario(idUsuario) {
    const id = Number(idUsuario);

    if (!Number.isInteger(id) || id <= 0) {
        throw crearError(
            "El identificador del usuario no es válido."
        );
    }

    const usuario =
        await usuarioModel.obtenerUsuarioPorId(id);

    if (!usuario) {
        throw crearError(
            "El usuario solicitado no existe.",
            404
        );
    }

    return usuario;
}

async function crearUsuario(datos) {
    const nombreCompleto =
        normalizarTexto(datos.NombreCompleto);

    const usuario =
        normalizarUsuario(datos.Usuario);

    const password =
        String(datos.Password ?? "");

    const correo =
        normalizarCorreo(datos.Correo);

    const idRol = Number(datos.IdRol);

    if (!nombreCompleto) {
        throw crearError(
            "El nombre completo es obligatorio."
        );
    }

    if (nombreCompleto.length > 150) {
        throw crearError(
            "El nombre completo no puede superar los 150 caracteres."
        );
    }

    if (!usuario) {
        throw crearError(
            "El nombre de usuario es obligatorio."
        );
    }

    if (usuario.length > 50) {
        throw crearError(
            "El nombre de usuario no puede superar los 50 caracteres."
        );
    }

    if (password.length < 8) {
        throw crearError(
            "La contraseña debe tener como mínimo 8 caracteres."
        );
    }

    if (
        !Number.isInteger(idRol) ||
        idRol <= 0
    ) {
        throw crearError(
            "Debe seleccionar un rol válido."
        );
    }

    validarCorreo(correo);

    const rol =
        await usuarioModel.obtenerRolPorId(idRol);

    if (!rol) {
        throw crearError(
            "El rol seleccionado no existe."
        );
    }

    const usuarioExistente =
        await usuarioModel.obtenerUsuarioPorNombre(
            usuario
        );

    if (usuarioExistente) {
        throw crearError(
            "Ya existe un usuario registrado con ese nombre.",
            409
        );
    }

    const passwordHash =
        await bcrypt.hash(password, 10);

    const idUsuario =
        await usuarioModel.crearUsuario({
            IdRol: idRol,
            NombreCompleto: nombreCompleto,
            Usuario: usuario,
            PasswordHash: passwordHash,
            Correo: correo,
            Estado: true
        });

    return usuarioModel.obtenerUsuarioPorId(
        idUsuario
    );
}

async function actualizarUsuario(
    idUsuario,
    datos
) {
    const id = Number(idUsuario);

    if (!Number.isInteger(id) || id <= 0) {
        throw crearError(
            "El identificador del usuario no es válido."
        );
    }

    const usuarioActual =
        await usuarioModel.obtenerUsuarioPorId(id);

    if (!usuarioActual) {
        throw crearError(
            "El usuario solicitado no existe.",
            404
        );
    }

    const nombreCompleto =
        normalizarTexto(datos.NombreCompleto);

    const usuario =
        normalizarUsuario(datos.Usuario);

    const password =
        String(datos.Password ?? "");

    const correo =
        normalizarCorreo(datos.Correo);

    const idRol = Number(datos.IdRol);

    if (!nombreCompleto) {
        throw crearError(
            "El nombre completo es obligatorio."
        );
    }

    if (nombreCompleto.length > 150) {
        throw crearError(
            "El nombre completo no puede superar los 150 caracteres."
        );
    }

    if (!usuario) {
        throw crearError(
            "El nombre de usuario es obligatorio."
        );
    }

    if (usuario.length > 50) {
        throw crearError(
            "El nombre de usuario no puede superar los 50 caracteres."
        );
    }

    if (
        password &&
        password.length < 8
    ) {
        throw crearError(
            "La nueva contraseña debe tener como mínimo 8 caracteres."
        );
    }

    if (
        !Number.isInteger(idRol) ||
        idRol <= 0
    ) {
        throw crearError(
            "Debe seleccionar un rol válido."
        );
    }

    validarCorreo(correo);

    const rol =
        await usuarioModel.obtenerRolPorId(idRol);

    if (!rol) {
        throw crearError(
            "El rol seleccionado no existe."
        );
    }

    const usuarioDuplicado =
        await usuarioModel.obtenerUsuarioPorNombre(
            usuario,
            id
        );

    if (usuarioDuplicado) {
        throw crearError(
            "Ya existe otro usuario registrado con ese nombre.",
            409
        );
    }

    let passwordHash = null;

    if (password) {
        passwordHash =
            await bcrypt.hash(password, 10);
    }

    await usuarioModel.actualizarUsuario(
        id,
        {
            IdRol: idRol,
            NombreCompleto: nombreCompleto,
            Usuario: usuario,
            Correo: correo,
            PasswordHash: passwordHash
        }
    );

    return usuarioModel.obtenerUsuarioPorId(id);
}

async function actualizarEstadoUsuario(
    idUsuario,
    estado,
    idUsuarioAutenticado
) {
    const id = Number(idUsuario);
    const idAutenticado =
        Number(idUsuarioAutenticado);

    if (!Number.isInteger(id) || id <= 0) {
        throw crearError(
            "El identificador del usuario no es válido."
        );
    }

    if (typeof estado !== "boolean") {
        throw crearError(
            "El estado del usuario debe ser verdadero o falso."
        );
    }

    const usuario =
        await usuarioModel.obtenerUsuarioPorId(id);

    if (!usuario) {
        throw crearError(
            "El usuario solicitado no existe.",
            404
        );
    }

    if (
        id === idAutenticado &&
        estado === false
    ) {
        throw crearError(
            "No puede desactivar su propia cuenta.",
            409
        );
    }

    await usuarioModel.actualizarEstadoUsuario(
        id,
        estado
    );

    return usuarioModel.obtenerUsuarioPorId(id);
}

module.exports = {
    listarUsuarios,
    listarRoles,
    obtenerUsuario,
    crearUsuario,
    actualizarUsuario,
    actualizarEstadoUsuario
};