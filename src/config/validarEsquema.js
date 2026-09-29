const REQUISITOS_TABLAS = [
    "dbo.Operaciones",
    "dbo.OrdenesTrabajo",
    "dbo.ActividadesOFSC",
    "dbo.Asignaciones",
    "dbo.HistorialEstadosOT",
    "dbo.HistorialAsignaciones",
    "dbo.DetalleImportacionOFSC",
    "dbo.HistorialCambiosOFSC",
    "dbo.TSS",
    "dbo.HistorialEstadosTSS",
    "dbo.TiposEvidenciaTSS",
    "dbo.EvidenciasTSS",
    "dbo.DocumentosTSS",
    "dbo.ValidacionesTCE",
    "dbo.DisponibilidadTecnicos",
    "dbo.AgendaTecnicos",
    "dbo.Usuarios",
    "dbo.Roles",
    "dbo.Tecnicos",
    "dbo.NAPs"
];

const REQUISITOS_COLUMNAS = [
    ["dbo.Operaciones", "CantidadNuevas"],
    ["dbo.Operaciones", "CantidadActualizadas"],
    ["dbo.Operaciones", "CantidadSinCambios"],
    ["dbo.Operaciones", "CantidadErrores"],

    ["dbo.OrdenesTrabajo", "IdOrden"],
    ["dbo.OrdenesTrabajo", "IdNAP"],
    ["dbo.OrdenesTrabajo", "CodigoOT"],
    ["dbo.OrdenesTrabajo", "CodigoServicio"],
    ["dbo.OrdenesTrabajo", "Cliente"],
    ["dbo.OrdenesTrabajo", "Distrito"],
    ["dbo.OrdenesTrabajo", "EstadoOT"],
    ["dbo.OrdenesTrabajo", "EstadoAsignacion"],
    ["dbo.OrdenesTrabajo", "FechaAgenda"],
    ["dbo.OrdenesTrabajo", "FechaActualizacion"],

    ["dbo.ActividadesOFSC", "IdActividad"],
    ["dbo.ActividadesOFSC", "IdActividadOFSC"],
    ["dbo.ActividadesOFSC", "IdOrden"],
    ["dbo.ActividadesOFSC", "EstadoActividad"],
    ["dbo.ActividadesOFSC", "FechaActividad"],
    ["dbo.ActividadesOFSC", "FechaImportacion"],
    ["dbo.ActividadesOFSC", "FechaActualizacion"],

    ["dbo.Tecnicos", "IdTecnico"],
    ["dbo.Tecnicos", "CodigoTecnico"],
    ["dbo.Tecnicos", "NombreCompleto"],
    ["dbo.Tecnicos", "Telefono"],
    ["dbo.Tecnicos", "DistritoBase"],

    ["dbo.NAPs", "IdNAP"],
    ["dbo.NAPs", "CodigoNAP"],
    ["dbo.NAPs", "Proyecto"],
    ["dbo.NAPs", "OLT"],
    ["dbo.NAPs", "PuertoOLT"],
    ["dbo.NAPs", "Coordenadas"],
    ["dbo.NAPs", "Distrito"],
    ["dbo.NAPs", "EsReferenciaHistorica"],
    ["dbo.NAPs", "FechaBaseReferencia"],
    ["dbo.NAPs", "FuenteDatos"],

    ["dbo.Usuarios", "IdUsuario"],
    ["dbo.Usuarios", "IdRol"],
    ["dbo.Usuarios", "NombreCompleto"],
    ["dbo.Usuarios", "Usuario"],

    ["dbo.Roles", "IdRol"],
    ["dbo.Roles", "Nombre"],

    ["dbo.DetalleImportacionOFSC", "IdOperacion"],
    ["dbo.DetalleImportacionOFSC", "IdOrden"],
    ["dbo.DetalleImportacionOFSC", "CodigoOT"],
    ["dbo.DetalleImportacionOFSC", "Resultado"],
    ["dbo.DetalleImportacionOFSC", "Mensaje"],

    ["dbo.HistorialCambiosOFSC", "IdOrden"],
    ["dbo.HistorialCambiosOFSC", "IdOperacion"],
    ["dbo.HistorialCambiosOFSC", "Campo"],
    ["dbo.HistorialCambiosOFSC", "ValorAnterior"],
    ["dbo.HistorialCambiosOFSC", "ValorNuevo"],

    ["dbo.TSS", "IdTSS"],
    ["dbo.TSS", "IdOrden"],
    ["dbo.TSS", "IdTecnico"],
    ["dbo.TSS", "FechaAgenda"],
    ["dbo.TSS", "Turno"],
    ["dbo.TSS", "EstadoTSS"],
    ["dbo.TSS", "IdNAP"],
    ["dbo.TSS", "PuertoNAP"],
    ["dbo.TSS", "CoordenadasNAP"],
    ["dbo.TSS", "RFS"],
    ["dbo.TSS", "Observaciones"],
    ["dbo.TSS", "ContinuidadInstalacion"],
    ["dbo.TSS", "FormularioEnviado"],
    ["dbo.TSS", "FechaEnvioFormulario"],
    ["dbo.TSS", "IdUsuarioFormulario"],
    ["dbo.TSS", "FechaCreacion"],
    ["dbo.TSS", "FechaActualizacion"],
    ["dbo.TSS", "IdUsuarioRegistro"],

    ["dbo.HistorialEstadosTSS", "IdHistorialTSS"],
    ["dbo.HistorialEstadosTSS", "IdTSS"],
    ["dbo.HistorialEstadosTSS", "EstadoAnterior"],
    ["dbo.HistorialEstadosTSS", "EstadoNuevo"],
    ["dbo.HistorialEstadosTSS", "Motivo"],
    ["dbo.HistorialEstadosTSS", "Observacion"],
    ["dbo.HistorialEstadosTSS", "FechaEvento"],
    ["dbo.HistorialEstadosTSS", "IdUsuario"],

    ["dbo.TiposEvidenciaTSS", "IdTipoEvidencia"],
    ["dbo.TiposEvidenciaTSS", "Nombre"],
    ["dbo.TiposEvidenciaTSS", "Descripcion"],
    ["dbo.TiposEvidenciaTSS", "EsBase"],
    ["dbo.TiposEvidenciaTSS", "Obligatoria"],
    ["dbo.TiposEvidenciaTSS", "Activo"],
    ["dbo.TiposEvidenciaTSS", "OrdenVisual"],

    ["dbo.EvidenciasTSS", "IdEvidenciaTSS"],
    ["dbo.EvidenciasTSS", "IdTSS"],
    ["dbo.EvidenciasTSS", "IdTipoEvidencia"],
    ["dbo.EvidenciasTSS", "NombreEvidencia"],
    ["dbo.EvidenciasTSS", "EstadoEvidencia"],
    ["dbo.EvidenciasTSS", "MotivoNoAplica"],
    ["dbo.EvidenciasTSS", "NombreArchivo"],
    ["dbo.EvidenciasTSS", "RutaArchivo"],
    ["dbo.EvidenciasTSS", "Extension"],
    ["dbo.EvidenciasTSS", "PesoKB"],
    ["dbo.EvidenciasTSS", "Observacion"],
    ["dbo.EvidenciasTSS", "FechaRegistro"],
    ["dbo.EvidenciasTSS", "IdUsuarioRegistro"],

    ["dbo.DocumentosTSS", "IdDocumentoTSS"],
    ["dbo.DocumentosTSS", "IdTSS"],
    ["dbo.DocumentosTSS", "TipoDocumento"],
    ["dbo.DocumentosTSS", "NombreArchivo"],
    ["dbo.DocumentosTSS", "RutaArchivo"],
    ["dbo.DocumentosTSS", "FechaGeneracion"],
    ["dbo.DocumentosTSS", "IdUsuarioGeneracion"],
    ["dbo.DocumentosTSS", "Vigente"],

    ["dbo.ValidacionesTCE", "IdValidacionTCE"],
    ["dbo.ValidacionesTCE", "IdTSS"],
    ["dbo.ValidacionesTCE", "IdNAP"],
    ["dbo.ValidacionesTCE", "CodigoNAPValidado"],
    ["dbo.ValidacionesTCE", "PuertoConfirmado"],
    ["dbo.ValidacionesTCE", "Resultado"],
    ["dbo.ValidacionesTCE", "Observaciones"],
    ["dbo.ValidacionesTCE", "FechaSolicitud"],
    ["dbo.ValidacionesTCE", "FechaRespuesta"],
    ["dbo.ValidacionesTCE", "ValidadoPor"],
    ["dbo.ValidacionesTCE", "IdUsuarioRegistro"],

    ["dbo.DisponibilidadTecnicos", "IdDisponibilidad"],
    ["dbo.DisponibilidadTecnicos", "IdTecnico"],
    ["dbo.DisponibilidadTecnicos", "FechaVigencia"],
    ["dbo.DisponibilidadTecnicos", "DisponibleAM"],
    ["dbo.DisponibilidadTecnicos", "DisponiblePM"],
    ["dbo.DisponibilidadTecnicos", "NocturnoConfirmado"],
    ["dbo.DisponibilidadTecnicos", "Motivo"],
    ["dbo.DisponibilidadTecnicos", "Observaciones"],
    ["dbo.DisponibilidadTecnicos", "FechaRegistro"],
    ["dbo.DisponibilidadTecnicos", "IdUsuarioRegistro"],

    ["dbo.AgendaTecnicos", "IdAgenda"],
    ["dbo.AgendaTecnicos", "IdTecnico"],
    ["dbo.AgendaTecnicos", "FechaAgenda"],
    ["dbo.AgendaTecnicos", "Turno"],
    ["dbo.AgendaTecnicos", "TipoActividad"],
    ["dbo.AgendaTecnicos", "IdTSS"],
    ["dbo.AgendaTecnicos", "IdActividad"],
    ["dbo.AgendaTecnicos", "EstadoAgenda"],
    ["dbo.AgendaTecnicos", "OcupaTurno"],
    ["dbo.AgendaTecnicos", "Observaciones"],
    ["dbo.AgendaTecnicos", "FechaRegistro"],
    ["dbo.AgendaTecnicos", "FechaActualizacion"],
    ["dbo.AgendaTecnicos", "IdUsuarioRegistro"],

    ["dbo.HistorialAsignaciones", "IdAsignacion"],
    ["dbo.HistorialAsignaciones", "IdOrden"],
    ["dbo.HistorialAsignaciones", "IdTecnicoAnterior"],
    ["dbo.HistorialAsignaciones", "IdTecnicoNuevo"],
    ["dbo.HistorialAsignaciones", "Evento"],
    ["dbo.HistorialAsignaciones", "EstadoAnterior"],
    ["dbo.HistorialAsignaciones", "EstadoNuevo"],
    ["dbo.HistorialAsignaciones", "Motivo"],
    ["dbo.HistorialAsignaciones", "Fuente"],
    ["dbo.HistorialAsignaciones", "IdUsuario"],
    ["dbo.HistorialAsignaciones", "IdActividad"]
];

