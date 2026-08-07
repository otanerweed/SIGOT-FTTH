const express =
    require("express");

const router =
    express.Router();

const {
    listarOrdenes,
    actualizarEstadoOrden
} = require(
    "../controllers/ordenesController"
);

const {
    autorizarRoles
} = require(
    "../middlewares/authMiddleware"
);

// =====================================
// LISTAR ÓRDENES
// =====================================
router.get(
    "/",
    autorizarRoles(
        "Administrador",
        "Coordinador",
        "Supervisor",
        "Consulta"
    ),
    listarOrdenes
);

// =====================================
// CAMBIAR ESTADO DE OT
// =====================================
router.patch(
    "/:id/estado",
    autorizarRoles(
        "Administrador",
        "Coordinador"
    ),
    actualizarEstadoOrden
);

module.exports =
    router;