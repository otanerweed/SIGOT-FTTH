import api from "./api";

// =====================================
// LISTAR ÓRDENES
// =====================================
export const obtenerOrdenes =
    async () => {
        const respuesta =
            await api.get(
                "/importador/ordenes"
            );

        return respuesta.data;
    };

// =====================================
// CAMBIAR ESTADO
// =====================================
export const cambiarEstadoOrden =
    async (
        idOrden,
        estadoNuevo,
        motivo
    ) => {
        const respuesta =
            await api.patch(
                `/ordenes/${idOrden}/estado`,
                {
                    estadoNuevo,
                    motivo
                }
            );

        return respuesta.data;
    };