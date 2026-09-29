import "./Dashboard.css";

import DashboardCards from "./DashboardCards";

function Dashboard({
    dashboard,
    kpis,
    fechaDesde,
    setFechaDesde,
    fechaHasta,
    setFechaHasta,
    distritoSeleccionado,
    setDistritoSeleccionado,
    aplicarFiltros,
    cargandoKPI,
    filtrosAplicados
}) {

    return (
        <>
            <DashboardCards
                dashboard={dashboard}
                kpis={kpis}
                fechaDesde={fechaDesde}
                setFechaDesde={setFechaDesde}
                fechaHasta={fechaHasta}
                setFechaHasta={setFechaHasta}
                distritoSeleccionado={
                    distritoSeleccionado
                }
                setDistritoSeleccionado={
                    setDistritoSeleccionado
                }
                aplicarFiltros={aplicarFiltros}
                cargandoKPI={cargandoKPI}
                filtrosAplicados={filtrosAplicados}
            />

        </>
    );
}

export default Dashboard;