const REQUISITOS_INDICES = [
    ["dbo.OrdenesTrabajo", "UX_OrdenesTrabajo_CodigoOT"],
    ["dbo.ActividadesOFSC", "UQ_ActividadesOFSC_IdActividadOFSC"],
    ["dbo.Asignaciones", "UX_Asignaciones_OrdenActiva"],
    ["dbo.TSS", "UQ_TSS_IdOrden"],
    ["dbo.DetalleImportacionOFSC", "IX_DetalleImportacionOFSC_IdOperacion"],
    ["dbo.HistorialCambiosOFSC", "IX_HistorialCambiosOFSC_IdOrden"],
    ["dbo.HistorialEstadosTSS", "IX_HistorialEstadosTSS_IdTSS"],
    ["dbo.EvidenciasTSS", "IX_EvidenciasTSS_IdTSS"],
    ["dbo.DocumentosTSS", "IX_DocumentosTSS_IdTSS"],
    ["dbo.ValidacionesTCE", "IX_ValidacionesTCE_IdTSS"],
    [
        "dbo.DisponibilidadTecnicos",
        "UQ_DisponibilidadTecnicos_TecnicoFecha"
    ],
    [
        "dbo.DisponibilidadTecnicos",
        "IX_DisponibilidadTecnicos_Fecha"
    ],
    ["dbo.AgendaTecnicos", "UX_AgendaTecnicos_TurnoOcupado"],
    ["dbo.AgendaTecnicos", "UX_AgendaTecnicos_TSS_Ocupado"],
    [
        "dbo.AgendaTecnicos",
        "UX_AgendaTecnicos_Actividad_Ocupada"
    ],
    ["dbo.AgendaTecnicos", "IX_AgendaTecnicos_Fecha"]
];

