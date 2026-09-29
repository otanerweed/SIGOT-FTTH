const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

const limiteConfiguradoMB = Number(
    process.env.MAX_EXCEL_MB
);

const limiteExcelMB =
    Number.isFinite(limiteConfiguradoMB) &&
    limiteConfiguradoMB > 0
        ? limiteConfiguradoMB
        : 20;

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },

    filename: (req, file, cb) => {
        const extension = path
            .extname(file.originalname)
            .toLowerCase();

        const nombre =
            `${Date.now()}-${crypto.randomUUID()}${extension}`;

        cb(null, nombre);
    }
});

const fileFilter = (req, file, cb) => {
    const extensionesPermitidas = [
        ".xlsx",
        ".xls"
    ];

    const extension = path
        .extname(file.originalname)
        .toLowerCase();

    if (extensionesPermitidas.includes(extension)) {
        cb(null, true);
    } else {
        cb(
            new Error(
                "Solo se permiten archivos Excel (.xlsx o .xls)"
            )
        );
    }
};

const uploadResourceLogs = multer({
    storage,
    fileFilter,

    limits: {
        files: 20,
        fileSize:
            limiteExcelMB *
            1024 *
            1024
    }
});

module.exports = uploadResourceLogs;