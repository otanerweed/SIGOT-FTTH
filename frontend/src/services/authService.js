import api from "./api";

const TOKEN_KEY = "sigot_token";
const USUARIO_KEY = "sigot_usuario";

// =====================================
// INICIAR SESIÓN
// =====================================
export async function iniciarSesion(
    usuario,
    password
) {
    const respuesta = await api.post(
        "/auth/login",
        {
            usuario,
            password
        }
    );

    return respuesta.data;
}

// =====================================
// GUARDAR SESIÓN
// =====================================
export function guardarSesion(
    token,
    usuario
) {
    localStorage.setItem(
        TOKEN_KEY,
        token
    );

    localStorage.setItem(
        USUARIO_KEY,
        JSON.stringify(usuario)
    );
}

// =====================================
// OBTENER TOKEN
// =====================================
export function obtenerToken() {
    return localStorage.getItem(
        TOKEN_KEY
    );
}

// =====================================
// OBTENER USUARIO
// =====================================
export function obtenerUsuario() {
    const usuarioGuardado =
        localStorage.getItem(
            USUARIO_KEY
        );

    if (!usuarioGuardado) {
        return null;
    }

    try {
        return JSON.parse(
            usuarioGuardado
        );
    } catch (error) {
        console.error(
            "No se pudo leer el usuario guardado:",
            error
        );

        return null;
    }
}

// =====================================
// COMPROBAR SESIÓN
// =====================================
export function haySesion() {
    return Boolean(
        obtenerToken()
    );
}

// =====================================
// CERRAR SESIÓN
// =====================================
export function cerrarSesion() {
    localStorage.removeItem(
        TOKEN_KEY
    );

    localStorage.removeItem(
        USUARIO_KEY
    );
}

// =====================================
// VALIDAR TOKEN CON EL BACKEND
// =====================================
export async function obtenerPerfil() {
    const respuesta = await api.get(
        "/auth/perfil"
    );

    return respuesta.data;
}