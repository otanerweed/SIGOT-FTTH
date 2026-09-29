const express = require("express");

const router = express.Router();

const uploadImportador = require(
    "../middlewares/uploadImportador"
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
    uploadImportador.fields([
        { name: "archivo", maxCount: 1 },
        { name: "historialRecursos", maxCount: 20 }
    ]),
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
