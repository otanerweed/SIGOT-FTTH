import {
    useEffect,
    useState
} from "react";

import Dashboard from "../components/Dashboard";

import {
    obtenerDashboard,
    obtenerKPIs
} from "../services/dashboardService";

function DashboardPage() {

    const [dashboard, setDashboard] =
        useState(null);

    const [kpis, setKpis] =
        useState(null);

    const [fechaDesde, setFechaDesde] =
        useState("2026-09-07");

    const [fechaHasta, setFechaHasta] =
        useState(
            new Date()
                .toLocaleDateString("en-CA")
        );

    const [
        distritoSeleccionado,
        setDistritoSeleccionado
    ] = useState("TODOS");

    /*
     * =====================================================
     * FILTROS REALMENTE APLICADOS AL BACKEND
     * =====================================================
     */

    const [
        filtrosAplicados,
        setFiltrosAplicados
    ] = useState({
        proyecto: "RED_WINET",
        fechaDesde: "2026-09-07",
        fechaHasta:
            new Date()
                .toLocaleDateString("en-CA"),
        distrito: ""
    });

    const [cargando, setCargando] =
        useState(true);

    const [cargandoKPI, setCargandoKPI] =
        useState(false);

    const [error, setError] =
        useState("");

    /*
     * =====================================================
     * CARGAR DASHBOARD GENERAL
     * =====================================================
     */

    useEffect(() => {

        let componenteActivo = true;

        const controller =
            new AbortController();

        async function cargarDashboard() {

            try {

                setCargando(true);
                setError("");

                const datosDashboard =
                    await obtenerDashboard({
                        signal:
                            controller.signal
                    });

                if (componenteActivo) {

                    setDashboard(
                        datosDashboard
                    );

                }

            } catch (error) {

                if (
                    error.code ===
                        "ERR_CANCELED" ||
                    error.name ===
                        "CanceledError"
                ) {
                    return;
                }

                console.error(
                    "Error al cargar el dashboard:",
                    error
                );

                if (componenteActivo) {

                    setError(
                        error.response
                            ?.data?.mensaje ||
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

            controller.abort();

        };

    }, []);

    /*
     * =====================================================
     * CARGAR KPIs
     * =====================================================
     *
     * Esta consulta solamente se ejecuta:
     *
     * 1. Al abrir el Dashboard.
     * 2. Cuando se presiona "Aplicar filtros".
     *
     * Cambiar los controles visuales por separado
     * NO genera una petición.
     */

    useEffect(() => {


        let componenteActivo = true;

        async function cargarKPIs() {

            try {

                setCargandoKPI(true);

                const parametros = {
                    ...(filtrosAplicados.proyecto && {
                        proyecto:
                            filtrosAplicados.proyecto
                    }),

                    ...(filtrosAplicados.fechaDesde && {
                        fechaDesde:
                            filtrosAplicados.fechaDesde
                    }),

                    ...(filtrosAplicados.fechaHasta && {
                        fechaHasta:
                            filtrosAplicados.fechaHasta
                    }),

                    ...(filtrosAplicados.distrito && {
                        distrito:
                            filtrosAplicados.distrito
                    })
                };

                const datos =
                    await obtenerKPIs(
                        parametros
                    );

                if (componenteActivo) {

                    setKpis(datos);

                }

            } catch (error) {

                console.error(
                    "Error al cargar los KPIs:",
                    error
                );

                if (componenteActivo) {

                    setKpis(null);

                }

            } finally {

                if (componenteActivo) {

                    setCargandoKPI(false);

                }

            }

        }

        cargarKPIs();

        return () => {

            componenteActivo = false;

        };

    }, [filtrosAplicados]);
    /*
     * =====================================================
     * APLICAR FILTROS
     * =====================================================
     */

    const aplicarFiltros = () =>
        setFiltrosAplicados({
            proyecto: "RED_WINET",
            fechaDesde: fechaDesde || "",
            fechaHasta: fechaHasta || "",
            distrito:
                distritoSeleccionado !== "TODOS"
                    ? distritoSeleccionado
                    : ""
        });

    /*
     * =====================================================
     * PANTALLA DE CARGA INICIAL
     * =====================================================
     */

    if (cargando) {

        return (
            <div className="dashboardMensaje">
                Cargando indicadores...
            </div>
        );

    }

    /*
     * =====================================================
     * ERROR GENERAL
     * =====================================================
     */

    if (error) {

        return (
            <div className="dashboardError">

                <h3>
                    No se pudo cargar el dashboard
                </h3>

                <p>
                    {error}
                </p>

            </div>
        );

    }

    /*
     * =====================================================
     * DASHBOARD
     * =====================================================
     */

    return (

        <div className="dashboardPagina">

            <div className="dashboardEncabezado">

                <div className="dashboardEncabezadoContenido">

                    <span className="dashboardEyebrow">
                        CENTRO DE OPERACIONES
                    </span>

                    <h1>
                        Dashboard Operativo
                    </h1>

                    <p>
                        Monitoreo operativo de RED WINET.
                    </p>

                </div>

                <div className="dashboardEstadoSistema">

                    <span className="dashboardEstadoPunto"></span>

                    SIGOT-FTTH

                </div>

            </div>

            <Dashboard
                dashboard={dashboard}
                kpis={kpis}
                fechaDesde={fechaDesde}
                setFechaDesde={setFechaDesde}
                fechaHasta={fechaHasta}
                setFechaHasta={setFechaHasta}
                distritoSeleccionado={distritoSeleccionado}
                setDistritoSeleccionado={setDistritoSeleccionado}
                aplicarFiltros={aplicarFiltros}
                cargandoKPI={cargandoKPI}
                filtrosAplicados={filtrosAplicados}
            />

        </div>

    );

}

export default DashboardPage;