const express = require("express");

const router = express.Router();

const dashboardController = require(
    "../controllers/dashboardController"
);

const {
    autorizarRoles
} = require(
    "../middlewares/authMiddleware"
);

// Todos los roles pueden consultar el dashboard.
router.get(
    "/",
    autorizarRoles(
        "Administrador",
        "Coordinador",
        "Supervisor",
        "Consulta",
        "Jefe"
    ),
    dashboardController.obtenerResumen
);

// KPIs OPERATIVOS DE ACTIVIDADES OFSC
router.get(
    "/kpis",
    autorizarRoles(
        "Administrador",
        "Coordinador",
        "Supervisor",
        "Consulta",
        "Jefe"
    ),
    dashboardController.obtenerKPIs
);

module.exports = router;