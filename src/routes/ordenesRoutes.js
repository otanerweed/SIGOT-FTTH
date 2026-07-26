const express = require("express");

const router = express.Router();

const {
    listarOrdenes
} = require("../controllers/ordenesController");

router.get("/", listarOrdenes);

module.exports = router;