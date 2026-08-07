import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";

import {
    cancelarAsignacion,
    ejecutarAsignacionAutomatica,
    ejecutarAsignacionManual,
    obtenerAsignaciones,
    obtenerOpcionesAsignacionManual,
    reasignarOrden
} from "../services/asignacionesService";

import {
    obtenerUsuario
} from "../services/authService";

import "./AsignacionesPage.css";

const REGISTROS_POR_PAGINA = 10;

// =====================================
// FUNCIONES AUXILIARES
// =====================================
function obtenerTexto(valor) {
    return String(valor ?? "").trim();
}

function normalizarTexto(valor) {
    return obtenerTexto(valor)
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toUpperCase();
}

function mostrarEstado(estado) {
    return obtenerTexto(estado)
        .replaceAll("_", " ");
}

function formatearFecha(valor) {
    if (!valor) {
        return "Sin fecha";
    }

    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
        return obtenerTexto(valor);
    }

    return fecha.toLocaleDateString(
        "es-PE",
        {
            timeZone: "UTC"
        }
    );
}

function formatearFechaHora(valor) {
    if (!valor) {
        return "Sin registro";
    }

    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
        return obtenerTexto(valor);
    }

    return fecha.toLocaleString(
        "es-PE"
    );
}

function obtenerClaseEstado(estado) {
    const valor =
        normalizarTexto(estado);

    if (
        valor === "ACTIVA" ||
        valor === "ASIGNADA"
    ) {
        return "estado-activa";
    }

    if (
        valor === "FINALIZADA" ||
        valor === "FINALIZADO"
    ) {
        return "estado-finalizada";
    }

    if (
        valor === "CANCELADA" ||
        valor === "CANCELADO"
    ) {
        return "estado-cancelada";
    }

    if (
        valor === "PENDIENTE" ||
        valor === "SIN ASIGNAR"
    ) {
        return "estado-pendiente";
    }

    return "estado-neutro";
}

