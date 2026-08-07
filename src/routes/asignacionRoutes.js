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
    asignacionController
        .listarAsignaciones
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
// REASIGNAR ORDEN
// =====================================
router.patch(
    "/:id/reasignar",
    autorizarRoles(
        "Administrador",
        "Coordinador"
    ),
    asignacionController
        .ejecutarReasignacion
);

// =====================================
// CANCELAR ASIGNACIÓN
// =====================================
router.patch(
    "/:id/cancelar",
    autorizarRoles(
        "Administrador",
        "Coordinador"
    ),
    asignacionController
        .ejecutarCancelacion
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