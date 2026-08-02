const express = require("express");

const router = express.Router();

const {
    listarOrdenes
} = require(
    "../controllers/ordenesController"
);

const {
    autorizarRoles
} = require(
    "../middlewares/authMiddleware"
);

// Todos los roles pueden consultar órdenes.
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

module.exports = router;