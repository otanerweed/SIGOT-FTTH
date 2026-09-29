const test = require("node:test");
const assert = require("node:assert/strict");

const {
    validarEsquema,
    construirConsultaValidacion
} = require(
    "../src/config/validarEsquema"
);

function crearPool(recordset) {
    return {
        request() {
            return {
                async query(consulta) {
                    assert.equal(
                        consulta,
                        construirConsultaValidacion()
                    );

                    return { recordset };
                }
            };
        }
    };
}

test(
    "la verificación del esquema es estrictamente de solo lectura",
    () => {
        const consulta =
            construirConsultaValidacion()
                .toUpperCase();

        for (const palabra of [
            "INSERT ",
            "UPDATE ",
            "DELETE ",
            "ALTER ",
            "DROP ",
            "CREATE "
        ]) {
            assert.equal(
                consulta.includes(palabra),
                false,
                palabra
            );
        }

        assert.match(
            consulta,
            /SYS\.INDEXES/
        );
        assert.match(
            consulta,
            /SYS\.FOREIGN_KEYS/
        );
        assert.match(
            consulta,
            /SYS\.CHECK_CONSTRAINTS/
        );
    }
);

test(
    "permite iniciar cuando no falta ningún requisito",
    async () => {
        await assert.doesNotReject(
            validarEsquema(
                crearPool([])
            )
        );
    }
);

test(
    "detiene el inicio y enumera los requisitos faltantes",
    async () => {
        await assert.rejects(
            validarEsquema(
                crearPool([
                    {
                        Requisito:
                            "Tabla: dbo.TSS"
                    },
                    {
                        Requisito:
                            "Columna: dbo.Operaciones.CantidadNuevas"
                    }
                ])
            ),
            (error) => {
                assert.equal(
                    error.code,
                    "ESQUEMA_INCOMPLETO"
                );
                assert.deepEqual(
                    error.requisitosFaltantes,
                    [
                        "Tabla: dbo.TSS",
                        "Columna: dbo.Operaciones.CantidadNuevas"
                    ]
                );
                assert.match(
                    error.message,
                    /migraciones pendientes/i
                );

                return true;
            }
        );
    }
);

test(
    "rechaza una conexión inexistente antes de consultar",
    async () => {
        await assert.rejects(
            validarEsquema(null),
            /conexión válida/i
        );
    }
);
