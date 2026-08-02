import { useEffect, useState } from "react";

import Dashboard from "../components/Dashboard";
import { obtenerDashboard } from "../services/dashboardService";

function DashboardPage() {
    const [dashboard, setDashboard] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let componenteActivo = true;

        async function cargarDashboard() {
            try {
                setCargando(true);
                setError("");

                const datos = await obtenerDashboard();

                if (componenteActivo) {
                    setDashboard(datos);
                }
            } catch (error) {
                console.error(
                    "Error al cargar el dashboard:",
                    error
                );

                if (componenteActivo) {
                    setError(
                        error.response?.data?.mensaje ||
                        "No se pudieron cargar los indicadores."
                    );
                }
            } finally {
                if (componenteActivo) {
                    setCargando(false);
                }
            }
        }

        cargarDashboard();

        return () => {
            componenteActivo = false;
        };
    }, []);

    if (cargando) {
        return (
            <div className="dashboardMensaje">
                Cargando indicadores...
            </div>
        );
    }

    if (error) {
        return (
            <div className="dashboardError">
                <h3>No se pudo cargar el dashboard</h3>
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="dashboardPagina">
            <div className="dashboardEncabezado">
                <div>
                    <h2>Dashboard</h2>

                    <p>
                        Resumen general de las órdenes de trabajo
                        FTTH.
                    </p>
                </div>
            </div>

            <Dashboard dashboard={dashboard} />
        </div>
    );
}

export default DashboardPage;