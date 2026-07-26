const express = require("express");

const router = express.Router();

const {
    listarAsignaciones
} = require("../controllers/asignacionesListadoController");

router.get("/", listarAsignaciones);

module.exports = router;