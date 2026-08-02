const express = require("express");

const router = express.Router();

const {
    obtenerAuditoria
} = require(
    "../controllers/auditoriaController"
);

const {
    autorizarRoles
} = require(
    "../middlewares/authMiddleware"
);

// =====================================
// AUDITORÍA GENERAL
// ADMINISTRADOR Y SUPERVISOR
// =====================================
router.get(
    "/",
    autorizarRoles(
        "Administrador",
        "Supervisor"
    ),
    obtenerAuditoria
);

module.exports = router;