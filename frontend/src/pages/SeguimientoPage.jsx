import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";

import {
    obtenerSeguimientos
} from "../services/seguimientoService";

import "./SeguimientoPage.css";

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

function mostrarTexto(valor) {
    return obtenerTexto(valor)
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
        return "Sin fecha";
    }

    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
        return obtenerTexto(valor);
    }

    return fecha.toLocaleString(
        "es-PE"
    );
}

function obtenerClaseEvento(evento) {
    const valor =
        normalizarTexto(evento);

    if (
        valor === "ASIGNACION"
    ) {
        return "seguimiento-evento-asignacion";
    }

    if (
        valor === "INICIO_RUTA"
    ) {
        return "seguimiento-evento-ruta";
    }

    if (
        valor === "INICIO"
    ) {
        return "seguimiento-evento-inicio";
    }

    if (
        valor === "SUSPENSION"
    ) {
        return "seguimiento-evento-suspension";
    }

    if (
        valor === "FINALIZACION"
    ) {
        return "seguimiento-evento-finalizacion";
    }

    if (
        valor === "CANCELACION"
    ) {
        return "seguimiento-evento-cancelacion";
    }

    return "seguimiento-evento-neutro";
}

function SeguimientoPage() {
    const [
        seguimientos,
        setSeguimientos
    ] = useState([]);

    const [
        busqueda,
        setBusqueda
    ] = useState("");

    const [
        eventoSeleccionado,
        setEventoSeleccionado
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
        error,
        setError
    ] = useState("");

    // =====================================
    // CARGAR SEGUIMIENTOS
    // =====================================
    const cargarSeguimientos =
        useCallback(async () => {
            try {
                setCargando(true);
                setError("");

                const data =
                    await obtenerSeguimientos();

                setSeguimientos(
                    Array.isArray(data)
                        ? data
                        : []
                );
            } catch (
                errorPeticion
            ) {
                console.error(
                    "Error al cargar seguimientos:",
                    errorPeticion
                );

                setError(
                    errorPeticion
                        .response
                        ?.data
                        ?.mensaje ||
                    "No se pudo cargar el seguimiento de las órdenes."
                );
            } finally {
                setCargando(false);
            }
        }, []);

    useEffect(() => {
        cargarSeguimientos();
    }, [cargarSeguimientos]);

    // =====================================
    // EVENTOS DISPONIBLES
    // =====================================
    const eventosDisponibles =
        useMemo(() => {
            const eventos =
                seguimientos
                    .map(
                        (item) =>
                            normalizarTexto(
                                item.Evento
                            )
                    )
                    .filter(
                        Boolean
                    );

            return [
                ...new Set(eventos)
            ].sort();
        }, [seguimientos]);

    // =====================================
    // FILTRAR
    // =====================================
    const seguimientosFiltrados =
        useMemo(() => {
            const textoBusqueda =
                normalizarTexto(
                    busqueda
                );

            return seguimientos.filter(
                (item) => {
                    const evento =
                        normalizarTexto(
                            item.Evento
                        );

                    const cumpleEvento =
                        eventoSeleccionado ===
                            "TODOS" ||
                        evento ===
                            eventoSeleccionado;

                    const contenido =
                        normalizarTexto(
                            [
                                item.CodigoOT,
                                item.Cliente,
                                item.Distrito,
                                item.Tecnico,
                                item.CodigoTecnico,
                                item.Evento,
                                item.EstadoAnterior,
                                item.EstadoNuevo,
                                item.Comentario,
                                item.UsuarioResponsable,
                                item.NombreUsuarioResponsable,
                                item.RolResponsable
                            ].join(" ")
                        );

                    const cumpleBusqueda =
                        textoBusqueda ===
                            "" ||
                        contenido.includes(
                            textoBusqueda
                        );

                    return (
                        cumpleEvento &&
                        cumpleBusqueda
                    );
                }
            );
        }, [
            seguimientos,
            busqueda,
            eventoSeleccionado
        ]);

    useEffect(() => {
        setPaginaActual(1);
    }, [
        busqueda,
        eventoSeleccionado
    ]);

    // =====================================
    // PAGINACIÓN
    // =====================================
    const totalPaginas =
        Math.max(
            1,
            Math.ceil(
                seguimientosFiltrados.length /
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

    const seguimientosVisibles =
        seguimientosFiltrados.slice(
            indiceInicial,
            indiceFinal
        );

    return (
        <section className="seguimiento-page">
            <header className="seguimiento-encabezado">
                <div>
                    <h1>
                        Seguimiento de OT
                    </h1>

                    <p>
                        Consulte la línea de tiempo operativa
                        de las asignaciones y los eventos
                        registrados durante la atención de
                        las órdenes.
                    </p>
                </div>

                <button
                    type="button"
                    className="seguimiento-boton-actualizar"
                    onClick={
                        cargarSeguimientos
                    }
                    disabled={
                        cargando
                    }
                >
                    {cargando
                        ? "Actualizando..."
                        : "Actualizar"}
                </button>
            </header>

            {/* =====================================
                RESUMEN
            ===================================== */}
            <div className="seguimiento-resumen">
                <div className="seguimiento-tarjeta">
                    <span>
                        Total de eventos
                    </span>

                    <strong>
                        {seguimientos.length}
                    </strong>
                </div>

                <div className="seguimiento-tarjeta">
                    <span>
                        Resultados
                    </span>

                    <strong>
                        {seguimientosFiltrados.length}
                    </strong>
                </div>
            </div>

            <div className="seguimiento-contenedor">
                {/* =====================================
                    FILTROS
                ===================================== */}
                <div className="seguimiento-filtros">
                    <div className="seguimiento-grupo-filtro">
                        <label htmlFor="buscar-seguimiento">
                            Buscar
                        </label>

                        <input
                            id="buscar-seguimiento"
                            type="search"
                            placeholder="OT, cliente, técnico, evento o responsable"
                            value={
                                busqueda
                            }
                            onChange={(evento) =>
                                setBusqueda(
                                    evento
                                        .target
                                        .value
                                )
                            }
                        />
                    </div>

                    <div className="seguimiento-grupo-filtro">
                        <label htmlFor="evento-seguimiento">
                            Evento
                        </label>

                        <select
                            id="evento-seguimiento"
                            value={
                                eventoSeleccionado
                            }
                            onChange={(evento) =>
                                setEventoSeleccionado(
                                    evento
                                        .target
                                        .value
                                )
                            }
                        >
                            <option value="TODOS">
                                Todos
                            </option>

                            {eventosDisponibles.map(
                                (evento) => (
                                    <option
                                        key={
                                            evento
                                        }
                                        value={
                                            evento
                                        }
                                    >
                                        {mostrarTexto(
                                            evento
                                        )}
                                    </option>
                                )
                            )}
                        </select>
                    </div>
                </div>

                {cargando && (
                    <div className="seguimiento-estado">
                        Cargando seguimiento...
                    </div>
                )}

                {!cargando &&
                    error && (
                        <div className="seguimiento-error">
                            {error}
                        </div>
                    )}

                {!cargando &&
                    !error &&
                    seguimientos.length ===
                        0 && (
                        <div className="seguimiento-estado">
                            No existen eventos de seguimiento.
                        </div>
                    )}

                {!cargando &&
                    !error &&
                    seguimientos.length >
                        0 && (
                        <>
                            <div className="seguimiento-tabla-contenedor">
                                <table className="seguimiento-tabla">
                                    <thead>
                                        <tr>
                                            <th>
                                                Fecha
                                            </th>

                                            <th>
                                                OT
                                            </th>

                                            <th>
                                                Cliente
                                            </th>

                                            <th>
                                                Técnico
                                            </th>

                                            <th>
                                                Evento
                                            </th>

                                            <th>
                                                Cambio
                                            </th>

                                            <th>
                                                Responsable
                                            </th>

                                            <th>
                                                Evidencias
                                            </th>

                                            <th>
                                                Comentario
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {seguimientosVisibles.length >
                                        0 ? (
                                            seguimientosVisibles.map(
                                                (
                                                    item
                                                ) => (
                                                    <tr
                                                        key={
                                                            item.IdSeguimiento
                                                        }
                                                    >
                                                        <td className="seguimiento-fecha">
                                                            {formatearFechaHora(
                                                                item.FechaEvento
                                                            )}
                                                        </td>

                                                        <td>
                                                            <strong className="seguimiento-codigo-ot">
                                                                {item.CodigoOT ||
                                                                    "Sin OT"}
                                                            </strong>

                                                            <small>
                                                                {formatearFecha(
                                                                    item.FechaAgenda
                                                                )}
                                                                {" · "}
                                                                {item.Horario ||
                                                                    "Sin horario"}
                                                            </small>
                                                        </td>

                                                        <td>
                                                            <strong>
                                                                {item.Cliente ||
                                                                    "Sin cliente"}
                                                            </strong>

                                                            <small>
                                                                {item.Distrito ||
                                                                    "Sin distrito"}
                                                            </small>
                                                        </td>

                                                        <td>
                                                            <strong>
                                                                {item.Tecnico ||
                                                                    "Sin técnico"}
                                                            </strong>

                                                            <small>
                                                                {item.CodigoTecnico ||
                                                                    ""}
                                                            </small>
                                                        </td>

                                                        <td>
                                                            <span
                                                                className={`seguimiento-badge-evento ${obtenerClaseEvento(
                                                                    item.Evento
                                                                )}`}
                                                            >
                                                                {mostrarTexto(
                                                                    item.Evento ||
                                                                    "SIN EVENTO"
                                                                )}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            <div className="seguimiento-cambio">
                                                                <span>
                                                                    {mostrarTexto(
                                                                        item.EstadoAnterior ||
                                                                        "Sin estado anterior"
                                                                    )}
                                                                </span>

                                                                <strong>
                                                                    →
                                                                </strong>

                                                                <span>
                                                                    {mostrarTexto(
                                                                        item.EstadoNuevo ||
                                                                        "Sin estado nuevo"
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        <td>
                                                            <strong className="seguimiento-responsable">
                                                                {item.UsuarioResponsable ||
                                                                    "Sin responsable"}
                                                            </strong>

                                                            <small>
                                                                {item.NombreUsuarioResponsable
                                                                    ? `@${item.NombreUsuarioResponsable}`
                                                                    : item.IdUsuario
                                                                      ? `ID usuario: ${item.IdUsuario}`
                                                                      : "Sin usuario"}
                                                            </small>

                                                            <small>
                                                                {item.RolResponsable ||
                                                                    "Sin rol"}
                                                            </small>
                                                        </td>

                                                        <td>
                                                            <span className="seguimiento-evidencias">
                                                                {Number(
                                                                    item.CantidadEvidencias ??
                                                                    0
                                                                )}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            <div className="seguimiento-comentario">
                                                                {item.Comentario ||
                                                                    "Sin comentario"}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            )
                                        ) : (
                                            <tr>
                                                <td
                                                    colSpan="9"
                                                    className="seguimiento-sin-resultados"
                                                >
                                                    No se encontraron eventos con los filtros seleccionados.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {seguimientosFiltrados.length >
                                0 && (
                                <div className="seguimiento-paginacion">
                                    <span>
                                        Mostrando{" "}
                                        {indiceInicial +
                                            1}{" "}
                                        a{" "}
                                        {Math.min(
                                            indiceFinal,
                                            seguimientosFiltrados.length
                                        )}{" "}
                                        de{" "}
                                        {
                                            seguimientosFiltrados.length
                                        }
                                    </span>

                                    <div className="seguimiento-botones-paginacion">
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
        </section>
    );
}

export default SeguimientoPage;