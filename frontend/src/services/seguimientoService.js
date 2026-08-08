import api from "./api";

// =====================================
// OBTENER TODOS LOS SEGUIMIENTOS
// =====================================
export const obtenerSeguimientos =
    async () => {
        const respuesta =
            await api.get(
                "/seguimiento"
            );

        return respuesta.data;
    };

// =====================================
// OBTENER SEGUIMIENTO POR ASIGNACIÓN
// =====================================
export const obtenerSeguimientoPorAsignacion =
    async (
        idAsignacion
    ) => {
        const respuesta =
            await api.get(
                `/seguimiento/asignacion/${idAsignacion}`
            );

        return respuesta.data;
    };