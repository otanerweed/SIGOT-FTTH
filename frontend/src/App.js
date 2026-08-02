import {
    BrowserRouter,
    Navigate,
    Route,
    Routes
} from "react-router-dom";

import MainLayout from "./layouts/MainLayout";
import RutaProtegida from "./components/RutaProtegida";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ImportarPage from "./pages/ImportarPage";
import Tecnicos from "./pages/Tecnicos";
import OrdenesPage from "./pages/OrdenesPage";
import AsignacionesPage from "./pages/AsignacionesPage";
import ReportesPage from "./pages/ReportesPage";
import Mapa from "./pages/Mapa";

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Ruta pública */}
                <Route
                    path="/login"
                    element={<LoginPage />}
                />

                {/* Rutas protegidas */}
                <Route element={<RutaProtegida />}>
                    <Route
                        path="/"
                        element={<MainLayout />}
                    >
                        <Route
                            index
                            element={<DashboardPage />}
                        />

                        <Route
                            path="importar"
                            element={<ImportarPage />}
                        />

                        <Route
                            path="ordenes"
                            element={<OrdenesPage />}
                        />

                        <Route
                            path="tecnicos"
                            element={<Tecnicos />}
                        />

                        <Route
                            path="asignaciones"
                            element={<AsignacionesPage />}
                        />

                        <Route
                            path="mapa"
                            element={<Mapa />}
                        />

                        <Route
                            path="reportes"
                            element={<ReportesPage />}
                        />
                    </Route>
                </Route>

                {/* Ruta inexistente */}
                <Route
                    path="*"
                    element={
                        <Navigate
                            to="/"
                            replace
                        />
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;