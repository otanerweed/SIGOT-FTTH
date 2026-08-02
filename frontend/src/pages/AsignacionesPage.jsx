import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";

import {
    ejecutarAsignacionAutomatica,
    ejecutarAsignacionManual,
    obtenerAsignaciones,
    obtenerOpcionesAsignacionManual
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

    const puedeEjecutarAsignacion = [
        "Administrador",
        "Coordinador"
    ].includes(usuario?.Rol || "");

    const [asignaciones, setAsignaciones] =
        useState([]);

    const [busqueda, setBusqueda] =
        useState("");

    const [
        estadoSeleccionado,
        setEstadoSeleccionado
    ] = useState("TODOS");

    const [paginaActual, setPaginaActual] =
        useState(1);

    const [cargando, setCargando] =
        useState(true);

    const [ejecutando, setEjecutando] =
        useState(false);

    const [mensaje, setMensaje] =
        useState("");

    const [error, setError] =
        useState("");

    const [resumenProceso, setResumenProceso] =
        useState(null);

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
    // EJECUTAR ASIGNACIÓN AUTOMÁTICA
    // =====================================
    async function ejecutarAsignacion() {
        if (!puedeEjecutarAsignacion) {
            setError(
                "No tiene permisos para ejecutar la asignación automática."
            );

            return;
        }

        const confirmado = window.confirm(
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
    // ABRIR ASIGNACIÓN MANUAL
    // =====================================
    async function abrirAsignacionManual() {
        if (!puedeEjecutarAsignacion) {
            setError(
                "No tiene permisos para realizar asignaciones manuales."
            );

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
            console.error(
                "Error al cargar opciones manuales:",
                errorPeticion
            );

            setErrorManual(
                errorPeticion.response?.data?.mensaje ||
                    "No se pudieron cargar las órdenes y técnicos disponibles."
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

        const idOrden = Number(
            idOrdenManual
        );

        const idTecnico = Number(
            idTecnicoManual
        );

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
            console.error(
                "Error al registrar la asignación manual:",
                errorPeticion
            );

            setErrorManual(
                errorPeticion.response?.data?.mensaje ||
                    "No se pudo registrar la asignación manual."
            );
        } finally {
            setGuardandoManual(false);
        }
    }

    // =====================================
    // OPCIONES VÁLIDAS DEL MODAL
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
            return opcionesManuales.ordenes.find(
                (orden) =>
                    Number(
                        orden.IdOrden
                    ) ===
                    Number(
                        idOrdenManual
                    )
            ) || null;
        }, [
            opcionesManuales.ordenes,
            idOrdenManual
        ]);

    const tecnicoManualSeleccionado =
        useMemo(() => {
            return opcionesManuales.tecnicos.find(
                (tecnico) =>
                    Number(
                        tecnico.IdTecnico
                    ) ===
                    Number(
                        idTecnicoManual
                    )
            ) || null;
        }, [
            opcionesManuales.tecnicos,
            idTecnicoManual
        ]);

    // =====================================
    // ESTADOS DISPONIBLES
    // =====================================
    const estadosDisponibles =
        useMemo(() => {
            const estados = asignaciones
                .map((asignacion) =>
                    normalizarTexto(
                        asignacion.EstadoAsignacion
                    )
                )
                .filter(Boolean);

            return [
                ...new Set(estados)
            ].sort();
        }, [asignaciones]);

    // =====================================
    // FILTRAR ASIGNACIONES
    // =====================================
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
    const totalPaginas = Math.max(
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
        (paginaActual - 1) *
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
                        {puedeEjecutarAsignacion
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

                    {puedeEjecutarAsignacion && (
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
                puedeEjecutarAsignacion && (
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
                    <span>
                        Total
                    </span>

                    <strong>
                        {asignaciones.length}
                    </strong>
                </div>

                <div className="tarjeta-resumen">
                    <span>
                        Activas
                    </span>

                    <strong>
                        {totalActivas}
                    </strong>
                </div>

                <div className="tarjeta-resumen">
                    <span>
                        Finalizadas
                    </span>

                    <strong>
                        {totalFinalizadas}
                    </strong>
                </div>

                <div className="tarjeta-resumen">
                    <span>
                        Canceladas
                    </span>

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
                    !error &&
                    asignaciones.length ===
                        0 && (
                        <div className="estado-asignaciones">
                            No existen asignaciones registradas.
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
                                            <th>Actividad OFSC</th>
                                            <th>Responsable</th>
                                            <th>Rol</th>
                                            <th>Fecha asignación</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {asignacionesVisibles.length >
                                        0 ? (
                                            asignacionesVisibles.map(
                                                (
                                                    asignacion
                                                ) => (
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
                                                            <div>
                                                                {formatearFecha(
                                                                    asignacion.FechaAgenda
                                                                )}
                                                            </div>

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
                                                                    asignacion.EstadoAsignacion ||
                                                                        "Sin estado"
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
                                                                    asignacion.EstadoInternoOT ||
                                                                        "Sin estado"
                                                                )}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            <div>
                                                                {mostrarEstado(
                                                                    asignacion.EstadoActividad ||
                                                                        "Sin actividad"
                                                                )}
                                                            </div>

                                                            <small>
                                                                {asignacion.IdActividadOFSC
                                                                    ? `ID: ${asignacion.IdActividadOFSC}`
                                                                    : "Sin vínculo OFSC"}
                                                            </small>
                                                        </td>

                                                        <td>
                                                            <strong className="responsable-asignacion">
                                                                {asignacion.UsuarioResponsable ||
                                                                    "Sin responsable"}
                                                            </strong>

                                                            <small className="usuario-responsable">
                                                                {asignacion.NombreUsuarioResponsable
                                                                    ? `@${asignacion.NombreUsuarioResponsable}`
                                                                    : asignacion.IdUsuario
                                                                      ? `ID usuario: ${asignacion.IdUsuario}`
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
                                                    </tr>
                                                )
                                            )
                                        ) : (
                                            <tr>
                                                <td
                                                    colSpan="11"
                                                    className="sin-resultados-asignaciones"
                                                >
                                                    No se encontraron asignaciones con los filtros seleccionados.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {asignacionesFiltradas.length >
                                0 && (
                                <div className="paginacion-asignaciones">
                                    <span>
                                        Mostrando{" "}
                                        {indiceInicial +
                                            1}{" "}
                                        a{" "}
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
                                                    (
                                                        pagina
                                                    ) =>
                                                        pagina -
                                                        1
                                                )
                                            }
                                        >
                                            Anterior
                                        </button>

                                        <span>
                                            Página{" "}
                                            {
                                                paginaActual
                                            }{" "}
                                            de{" "}
                                            {
                                                totalPaginas
                                            }
                                        </span>

                                        <button
                                            type="button"
                                            disabled={
                                                paginaActual ===
                                                totalPaginas
                                            }
                                            onClick={() =>
                                                setPaginaActual(
                                                    (
                                                        pagina
                                                    ) =>
                                                        pagina +
                                                        1
                                                )
                                            }
                                        >
                                            Siguiente
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
            </div>

            {modalManualAbierto && (
                <div
                    className="modal-asignacion-fondo"
                    role="presentation"
                    onMouseDown={(evento) => {
                        if (
                            evento.target ===
                            evento.currentTarget
                        ) {
                            cerrarAsignacionManual();
                        }
                    }}
                >
                    <div
                        className="modal-asignacion"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="titulo-asignacion-manual"
                    >
                        <div className="modal-asignacion-encabezado">
                            <div>
                                <h2 id="titulo-asignacion-manual">
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
                                disabled={
                                    guardandoManual
                                }
                                aria-label="Cerrar"
                            >
                                ×
                            </button>
                        </div>

                        {cargandoOpciones ? (
                            <div className="estado-modal-asignacion">
                                Cargando órdenes y técnicos...
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
                                    <label htmlFor="orden-manual">
                                        Orden pendiente
                                    </label>

                                    <select
                                        id="orden-manual"
                                        value={
                                            idOrdenManual
                                        }
                                        onChange={(evento) =>
                                            setIdOrdenManual(
                                                evento.target.value
                                            )
                                        }
                                        disabled={
                                            guardandoManual
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
                                                    {orden.Cliente ||
                                                        "Sin cliente"}
                                                    {" - "}
                                                    {formatearFecha(
                                                        orden.FechaAgenda
                                                    )}
                                                    {" "}
                                                    {orden.Horario}
                                                </option>
                                            )
                                        )}
                                    </select>

                                    <small>
                                        {ordenesManualesDisponibles.length} orden(es) con fecha y horario disponibles.
                                    </small>

                                    {ordenesSinAgenda >
                                        0 && (
                                        <small className="aviso-modal-asignacion">
                                            {ordenesSinAgenda} orden(es) pendientes no aparecen porque no tienen fecha u horario.
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
                                            {ordenManualSeleccionada.Cliente ||
                                                "Sin cliente"}
                                        </span>

                                        <span>
                                            {ordenManualSeleccionada.Direccion ||
                                                "Sin dirección"}
                                        </span>

                                        <span>
                                            {ordenManualSeleccionada.Distrito ||
                                                "Sin distrito"}
                                            {" · "}
                                            {formatearFecha(
                                                ordenManualSeleccionada.FechaAgenda
                                            )}
                                            {" · "}
                                            {ordenManualSeleccionada.Horario}
                                        </span>
                                    </div>
                                )}

                                <div className="campo-modal-asignacion">
                                    <label htmlFor="tecnico-manual">
                                        Técnico
                                    </label>

                                    <select
                                        id="tecnico-manual"
                                        value={
                                            idTecnicoManual
                                        }
                                        onChange={(evento) =>
                                            setIdTecnicoManual(
                                                evento.target.value
                                            )
                                        }
                                        disabled={
                                            guardandoManual
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
                                                    {" - "}
                                                    {tecnico.DistritoBase ||
                                                        "Sin distrito"}
                                                    {" - Cap. "}
                                                    {tecnico.CapacidadMaxima ??
                                                        0}
                                                </option>
                                            )
                                        )}
                                    </select>

                                    <small>
                                        La capacidad del técnico será validada para la fecha y turno de la OT.
                                    </small>
                                </div>

                                {tecnicoManualSeleccionado && (
                                    <div className="detalle-seleccion-manual">
                                        <strong>
                                            {
                                                tecnicoManualSeleccionado.NombreCompleto
                                            }
                                        </strong>

                                        <span>
                                            Código:{" "}
                                            {
                                                tecnicoManualSeleccionado.CodigoTecnico
                                            }
                                        </span>

                                        <span>
                                            Tipo:{" "}
                                            {tecnicoManualSeleccionado.TipoTecnico ||
                                                "Sin tipo"}
                                        </span>

                                        <span>
                                            Distrito base:{" "}
                                            {tecnicoManualSeleccionado.DistritoBase ||
                                                "Sin distrito"}
                                            {" · Capacidad máxima: "}
                                            {tecnicoManualSeleccionado.CapacidadMaxima ??
                                                0}
                                        </span>
                                    </div>
                                )}

                                {ordenesManualesDisponibles.length ===
                                    0 && (
                                    <div className="mensaje-modal-informativo">
                                        No existen órdenes pendientes con fecha y horario para asignar.
                                    </div>
                                )}

                                {opcionesManuales.tecnicos.length ===
                                    0 && (
                                    <div className="mensaje-modal-informativo">
                                        No existen técnicos activos y disponibles.
                                    </div>
                                )}

                                <div className="modal-asignacion-acciones">
                                    <button
                                        type="button"
                                        className="boton-cancelar-manual"
                                        onClick={
                                            cerrarAsignacionManual
                                        }
                                        disabled={
                                            guardandoManual
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
                                            !idTecnicoManual ||
                                            ordenesManualesDisponibles.length ===
                                                0 ||
                                            opcionesManuales.tecnicos.length ===
                                                0
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
        </section>
    );
}

export default AsignacionesPage;