const REQUISITOS_INDICES_UNICOS = [
    [
        "dbo.OrdenesTrabajo",
        "UX_OrdenesTrabajo_CodigoOT",
        "CodigoOT",
        "0",
        "",
        "0"
    ],
    [
        "dbo.ActividadesOFSC",
        "UQ_ActividadesOFSC_IdActividadOFSC",
        "IdActividadOFSC",
        "0",
        "",
        "1"
    ],
    [
        "dbo.Asignaciones",
        "UX_Asignaciones_OrdenActiva",
        "IdOrden",
        "1",
        "Estado='ACTIVA'",
        "0"
    ],
    [
        "dbo.TSS",
        "UQ_TSS_IdOrden",
        "IdOrden",
        "0",
        "",
        "1"
    ],
    [
        "dbo.DisponibilidadTecnicos",
        "UQ_DisponibilidadTecnicos_TecnicoFecha",
        "IdTecnico,FechaVigencia",
        "0",
        "",
        "1"
    ],
    [
        "dbo.AgendaTecnicos",
        "UX_AgendaTecnicos_TurnoOcupado",
        "IdTecnico,FechaAgenda,Turno",
        "1",
        "OcupaTurno=1",
        "0"
    ],
    [
        "dbo.AgendaTecnicos",
        "UX_AgendaTecnicos_TSS_Ocupado",
        "IdTSS",
        "1",
        "IdTSSISNOTNULLANDOcupaTurno=1",
        "0"
    ],
    [
        "dbo.AgendaTecnicos",
        "UX_AgendaTecnicos_Actividad_Ocupada",
        "IdActividad",
        "1",
        "IdActividadISNOTNULLANDOcupaTurno=1",
        "0"
    ]
];

