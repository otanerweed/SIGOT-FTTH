const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const XLSX = require("xlsx");

const {
    leerExcel,
    leerExcelConDetalle
} = require(
    "../src/services/excelService"
);

async function crearExcelTemporal(
    contexto,
    filas
) {
    const directorio = await fs.mkdtemp(
        path.join(
            os.tmpdir(),
            "sigot-ofsc-test-"
        )
    );

    contexto.after(async () => {
        await fs.rm(
            directorio,
            {
                recursive: true,
                force: true
            }
        );
    });

    const ruta = path.join(
        directorio,
        "ofsc.xlsx"
    );

    const libro = XLSX.utils.book_new();
    const hoja = XLSX.utils.aoa_to_sheet(filas);

    XLSX.utils.book_append_sheet(
        libro,
        hoja,
        "Page 1"
    );

    XLSX.writeFile(libro, ruta);

    return ruta;
}

test(
    "separa filas válidas y rechazadas conservando sus números reales",
    async (contexto) => {
        const encabezados = [
            "ID de actividad",
            "Orden de trabajo",
            "Estado de actividad"
        ];

        const ruta = await crearExcelTemporal(
            contexto,
            [
                encabezados,
                ["ACT-1", "OT-1", "pendiente"],
                [],
                [null, "OT-2", "pendiente"],
                ["ACT-3", null, "pendiente"],
                ["ACT-4", "OT-4", null],
                ["ACT-5", "OT-5", "ESTADO RARO"]
            ]
        );

        const resultado =
            leerExcelConDetalle(ruta);

        assert.equal(
            resultado.totalFilasLeidas,
            5
        );
        assert.equal(
            resultado.actividades.length,
            1
        );
        assert.equal(
            resultado.filasRechazadas.length,
            4
        );
        assert.equal(
            resultado.actividades[0]
                .estadoActividad,
            "PENDIENTE"
        );
        assert.deepEqual(
            resultado.filasRechazadas.map(
                (fila) => fila.fila
            ),
            [4, 5, 6, 7]
        );
        assert.match(
            resultado.filasRechazadas[3]
                .motivo,
            /ESTADO RARO/
        );
    }
);

test(
    "leerExcel conserva el contrato histórico de devolver un arreglo",
    async (contexto) => {
        const ruta = await crearExcelTemporal(
            contexto,
            [
                [
                    "ID de actividad",
                    "Orden de trabajo",
                    "Estado de actividad"
                ],
                ["ACT-1", "OT-1", "pendiente"],
                [null, "OT-2", "pendiente"]
            ]
        );

        const actividades = leerExcel(ruta);

        assert.ok(Array.isArray(actividades));
        assert.equal(actividades.length, 1);
        assert.equal(
            actividades[0].idActividadOFSC,
            "ACT-1"
        );
    }
);
