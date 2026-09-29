import api from "./api";

export const obtenerDashboard = async (config = {}) => {
    const respuesta = await api.get("/dashboard", config);

    return respuesta.data;
};

export const obtenerKPIs = async (
    parametros = {},
    config = {}
) => {
    const respuesta = await api.get("/dashboard/kpis", {
        params: parametros,
        ...config
    });

    return respuesta.data;
};