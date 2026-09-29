const test = require("node:test");
const assert = require("node:assert/strict");

const {
    leerBooleanoEntorno
} = require(
    "../src/config/database"
);

test(
    "interpreta opciones booleanas de conexión de forma segura",
    () => {
        for (const valor of [
            "1",
            "true",
            "SI",
            "sí"
        ]) {
            assert.equal(
                leerBooleanoEntorno(
                    valor,
                    false
                ),
                true
            );
        }

        for (const valor of [
            "0",
            "false",
            "NO",
            "cualquier otro"
        ]) {
            assert.equal(
                leerBooleanoEntorno(
                    valor,
                    true
                ),
                false
            );
        }

        assert.equal(
            leerBooleanoEntorno(
                undefined,
                true
            ),
            true
        );
    }
);
