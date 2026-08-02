import { Outlet } from "react-router-dom";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";

import "./MainLayout.css";

function MainLayout() {
  return (
    <div className="layout">
      <Navbar />

      <div className="contenido">
        <Sidebar />

        <main className="principal">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;