import api from "./api";

// =====================================
// LISTAR USUARIOS
// =====================================
export const obtenerUsuarios = async () => {
    const respuesta = await api.get(
        "/usuarios"
    );

    return respuesta.data;
};

// =====================================
// LISTAR ROLES
// =====================================
export const obtenerRoles = async () => {
    const respuesta = await api.get(
        "/usuarios/roles"
    );

    return respuesta.data;
};

// =====================================
// OBTENER USUARIO POR ID
// =====================================
export const obtenerUsuarioPorId = async (
    id
) => {
    const respuesta = await api.get(
        `/usuarios/${id}`
    );

    return respuesta.data;
};

// =====================================
// CREAR USUARIO
// =====================================
export const crearUsuario = async (
    datos
) => {
    const respuesta = await api.post(
        "/usuarios",
        datos
    );

    return respuesta.data;
};

// =====================================
// ACTUALIZAR USUARIO
// =====================================
export const actualizarUsuario = async (
    id,
    datos
) => {
    const respuesta = await api.put(
        `/usuarios/${id}`,
        datos
    );

    return respuesta.data;
};

// =====================================
// ACTIVAR O DESACTIVAR USUARIO
// =====================================
export const actualizarEstadoUsuario = async (
    id,
    Estado
) => {
    const respuesta = await api.patch(
        `/usuarios/${id}/estado`,
        {
            Estado
        }
    );

    return respuesta.data;
};