const express = require("express");
const cors = require("cors");

const app = express();

// =====================================
// RUTAS
// =====================================
const authRoutes = require(
    "./routes/authRoutes"
);

const importadorRoutes = require(
    "./routes/importadorRoutes"
);

const ordenesRoutes = require(
    "./routes/ordenesRoutes"
);

const tecnicosRoutes = require(
    "./routes/tecnicoRoutes"
);

const asignacionRoutes = require(
    "./routes/asignacionRoutes"
);

const dashboardRoutes = require(
    "./routes/dashboardRoutes"
);

const reporteRoutes = require(
    "./routes/reporteRoutes"
);

const usuarioRoutes = require(
    "./routes/usuarioRoutes"
);

const auditoriaRoutes = require(
    "./routes/auditoriaRoutes"
);

// =====================================
// MIDDLEWARE DE AUTENTICACIÓN
// =====================================
const {
    verificarToken
} = require(
    "./middlewares/authMiddleware"
);

// =====================================
// MIDDLEWARES GENERALES
// =====================================
app.use(cors());
app.use(express.json());

// =====================================
// RUTA PRINCIPAL PÚBLICA
// =====================================
app.get("/", (req, res) => {
    res.json({
        sistema: "SIGOT-FTTH",
        version: "1.0",
        mensaje:
            "API funcionando correctamente"
    });
});

// =====================================
// AUTENTICACIÓN PÚBLICA
// =====================================
app.use(
    "/api/auth",
    authRoutes
);

/*
 * Todas las rutas registradas después
 * de esta línea requieren un token JWT.
 */
app.use(verificarToken);

// =====================================
// IMPORTADOR
// =====================================
app.use(
    "/api/importador",
    importadorRoutes
);

// =====================================
// ÓRDENES
// =====================================
app.use(
    "/api/ordenes",
    ordenesRoutes
);

// =====================================
// TÉCNICOS
// =====================================
app.use(
    "/api/tecnicos",
    tecnicosRoutes
);

// =====================================
// ASIGNACIONES
// =====================================
app.use(
    "/api/asignaciones",
    asignacionRoutes
);

// =====================================
// DASHBOARD
// =====================================
app.use(
    "/api/dashboard",
    dashboardRoutes
);

// =====================================
// REPORTES
// =====================================
app.use(
    "/api/reportes",
    reporteRoutes
);

// =====================================
// USUARIOS
// =====================================
app.use(
    "/api/usuarios",
    usuarioRoutes
);

// =====================================
// AUDITORÍA
// =====================================
app.use(
    "/api/auditoria",
    auditoriaRoutes
);

module.exports = app;