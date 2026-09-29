const test = require("node:test");
const assert = require("node:assert/strict");

const { sql } = require(
    "../src/config/database"
);

const {
    registrarHistorialAsignacion
} = require(
    "../src/services/historialAsignacionService"
);

test(
    "registra la fuente y los datos exactos del cierre OFSC",
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
                    transaction: this.transaction,
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

        const transaction = { id: "tx-prueba" };

        await registrarHistorialAsignacion(
            transaction,
            {
                idAsignacion: 68,
                idOrden: 42,
                idTecnicoAnterior: 7,
                idTecnicoNuevo: null,
                evento: "CANCELACION",
                estadoAnterior: "ACTIVA",
                estadoNuevo: "CANCELADA",
                motivo:
                    "Asignación cancelada según OFSC.",
                fuente: "OFSC",
                idUsuario: 3,
                idActividad: 99
            }
        );

        assert.equal(consultas.length, 1);
        assert.equal(
            consultas[0].transaction,
            transaction
        );
        assert.deepEqual(
            consultas[0].parametros,
            {
                IdAsignacion: 68,
                IdOrden: 42,
                IdTecnicoAnterior: 7,
                IdTecnicoNuevo: null,
                Evento: "CANCELACION",
                EstadoAnterior: "ACTIVA",
                EstadoNuevo: "CANCELADA",
                Motivo:
                    "Asignación cancelada según OFSC.",
                Fuente: "OFSC",
                IdUsuario: 3,
                IdActividad: 99
            }
        );
        assert.match(
            consultas[0].consulta,
            /INSERT INTO dbo\.HistorialAsignaciones/
        );
    }
);