function AsignacionesPage() {
    const usuario = obtenerUsuario();

    const puedeGestionar = [
        "Administrador",
        "Coordinador"
    ].includes(
        usuario?.Rol || ""
    );

    const [
        asignaciones,
        setAsignaciones
    ] = useState([]);

    const [
        busqueda,
        setBusqueda
    ] = useState("");

    const [
        estadoSeleccionado,
        setEstadoSeleccionado
    ] = useState("TODOS");

    const [
        paginaActual,
        setPaginaActual
    ] = useState(1);

    const [
        cargando,
        setCargando
    ] = useState(true);

    const [
        ejecutando,
        setEjecutando
    ] = useState(false);

    const [
        mensaje,
        setMensaje
    ] = useState("");

    const [
        error,
        setError
    ] = useState("");

    const [
        resumenProceso,
        setResumenProceso
    ] = useState(null);

    // =====================================
    // ASIGNACIÓN MANUAL
    // =====================================
    const [
        modalManualAbierto,
        setModalManualAbierto
    ] = useState(false);

    const [
        cargandoOpciones,
        setCargandoOpciones
    ] = useState(false);

    const [
        guardandoManual,
        setGuardandoManual
    ] = useState(false);

    const [
        opcionesManuales,
        setOpcionesManuales
    ] = useState({
        ordenes: [],
        tecnicos: []
    });

    const [
        idOrdenManual,
        setIdOrdenManual
    ] = useState("");

    const [
        idTecnicoManual,
        setIdTecnicoManual
    ] = useState("");

    const [
        errorManual,
        setErrorManual
    ] = useState("");

    // =====================================
    // REASIGNACIÓN
    // =====================================
    const [
        modalReasignarAbierto,
        setModalReasignarAbierto
    ] = useState(false);

    const [
        asignacionReasignar,
        setAsignacionReasignar
    ] = useState(null);

    const [
        idTecnicoReasignar,
        setIdTecnicoReasignar
    ] = useState("");

    const [
        motivoReasignar,
        setMotivoReasignar
    ] = useState("");

    const [
        guardandoReasignacion,
        setGuardandoReasignacion
    ] = useState(false);

    const [
        errorReasignacion,
        setErrorReasignacion
    ] = useState("");

    const [
        tecnicosReasignacion,
        setTecnicosReasignacion
    ] = useState([]);

    // =====================================
    // CANCELACIÓN
    // =====================================
    const [
        modalCancelarAbierto,
        setModalCancelarAbierto
    ] = useState(false);

    const [
        asignacionCancelar,
        setAsignacionCancelar
    ] = useState(null);

    const [
        motivoCancelar,
        setMotivoCancelar
    ] = useState("");

    const [
        guardandoCancelacion,
        setGuardandoCancelacion
    ] = useState(false);

    const [
        errorCancelacion,
        setErrorCancelacion
    ] = useState("");

    // =====================================
    // CARGAR ASIGNACIONES
    // =====================================
    const cargarAsignaciones =
        useCallback(async () => {
            try {
                setCargando(true);
                setError("");

                const data =
                    await obtenerAsignaciones();

                setAsignaciones(
                    Array.isArray(data)
                        ? data
                        : []
                );
            } catch (errorPeticion) {
                console.error(
                    "Error al cargar asignaciones:",
                    errorPeticion
                );

                setError(
                    errorPeticion.response?.data?.mensaje ||
                    "No se pudieron cargar las asignaciones."
                );
            } finally {
                setCargando(false);
            }
        }, []);

    useEffect(() => {
        cargarAsignaciones();
    }, [cargarAsignaciones]);

    // =====================================
    // ASIGNACIÓN AUTOMÁTICA
    // =====================================
    async function ejecutarAsignacion() {
        if (!puedeGestionar) {
            setError(
                "No tiene permisos para ejecutar la asignación automática."
            );

            return;
        }

        const confirmado =
            window.confirm(
                "¿Desea ejecutar la asignación automática de las órdenes pendientes?"
            );

        if (!confirmado) {
            return;
        }

        try {
            setEjecutando(true);
            setMensaje("");
            setError("");
            setResumenProceso(null);

            const respuesta =
                await ejecutarAsignacionAutomatica();

            setMensaje(
                respuesta.mensaje ||
                "Asignación automática ejecutada correctamente."
            );

            setResumenProceso(
                respuesta.resumen || null
            );

            await cargarAsignaciones();
        } catch (errorPeticion) {
            console.error(
                "Error al ejecutar la asignación automática:",
                errorPeticion
            );

            setError(
                errorPeticion.response?.data?.mensaje ||
                "No se pudo ejecutar la asignación automática."
            );
        } finally {
            setEjecutando(false);
        }
    }

    // =====================================
    // ASIGNACIÓN MANUAL
    // =====================================
    async function abrirAsignacionManual() {
        if (!puedeGestionar) {
            return;
        }

        try {
            setModalManualAbierto(true);
            setCargandoOpciones(true);
            setErrorManual("");
            setIdOrdenManual("");
            setIdTecnicoManual("");

            const respuesta =
                await obtenerOpcionesAsignacionManual();

            setOpcionesManuales({
                ordenes:
                    Array.isArray(
                        respuesta?.ordenes
                    )
                        ? respuesta.ordenes
                        : [],

                tecnicos:
                    Array.isArray(
                        respuesta?.tecnicos
                    )
                        ? respuesta.tecnicos
                        : []
            });
        } catch (errorPeticion) {
            setErrorManual(
                errorPeticion.response?.data?.mensaje ||
                "No se pudieron cargar las opciones."
            );
        } finally {
            setCargandoOpciones(false);
        }
    }

    function cerrarAsignacionManual() {
        if (guardandoManual) {
            return;
        }

        setModalManualAbierto(false);
        setErrorManual("");
        setIdOrdenManual("");
        setIdTecnicoManual("");
    }

    async function guardarAsignacionManual(
        evento
    ) {
        evento.preventDefault();

        const idOrden =
            Number(idOrdenManual);

        const idTecnico =
            Number(idTecnicoManual);

        if (
            !Number.isInteger(idOrden) ||
            idOrden <= 0
        ) {
            setErrorManual(
                "Debe seleccionar una orden."
            );

            return;
        }

        if (
            !Number.isInteger(idTecnico) ||
            idTecnico <= 0
        ) {
            setErrorManual(
                "Debe seleccionar un técnico."
            );

            return;
        }

        try {
            setGuardandoManual(true);
            setErrorManual("");
            setMensaje("");
            setError("");
            setResumenProceso(null);

            const respuesta =
                await ejecutarAsignacionManual(
                    idOrden,
                    idTecnico
                );

            setMensaje(
                respuesta.mensaje ||
                "La asignación manual fue registrada correctamente."
            );

            setModalManualAbierto(false);
            setIdOrdenManual("");
            setIdTecnicoManual("");

            await cargarAsignaciones();
        } catch (errorPeticion) {
            setErrorManual(
                errorPeticion.response?.data?.mensaje ||
                "No se pudo registrar la asignación manual."
            );
        } finally {
            setGuardandoManual(false);
        }
    }

    // =====================================
    // REASIGNACIÓN
    // =====================================
    async function abrirReasignacion(
        asignacion
    ) {
        if (!puedeGestionar) {
            return;
        }

        try {
            setAsignacionReasignar(
                asignacion
            );

            setModalReasignarAbierto(
                true
            );

            setIdTecnicoReasignar("");
            setMotivoReasignar("");
            setErrorReasignacion("");
            setCargandoOpciones(true);

            const respuesta =
                await obtenerOpcionesAsignacionManual();

            const tecnicos =
                Array.isArray(
                    respuesta?.tecnicos
                )
                    ? respuesta.tecnicos
                    : [];

            setTecnicosReasignacion(
                tecnicos.filter(
                    (tecnico) =>
                        Number(
                            tecnico.IdTecnico
                        ) !==
                        Number(
                            asignacion.IdTecnico
                        )
                )
            );
        } catch (errorPeticion) {
            setErrorReasignacion(
                errorPeticion.response?.data?.mensaje ||
                "No se pudieron cargar los técnicos disponibles."
            );
        } finally {
            setCargandoOpciones(false);
        }
    }

    function cerrarReasignacion() {
        if (guardandoReasignacion) {
            return;
        }

        setModalReasignarAbierto(
            false
        );

        setAsignacionReasignar(null);
        setIdTecnicoReasignar("");
        setMotivoReasignar("");
        setErrorReasignacion("");
    }

    async function guardarReasignacion(
        evento
    ) {
        evento.preventDefault();

        const idAsignacion =
            Number(
                asignacionReasignar
                    ?.IdAsignacion
            );

        const idTecnicoNuevo =
            Number(
                idTecnicoReasignar
            );

        const motivo =
            motivoReasignar.trim();

        if (
            !Number.isInteger(
                idTecnicoNuevo
            ) ||
            idTecnicoNuevo <= 0
        ) {
            setErrorReasignacion(
                "Debe seleccionar un nuevo técnico."
            );

            return;
        }

        if (motivo.length < 5) {
            setErrorReasignacion(
                "El motivo debe contener al menos 5 caracteres."
            );

            return;
        }

        try {
            setGuardandoReasignacion(
                true
            );

            setErrorReasignacion("");
            setMensaje("");
            setError("");

            const respuesta =
                await reasignarOrden(
                    idAsignacion,
                    idTecnicoNuevo,
                    motivo
                );

            setMensaje(
                respuesta.mensaje ||
                "La orden fue reasignada correctamente."
            );

            setModalReasignarAbierto(
                false
            );

            setAsignacionReasignar(null);

            await cargarAsignaciones();
        } catch (errorPeticion) {
            setErrorReasignacion(
                errorPeticion.response?.data?.mensaje ||
                "No se pudo reasignar la orden."
            );
        } finally {
            setGuardandoReasignacion(
                false
            );
        }
    }

    // =====================================
    // CANCELACIÓN
    // =====================================
    function abrirCancelacion(
        asignacion
    ) {
        if (!puedeGestionar) {
            return;
        }

        setAsignacionCancelar(
            asignacion
        );

        setMotivoCancelar("");
        setErrorCancelacion("");

        setModalCancelarAbierto(
            true
        );
    }

    function cerrarCancelacion() {
        if (guardandoCancelacion) {
            return;
        }

        setModalCancelarAbierto(
            false
        );

        setAsignacionCancelar(null);
        setMotivoCancelar("");
        setErrorCancelacion("");
    }

    async function guardarCancelacion(
        evento
    ) {
        evento.preventDefault();

        const motivo =
            motivoCancelar.trim();

        if (motivo.length < 5) {
            setErrorCancelacion(
                "El motivo debe contener al menos 5 caracteres."
            );

            return;
        }

        try {
            setGuardandoCancelacion(
                true
            );

            setErrorCancelacion("");
            setMensaje("");
            setError("");

            const respuesta =
                await cancelarAsignacion(
                    asignacionCancelar
                        .IdAsignacion,
                    motivo
                );

            setMensaje(
                respuesta.mensaje ||
                "La asignación fue cancelada correctamente."
            );

            setModalCancelarAbierto(
                false
            );

            setAsignacionCancelar(null);

            await cargarAsignaciones();
        } catch (errorPeticion) {
            setErrorCancelacion(
                errorPeticion.response?.data?.mensaje ||
                "No se pudo cancelar la asignación."
            );
        } finally {
            setGuardandoCancelacion(
                false
            );
        }
    }

    // =====================================
    // OPCIONES DEL MODAL MANUAL
    // =====================================
    const ordenesManualesDisponibles =
        useMemo(() => {
            return opcionesManuales.ordenes.filter(
                (orden) =>
                    Boolean(
                        orden.FechaAgenda
                    ) &&
                    Boolean(
                        obtenerTexto(
                            orden.Horario
                        )
                    )
            );
        }, [opcionesManuales.ordenes]);

    const ordenesSinAgenda =
        opcionesManuales.ordenes.length -
        ordenesManualesDisponibles.length;

    const ordenManualSeleccionada =
        useMemo(() => {
            return (
                opcionesManuales.ordenes.find(
                    (orden) =>
                        Number(
                            orden.IdOrden
                        ) ===
                        Number(
                            idOrdenManual
                        )
                ) || null
            );
        }, [
            opcionesManuales.ordenes,
            idOrdenManual
        ]);

    const tecnicoManualSeleccionado =
        useMemo(() => {
            return (
                opcionesManuales.tecnicos.find(
                    (tecnico) =>
                        Number(
                            tecnico.IdTecnico
                        ) ===
                        Number(
                            idTecnicoManual
                        )
                ) || null
            );
        }, [
            opcionesManuales.tecnicos,
            idTecnicoManual
        ]);

    // =====================================
    // FILTROS
    // =====================================
    const estadosDisponibles =
        useMemo(() => {
            const estados =
                asignaciones
                    .map(
                        (asignacion) =>
                            normalizarTexto(
                                asignacion.EstadoAsignacion
                            )
                    )
                    .filter(Boolean);

            return [
                ...new Set(estados)
            ].sort();
        }, [asignaciones]);

    const asignacionesFiltradas =
        useMemo(() => {
            const textoBusqueda =
                busqueda
                    .trim()
                    .toLowerCase();

            return asignaciones.filter(
                (asignacion) => {
                    const estado =
                        normalizarTexto(
                            asignacion.EstadoAsignacion
                        );

                    const cumpleEstado =
                        estadoSeleccionado ===
                            "TODOS" ||
                        estado ===
                            estadoSeleccionado;

                    const contenido = [
                        asignacion.CodigoOT,
                        asignacion.Cliente,
                        asignacion.Direccion,
                        asignacion.Distrito,
                        asignacion.CodigoTecnico,
                        asignacion.Tecnico,
                        asignacion.TipoTecnico,
                        asignacion.EstadoAsignacion,
                        asignacion.EstadoInternoOT,
                        asignacion.EstadoOT,
                        asignacion.EstadoActividad,
                        asignacion.TipoAsignacion,
                        asignacion.UsuarioResponsable,
                        asignacion.NombreUsuarioResponsable,
                        asignacion.RolResponsable
                    ]
                        .map(obtenerTexto)
                        .join(" ")
                        .toLowerCase();

                    const cumpleBusqueda =
                        textoBusqueda === "" ||
                        contenido.includes(
                            textoBusqueda
                        );

                    return (
                        cumpleEstado &&
                        cumpleBusqueda
                    );
                }
            );
        }, [
            asignaciones,
            busqueda,
            estadoSeleccionado
        ]);

    useEffect(() => {
        setPaginaActual(1);
    }, [
        busqueda,
        estadoSeleccionado
    ]);

    // =====================================
    // RESUMEN
    // =====================================
    const totalActivas =
        asignaciones.filter(
            (asignacion) =>
                normalizarTexto(
                    asignacion.EstadoAsignacion
                ) === "ACTIVA"
        ).length;

    const totalFinalizadas =
        asignaciones.filter(
            (asignacion) =>
                normalizarTexto(
                    asignacion.EstadoAsignacion
                ) === "FINALIZADA"
        ).length;

    const totalCanceladas =
        asignaciones.filter(
            (asignacion) =>
                normalizarTexto(
                    asignacion.EstadoAsignacion
                ) === "CANCELADA"
        ).length;

    // =====================================
    // PAGINACIÓN
    // =====================================
    const totalPaginas =
        Math.max(
            1,
            Math.ceil(
                asignacionesFiltradas.length /
                REGISTROS_POR_PAGINA
            )
        );

    useEffect(() => {
        if (
            paginaActual >
            totalPaginas
        ) {
            setPaginaActual(
                totalPaginas
            );
        }
    }, [
        paginaActual,
        totalPaginas
    ]);

    const indiceInicial =
        (
            paginaActual - 1
        ) *
        REGISTROS_POR_PAGINA;

    const indiceFinal =
        indiceInicial +
        REGISTROS_POR_PAGINA;

    const asignacionesVisibles =
        asignacionesFiltradas.slice(
            indiceInicial,
            indiceFinal
        );

    return (
        <section className="asignaciones-page">
            <header className="asignaciones-encabezado">
                <div>
                    <h1>
                        Asignaciones
                    </h1>

                    <p>
                        {puedeGestionar
                            ? "Consulte las órdenes asignadas y gestione la asignación de técnicos."
                            : "Consulte las órdenes asignadas a los técnicos."}
                    </p>
                </div>

                <div className="acciones-encabezado">
                    <button
                        type="button"
                        className="boton-refrescar"
                        onClick={
                            cargarAsignaciones
                        }
                        disabled={
                            cargando ||
                            ejecutando
                        }
                    >
                        {cargando
                            ? "Actualizando..."
                            : "Actualizar"}
                    </button>

                    {puedeGestionar && (
                        <>
                            <button
                                type="button"
                                className="boton-asignacion-manual"
                                onClick={
                                    abrirAsignacionManual
                                }
                                disabled={
                                    ejecutando ||
                                    cargando
                                }
                            >
                                Asignación manual
                            </button>

                            <button
                                type="button"
                                className="boton-asignacion-automatica"
                                onClick={
                                    ejecutarAsignacion
                                }
                                disabled={
                                    ejecutando ||
                                    cargando
                                }
                            >
                                {ejecutando
                                    ? "Asignando..."
                                    : "Asignación automática"}
                            </button>
                        </>
                    )}
                </div>
            </header>

            {mensaje && (
                <div className="mensaje-asignacion mensaje-asignacion-exito">
                    {mensaje}
                </div>
            )}

            {error && (
                <div className="mensaje-asignacion mensaje-asignacion-error">
                    {error}
                </div>
            )}

            {resumenProceso &&
                puedeGestionar && (
                    <div className="resultado-proceso">
                        <h3>
                            Resultado de la asignación
                        </h3>

                        <div className="resultado-grid">
                            <div>
                                <span>
                                    Asignadas
                                </span>

                                <strong>
                                    {resumenProceso.totalAsignadas ??
                                        0}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Sin técnico
                                </span>

                                <strong>
                                    {resumenProceso.sinTecnicoDisponible ??
                                        0}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Sin agenda
                                </span>

                                <strong>
                                    {resumenProceso.sinFechaOHorario ??
                                        0}
                                </strong>
                            </div>

                            <div>
                                <span>
                                    Errores
                                </span>

                                <strong>
                                    {resumenProceso.totalErrores ??
                                        0}
                                </strong>
                            </div>
                        </div>
                    </div>
                )}

            <div className="resumen-asignaciones">
                <div className="tarjeta-resumen">
                    <span>Total</span>
                    <strong>
                        {asignaciones.length}
                    </strong>
                </div>

                <div className="tarjeta-resumen">
                    <span>Activas</span>
                    <strong>
                        {totalActivas}
                    </strong>
                </div>

                <div className="tarjeta-resumen">
                    <span>Finalizadas</span>
                    <strong>
                        {totalFinalizadas}
                    </strong>
                </div>

                <div className="tarjeta-resumen">
                    <span>Canceladas</span>
                    <strong>
                        {totalCanceladas}
                    </strong>
                </div>
            </div>

            <div className="asignaciones-contenedor">
                <div className="asignaciones-filtros">
                    <div className="grupo-filtro">
                        <label htmlFor="buscar-asignacion">
                            Buscar
                        </label>

                        <input
                            id="buscar-asignacion"
                            type="search"
                            placeholder="OT, cliente, técnico o responsable"
                            value={busqueda}
                            onChange={(evento) =>
                                setBusqueda(
                                    evento.target.value
                                )
                            }
                        />
                    </div>

                    <div className="grupo-filtro">
                        <label htmlFor="estado-asignacion">
                            Estado
                        </label>

                        <select
                            id="estado-asignacion"
                            value={
                                estadoSeleccionado
                            }
                            onChange={(evento) =>
                                setEstadoSeleccionado(
                                    evento.target.value
                                )
                            }
                        >
                            <option value="TODOS">
                                Todos
                            </option>

                            {estadosDisponibles.map(
                                (estado) => (
                                    <option
                                        key={estado}
                                        value={estado}
                                    >
                                        {mostrarEstado(
                                            estado
                                        )}
                                    </option>
                                )
                            )}
                        </select>
                    </div>
                </div>

                {cargando && (
                    <div className="estado-asignaciones">
                        Cargando asignaciones...
                    </div>
                )}

                {!cargando &&
                    asignaciones.length >
                        0 && (
                        <>
                            <div className="tabla-asignaciones-contenedor">
                                <table className="tabla-asignaciones">
                                    <thead>
                                        <tr>
                                            <th>OT</th>
                                            <th>Cliente</th>
                                            <th>Agenda</th>
                                            <th>Técnico</th>
                                            <th>Tipo</th>
                                            <th>Estado</th>
                                            <th>Estado interno</th>
                                            <th>Responsable</th>
                                            <th>Rol</th>
                                            <th>Fecha</th>

                                            {puedeGestionar && (
                                                <th>
                                                    Acciones
                                                </th>
                                            )}
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {asignacionesVisibles.map(
                                            (
                                                asignacion
                                            ) => {
                                                const activa =
                                                    normalizarTexto(
                                                        asignacion.EstadoAsignacion
                                                    ) ===
                                                    "ACTIVA";

                                                return (
                                                    <tr
                                                        key={
                                                            asignacion.IdAsignacion
                                                        }
                                                    >
                                                        <td>
                                                            <strong className="codigo-ot-asignacion">
                                                                {
                                                                    asignacion.CodigoOT
                                                                }
                                                            </strong>

                                                            <small>
                                                                ID:{" "}
                                                                {
                                                                    asignacion.IdAsignacion
                                                                }
                                                            </small>
                                                        </td>

                                                        <td>
                                                            <strong>
                                                                {asignacion.Cliente ||
                                                                    "Sin cliente"}
                                                            </strong>

                                                            <small>
                                                                {asignacion.Distrito ||
                                                                    "Sin distrito"}
                                                            </small>
                                                        </td>

                                                        <td>
                                                            {formatearFecha(
                                                                asignacion.FechaAgenda
                                                            )}

                                                            <small>
                                                                {asignacion.Horario ||
                                                                    "Sin horario"}
                                                            </small>
                                                        </td>

                                                        <td>
                                                            <strong>
                                                                {asignacion.Tecnico ||
                                                                    "Sin técnico"}
                                                            </strong>

                                                            <small>
                                                                {asignacion.CodigoTecnico ||
                                                                    "Sin código"}
                                                            </small>
                                                        </td>

                                                        <td>
                                                            {mostrarEstado(
                                                                asignacion.TipoAsignacion ||
                                                                "Sin tipo"
                                                            )}
                                                        </td>

                                                        <td>
                                                            <span
                                                                className={`badge-asignacion ${obtenerClaseEstado(
                                                                    asignacion.EstadoAsignacion
                                                                )}`}
                                                            >
                                                                {mostrarEstado(
                                                                    asignacion.EstadoAsignacion
                                                                )}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            <span
                                                                className={`badge-asignacion ${obtenerClaseEstado(
                                                                    asignacion.EstadoInternoOT
                                                                )}`}
                                                            >
                                                                {mostrarEstado(
                                                                    asignacion.EstadoInternoOT
                                                                )}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            <strong>
                                                                {asignacion.UsuarioResponsable ||
                                                                    "Sin responsable"}
                                                            </strong>

                                                            <small>
                                                                {asignacion.NombreUsuarioResponsable
                                                                    ? `@${asignacion.NombreUsuarioResponsable}`
                                                                    : "Sin usuario"}
                                                            </small>
                                                        </td>

                                                        <td>
                                                            <span className="badge-rol-responsable">
                                                                {asignacion.RolResponsable ||
                                                                    "Sin rol"}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            {formatearFechaHora(
                                                                asignacion.FechaAsignacion
                                                            )}
                                                        </td>

                                                        {puedeGestionar && (
                                                            <td>
                                                                {activa ? (
                                                                    <div className="acciones-fila-asignacion">
                                                                        <button
                                                                            type="button"
                                                                            className="boton-reasignar"
                                                                            onClick={() =>
                                                                                abrirReasignacion(
                                                                                    asignacion
                                                                                )
                                                                            }
                                                                        >
                                                                            Reasignar
                                                                        </button>

                                                                        <button
                                                                            type="button"
                                                                            className="boton-cancelar-asignacion"
                                                                            onClick={() =>
                                                                                abrirCancelacion(
                                                                                    asignacion
                                                                                )
                                                                            }
                                                                        >
                                                                            Cancelar
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <span className="sin-acciones">
                                                                        Sin acciones
                                                                    </span>
                                                                )}
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            }
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="paginacion-asignaciones">
                                <span>
                                    Mostrando{" "}
                                    {indiceInicial + 1} a{" "}
                                    {Math.min(
                                        indiceFinal,
                                        asignacionesFiltradas.length
                                    )}{" "}
                                    de{" "}
                                    {
                                        asignacionesFiltradas.length
                                    }
                                </span>

                                <div className="botones-paginacion">
                                    <button
                                        type="button"
                                        disabled={
                                            paginaActual ===
                                            1
                                        }
                                        onClick={() =>
                                            setPaginaActual(
                                                (pagina) =>
                                                    pagina -
                                                    1
                                            )
                                        }
                                    >
                                        Anterior
                                    </button>

                                    <span>
                                        Página{" "}
                                        {paginaActual} de{" "}
                                        {totalPaginas}
                                    </span>

                                    <button
                                        type="button"
                                        disabled={
                                            paginaActual ===
                                            totalPaginas
                                        }
                                        onClick={() =>
                                            setPaginaActual(
                                                (pagina) =>
                                                    pagina +
                                                    1
                                            )
                                        }
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
            </div>

            {/* =====================================
                MODAL ASIGNACIÓN MANUAL
            ===================================== */}
            {modalManualAbierto && (
                <div className="modal-asignacion-fondo">
                    <div className="modal-asignacion">
                        <div className="modal-asignacion-encabezado">
                            <div>
                                <h2>
                                    Asignación manual
                                </h2>

                                <p>
                                    Seleccione una orden pendiente y el técnico responsable.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="boton-cerrar-modal"
                                onClick={
                                    cerrarAsignacionManual
                                }
                            >
                                ×
                            </button>
                        </div>

                        {cargandoOpciones ? (
                            <div className="estado-modal-asignacion">
                                Cargando opciones...
                            </div>
                        ) : (
                            <form
                                onSubmit={
                                    guardarAsignacionManual
                                }
                            >
                                {errorManual && (
                                    <div className="mensaje-modal-error">
                                        {errorManual}
                                    </div>
                                )}

                                <div className="campo-modal-asignacion">
                                    <label>
                                        Orden
                                    </label>

                                    <select
                                        value={
                                            idOrdenManual
                                        }
                                        onChange={(evento) =>
                                            setIdOrdenManual(
                                                evento.target.value
                                            )
                                        }
                                    >
                                        <option value="">
                                            Seleccione una orden
                                        </option>

                                        {ordenesManualesDisponibles.map(
                                            (orden) => (
                                                <option
                                                    key={
                                                        orden.IdOrden
                                                    }
                                                    value={
                                                        orden.IdOrden
                                                    }
                                                >
                                                    OT{" "}
                                                    {
                                                        orden.CodigoOT
                                                    }
                                                    {" - "}
                                                    {
                                                        orden.Cliente
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>

                                    {ordenesSinAgenda >
                                        0 && (
                                        <small>
                                            {ordenesSinAgenda} orden(es) no tienen fecha u horario.
                                        </small>
                                    )}
                                </div>

                                {ordenManualSeleccionada && (
                                    <div className="detalle-seleccion-manual">
                                        <strong>
                                            OT{" "}
                                            {
                                                ordenManualSeleccionada.CodigoOT
                                            }
                                        </strong>

                                        <span>
                                            {
                                                ordenManualSeleccionada.Cliente
                                            }
                                        </span>

                                        <span>
                                            {formatearFecha(
                                                ordenManualSeleccionada.FechaAgenda
                                            )}
                                            {" · "}
                                            {
                                                ordenManualSeleccionada.Horario
                                            }
                                        </span>
                                    </div>
                                )}

                                <div className="campo-modal-asignacion">
                                    <label>
                                        Técnico
                                    </label>

                                    <select
                                        value={
                                            idTecnicoManual
                                        }
                                        onChange={(evento) =>
                                            setIdTecnicoManual(
                                                evento.target.value
                                            )
                                        }
                                    >
                                        <option value="">
                                            Seleccione un técnico
                                        </option>

                                        {opcionesManuales.tecnicos.map(
                                            (tecnico) => (
                                                <option
                                                    key={
                                                        tecnico.IdTecnico
                                                    }
                                                    value={
                                                        tecnico.IdTecnico
                                                    }
                                                >
                                                    {
                                                        tecnico.NombreCompleto
                                                    }
                                                    {" - "}
                                                    {
                                                        tecnico.CodigoTecnico
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>

                                {tecnicoManualSeleccionado && (
                                    <div className="detalle-seleccion-manual">
                                        <strong>
                                            {
                                                tecnicoManualSeleccionado.NombreCompleto
                                            }
                                        </strong>

                                        <span>
                                            Distrito base:{" "}
                                            {
                                                tecnicoManualSeleccionado.DistritoBase
                                            }
                                        </span>

                                        <span>
                                            Capacidad máxima:{" "}
                                            {
                                                tecnicoManualSeleccionado.CapacidadMaxima
                                            }
                                        </span>
                                    </div>
                                )}

                                <div className="modal-asignacion-acciones">
                                    <button
                                        type="button"
                                        className="boton-cancelar-manual"
                                        onClick={
                                            cerrarAsignacionManual
                                        }
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        type="submit"
                                        className="boton-guardar-manual"
                                        disabled={
                                            guardandoManual ||
                                            !idOrdenManual ||
                                            !idTecnicoManual
                                        }
                                    >
                                        {guardandoManual
                                            ? "Asignando..."
                                            : "Confirmar asignación"}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* =====================================
                MODAL REASIGNAR
            ===================================== */}
            {modalReasignarAbierto &&
                asignacionReasignar && (
                    <div className="modal-asignacion-fondo">
                        <div className="modal-asignacion">
                            <div className="modal-asignacion-encabezado">
                                <div>
                                    <h2>
                                        Reasignar orden
                                    </h2>

                                    <p>
                                        Cambie el técnico responsable de la OT.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    className="boton-cerrar-modal"
                                    onClick={
                                        cerrarReasignacion
                                    }
                                >
                                    ×
                                </button>
                            </div>

                            <form
                                onSubmit={
                                    guardarReasignacion
                                }
                            >
                                {errorReasignacion && (
                                    <div className="mensaje-modal-error">
                                        {errorReasignacion}
                                    </div>
                                )}

                                <div className="detalle-seleccion-manual">
                                    <strong>
                                        OT{" "}
                                        {
                                            asignacionReasignar.CodigoOT
                                        }
                                    </strong>

                                    <span>
                                        Técnico actual:{" "}
                                        {
                                            asignacionReasignar.Tecnico
                                        }
                                    </span>

                                    <span>
                                        Agenda:{" "}
                                        {formatearFecha(
                                            asignacionReasignar.FechaAgenda
                                        )}
                                        {" · "}
                                        {
                                            asignacionReasignar.Horario
                                        }
                                    </span>
                                </div>

                                <div className="campo-modal-asignacion">
                                    <label>
                                        Nuevo técnico
                                    </label>

                                    <select
                                        value={
                                            idTecnicoReasignar
                                        }
                                        onChange={(evento) =>
                                            setIdTecnicoReasignar(
                                                evento.target.value
                                            )
                                        }
                                        disabled={
                                            cargandoOpciones
                                        }
                                    >
                                        <option value="">
                                            Seleccione un técnico
                                        </option>

                                        {tecnicosReasignacion.map(
                                            (tecnico) => (
                                                <option
                                                    key={
                                                        tecnico.IdTecnico
                                                    }
                                                    value={
                                                        tecnico.IdTecnico
                                                    }
                                                >
                                                    {
                                                        tecnico.NombreCompleto
                                                    }
                                                    {" - "}
                                                    {
                                                        tecnico.CodigoTecnico
                                                    }
                                                    {" - Cap. "}
                                                    {
                                                        tecnico.CapacidadMaxima
                                                    }
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>

                                <div className="campo-modal-asignacion">
                                    <label>
                                        Motivo
                                    </label>

                                    <textarea
                                        rows="4"
                                        maxLength="350"
                                        placeholder="Ejemplo: técnico no disponible en la zona."
                                        value={
                                            motivoReasignar
                                        }
                                        onChange={(evento) =>
                                            setMotivoReasignar(
                                                evento.target.value
                                            )
                                        }
                                    />

                                    <small>
                                        {motivoReasignar.length}/350 caracteres
                                    </small>
                                </div>

                                <div className="modal-asignacion-acciones">
                                    <button
                                        type="button"
                                        className="boton-cancelar-manual"
                                        onClick={
                                            cerrarReasignacion
                                        }
                                    >
                                        Cancelar
                                    </button>

                                    <button
                                        type="submit"
                                        className="boton-guardar-manual"
                                        disabled={
                                            guardandoReasignacion ||
                                            !idTecnicoReasignar ||
                                            motivoReasignar.trim()
                                                .length <
                                                5
                                        }
                                    >
                                        {guardandoReasignacion
                                            ? "Reasignando..."
                                            : "Confirmar reasignación"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

            {/* =====================================
                MODAL CANCELAR
            ===================================== */}
            {modalCancelarAbierto &&
                asignacionCancelar && (
                    <div className="modal-asignacion-fondo">
                        <div className="modal-asignacion modal-cancelacion">
                            <div className="modal-asignacion-encabezado">
                                <div>
                                    <h2>
                                        Cancelar asignación
                                    </h2>

                                    <p>
                                        La OT volverá al estado pendiente.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    className="boton-cerrar-modal"
                                    onClick={
                                        cerrarCancelacion
                                    }
                                >
                                    ×
                                </button>
                            </div>

                            <form
                                onSubmit={
                                    guardarCancelacion
                                }
                            >
                                {errorCancelacion && (
                                    <div className="mensaje-modal-error">
                                        {errorCancelacion}
                                    </div>
                                )}

                                <div className="detalle-cancelacion">
                                    <strong>
                                        OT{" "}
                                        {
                                            asignacionCancelar.CodigoOT
                                        }
                                    </strong>

                                    <span>
                                        Técnico:{" "}
                                        {
                                            asignacionCancelar.Tecnico
                                        }
                                    </span>
                                </div>

                                <div className="campo-modal-asignacion">
                                    <label>
                                        Motivo de cancelación
                                    </label>

                                    <textarea
                                        rows="4"
                                        maxLength="350"
                                        placeholder="Indique el motivo de la cancelación."
                                        value={
                                            motivoCancelar
                                        }
                                        onChange={(evento) =>
                                            setMotivoCancelar(
                                                evento.target.value
                                            )
                                        }
                                    />

                                    <small>
                                        {motivoCancelar.length}/350 caracteres
                                    </small>
                                </div>

                                <div className="modal-asignacion-acciones">
                                    <button
                                        type="button"
                                        className="boton-cancelar-manual"
                                        onClick={
                                            cerrarCancelacion
                                        }
                                    >
                                        Volver
                                    </button>

                                    <button
                                        type="submit"
                                        className="boton-confirmar-cancelacion"
                                        disabled={
                                            guardandoCancelacion ||
                                            motivoCancelar.trim()
                                                .length <
                                                5
                                        }
                                    >
                                        {guardandoCancelacion
                                            ? "Cancelando..."
                                            : "Cancelar asignación"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
        </section>
    );
}

export default AsignacionesPage;