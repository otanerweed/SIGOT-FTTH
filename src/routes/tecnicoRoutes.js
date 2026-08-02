const express = require("express");

const router = express.Router();

const tecnicoController = require(
    "../controllers/tecnicoController"
);

const {
    autorizarRoles
} = require(
    "../middlewares/authMiddleware"
);

// =====================================
// SOLO ADMINISTRADOR Y COORDINADOR
// =====================================
router.use(
    autorizarRoles(
        "Administrador",
        "Coordinador"
    )
);

// LISTAR TÉCNICOS
router.get(
    "/",
    tecnicoController.listarTecnicos
);

// OBTENER TÉCNICO
router.get(
    "/:id",
    tecnicoController.obtenerTecnico
);

// CREAR TÉCNICO
router.post(
    "/",
    tecnicoController.crearTecnico
);

// ACTUALIZAR TÉCNICO
router.put(
    "/:id",
    tecnicoController.actualizarTecnico
);

// ACTIVAR O DESACTIVAR TÉCNICO
router.patch(
    "/:id/estado",
    tecnicoController.actualizarEstadoTecnico
);

module.exports = router;