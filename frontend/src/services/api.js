import axios from "axios";

const TOKEN_KEY = "sigot_token";
const USUARIO_KEY = "sigot_usuario";

export const API_BASE_URL =
    process.env.REACT_APP_API_URL ||
    "http://localhost:3001/api";

const api = axios.create({
    baseURL: API_BASE_URL
});

// =====================================
// ENVIAR TOKEN EN CADA PETICIÓN
// =====================================
api.interceptors.request.use(
    (config) => {
        const token =
            localStorage.getItem(TOKEN_KEY);

        if (token) {
            config.headers.Authorization =
                `Bearer ${token}`;
        }

        return config;
    },
    (error) => Promise.reject(error)
);

// =====================================
// CONTROLAR SESIÓN VENCIDA O INVÁLIDA
// =====================================
api.interceptors.response.use(
    (response) => response,

    (error) => {
        const estado =
            error.response?.status;

        const esRutaLogin =
            error.config?.url?.includes(
                "/auth/login"
            );

        /*
         * No redirigir cuando el error 401
         * proviene de credenciales incorrectas.
         */
        if (
            estado === 401 &&
            !esRutaLogin
        ) {
            localStorage.removeItem(
                TOKEN_KEY
            );

            localStorage.removeItem(
                USUARIO_KEY
            );

            if (
                window.location.pathname !==
                "/login"
            ) {
                window.location.replace(
                    "/login"
                );
            }
        }

        return Promise.reject(error);
    }
);

export default api;