function escaparSql(valor) {
    return String(valor).replaceAll("'", "''");
}

function construirValores(filas) {
    return filas
        .map(
            (fila) =>
                `(${fila
                    .map(
                        (valor) =>
                            `'${escaparSql(valor)}'`
                    )
                    .join(", ")})`
        )
        .join(",\n                    ");
}

function construirConsultaValidacion() {
    const tablas = construirValores(
        REQUISITOS_TABLAS.map(
            (tabla) => [tabla]
        )
    );

    const columnas = construirValores(
        REQUISITOS_COLUMNAS
    );

    return `
        WITH RequisitosTabla AS
        (
            SELECT Tabla
            FROM (VALUES
                    ${tablas}
            ) V(Tabla)
        ),
        RequisitosColumna AS
        (
            SELECT Tabla, Columna
            FROM (VALUES
                    ${columnas}
            ) V(Tabla, Columna)
        )
        SELECT
            CONCAT(
                'Tabla: ',
                Tabla
            ) AS Requisito
        FROM RequisitosTabla
        WHERE OBJECT_ID(Tabla, 'U') IS NULL

        UNION ALL

        SELECT
            CONCAT(
                'Columna: ',
                Tabla,
                '.',
                Columna
            ) AS Requisito
        FROM RequisitosColumna
        WHERE
            OBJECT_ID(Tabla, 'U') IS NULL
            OR COL_LENGTH(
                Tabla,
                Columna
            ) IS NULL

        ORDER BY Requisito;
    `;
}

async function validarEsquema(pool) {
    if (!pool || typeof pool.request !== "function") {
        throw new Error(
            "No se recibió una conexión válida para verificar el esquema."
        );
    }

    const request = pool.request({
        requestTimeout: 120000
    });

    const resultado = await request.query(
        construirConsultaValidacion()
    );

    const faltantes = (
        resultado.recordset || []
    )
        .map((fila) => fila.Requisito)
        .filter(Boolean);

    if (faltantes.length > 0) {
        const error = new Error(
            "La base de datos no tiene el esquema requerido por SIGOT-FTTH. " +
            "Ejecute las migraciones pendientes antes de iniciar el backend. " +
            `Revisar: ${faltantes.join("; ")}`
        );

        error.code = "ESQUEMA_INCOMPLETO";
        error.requisitosFaltantes = faltantes;

        throw error;
    }

    return true;
}

module.exports = {
    validarEsquema,
    construirConsultaValidacion,
    REQUISITOS_TABLAS,
    REQUISITOS_COLUMNAS,
    REQUISITOS_INDICES,
    REQUISITOS_INDICES_UNICOS
};
