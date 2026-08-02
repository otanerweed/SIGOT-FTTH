import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";

import api from "../services/api";

import "./AuditoriaPage.css";

const REGISTROS_POR_PAGINA = 12;

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

function obtenerClaseTipo(tipo) {
    const valor =
        normalizarTexto(tipo);

    if (valor === "IMPORTACION") {
        return "auditoria-tipo-importacion";
    }

    if (valor === "ASIGNACION") {
        return "auditoria-tipo-asignacion";
    }

    if (valor === "CAMBIO_ESTADO") {
        return "auditoria-tipo-estado";
    }

    return "auditoria-tipo-neutro";
}

function AuditoriaPage() {
    const [eventos, setEventos] =
        useState([]);

    const [busqueda, setBusqueda] =
        useState("");

    const [
        tipoSeleccionado,
        setTipoSeleccionado
    ] = useState("TODOS");

    const [
        usuarioSeleccionado,
        setUsuarioSeleccionado
    ] = useState("TODOS");

    const [paginaActual, setPaginaActual] =
        useState(1);

    const [cargando, setCargando] =
        useState(true);

    const [error, setError] =
        useState("");

    // =====================================
    // CARGAR AUDITORÍA
    // =====================================
    const cargarAuditoria =
        useCallback(async () => {
            try {
                setCargando(true);
                setError("");

                const respuesta =
                    await api.get(
                        "/auditoria"
                    );

                setEventos(
                    Array.isArray(
                        respuesta.data
                    )
                        ? respuesta.data
                        : []
                );
            } catch (errorPeticion) {
                console.error(
                    "Error al cargar auditoría:",
                    errorPeticion
                );

                setError(
                    errorPeticion.response?.data?.mensaje ||
                        "No se pudo cargar la auditoría general."
                );
            } finally {
                setCargando(false);
            }
        }, []);

    useEffect(() => {
        cargarAuditoria();
    }, [cargarAuditoria]);

    // =====================================
    // RESUMEN
    // =====================================
    const totalImportaciones =
        eventos.filter(
            (evento) =>
                normalizarTexto(
                    evento.TipoEvento
                ) === "IMPORTACION"
        ).length;

    const totalAsignaciones =
        eventos.filter(
            (evento) =>
                normalizarTexto(
                    evento.TipoEvento
                ) === "ASIGNACION"
        ).length;

    const totalCambiosEstado =
        eventos.filter(
            (evento) =>
                normalizarTexto(
                    evento.TipoEvento
                ) === "CAMBIO_ESTADO"
        ).length;

    // =====================================
    // USUARIOS DISPONIBLES
    // =====================================
    const usuariosDisponibles =
        useMemo(() => {
            const mapaUsuarios =
                new Map();

            eventos.forEach((evento) => {
                const usuario =
                    obtenerTexto(
                        evento.NombreUsuarioResponsable
                    );

                if (!usuario) {
                    return;
                }

                if (
                    !mapaUsuarios.has(usuario)
                ) {
                    mapaUsuarios.set(
                        usuario,
                        {
                            usuario,

                            nombre:
                                obtenerTexto(
                                    evento.UsuarioResponsable
                                ) ||
                                usuario
                        }
                    );
                }
            });

            return Array.from(
                mapaUsuarios.values()
            ).sort((a, b) =>
                a.nombre.localeCompare(
                    b.nombre,
                    "es"
                )
            );
        }, [eventos]);

    // =====================================
    // FILTRAR EVENTOS
    // =====================================
    const eventosFiltrados =
        useMemo(() => {
            const textoBusqueda =
                normalizarTexto(busqueda);

            return eventos.filter(
                (evento) => {
                    const tipo =
                        normalizarTexto(
                            evento.TipoEvento
                        );

                    const usuario =
                        obtenerTexto(
                            evento.NombreUsuarioResponsable
                        );

                    const cumpleTipo =
                        tipoSeleccionado ===
                            "TODOS" ||
                        tipo ===
                            tipoSeleccionado;

                    const cumpleUsuario =
                        usuarioSeleccionado ===
                            "TODOS" ||
                        usuario ===
                            usuarioSeleccionado;

                    const contenido =
                        normalizarTexto(
                            [
                                evento.TipoEvento,
                                evento.Modulo,
                                evento.Referencia,
                                evento.CodigoOT,
                                evento.Accion,
                                evento.Detalle,
                                evento.EstadoAnterior,
                                evento.EstadoNuevo,
                                evento.Fuente,
                                evento.UsuarioResponsable,
                                evento.NombreUsuarioResponsable,
                                evento.RolResponsable,
                                evento.NombreArchivo,
                                evento.Tecnico
                            ].join(" ")
                        );

                    const cumpleBusqueda =
                        textoBusqueda === "" ||
                        contenido.includes(
                            textoBusqueda
                        );

                    return (
                        cumpleTipo &&
                        cumpleUsuario &&
                        cumpleBusqueda
                    );
                }
            );
        }, [
            eventos,
            busqueda,
            tipoSeleccionado,
            usuarioSeleccionado
        ]);

    useEffect(() => {
        setPaginaActual(1);
    }, [
        busqueda,
        tipoSeleccionado,
        usuarioSeleccionado
    ]);

    // =====================================
    // PAGINACIÓN
    // =====================================
    const totalPaginas =
        Math.max(
            1,
            Math.ceil(
                eventosFiltrados.length /
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

    const eventosVisibles =
        eventosFiltrados.slice(
            indiceInicial,
            indiceFinal
        );

    function limpiarFiltros() {
        setBusqueda("");

        setTipoSeleccionado(
            "TODOS"
        );

        setUsuarioSeleccionado(
            "TODOS"
        );
    }

    return (
        <section className="auditoria-page">
            <header className="auditoria-encabezado">
                <div>
                    <h1>
                        Auditoría general
                    </h1>

                    <p>
                        Consulte las importaciones,
                        asignaciones y cambios de estado
                        realizados en el sistema.
                    </p>
                </div>

                <button
                    type="button"
                    className="auditoria-boton-actualizar"
                    onClick={
                        cargarAuditoria
                    }
                    disabled={cargando}
                >
                    {cargando
                        ? "Actualizando..."
                        : "Actualizar"}
                </button>
            </header>

            {error && (
                <div className="auditoria-mensaje-error">
                    {error}
                </div>
            )}

            <div className="auditoria-resumen">
                <div className="auditoria-tarjeta">
                    <span>
                        Total de eventos
                    </span>

                    <strong>
                        {eventos.length}
                    </strong>
                </div>

                <div className="auditoria-tarjeta">
                    <span>
                        Importaciones
                    </span>

                    <strong>
                        {totalImportaciones}
                    </strong>
                </div>

                <div className="auditoria-tarjeta">
                    <span>
                        Asignaciones
                    </span>

                    <strong>
                        {totalAsignaciones}
                    </strong>
                </div>

                <div className="auditoria-tarjeta">
                    <span>
                        Cambios de estado
                    </span>

                    <strong>
                        {totalCambiosEstado}
                    </strong>
                </div>
            </div>

            <div className="auditoria-contenedor">
                <div className="auditoria-filtros">
                    <div className="auditoria-grupo-filtro auditoria-busqueda">
                        <label htmlFor="buscar-auditoria">
                            Buscar
                        </label>

                        <input
                            id="buscar-auditoria"
                            type="search"
                            placeholder="OT, archivo, acción, técnico o responsable"
                            value={busqueda}
                            onChange={(evento) =>
                                setBusqueda(
                                    evento.target.value
                                )
                            }
                        />
                    </div>

                    <div className="auditoria-grupo-filtro">
                        <label htmlFor="tipo-auditoria">
                            Tipo de evento
                        </label>

                        <select
                            id="tipo-auditoria"
                            value={
                                tipoSeleccionado
                            }
                            onChange={(evento) =>
                                setTipoSeleccionado(
                                    evento.target.value
                                )
                            }
                        >
                            <option value="TODOS">
                                Todos
                            </option>

                            <option value="IMPORTACION">
                                Importación
                            </option>

                            <option value="ASIGNACION">
                                Asignación
                            </option>

                            <option value="CAMBIO_ESTADO">
                                Cambio de estado
                            </option>
                        </select>
                    </div>

                    <div className="auditoria-grupo-filtro">
                        <label htmlFor="usuario-auditoria">
                            Usuario
                        </label>

                        <select
                            id="usuario-auditoria"
                            value={
                                usuarioSeleccionado
                            }
                            onChange={(evento) =>
                                setUsuarioSeleccionado(
                                    evento.target.value
                                )
                            }
                        >
                            <option value="TODOS">
                                Todos
                            </option>

                            {usuariosDisponibles.map(
                                (item) => (
                                    <option
                                        key={
                                            item.usuario
                                        }
                                        value={
                                            item.usuario
                                        }
                                    >
                                        {item.nombre}
                                        {" ("}
                                        {item.usuario}
                                        {")"}
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    <button
                        type="button"
                        className="auditoria-boton-limpiar"
                        onClick={
                            limpiarFiltros
                        }
                    >
                        Limpiar filtros
                    </button>
                </div>

                {cargando && (
                    <div className="auditoria-estado">
                        Cargando auditoría...
                    </div>
                )}

                {!cargando &&
                    !error &&
                    eventos.length === 0 && (
                        <div className="auditoria-estado">
                            No existen eventos de auditoría.
                        </div>
                    )}

                {!cargando &&
                    eventos.length > 0 && (
                        <>
                            <div className="auditoria-tabla-contenedor">
                                <table className="auditoria-tabla">
                                    <thead>
                                        <tr>
                                            <th>
                                                Fecha
                                            </th>

                                            <th>
                                                Tipo
                                            </th>

                                            <th>
                                                Referencia
                                            </th>

                                            <th>
                                                Acción
                                            </th>

                                            <th>
                                                Cambio
                                            </th>

                                            <th>
                                                Responsable
                                            </th>

                                            <th>
                                                Rol
                                            </th>

                                            <th>
                                                Fuente
                                            </th>

                                            <th>
                                                Detalle
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {eventosVisibles.length >
                                        0 ? (
                                            eventosVisibles.map(
                                                (evento) => (
                                                    <tr
                                                        key={
                                                            evento.IdEvento
                                                        }
                                                    >
                                                        <td className="auditoria-fecha">
                                                            {formatearFechaHora(
                                                                evento.FechaEvento
                                                            )}
                                                        </td>

                                                        <td>
                                                            <span
                                                                className={`auditoria-badge-tipo ${obtenerClaseTipo(
                                                                    evento.TipoEvento
                                                                )}`}
                                                            >
                                                                {mostrarTexto(
                                                                    evento.TipoEvento
                                                                )}
                                                            </span>

                                                            <small>
                                                                {evento.Modulo ||
                                                                    "Sin módulo"}
                                                            </small>
                                                        </td>

                                                        <td>
                                                            <strong className="auditoria-referencia">
                                                                {evento.Referencia ||
                                                                    "Sin referencia"}
                                                            </strong>

                                                            {evento.NombreArchivo && (
                                                                <small>
                                                                    {
                                                                        evento.NombreArchivo
                                                                    }
                                                                </small>
                                                            )}
                                                        </td>

                                                        <td>
                                                            {mostrarTexto(
                                                                evento.Accion ||
                                                                    "Sin acción"
                                                            )}
                                                        </td>

                                                        <td>
                                                            <div className="auditoria-cambio">
                                                                <span>
                                                                    {mostrarTexto(
                                                                        evento.EstadoAnterior ||
                                                                            "Sin estado anterior"
                                                                    )}
                                                                </span>

                                                                <strong>
                                                                    →
                                                                </strong>

                                                                <span>
                                                                    {mostrarTexto(
                                                                        evento.EstadoNuevo ||
                                                                            "Sin estado nuevo"
                                                                    )}
                                                                </span>
                                                            </div>
                                                        </td>

                                                        <td>
                                                            <strong className="auditoria-responsable">
                                                                {evento.UsuarioResponsable ||
                                                                    "Sin responsable"}
                                                            </strong>

                                                            <small>
                                                                {evento.NombreUsuarioResponsable
                                                                    ? `@${evento.NombreUsuarioResponsable}`
                                                                    : evento.IdUsuario
                                                                      ? `ID usuario: ${evento.IdUsuario}`
                                                                      : "Sin usuario"}
                                                            </small>
                                                        </td>

                                                        <td>
                                                            <span className="auditoria-badge-rol">
                                                                {evento.RolResponsable ||
                                                                    "Sin rol"}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            {evento.Fuente ||
                                                                "Sin fuente"}
                                                        </td>

                                                        <td>
                                                            <div className="auditoria-detalle">
                                                                {evento.Detalle ||
                                                                    "Sin detalle"}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            )
                                        ) : (
                                            <tr>
                                                <td
                                                    colSpan="9"
                                                    className="auditoria-sin-resultados"
                                                >
                                                    No se encontraron eventos con los filtros seleccionados.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {eventosFiltrados.length >
                                0 && (
                                <div className="auditoria-paginacion">
                                    <span>
                                        Mostrando{" "}
                                        {indiceInicial +
                                            1}{" "}
                                        a{" "}
                                        {Math.min(
                                            indiceFinal,
                                            eventosFiltrados.length
                                        )}{" "}
                                        de{" "}
                                        {
                                            eventosFiltrados.length
                                        }
                                    </span>

                                    <div className="auditoria-botones-paginacion">
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

export default AuditoriaPage;