const express = require("express");

const router = express.Router();

const usuarioController = require(
    "../controllers/usuarioController"
);

const {
    autorizarRoles
} = require(
    "../middlewares/authMiddleware"
);

// Solo el Administrador puede gestionar usuarios.
router.use(
    autorizarRoles("Administrador")
);

// La ruta /roles debe ir antes de /:id.
router.get(
    "/roles",
    usuarioController.listarRoles
);

router.get(
    "/",
    usuarioController.listarUsuarios
);

router.get(
    "/:id",
    usuarioController.obtenerUsuario
);

router.post(
    "/",
    usuarioController.crearUsuario
);

router.put(
    "/:id",
    usuarioController.actualizarUsuario
);

router.patch(
    "/:id/estado",
    usuarioController.actualizarEstadoUsuario
);

module.exports = router;