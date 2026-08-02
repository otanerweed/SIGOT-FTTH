import "./Dashboard.css";

import DashboardCards from "./DashboardCards";
import GraficoEstado from "./GraficoEstado";

function Dashboard({ dashboard }) {
    return (
        <>
            <DashboardCards dashboard={dashboard} />

            <div className="dashboardGraficos">
                <GraficoEstado dashboard={dashboard} />
            </div>
        </>
    );
}

export default Dashboard;