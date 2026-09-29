const test = require("node:test");
const assert = require("node:assert/strict");
const multer = require("multer");

const {
    manejarErrores
} = require(
    "../src/middlewares/errorMiddleware"
);

function crearRespuesta() {
    return {
        headersSent: false,
        statusCode: null,
        body: null,
        status(codigo) {
            this.statusCode = codigo;

            return this;
        },
        json(body) {
            this.body = body;

            return this;
        }
    };
}

test(
    "devuelve 413 cuando el Excel supera el límite configurado",
    () => {
        const respuesta = crearRespuesta();
        const error = new multer.MulterError(
            "LIMIT_FILE_SIZE"
        );

        manejarErrores(
            error,
            {},
            respuesta,
            () => {}
        );

        assert.equal(respuesta.statusCode, 413);
        assert.deepEqual(respuesta.body, {
            ok: false,
            mensaje:
                "El archivo Excel supera el tamaño permitido."
        });
    }
);

test(
    "devuelve 400 para una extensión no permitida",
    () => {
        const respuesta = crearRespuesta();

        manejarErrores(
            new Error(
                "Solo se permiten archivos Excel (.xlsx o .xls)"
            ),
            {},
            respuesta,
            () => {}
        );

        assert.equal(respuesta.statusCode, 400);
        assert.equal(
            respuesta.body.mensaje,
            "Solo se permiten archivos Excel (.xlsx o .xls)"
        );
    }
);
