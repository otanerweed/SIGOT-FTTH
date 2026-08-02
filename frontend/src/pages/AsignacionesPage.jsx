import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";

import {
    ejecutarAsignacionAutomatica,
    obtenerAsignaciones
} from "../services/asignacionesService";

import {
    obtenerUsuario
} from "../services/authService";

import "./AsignacionesPage.css";

const REGISTROS_POR_PAGINA = 10;

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
    // FUNCIONES AUXILIARES
    // =====================================
    function obtenerTexto(valor) {
        return String(valor ?? "").trim();
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
        const valor = obtenerTexto(estado)
            .toUpperCase();

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
            "¿Desea ejecutar la asignación automática de las órdenes sin asignar?"
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
    // ESTADOS DISPONIBLES
    // =====================================
    const estadosDisponibles =
        useMemo(() => {
            const estados = asignaciones
                .map((asignacion) =>
                    obtenerTexto(
                        asignacion.EstadoAsignacion
                    ).toUpperCase()
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
            const textoBusqueda = busqueda
                .trim()
                .toLowerCase();

            return asignaciones.filter(
                (asignacion) => {
                    const estado =
                        obtenerTexto(
                            asignacion.EstadoAsignacion
                        ).toUpperCase();

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
                        asignacion.TipoAsignacion
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
    // RESUMEN DE ASIGNACIONES
    // =====================================
    const totalActivas =
        asignaciones.filter(
            (asignacion) =>
                obtenerTexto(
                    asignacion.EstadoAsignacion
                ).toUpperCase() === "ACTIVA"
        ).length;

    const totalFinalizadas =
        asignaciones.filter(
            (asignacion) =>
                obtenerTexto(
                    asignacion.EstadoAsignacion
                ).toUpperCase() ===
                "FINALIZADA"
        ).length;

    const totalCanceladas =
        asignaciones.filter(
            (asignacion) =>
                obtenerTexto(
                    asignacion.EstadoAsignacion
                ).toUpperCase() ===
                "CANCELADA"
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
                    <h1>Asignaciones</h1>

                    <p>
                        {puedeEjecutarAsignacion
                            ? "Consulte las órdenes asignadas y ejecute el proceso automático."
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
                                : "Ejecutar asignación automática"}
                        </button>
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
                            placeholder="OT, cliente, distrito o técnico"
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
                            No existen asignaciones
                            registradas.
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
                                            <th>
                                                OT
                                            </th>

                                            <th>
                                                Cliente
                                            </th>

                                            <th>
                                                Agenda
                                            </th>

                                            <th>
                                                Técnico
                                            </th>

                                            <th>
                                                Tipo
                                            </th>

                                            <th>
                                                Estado
                                            </th>

                                            <th>
                                                Estado interno
                                            </th>

                                            <th>
                                                Actividad OFSC
                                            </th>

                                            <th>
                                                Fecha asignación
                                            </th>
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
                                                    colSpan="9"
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
        </section>
    );
}

export default AsignacionesPage;