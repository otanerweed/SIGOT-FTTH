import api from "./api";

// ===============================
// OBTENER REPORTE GENERAL
// ===============================
export const obtenerReporteGeneral = async () => {
    const respuesta = await api.get(
        "/reportes/general"
    );

    return respuesta.data;
};