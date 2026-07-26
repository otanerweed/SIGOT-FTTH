const express = require("express");

const router = express.Router();

const upload = require("../middlewares/uploadExcel");

const {
    importarOFSC
} = require("../controllers/importadorController");

const {
    listarOrdenes
} = require("../controllers/ordenesController");

// Importar Excel
router.post(
    "/ofsc",
    upload.single("archivo"),
    importarOFSC
);

// Obtener órdenes
router.get(
    "/ordenes",
    listarOrdenes
);

module.exports = router;