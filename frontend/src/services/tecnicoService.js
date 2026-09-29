import api from "./api";

// ===============================
// LISTAR TÉCNICOS
// ===============================
export const obtenerTecnicos = async () => {
    const respuesta = await api.get("/tecnicos");

    return respuesta.data;
};

// ===============================
// OBTENER TÉCNICO POR ID
// ===============================
export const obtenerTecnicoPorId = async (id) => {
    const respuesta = await api.get(
        `/tecnicos/${id}`
    );

    return respuesta.data;
};

// ===============================
// CREAR TÉCNICO
// ===============================
export const crearTecnico = async (datos) => {
    const respuesta = await api.post(
        "/tecnicos",
        datos
    );

    return respuesta.data;
};

// ===============================
// ACTUALIZAR TÉCNICO
// ===============================
export const actualizarTecnico = async (
    id,
    datos
) => {
    const respuesta = await api.put(
        `/tecnicos/${id}`,
        datos
    );

    return respuesta.data;
};

// ===============================
// ACTIVAR O DESACTIVAR TÉCNICO
// ===============================
export const actualizarEstadoTecnico = async (
    id,
    Activo
) => {
    const respuesta = await api.patch(
        `/tecnicos/${id}/estado`,
        {
            Activo
        }
    );

    return respuesta.data;
};

// ===============================
// OBTENER DISPONIBILIDAD DEL TÉCNICO
// ===============================
export const obtenerDisponibilidadTecnico = async (
    id
) => {
    const respuesta = await api.get(
        `/tecnicos/${id}/disponibilidad`
    );

    return respuesta.data;
};

// ===============================
// GUARDAR / ACTUALIZAR DISPONIBILIDAD
// ===============================
export const guardarDisponibilidadTecnico = async (
    id,
    datos
) => {
    const respuesta = await api.put(
        `/tecnicos/${id}/disponibilidad`,
        datos
    );

    return respuesta.data;
};