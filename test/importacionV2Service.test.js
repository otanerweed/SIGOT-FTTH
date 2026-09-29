const test = require("node:test");
const assert = require("node:assert/strict");

const {
    convertirValorHistorial,
    requiereTSSInicial
} = require(
    "../src/services/importacionV2Service"
);

test(
    "convierte valores del historial sin guardar espacios vacíos",
    () => {
        assert.equal(
            convertirValorHistorial(undefined),
            null
        );
        assert.equal(
            convertirValorHistorial(null),
            null
        );
        assert.equal(
            convertirValorHistorial("   "),
            null
        );
        assert.equal(
            convertirValorHistorial("  texto  "),
            "texto"
        );
        assert.equal(
            convertirValorHistorial(false),
            "false"
        );
        assert.equal(
            convertirValorHistorial(42),
            "42"
        );
    }
);

test(
    "convierte fechas del historial al formato ISO de día",
    () => {
        assert.equal(
            convertirValorHistorial(
                new Date("2026-08-21T17:30:00.000Z")
            ),
            "2026-08-21"
        );

        assert.equal(
            convertirValorHistorial(
                new Date("fecha inválida")
            ),
            null
        );
    }
);

test(
    "crea TSS solo para una OT nueva que aún puede programarse",
    () => {
        const programables = [
            "PENDIENTE",
            "INICIADA",
            "SUSPENDIDA",
            "NO_REALIZADO",
            "REPROGRAMADA"
        ];

        for (const estado of programables) {
            assert.equal(
                requiereTSSInicial(estado),
                true,
                estado
            );
        }

        assert.equal(
            requiereTSSInicial("CANCELADA"),
            false
        );
        assert.equal(
            requiereTSSInicial("finalizada"),
            false
        );
        assert.equal(
            requiereTSSInicial(" FINALIZADA "),
            false
        );
    }
);
