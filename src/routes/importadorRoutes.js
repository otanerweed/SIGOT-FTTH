const express = require("express");

const router = express.Router();

const upload = require(
    "../middlewares/uploadExcel"
);

const {
    importarOFSC
} = require(
    "../controllers/importadorController"
);

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

// =====================================
// IMPORTAR EXCEL
// ADMINISTRADOR Y COORDINADOR
// =====================================
router.post(
    "/ofsc",
    autorizarRoles(
        "Administrador",
        "Coordinador"
    ),
    upload.single("archivo"),
    importarOFSC
);

// =====================================
// CONSULTAR ÓRDENES
// TODOS LOS ROLES AUTENTICADOS
// =====================================
router.get(
    "/ordenes",
    autorizarRoles(
        "Administrador",
        "Coordinador",
        "Supervisor",
        "Consulta"
    ),
    listarOrdenes
);

module.exports = router;