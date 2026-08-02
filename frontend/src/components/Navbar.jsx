import { useNavigate } from "react-router-dom";

import {
    cerrarSesion,
    obtenerUsuario
} from "../services/authService";

import "./Navbar.css";

function Navbar() {
    const navigate = useNavigate();
    const usuario = obtenerUsuario();

    const manejarCerrarSesion = () => {
        const confirmar = window.confirm(
            "¿Está seguro de que desea cerrar sesión?"
        );

        if (!confirmar) {
            return;
        }

        cerrarSesion();

        navigate("/login", {
            replace: true
        });
    };

    return (
        <header className="navbar">
            <div className="navbar-logo">
                SIGOT-FTTH
            </div>

            <div className="navbar-usuario">
                <div className="navbar-avatar">
                    {usuario?.NombreCompleto
                        ?.charAt(0)
                        ?.toUpperCase() || "U"}
                </div>

                <div className="navbar-datos">
                    <span className="navbar-nombre">
                        {usuario?.NombreCompleto ||
                            "Usuario"}
                    </span>

                    <span className="navbar-rol">
                        {usuario?.Rol ||
                            "Sin rol"}
                    </span>
                </div>

                <button
                    type="button"
                    className="navbar-cerrar-sesion"
                    onClick={manejarCerrarSesion}
                >
                    Cerrar sesión
                </button>
            </div>
        </header>
    );
}

export default Navbar;