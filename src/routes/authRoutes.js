const express = require("express");

const authController = require(
    "../controllers/authController"
);

const {
    verificarToken
} = require(
    "../middlewares/authMiddleware"
);

const router = express.Router();

// =====================================
// INICIAR SESIÓN
// POST /api/auth/login
// =====================================
router.post(
    "/login",
    authController.iniciarSesion
);

// =====================================
// CONSULTAR PERFIL AUTENTICADO
// GET /api/auth/perfil
// =====================================
router.get(
    "/perfil",
    verificarToken,
    authController.obtenerPerfil
);

module.exports = router;