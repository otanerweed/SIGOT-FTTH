const express = require("express");

const router = express.Router();

const asignacionController = require(
    "../controllers/asignacionController"
);

// ===============================
// LISTAR ASIGNACIONES
// ===============================
router.get(
    "/",
    asignacionController.listarAsignaciones
);

// ===============================
// EJECUTAR ASIGNACIÓN AUTOMÁTICA
// ===============================
router.post(
    "/automatica",
    asignacionController.ejecutarAsignacion
);

module.exports = router;