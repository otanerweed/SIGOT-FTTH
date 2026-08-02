const express = require("express");

const router = express.Router();

const asignacionController = require(
    "../controllers/asignacionController"
);

const {
    autorizarRoles
} = require(
    "../middlewares/authMiddleware"
);

// =====================================
// LISTAR ASIGNACIONES
// =====================================
router.get(
    "/",
    autorizarRoles(
        "Administrador",
        "Coordinador",
        "Supervisor"
    ),
    asignacionController.listarAsignaciones
);

// =====================================
// OPCIONES PARA ASIGNACIÓN MANUAL
// =====================================
router.get(
    "/manual/opciones",
    autorizarRoles(
        "Administrador",
        "Coordinador"
    ),
    asignacionController
        .listarOpcionesManuales
);

// =====================================
// EJECUTAR ASIGNACIÓN MANUAL
// =====================================
router.post(
    "/manual",
    autorizarRoles(
        "Administrador",
        "Coordinador"
    ),
    asignacionController
        .ejecutarAsignacionManual
);

// =====================================
// EJECUTAR ASIGNACIÓN AUTOMÁTICA
// =====================================
router.post(
    "/automatica",
    autorizarRoles(
        "Administrador",
        "Coordinador"
    ),
    asignacionController
        .ejecutarAsignacion
);

module.exports = router;