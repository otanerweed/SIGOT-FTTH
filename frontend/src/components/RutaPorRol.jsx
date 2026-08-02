import {
    Navigate
} from "react-router-dom";

import {
    obtenerUsuario
} from "../services/authService";

function RutaPorRol({
    rolesPermitidos,
    children
}) {
    const usuario = obtenerUsuario();
    const rolActual = usuario?.Rol || "";

    if (
        !rolesPermitidos.includes(
            rolActual
        )
    ) {
        return (
            <Navigate
                to="/"
                replace
            />
        );
    }

    return children;
}

export default RutaPorRol;