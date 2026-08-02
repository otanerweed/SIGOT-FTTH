import {
    Navigate,
    Outlet
} from "react-router-dom";

import {
    haySesion
} from "../services/authService";

function RutaProtegida() {
    if (!haySesion()) {
        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    return <Outlet />;
}

export default RutaProtegida;