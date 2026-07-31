const express = require("express");

const router = express.Router();

const tecnicoController = require(
    "../controllers/tecnicoController"
);

router.get(
    "/",
    tecnicoController.listarTecnicos
);

router.get(
    "/:id",
    tecnicoController.obtenerTecnico
);

router.post(
    "/",
    tecnicoController.crearTecnico
);

router.put(
    "/:id",
    tecnicoController.actualizarTecnico
);

router.patch(
    "/:id/estado",
    tecnicoController.actualizarEstadoTecnico
);

module.exports = router;