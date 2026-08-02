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
        "Consulta"
    ),
    dashboardController.obtenerResumen
);

module.exports = router;