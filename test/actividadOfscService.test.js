const test = require("node:test");
const assert = require("node:assert/strict");

const {
    obtenerCambiosActividad,
    resolverEstadoOrdenDesdeActividad,
    resolverEventoActividad,
    resolverResultadoNoRealizado
} = require(
    "../src/services/actividadOfscService"
);

function crearActividad(
    sobrescrituras = {}
) {
    return {
        estadoActividad: "PENDIENTE",
        fechaActividad:
            new Date(2026, 7, 21, 12),
        horaInicio: "09:00",
        horaFin: "13:00:00",
        flagReagenda: true,
        razonReagenda: "Razón",
        motivo: "Motivo",
        motivoCancelacion: null,
        tipoCierre: null,
        resultadoGlobal: "Resultado",
        responsableSuspension: null,
        tipoSuspension: null,
        ...sobrescrituras
    };
}

function crearActividadExistente(
    sobrescrituras = {}
) {
    return {
        IdActividadOFSC: "ACT-1",
        EstadoActividad: "PENDIENTE",
        FechaActividadISO: "2026-08-21",
        HoraInicioTexto: "09:00:00",
        HoraFinTexto: "13:00:00",
        FlagReagenda: true,
        RazonReagenda: "Razón",
        ResultadoNoRealizado: null,
        Motivo: "Motivo",
        MotivoCancelacion: null,
        TipoCierre: null,
        ResultadoGlobal: "Resultado",
        ResponsableSuspension: null,
        TipoSuspension: null,
        ...sobrescrituras
    };
}

test(
    "resuelve los estados generales de la OT desde OFSC",
    () => {
        const casos = [
            ["PENDIENTE", null, "PENDIENTE"],
            ["INICIADA", null, "INICIADA"],
            ["SUSPENDIDA", null, "SUSPENDIDA"],
            ["FINALIZADA", null, "FINALIZADA"],
            ["CANCELADA", null, "CANCELADA"],
            [
                "NO_REALIZADO",
                "REPROGRAMADO",
                "REPROGRAMADA"
            ],
            [
                "NO_REALIZADO",
                "CIERRE_AUTOMATICO",
                "CANCELADA"
            ],
            [
                "NO_REALIZADO",
                null,
                "NO_REALIZADO"
            ]
        ];

        for (const [
            estadoActividad,
            tipoCierre,
            esperado
        ] of casos) {
            assert.equal(
                resolverEstadoOrdenDesdeActividad({
                    estadoActividad,
                    tipoCierre
                }),
                esperado
            );
        }
    }
);

test(
    "resuelve el evento de historial correspondiente",
    () => {
        const casos = [
            ["PENDIENTE", null, "ACTIVIDAD_PENDIENTE"],
            ["INICIADA", null, "INICIO"],
            ["SUSPENDIDA", null, "SUSPENSION"],
            ["FINALIZADA", null, "FINALIZACION"],
            ["CANCELADA", null, "CANCELACION_ENTEL"],
            [
                "NO_REALIZADO",
                "REPROGRAMADO",
                "REPROGRAMACION"
            ],
            [
                "NO_REALIZADO",
                "CIERRE_AUTOMATICO",
                "CIERRE_AUTOMATICO"
            ],
            ["NO_REALIZADO", null, "NO_REALIZADO"]
        ];

        for (const [
            estadoActividad,
            tipoCierre,
            esperado
        ] of casos) {
            assert.equal(
                resolverEventoActividad({
                    estadoActividad,
                    tipoCierre
                }),
                esperado
            );
        }
    }
);

test(
    "resuelve el resultado de una actividad no realizada",
    () => {
        assert.equal(
            resolverResultadoNoRealizado({
                estadoActividad: "NO_REALIZADO",
                tipoCierre: "REPROGRAMADO"
            }),
            "REPROGRAMADA"
        );

        assert.equal(
            resolverResultadoNoRealizado({
                estadoActividad: "NO_REALIZADO",
                tipoCierre: "CIERRE_AUTOMATICO"
            }),
            "CIERRE_AUTOMATICO"
        );

        assert.equal(
            resolverResultadoNoRealizado({
                estadoActividad: "PENDIENTE",
                tipoCierre: "REPROGRAMADO"
            }),
            null
        );
    }
);

test(
    "no reporta cambios cuando fechas, horas y textos son equivalentes",
    () => {
        const cambios = obtenerCambiosActividad(
            crearActividadExistente(),
            crearActividad({
                horaInicio: "9:00",
                razonReagenda: "  Razón  ",
                motivo: " Motivo "
            }),
            null,
            "ACT-1"
        );

        assert.deepEqual(cambios, []);
    }
);

test(
    "registra únicamente el campo de actividad realmente modificado",
    () => {
        const cambios = obtenerCambiosActividad(
            crearActividadExistente(),
            crearActividad({
                motivo: "Motivo actualizado"
            }),
            null,
            "ACT-1"
        );

        assert.deepEqual(cambios, [
            {
                campo:
                    "ActividadOFSC[ACT-1].Motivo",
                valorAnterior: "Motivo",
                valorNuevo: "Motivo actualizado"
            }
        ]);
    }
);

test(
    "audita los 14 campos persistidos de una actividad",
    () => {
        const existente =
            crearActividadExistente({
                IdActividadOFSC: "ACT-OLD",
                EstadoActividad: "PENDIENTE",
                FechaActividadISO: "2026-08-20",
                HoraInicioTexto: "08:00:00",
                HoraFinTexto: "12:00:00",
                FlagReagenda: false,
                RazonReagenda: "Anterior",
                ResultadoNoRealizado: null,
                Motivo: "Anterior",
                MotivoCancelacion: "Anterior",
                TipoCierre: "Anterior",
                ResultadoGlobal: "Anterior",
                ResponsableSuspension: "Anterior",
                TipoSuspension: "Anterior"
            });

        const actividad =
            crearActividad({
                estadoActividad: "CANCELADA",
                fechaActividad:
                    new Date(2026, 7, 21, 12),
                horaInicio: "09:00",
                horaFin: "13:00",
                flagReagenda: true,
                razonReagenda: "Nueva",
                motivo: "Nuevo",
                motivoCancelacion: "Nuevo",
                tipoCierre: "CIERRE_AUTOMATICO",
                resultadoGlobal: "Nuevo",
                responsableSuspension: "Nuevo",
                tipoSuspension: "Nuevo"
            });

        const cambios = obtenerCambiosActividad(
            existente,
            actividad,
            "CIERRE_AUTOMATICO",
            "ACT-NEW"
        );

        const campos = cambios.map(
            (cambio) =>
                cambio.campo.split("].")[1]
        );

        assert.deepEqual(campos, [
            "IdActividadOFSC",
            "EstadoActividad",
            "FechaActividad",
            "HoraInicio",
            "HoraFin",
            "FlagReagenda",
            "RazonReagenda",
            "ResultadoNoRealizado",
            "Motivo",
            "MotivoCancelacion",
            "TipoCierre",
            "ResultadoGlobal",
            "ResponsableSuspension",
            "TipoSuspension"
        ]);
    }
);

test(
    "los nombres de campos de actividad caben en HistorialCambiosOFSC",
    () => {
        const idActividadOFSC = "A".repeat(50);

        const cambios = obtenerCambiosActividad(
            null,
            crearActividad({
                responsableSuspension:
                    "Responsable"
            }),
            null,
            idActividadOFSC
        );

        assert.ok(cambios.length > 0);

        for (const cambio of cambios) {
            assert.ok(
                cambio.campo.length <= 100,
                cambio.campo
            );
        }
    }
);
