const express = require("express");

const router = express.Router();

const {
    obtenerControlRuta,
    guardarCorreccionInicioRuta,
    guardarCorreccionCierreRuta,
    guardarControlJornada,
    obtenerReporteSemanal
} = require(
    "../controllers/controlOperativoController"
);

const {
    autorizarRoles
} = require(
    "../middlewares/authMiddleware"
);

// =====================================
// CONTROL OPERATIVO - RUTA DIARIA
// =====================================

router.get(
    "/ruta",
    autorizarRoles(
        "Administrador",
        "Coordinador",
        "Supervisor",
        "Consulta",
        "Jefe"
    ),
    obtenerControlRuta
);

// REPORTE SEMANAL
router.get(
    "/reporte-semanal",
        autorizarRoles(
        "Administrador",
        "Coordinador",
        "Supervisor",
        "Consulta",
        "Jefe"
    ),
    obtenerReporteSemanal
);

// =====================================
// CORREGIR INICIO DE RUTA
// =====================================

router.post(
    "/ruta/correccion",
    autorizarRoles(
        "Administrador",
        "Coordinador",
        "Supervisor"
    ),
    guardarCorreccionInicioRuta
);

// =====================================
// CORREGIR CIERRE DE RUTA
// =====================================

router.post(
    "/ruta/cierre/correccion",
    autorizarRoles(
        "Administrador",
        "Coordinador",
        "Supervisor"
    ),
    guardarCorreccionCierreRuta
);

// =====================================
// GESTIONAR JORNADA
// =====================================

router.post(
    "/ruta/jornada",
    autorizarRoles(
        "Administrador",
        "Coordinador",
        "Supervisor"
    ),
    guardarControlJornada
);
module.exports = router;