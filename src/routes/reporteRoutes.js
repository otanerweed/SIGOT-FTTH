const express = require("express");

const router = express.Router();

const reporteController = require(
    "../controllers/reporteController"
);

// ===============================
// REPORTE GENERAL
// ===============================
router.get(
    "/general",
    reporteController.listarReporteGeneral
);

module.exports = router;