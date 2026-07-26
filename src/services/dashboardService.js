import api from "./api";

export const obtenerDashboard = async () => {

    const respuesta = await api.get("/dashboard");

    return respuesta.data;

};