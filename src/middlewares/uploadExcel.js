const multer = require("multer");
const path = require("path");

// Configuración del almacenamiento
const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },

    filename: (req, file, cb) => {

        const nombre = Date.now() + path.extname(file.originalname);

        cb(null, nombre);

    }

});

// Validar que sea un Excel
const fileFilter = (req, file, cb) => {

    const extensionesPermitidas = [
        ".xlsx",
        ".xls"
    ];

    const extension = path.extname(file.originalname).toLowerCase();

    if (extensionesPermitidas.includes(extension)) {

        cb(null, true);

    } else {

        cb(new Error("Solo se permiten archivos Excel (.xlsx o .xls)"));

    }

};

const upload = multer({

    storage,
    fileFilter

});

module.exports = upload;