/**
 * Equivalencias entre las columnas del Excel OFSC
 * y los campos utilizados por SIGOT-FTTH.
 *
 * Se utilizan arreglos porque OFSC puede variar
 * ligeramente el nombre de algunas columnas.
 */
const mapaColumnas = {
    /*
     * Datos que identifican la actividad y la OT.
     */
    idActividadOFSC: [
        "ID de actividad"
    ],

    codigoOT: [
        "Orden de trabajo"
    ],

    /*
     * Datos generales del servicio.
     */
    codigoServicio: [
        "Cod_Servicio"
    ],

    productoPlan: [
        "Producto/Plan contratado"
    ],

    tipoServicio: [
        "Tipo de Servicio (TS1/TS2)"
    ],

    tipoActividad: [
        "Tipo de actividad"
    ],

    cliente: [
        "Nombre"
    ],

    dni: [
        "Documento"
    ],

    telefono: [
        "Teléfono móvil",
        "Teléfono",
        "Teléfono de Contacto"
    ],

    direccion: [
        "Dirección"
    ],

    distrito: [
        "Distrito",
        "Distrito WO"
    ],

    /*
     * Coordenadas.
     *
     * En OFSC:
     * Coordenada Y = latitud.
     * Coordenada X = longitud.
     */
    latitud: [
        "Coordenada Y"
    ],

    longitud: [
        "Coordenada X"
    ],

    /*
     * Información de red.
     */
    recursosXML: [
        "Recursos de red"
    ],

    rfs: [
        "ID Recurso de Servicio shm"
    ],

    /*
     * Agenda de la actividad.
     */
    fechaAgenda: [
        "Fecha"
    ],

    fechaActividad: [
        "Fecha"
    ],

    horario: [
        "Intervalo de tiempo",
        "Ventana de servicio"
    ],

    horaInicio: [
        "Inicio"
    ],

    horaFin: [
        "Finalización"
    ],

    /*
     * Estado de actividad en OFSC.
     *
     * estadoOT se conserva temporalmente para no
     * afectar el código existente.
     */
    estadoActividad: [
        "Estado de actividad"
    ],

    estadoOT: [
        "Estado de actividad"
    ],

    /*
     * Información de reagendamiento.
     */
    flagReagenda: [
        "Flag reagenda"
    ],

    razonReagenda: [
        "Razón reagenda"
    ],

    reagendamiento: [
        "Reagendamiento"
    ],

    solicitaReagendamiento: [
        "Solicita Reagendamiento"
    ],

    /*
     * Motivos y resultados.
     *
     * OFSC tiene actualmente el encabezado
     * "Motivo de cancelacíon", con esa escritura.
     * También se incluye la versión corregida.
     */
    motivo: [
        "Motivo"
    ],

    motivoCancelacion: [
        "Motivo de cancelacíon",
        "Motivo de cancelación"
    ],

    resultadoGlobal: [
        "Resultado Global"
    ],

    resultadoActivacion: [
        "Resultado activación"
    ],

    tipoCierre: [
    "Tipo Cierre",
    "Tipo de Cierre",
    "Tipo cierre",
    "Tipo de cierre",
    "TIPO CIERRE",
    "TIPO DE CIERRE"
    ],

    /*
     * Datos de suspensión.
     */
    responsableSuspension: [
        "Responsable Suspension",
        "Responsable Suspensión"
    ],

    tipoSuspension: [
        "Tipo Suspension",
        "Tipo Suspensión"
    ]
};

module.exports = mapaColumnas;