const multer = require("multer");

function manejarErrores(
    error,
    req,
    res,
    next
) {
    if (res.headersSent) {
        return next(error);
    }

    if (error instanceof multer.MulterError) {
        const excedeTamano =
            error.code === "LIMIT_FILE_SIZE";

        return res
            .status(
                excedeTamano
                    ? 413
                    : 400
            )
            .json({
                ok: false,
                mensaje:
                    excedeTamano
                        ? "El archivo Excel supera el tamaño permitido."
                        : "No se pudo recibir el archivo Excel."
            });
    }

    if (
        error?.message ===
        "Solo se permiten archivos Excel (.xlsx o .xls)"
    ) {
        return res.status(400).json({
            ok: false,
            mensaje: error.message
        });
    }

    console.error(
        "Error no controlado en la API:",
        error
    );

    return res.status(500).json({
        ok: false,
        mensaje:
            "Ocurrió un error interno. Intente nuevamente."
    });
}

module.exports = {
    manejarErrores
};
