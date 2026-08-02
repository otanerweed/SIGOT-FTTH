import { NavLink } from "react-router-dom";
import "./Sidebar.css";

function Sidebar() {

    return (

        <aside className="sidebar">

            <h3>Menú</h3>

            <ul>

                <li>
                    <NavLink to="/">
                        📊 Dashboard
                    </NavLink>
                </li>

                <li>
                    <NavLink to="/importar">
                        📂 Importar OFSC
                    </NavLink>
                </li>

                <li>
                    <NavLink to="/ordenes">
                        📋 Órdenes
                    </NavLink>
                </li>

                <li>
                    <NavLink to="/tecnicos">
                        👷 Técnicos
                    </NavLink>
                </li>

                <li>
                    <NavLink to="/asignaciones">
                        📌 Asignaciones
                    </NavLink>
                </li>

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