import {
    NavLink
} from "react-router-dom";

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

    const puedeVerSeguimiento = [
        "Administrador",
        "Coordinador",
        "Supervisor"
    ].includes(rol);

    const puedeVerMapa = [
        "Administrador",
        "Coordinador",
        "Supervisor"
    ].includes(rol);

    const puedeVerAuditoria = [
        "Administrador",
        "Supervisor"
    ].includes(rol);

    const puedeGestionarUsuarios =
        rol === "Administrador";
    const puedeVerControlOperativo = [
        "Administrador",
        "Coordinador",
        "Supervisor",
        "Consulta",
        "Jefe"
    ].includes(rol);
        return (
        <aside className="sidebar">
            <h3>
                Menú
            </h3>

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

                {[
                    "Administrador",
                    "Coordinador",
                    "Supervisor"
                ].includes(rol) && (
                    <li>
                        <NavLink to="/ordenes">
                            📋 Órdenes
                        </NavLink>
                    </li>
                )}

                {[
                    "Administrador",
                    "Coordinador",
                    "Supervisor"
                ].includes(rol) && (
                    <li>
                        <NavLink to="/tss">
                            🧰 TSS
                        </NavLink>
                    </li>
                )}

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

                {puedeVerSeguimiento && (
                    <li>
                        <NavLink to="/seguimiento">
                            🕒 Seguimiento OT
                        </NavLink>
                    </li>
                )}

                {puedeVerControlOperativo && (
                    <li>
                        <NavLink to="/control-operativo">
                            🕐 Control Operativo
                        </NavLink>
                    </li>
                )}

                {puedeVerMapa && (
                    <li>
                        <NavLink to="/mapa">
                            🗺️ Mapa
                        </NavLink>
                    </li>
                )}

                {[
                    "Administrador",
                    "Coordinador",
                    "Supervisor"
                ].includes(rol) && (
                    <li>
                        <NavLink to="/reportes">
                            📈 Reportes
                        </NavLink>
                    </li>
                )}

                {puedeVerAuditoria && (
                    <li>
                        <NavLink to="/auditoria">
                            🔎 Auditoría
                        </NavLink>
                    </li>
                )}

                {puedeGestionarUsuarios && (
                    <li>
                        <NavLink to="/usuarios">
                            👤 Usuarios
                        </NavLink>
                    </li>
                )}
            </ul>
        </aside>
    );
}

export default Sidebar;
