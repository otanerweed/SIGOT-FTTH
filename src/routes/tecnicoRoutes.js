const express = require("express");

const router = express.Router();

const tecnicoController = require("../controllers/tecnicoController");

router.get("/", tecnicoController.listarTecnicos);
router.get("/:id", tecnicoController.obtenerTecnico);
router.post("/", tecnicoController.crearTecnico);
module.exports = router;