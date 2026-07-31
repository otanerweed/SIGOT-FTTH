const express = require("express");
const cors = require("cors");

const app = express();

// Rutas
const importadorRoutes = require("./routes/importadorRoutes");
const ordenesRoutes = require("./routes/ordenesRoutes");
const tecnicosRoutes = require("./routes/tecnicoRoutes"); // ← IMPORTANTE
const asignacionRoutes = require("./routes/asignacionRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const asignacionesListadoRoutes = require("./routes/asignacionesListadoRoutes");
const reporteRoutes = require("./routes/reporteRoutes");

// Middlewares
app.use(cors());
app.use(express.json());

// Ruta principal
app.get("/", (req, res) => {
    res.json({
        sistema: "SIGOT-FTTH",
        version: "1.0",
        mensaje: "API funcionando correctamente"
    });
});

// Importador
app.use("/api/importador", importadorRoutes);

// Órdenes
app.use("/api/ordenes", ordenesRoutes);

// Técnicos
app.use("/api/tecnicos", tecnicosRoutes);

app.use("/api/asignaciones", asignacionRoutes);

app.use("/api/dashboard", dashboardRoutes);

app.use("/api/asignaciones", asignacionesListadoRoutes);

app.use("/api/reportes", reporteRoutes);

module.exports = app;