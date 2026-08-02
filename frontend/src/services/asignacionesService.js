import api from "./api";

// =====================================
// LISTAR ASIGNACIONES
// =====================================
export const obtenerAsignaciones =
    async () => {
        const respuesta = await api.get(
            "/asignaciones"
        );

        return respuesta.data;
    };

// =====================================
// OBTENER OPCIONES DE ASIGNACIÓN MANUAL
// =====================================
export const obtenerOpcionesAsignacionManual =
    async () => {
        const respuesta = await api.get(
            "/asignaciones/manual/opciones"
        );

        return respuesta.data;
    };

// =====================================
// EJECUTAR ASIGNACIÓN MANUAL
// =====================================
export const ejecutarAsignacionManual =
    async (
        idOrden,
        idTecnico
    ) => {
        const respuesta = await api.post(
            "/asignaciones/manual",
            {
                idOrden,
                idTecnico
            }
        );

        return respuesta.data;
    };

// =====================================
// EJECUTAR ASIGNACIÓN AUTOMÁTICA
// =====================================
export const ejecutarAsignacionAutomatica =
    async () => {
        const respuesta = await api.post(
            "/asignaciones/automatica"
        );

        return respuesta.data;
    };