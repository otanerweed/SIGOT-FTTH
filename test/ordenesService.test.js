const test = require("node:test");
const assert = require("node:assert/strict");

const { sql } = require(
    "../src/config/database"
);

const {
    guardarOrdenes,
    resolverCierreAsignacionDesdeEstado,
    normalizarFilaRechazada
} = require(
    "../src/services/ordenesService"
);

test(
    "normaliza el detalle de una fila rechazada sin exceder la columna SQL",
    () => {
        const rechazo = normalizarFilaRechazada({
            fila: 7,
            codigoOT: " OT-7 ",
            idActividadOFSC: " ACT-7 ",
            motivo: "M".repeat(600)
        });

        assert.equal(rechazo.fila, 7);
        assert.equal(rechazo.codigoOT, "OT-7");
        assert.equal(
            rechazo.idActividadOFSC,
            "ACT-7"
        );
        assert.ok(rechazo.mensaje.length <= 500);
        assert.match(
            rechazo.mensaje,
            /Fila Excel 7/
        );
    }
);

test(
    "persiste una fila inválida como ERROR y la incluye en el resumen",
    async (contexto) => {
        const RequestOriginal = sql.Request;
        const consultas = [];

        class RequestFalso {
            constructor(transaction) {
                this.transaction = transaction;
                this.parametros = {};
            }

            input(nombre, tipo, valor) {
                this.parametros[nombre] = valor;

                return this;
            }

            async query(consulta) {
                consultas.push({
                    parametros: this.parametros,
                    consulta
                });

                return { rowsAffected: [1] };
            }
        }

        sql.Request = RequestFalso;

        contexto.after(() => {
            sql.Request = RequestOriginal;
        });

        const resumen = await guardarOrdenes(
            { id: "tx-prueba" },
            [],
            100,
            3,
            {
                filasRechazadas: [
                    {
                        fila: 4,
                        codigoOT: "OT-4",
                        idActividadOFSC: null,
                        motivo:
                            "La fila no contiene ID de actividad OFSC."
                    }
                ],
                totalFilasLeidas: 1
            }
        );

        assert.equal(resumen.totalLeidas, 1);
        assert.equal(resumen.insertadas, 0);
        assert.equal(resumen.actualizadas, 0);
        assert.equal(resumen.sinCambios, 0);
        assert.equal(resumen.rechazadas, 1);
        assert.equal(
            resumen.detalleRechazadas[0].fila,
            4
        );
        assert.equal(consultas.length, 1);
        assert.equal(
            consultas[0].parametros.Resultado,
            "ERROR"
        );
        assert.equal(
            consultas[0].parametros.CodigoOT,
            "OT-4"
        );
        assert.match(
            consultas[0].parametros.Mensaje,
            /ID actividad OFSC: \(vacío\)/
        );
    }
);

test(
    "OFSC cancela la asignación cuando la OT es cancelada",
    () => {
        assert.deepEqual(
            resolverCierreAsignacionDesdeEstado(
                "CANCELADA"
            ),
            {
                nuevoEstado: "CANCELADA",
                evento: "CANCELACION",
                observacion:
                    "Asignación cancelada según el estado recibido desde OFSC."
            }
        );
    }
);

test(
    "OFSC cierra la asignación al reprogramar",
    () => {
        assert.deepEqual(
            resolverCierreAsignacionDesdeEstado(
                "REPROGRAMADA"
            ),
            {
                nuevoEstado: "CANCELADA",
                evento: "CANCELACION",
                observacion:
                    "Asignación cerrada por reprogramación recibida desde OFSC."
            }
        );
    }
);

test(
    "OFSC finaliza la asignación junto con la OT",
    () => {
        assert.deepEqual(
            resolverCierreAsignacionDesdeEstado(
                "FINALIZADA"
            ),
            {
                nuevoEstado: "FINALIZADA",
                evento: "FINALIZACION",
                observacion:
                    "Asignación finalizada según el estado recibido desde OFSC."
            }
        );
    }
);

test(
    "los estados no terminales conservan la asignación activa",
    () => {
        for (const estado of [
            "PENDIENTE",
            "INICIADA",
            "SUSPENDIDA",
            "NO_REALIZADO"
        ]) {
            assert.equal(
                resolverCierreAsignacionDesdeEstado(
                    estado
                ),
                null,
                estado
            );
        }
    }
);
