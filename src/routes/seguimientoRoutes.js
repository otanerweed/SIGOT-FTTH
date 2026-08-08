const express =
    require("express");

const router =
    express.Router();

const {
    listarSeguimientos,
    listarSeguimientoPorAsignacion
} = require(
    "../controllers/seguimientoController"
);

const {
    autorizarRoles
} = require(
    "../middlewares/authMiddleware"
);

// =====================================
// LISTAR TODOS LOS SEGUIMIENTOS
// =====================================
router.get(
    "/",
    autorizarRoles(
        "Administrador",
        "Coordinador",
        "Supervisor"
    ),
    listarSeguimientos
);

// =====================================
// LISTAR SEGUIMIENTO POR ASIGNACIÓN
// =====================================
router.get(
    "/asignacion/:idAsignacion",
    autorizarRoles(
        "Administrador",
        "Coordinador",
        "Supervisor"
    ),
    listarSeguimientoPorAsignacion
);

module.exports =
    router;