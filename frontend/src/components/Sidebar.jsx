import { NavLink } from "react-router-dom";

import {
    obtenerUsuario
} from "../services/authService";

import "./Sidebar.css";

function Sidebar() {
    const usuario = obtenerUsuario();

    const rol = usuario?.Rol || "";

    const puedeImportar = [
        "Administrador",
        "Coordinador"
    ].includes(rol);

    const puedeGestionarTecnicos = [
        "Administrador",
        "Coordinador"
    ].includes(rol);

    const puedeVerAsignaciones = [
        "Administrador",
        "Coordinador",
        "Supervisor"
    ].includes(rol);

    return (
        <aside className="sidebar">
            <h3>Menú</h3>

            <ul>
                <li>
                    <NavLink to="/">
                        📊 Dashboard
                    </NavLink>
                </li>

                {puedeImportar && (
                    <li>
                        <NavLink to="/importar">
                            📂 Importar OFSC
                        </NavLink>
                    </li>
                )}

                <li>
                    <NavLink to="/ordenes">
                        📋 Órdenes
                    </NavLink>
                </li>

                {puedeGestionarTecnicos && (
                    <li>
                        <NavLink to="/tecnicos">
                            👷 Técnicos
                        </NavLink>
                    </li>
                )}

                {puedeVerAsignaciones && (
                    <li>
                        <NavLink to="/asignaciones">
                            📌 Asignaciones
                        </NavLink>
                    </li>
                )}

                <li>
                    <NavLink to="/reportes">
                        📈 Reportes
                    </NavLink>
                </li>
            </ul>
        </aside>
    );
}

export default Sidebar;