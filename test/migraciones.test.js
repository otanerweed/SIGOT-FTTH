const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");

async function leerMigracion(nombre) {
    return fs.readFile(
        path.join(
            __dirname,
            "..",
            "database",
            nombre
        ),
        "utf8"
    );
}

test(
    "la migración OFSC V2 conserva sus objetos críticos",
    async () => {
        const sql = await leerMigracion(
            "06_importador_ofsc_v2.sql"
        );

        for (const objeto of [
            "DetalleImportacionOFSC",
            "HistorialCambiosOFSC",
            "TSS",
            "CantidadNuevas",
            "CantidadActualizadas",
            "CantidadSinCambios",
            "CantidadErrores",
            "UX_OrdenesTrabajo_CodigoOT",
            "UQ_ActividadesOFSC_IdActividadOFSC",
            "UX_Asignaciones_OrdenActiva"
        ]) {
            assert.equal(
                sql.includes(objeto),
                true,
                objeto
            );
        }

        assert.match(sql, /SET XACT_ABORT ON/i);
        assert.match(sql, /BEGIN TRANSACTION/i);
        assert.match(sql, /ROLLBACK TRANSACTION/i);
        assert.doesNotMatch(sql, /^\s*USE\s+/im);
    }
);

test(
    "la migración TSS versiona agenda y auxiliares sin fijar una base",
    async () => {
        const sql = await leerMigracion(
            "07_tss_operativo.sql"
        );

        const tablas = [
            "TiposEvidenciaTSS",
            "HistorialEstadosTSS",
            "EvidenciasTSS",
            "DocumentosTSS",
            "ValidacionesTCE",
            "DisponibilidadTecnicos",
            "AgendaTecnicos"
        ];

        for (const tabla of tablas) {
            assert.match(
                sql,
                new RegExp(
                    `CREATE\\s+TABLE\\s+dbo\\.${tabla}`,
                    "i"
                ),
                tabla
            );
        }

        for (const indice of [
            "UX_AgendaTecnicos_TurnoOcupado",
            "UX_AgendaTecnicos_TSS_Ocupado",
            "UX_AgendaTecnicos_Actividad_Ocupada",
            "IX_AgendaTecnicos_IdTSS_Fecha"
        ]) {
            assert.equal(
                sql.includes(indice),
                true,
                indice
            );
        }

        assert.match(sql, /SET XACT_ABORT ON/i);
        assert.match(sql, /BEGIN TRANSACTION/i);
        assert.match(sql, /ROLLBACK TRANSACTION/i);
        assert.doesNotMatch(sql, /^\s*USE\s+/im);
    }
);
