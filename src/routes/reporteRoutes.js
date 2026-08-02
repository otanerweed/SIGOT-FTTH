const express = require("express");

const router = express.Router();

const reporteController = require(
    "../controllers/reporteController"
);

const {
    autorizarRoles
} = require(
    "../middlewares/authMiddleware"
);

// Todos los roles pueden consultar reportes.
router.get(
    "/general",
    autorizarRoles(
        "Administrador",
        "Coordinador",
        "Supervisor",
        "Consulta"
    ),
    reporteController.listarReporteGeneral
);

module.exports = router;