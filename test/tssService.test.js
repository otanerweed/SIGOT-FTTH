const test = require("node:test");
const assert = require("node:assert/strict");

const {
    escaparLike,
    normalizarConsultaTSS,
    normalizarIdTSS,
    soloNombreArchivo,
    listarTSS,
    obtenerTSSPorId
} = require("../src/services/tssService");

function crearPool(recordsets, alConsultar) {
    return {
        request() {
            const entradas = new Map();

            return {
                input(nombre, tipo, valor) {
                    entradas.set(nombre, valor);
                    return this;
                },

                async query(consulta) {
                    if (alConsultar) {
                        alConsultar({
                            consulta,
                            entradas
                        });
                    }

                    return { recordsets };
                }
            };
        }
    };
}

test(
    "normaliza filtros TSS sin aceptar rangos u opciones inválidos",
    () => {
        assert.deepEqual(
            normalizarConsultaTSS({}),
            {
                pagina: 1,
                limite: 20,
                estado: null,
                turno: null,
                idTecnico: null,
                desde: null,
                hasta: null,
                buscar: "",
                patronBuscar: null,
                orden: "agenda"
            }
        );

        const filtros = normalizarConsultaTSS({
            pagina: "2",
            limite: "50",
            estado: " programado ",
            turno: "pm",
            buscar: "OT%_[!",
            orden: "recientes"
        });

        assert.equal(filtros.pagina, 2);
        assert.equal(filtros.limite, 50);
        assert.equal(filtros.estado, "PROGRAMADO");
        assert.equal(filtros.turno, "PM");
        assert.equal(
            filtros.patronBuscar,
            "%OT!%!_![!!%"
        );
        assert.equal(filtros.orden, "recientes");

        assert.throws(
            () => normalizarConsultaTSS({
                desde: "2026-08-31",
                hasta: "2026-08-20"
            }),
            /fecha desde/i
        );

        assert.throws(
            () => normalizarConsultaTSS({
                estado: "CERRADA"
            }),
            /estado no es válido/i
        );

        assert.throws(
            () => normalizarConsultaTSS({
                pagina: ["1", "2"]
            }),
            /no puede repetirse/i
        );
    }
);

test(
    "escapa búsquedas LIKE y valida el identificador TSS",
    () => {
        assert.equal(
            escaparLike("100%_[!"),
            "100!%!_![!!"
        );
        assert.equal(normalizarIdTSS("17"), 17);
        assert.throws(
            () => normalizarIdTSS("17.5"),
            /entero válido/i
        );
        assert.throws(
            () => normalizarIdTSS("0"),
            /rango permitido/i
        );
    }
);

test(
    "lista TSS con parámetros y paginación sin concatenar la búsqueda",
    async () => {
        const conexion = crearPool(
            [
                [{ Total: "1" }],
                [{ IdTSS: 8, CodigoOT: "OT-8" }]
            ],
            ({ consulta, entradas }) => {
                assert.equal(
                    consulta.includes("OT-8%"),
                    false
                );
                assert.equal(
                    entradas.get("Buscar"),
                    "%OT-8!%%"
                );
                assert.equal(
                    entradas.get("Offset"),
                    0
                );
            }
        );

        const resultado = await listarTSS(
            {
                buscar: "OT-8%",
                limite: 10
            },
            {
                conectarDB: async () => conexion
            }
        );

        assert.equal(resultado.tss.length, 1);
        assert.deepEqual(
            resultado.paginacion,
            {
                pagina: 1,
                limite: 10,
                total: 1,
                totalPaginas: 1
            }
        );
    }
);

test(
    "el detalle TSS no consulta rutas privadas y limpia nombres de archivo",
    async () => {
        const conexion = crearPool(
            [
                [{ IdTSS: 8, CodigoOT: "OT-8" }],
                [],
                [{
                    IdEvidenciaTSS: 1,
                    NombreArchivo:
                        "C:\\privado\\foto.jpg"
                }],
                [{
                    IdDocumentoTSS: 2,
                    NombreArchivo:
                        "/privado/final.pdf"
                }],
                [],
                [],
                [],
                []
            ],
            ({ consulta, entradas }) => {
                assert.equal(
                    consulta.includes("RutaArchivo"),
                    false
                );
                assert.equal(
                    entradas.get("IdTSS"),
                    8
                );
            }
        );

        const resultado = await obtenerTSSPorId(
            8,
            {
                conectarDB: async () => conexion
            }
        );

        assert.equal(
            resultado.evidencias[0].NombreArchivo,
            "foto.jpg"
        );
        assert.equal(
            resultado.documentos[0].NombreArchivo,
            "final.pdf"
        );
        assert.equal(resultado.disponibilidad, null);
    }
);

test(
    "solo conserva el nombre visible de un archivo",
    () => {
        assert.equal(
            soloNombreArchivo("C:\\uno\\dos.xlsx"),
            "dos.xlsx"
        );
        assert.equal(
            soloNombreArchivo("/uno/dos.pdf"),
            "dos.pdf"
        );
        assert.equal(soloNombreArchivo("   "), null);
    }
);
