import api from "./api";

// ===============================
// LISTAR ASIGNACIONES
// ===============================
export const obtenerAsignaciones = async () => {
    const respuesta = await api.get(
        "/asignaciones"
    );

    return respuesta.data;
};

// ===============================
// EJECUTAR ASIGNACIÓN AUTOMÁTICA
// ===============================
export const ejecutarAsignacionAutomatica =
    async () => {
        const respuesta = await api.post(
            "/asignaciones/automatica"
        );

        return respuesta.data;
    };