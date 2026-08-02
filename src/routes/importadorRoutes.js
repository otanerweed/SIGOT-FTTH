const express = require("express");

const router = express.Router();

const upload = require(
    "../middlewares/uploadExcel"
);

const {
    importarOFSC,
    obtenerHistorialImportaciones
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
// IMPORTAR EXCEL OFSC
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
// HISTORIAL DE IMPORTACIONES
// ADMINISTRADOR Y COORDINADOR
// =====================================
router.get(
    "/historial",
    autorizarRoles(
        "Administrador",
        "Coordinador"
    ),
    obtenerHistorialImportaciones
);

// =====================================
// CONSULTAR Ã“RDENES
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
