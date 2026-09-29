import api from "./api";

function limpiarParametros(parametros) {
    return Object.fromEntries(
        Object.entries(parametros).filter(
            ([, valor]) =>
                valor !== "" &&
                valor !== null &&
                valor !== undefined
        )
    );
}

export const obtenerTSS = async (
    parametros = {}
) => {
    const respuesta = await api.get(
        "/tss",
        {
            params: limpiarParametros(
                parametros
            )
        }
    );

    return respuesta.data;
};

export const obtenerDetalleTSS = async (
    idTSS
) => {
    const respuesta = await api.get(
        `/tss/${idTSS}`
    );

    return respuesta.data;
};

export const programarTSS = async (
    idTSS,
    datos
) => {
    const respuesta = await api.post(
        `/tss/${idTSS}/programar`,
        datos
    );

    return respuesta.data;
};
export const cambiarEstadoTSS = async (
    idTSS,
    datos
) => {
    const respuesta = await api.patch(
        `/tss/${idTSS}/estado`,
        datos
    );

    return respuesta.data;
};
export const actualizarContinuidadTSS = async (
    idTSS,
    datos
) => {
    const respuesta = await api.patch(
        `/tss/${idTSS}/continuidad`,
        datos
    );

    return respuesta.data;
};