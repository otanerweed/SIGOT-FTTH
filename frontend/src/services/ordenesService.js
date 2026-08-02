import api from "./api";

export const obtenerOrdenes = async () => {

    const respuesta = await api.get("/importador/ordenes");

    return respuesta.data;

};