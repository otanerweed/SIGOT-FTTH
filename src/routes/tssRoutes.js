const express = require("express");

const {
    listar,
    obtener,
    programar,
    cambiarEstado,
    actualizarContinuidad
} = require("../controllers/tssController");

const {
    autorizarRoles
} = require("../middlewares/authMiddleware");

const router = express.Router();

const rolesConsulta = [
    "Administrador",
    "Coordinador",
    "Supervisor",
    "Consulta"
];

const rolesOperacion = [
    "Administrador",
    "Coordinador",
    "Supervisor"
];

router.get(
    "/",
    autorizarRoles(...rolesConsulta),
    listar
);

router.post(
    "/:id/programar",
    autorizarRoles(...rolesOperacion),
    programar
);
router.patch(
    "/:id/continuidad",
    autorizarRoles(...rolesOperacion),
    actualizarContinuidad
);
router.get(
    "/:id",
    autorizarRoles(...rolesConsulta),
    obtener
);

module.exports = router;