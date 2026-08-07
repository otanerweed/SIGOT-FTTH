import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    cambiarEstadoOrden
} from "../services/ordenesService";

import "./TablaOrdenes.css";

const REGISTROS_POR_PAGINA =
    10;

const ESTADOS_OT = [
    "PENDIENTE",
    "INICIADA",
    "SUSPENDIDA",
    "NO_REALIZADO",
    "REPROGRAMADA",
    "FINALIZADA",
    "CANCELADA"
];

// =====================================
// FUNCIONES AUXILIARES
// =====================================
function obtenerTexto(valor) {
    return String(
        valor ?? ""
    ).trim();
}

function normalizarEstado(
    estado
) {
    return obtenerTexto(
        estado
    )
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toUpperCase();
}

function mostrarEstado(
    estado
) {
    return obtenerTexto(
        estado
    ).replaceAll(
        "_",
        " "
    );
}

function formatearFecha(
    valor
) {
    if (!valor) {
        return "Sin fecha";
    }

    const fecha =
        new Date(valor);

    if (
        Number.isNaN(
            fecha.getTime()
        )
    ) {
        return obtenerTexto(
            valor
        );
    }

    return fecha
        .toLocaleDateString(
            "es-PE",
            {
                timeZone:
                    "UTC"
            }
        );
}

function formatearFechaHora(
    valor
) {
    if (!valor) {
        return "Sin registro";
    }

    const fecha =
        new Date(valor);

    if (
        Number.isNaN(
            fecha.getTime()
        )
    ) {
        return obtenerTexto(
            valor
        );
    }

    return fecha
        .toLocaleString(
            "es-PE"
        );
}

function obtenerClaseEstado(
    estado
) {
    const valor =
        normalizarEstado(
            estado
        );

    if (
        valor ===
            "FINALIZADA" ||
        valor ===
            "FINALIZADO"
    ) {
        return "badge-finalizada";
    }

    if (
        valor ===
            "CANCELADA" ||
        valor ===
            "CANCELADO" ||
        valor ===
            "CIERRE_AUTOMATICO"
    ) {
        return "badge-cancelada";
    }

    if (
        valor ===
        "REPROGRAMADA"
    ) {
        return "badge-reprogramada";
    }

    if (
        valor ===
        "NO_REALIZADO"
    ) {
        return "badge-no-realizado";
    }

    if (
        valor ===
        "SUSPENDIDA"
    ) {
        return "badge-suspendida";
    }

    if (
        valor ===
            "INICIADA" ||
        valor ===
            "ACTIVA" ||
        valor ===
            "ASIGNADA"
    ) {
        return "badge-iniciada";
    }

    if (
        valor ===
            "PENDIENTE" ||
        valor ===
            "SIN ASIGNAR"
    ) {
        return "badge-pendiente";
    }

    return "badge-neutro";
}

function TablaOrdenes({
    ordenes = [],
    puedeGestionarEstados = false,
    onActualizar
}) {
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
        ordenSeleccionada,
        setOrdenSeleccionada
    ] = useState(null);

    // =====================================
    // CAMBIO DE ESTADO
    // =====================================
    const [
        modalEstadoAbierto,
        setModalEstadoAbierto
    ] = useState(false);

    const [
        ordenCambioEstado,
        setOrdenCambioEstado
    ] = useState(null);

    const [
        nuevoEstado,
        setNuevoEstado
    ] = useState("");

    const [
        motivoEstado,
        setMotivoEstado
    ] = useState("");

    const [
        guardandoEstado,
        setGuardandoEstado
    ] = useState(false);

    const [
        errorEstado,
        setErrorEstado
    ] = useState("");

    const [
        mensajeEstado,
        setMensajeEstado
    ] = useState("");

    // =====================================
    // ESTADOS DE FILTRO
    // =====================================
    const estadosDisponibles =
        useMemo(() => {
            const estados =
                ordenes
                    .map(
                        (orden) =>
                            normalizarEstado(
                                orden.EstadoOT
                            )
                    )
                    .filter(
                        Boolean
                    );

            return [
                ...new Set(
                    estados
                )
            ].sort();
        }, [ordenes]);

    // =====================================
    // FILTROS
    // =====================================
    const ordenesFiltradas =
        useMemo(() => {
            const textoBusqueda =
                busqueda
                    .trim()
                    .toLowerCase();

            return ordenes.filter(
                (orden) => {
                    const estadoOT =
                        normalizarEstado(
                            orden.EstadoOT
                        );

                    const cumpleEstado =
                        estadoSeleccionado ===
                            "TODOS" ||
                        estadoOT ===
                            estadoSeleccionado;

                    const contenido = [
                        orden.CodigoOT,
                        orden.CodigoServicio,
                        orden.Cliente,
                        orden.DNI,
                        orden.Telefono,
                        orden.Direccion,
                        orden.Distrito,
                        orden.TipoServicio,
                        orden.Tecnico,
                        orden.CodigoTecnico,
                        orden.EstadoOT,
                        orden.EstadoActividad,
                        orden.EstadoAsignacion,
                        orden.TipoCierre,
                        orden.ResultadoNoRealizado
                    ]
                        .map(
                            obtenerTexto
                        )
                        .join(" ")
                        .toLowerCase();

                    const cumpleBusqueda =
                        textoBusqueda ===
                            "" ||
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
            ordenes,
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
    // PAGINACIÓN
    // =====================================
    const totalPaginas =
        Math.max(
            1,
            Math.ceil(
                ordenesFiltradas
                    .length /
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

    const ordenesVisibles =
        ordenesFiltradas.slice(
            indiceInicial,
            indiceFinal
        );

    // =====================================
    // DETALLE
    // =====================================
    function cerrarDetalle() {
        setOrdenSeleccionada(
            null
        );
    }

    // =====================================
    // ABRIR CAMBIO DE ESTADO
    // =====================================
    function abrirCambioEstado(
        orden
    ) {
        if (
            !puedeGestionarEstados
        ) {
            return;
        }

        const estadoActual =
            normalizarEstado(
                orden.EstadoOT
            );

        if (
            estadoActual ===
                "FINALIZADA" ||
            estadoActual ===
                "CANCELADA"
        ) {
            setMensajeEstado("");

            setErrorEstado(
                (
                    `La OT ${orden.CodigoOT} se encuentra ` +
                    `en un estado definitivo y no puede modificarse.`
                )
            );

            return;
        }

        setOrdenCambioEstado(
            orden
        );

        setNuevoEstado("");
        setMotivoEstado("");
        setErrorEstado("");

        setModalEstadoAbierto(
            true
        );
    }

    function cerrarCambioEstado() {
        if (guardandoEstado) {
            return;
        }

        setModalEstadoAbierto(
            false
        );

        setOrdenCambioEstado(
            null
        );

        setNuevoEstado("");
        setMotivoEstado("");
        setErrorEstado("");
    }

    // =====================================
    // GUARDAR CAMBIO DE ESTADO
    // =====================================
    async function guardarCambioEstado(
        evento
    ) {
        evento.preventDefault();

        if (!nuevoEstado) {
            setErrorEstado(
                "Debe seleccionar un nuevo estado."
            );

            return;
        }

        if (
            motivoEstado
                .trim()
                .length < 5
        ) {
            setErrorEstado(
                "El motivo debe contener al menos 5 caracteres."
            );

            return;
        }

        try {
            setGuardandoEstado(
                true
            );

            setErrorEstado("");
            setMensajeEstado("");

            const respuesta =
                await cambiarEstadoOrden(
                    ordenCambioEstado
                        .IdOrden,
                    nuevoEstado,
                    motivoEstado.trim()
                );

            setMensajeEstado(
                respuesta.mensaje ||
                "El estado de la OT fue actualizado correctamente."
            );

            setModalEstadoAbierto(
                false
            );

            setOrdenCambioEstado(
                null
            );

            setNuevoEstado("");
            setMotivoEstado("");

            if (
                typeof onActualizar ===
                "function"
            ) {
                await onActualizar();
            }
        } catch (
            errorPeticion
        ) {
            console.error(
                "Error al cambiar estado:",
                errorPeticion
            );

            setErrorEstado(
                errorPeticion
                    .response
                    ?.data
                    ?.mensaje ||
                "No se pudo cambiar el estado de la orden."
            );
        } finally {
            setGuardandoEstado(
                false
            );
        }
    }

    // =====================================
    // ESTADOS DISPONIBLES PARA CAMBIO
    // =====================================
    const estadosParaCambio =
        useMemo(() => {
            if (
                !ordenCambioEstado
            ) {
                return [];
            }

            const actual =
                normalizarEstado(
                    ordenCambioEstado
                        .EstadoOT
                );

            return ESTADOS_OT.filter(
                (estado) =>
                    estado !==
                    actual
            );
        }, [
            ordenCambioEstado
        ]);

    if (
        ordenes.length === 0
    ) {
        return (
            <div className="tabla-vacia">
                No existen órdenes registradas.
            </div>
        );
    }

    return (
        <>
            {mensajeEstado && (
                <div className="mensaje-estado-ot mensaje-estado-exito">
                    {mensajeEstado}
                </div>
            )}

            {errorEstado &&
                !modalEstadoAbierto && (
                    <div className="mensaje-estado-ot mensaje-estado-error">
                        {errorEstado}
                    </div>
                )}

            <div className="ordenes-contenedor">
                <div className="ordenes-resumen">
                    <div className="resumen-orden">
                        <span>
                            Total de órdenes
                        </span>

                        <strong>
                            {ordenes.length}
                        </strong>
                    </div>

                    <div className="resumen-orden">
                        <span>
                            Resultados
                        </span>

                        <strong>
                            {ordenesFiltradas.length}
                        </strong>
                    </div>
                </div>

                <div className="ordenes-filtros">
                    <div className="filtro-grupo">
                        <label htmlFor="buscar-orden">
                            Buscar
                        </label>

                        <input
                            id="buscar-orden"
                            type="search"
                            placeholder="OT, cliente, distrito o técnico"
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

                    <div className="filtro-grupo">
                        <label htmlFor="estado-ot">
                            Estado de la OT
                        </label>

                        <select
                            id="estado-ot"
                            value={
                                estadoSeleccionado
                            }
                            onChange={(evento) =>
                                setEstadoSeleccionado(
                                    evento
                                        .target
                                        .value
                                )
                            }
                        >
                            <option value="TODOS">
                                Todos
                            </option>

                            {estadosDisponibles.map(
                                (estado) => (
                                    <option
                                        key={
                                            estado
                                        }
                                        value={
                                            estado
                                        }
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

                <div className="tabla-responsive">
                    <table className="tabla-ordenes">
                        <thead>
                            <tr>
                                <th>OT</th>
                                <th>Cliente</th>
                                <th>Distrito</th>
                                <th>Agenda</th>
                                <th>Técnico</th>
                                <th>Estado OT</th>
                                <th>Actividad OFSC</th>
                                <th>Asignación</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>

                        <tbody>
                            {ordenesVisibles.length >
                            0 ? (
                                ordenesVisibles.map(
                                    (orden) => {
                                        const estadoActual =
                                            normalizarEstado(
                                                orden.EstadoOT
                                            );

                                        const estadoDefinitivo =
                                            estadoActual ===
                                                "FINALIZADA" ||
                                            estadoActual ===
                                                "CANCELADA";

                                        return (
                                            <tr
                                                key={
                                                    orden.IdOrden
                                                }
                                            >
                                                <td>
                                                    <div className="codigo-ot">
                                                        {
                                                            orden.CodigoOT
                                                        }
                                                    </div>

                                                    <small>
                                                        Actividad:{" "}
                                                        {orden.IdActividadOFSC ||
                                                            "Sin registrar"}
                                                    </small>
                                                </td>

                                                <td>
                                                    <strong>
                                                        {orden.Cliente ||
                                                            "Sin cliente"}
                                                    </strong>

                                                    <small>
                                                        {orden.TipoServicio ||
                                                            "Sin servicio"}
                                                    </small>
                                                </td>

                                                <td>
                                                    {orden.Distrito ||
                                                        "Sin distrito"}
                                                </td>

                                                <td>
                                                    <div>
                                                        {formatearFecha(
                                                            orden.FechaAgenda
                                                        )}
                                                    </div>

                                                    <small>
                                                        {orden.Horario ||
                                                            "Sin horario"}
                                                    </small>
                                                </td>

                                                <td>
                                                    <div>
                                                        {orden.Tecnico ||
                                                            "Sin asignar"}
                                                    </div>

                                                    <small>
                                                        {orden.CodigoTecnico ||
                                                            ""}
                                                    </small>
                                                </td>

                                                <td>
                                                    <span
                                                        className={`badge-estado ${obtenerClaseEstado(
                                                            orden.EstadoOT
                                                        )}`}
                                                    >
                                                        {mostrarEstado(
                                                            orden.EstadoOT ||
                                                            "SIN ESTADO"
                                                        )}
                                                    </span>
                                                </td>

                                                <td>
                                                    <span
                                                        className={`badge-estado ${obtenerClaseEstado(
                                                            orden.EstadoActividad
                                                        )}`}
                                                    >
                                                        {mostrarEstado(
                                                            orden.EstadoActividad ||
                                                            "SIN ACTIVIDAD"
                                                        )}
                                                    </span>

                                                    {orden.TipoCierre && (
                                                        <small className="detalle-cierre">
                                                            Cierre:{" "}
                                                            {mostrarEstado(
                                                                orden.TipoCierre
                                                            )}
                                                        </small>
                                                    )}
                                                </td>

                                                <td>
                                                    <span
                                                        className={`badge-estado ${obtenerClaseEstado(
                                                            orden.EstadoAsignacion
                                                        )}`}
                                                    >
                                                        {mostrarEstado(
                                                            orden.EstadoAsignacion ||
                                                            "SIN ASIGNAR"
                                                        )}
                                                    </span>
                                                </td>

                                                <td>
                                                    <div className="acciones-orden">
                                                        <button
                                                            type="button"
                                                            className="boton-detalle"
                                                            onClick={() =>
                                                                setOrdenSeleccionada(
                                                                    orden
                                                                )
                                                            }
                                                        >
                                                            Ver detalle
                                                        </button>

                                                        {puedeGestionarEstados && (
                                                            <button
                                                                type="button"
                                                                className="boton-cambiar-estado"
                                                                disabled={
                                                                    estadoDefinitivo
                                                                }
                                                                onClick={() =>
                                                                    abrirCambioEstado(
                                                                        orden
                                                                    )
                                                                }
                                                            >
                                                                {estadoDefinitivo
                                                                    ? "Estado definitivo"
                                                                    : "Cambiar estado"}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }
                                )
                            ) : (
                                <tr>
                                    <td
                                        colSpan="9"
                                        className="sin-resultados"
                                    >
                                        No se encontraron órdenes con los filtros seleccionados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {ordenesFiltradas.length >
                    0 && (
                    <div className="tabla-paginacion">
                        <span>
                            Mostrando{" "}
                            {indiceInicial + 1} a{" "}
                            {Math.min(
                                indiceFinal,
                                ordenesFiltradas.length
                            )}{" "}
                            de{" "}
                            {ordenesFiltradas.length}
                        </span>

                        <div className="paginacion-botones">
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
            </div>

            {/* =====================================
                MODAL DETALLE
            ===================================== */}
            {ordenSeleccionada && (
                <div
                    className="modal-overlay"
                    onClick={
                        cerrarDetalle
                    }
                >
                    <div
                        className="modal-orden"
                        onClick={(evento) =>
                            evento
                                .stopPropagation()
                        }
                    >
                        <div className="modal-encabezado">
                            <div>
                                <h2>
                                    OT{" "}
                                    {
                                        ordenSeleccionada.CodigoOT
                                    }
                                </h2>

                                <p>
                                    Detalle de la orden y su última actividad OFSC
                                </p>
                            </div>

                            <button
                                type="button"
                                className="boton-cerrar"
                                onClick={
                                    cerrarDetalle
                                }
                            >
                                ×
                            </button>
                        </div>

                        <div className="modal-contenido">
                            <section className="detalle-seccion">
                                <h3>
                                    Cliente
                                </h3>

                                <div className="detalle-grid">
                                    <div>
                                        <span>
                                            Nombre
                                        </span>

                                        <strong>
                                            {ordenSeleccionada.Cliente ||
                                                "Sin dato"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            DNI
                                        </span>

                                        <strong>
                                            {ordenSeleccionada.DNI ||
                                                "Sin dato"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Teléfono
                                        </span>

                                        <strong>
                                            {ordenSeleccionada.Telefono ||
                                                "Sin dato"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Distrito
                                        </span>

                                        <strong>
                                            {ordenSeleccionada.Distrito ||
                                                "Sin dato"}
                                        </strong>
                                    </div>
                                </div>

                                <div className="detalle-direccion">
                                    <span>
                                        Dirección
                                    </span>

                                    <strong>
                                        {ordenSeleccionada.Direccion ||
                                            "Sin dato"}
                                    </strong>
                                </div>
                            </section>

                            <section className="detalle-seccion">
                                <h3>
                                    Orden de trabajo
                                </h3>

                                <div className="detalle-grid">
                                    <div>
                                        <span>
                                            Estado OT
                                        </span>

                                        <strong>
                                            {mostrarEstado(
                                                ordenSeleccionada.EstadoOT ||
                                                "Sin dato"
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Servicio
                                        </span>

                                        <strong>
                                            {ordenSeleccionada.CodigoServicio ||
                                                "Sin dato"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Tipo de servicio
                                        </span>

                                        <strong>
                                            {ordenSeleccionada.TipoServicio ||
                                                "Sin dato"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Producto o plan
                                        </span>

                                        <strong>
                                            {ordenSeleccionada.ProductoPlan ||
                                                "Sin dato"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            RFS
                                        </span>

                                        <strong>
                                            {ordenSeleccionada.RFS ||
                                                "Sin dato"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Fecha agenda
                                        </span>

                                        <strong>
                                            {formatearFecha(
                                                ordenSeleccionada.FechaAgenda
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Horario
                                        </span>

                                        <strong>
                                            {ordenSeleccionada.Horario ||
                                                "Sin dato"}
                                        </strong>
                                    </div>
                                </div>
                            </section>

                            <section className="detalle-seccion">
                                <h3>
                                    Actividad OFSC
                                </h3>

                                <div className="detalle-grid">
                                    <div>
                                        <span>
                                            ID actividad
                                        </span>

                                        <strong>
                                            {ordenSeleccionada.IdActividadOFSC ||
                                                "Sin actividad"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Estado actividad
                                        </span>

                                        <strong>
                                            {mostrarEstado(
                                                ordenSeleccionada.EstadoActividad ||
                                                "Sin dato"
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Resultado no realizado
                                        </span>

                                        <strong>
                                            {mostrarEstado(
                                                ordenSeleccionada.ResultadoNoRealizado ||
                                                "Sin dato"
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Tipo cierre
                                        </span>

                                        <strong>
                                            {mostrarEstado(
                                                ordenSeleccionada.TipoCierre ||
                                                "Sin dato"
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Inicio
                                        </span>

                                        <strong>
                                            {ordenSeleccionada.HoraInicio ||
                                                "Sin dato"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Finalización
                                        </span>

                                        <strong>
                                            {ordenSeleccionada.HoraFin ||
                                                "Sin dato"}
                                        </strong>
                                    </div>
                                </div>

                                <div className="detalle-direccion">
                                    <span>
                                        Motivo
                                    </span>

                                    <strong>
                                        {ordenSeleccionada.MotivoCancelacion ||
                                            ordenSeleccionada.Motivo ||
                                            ordenSeleccionada.RazonReagenda ||
                                            "Sin motivo registrado"}
                                    </strong>
                                </div>
                            </section>

                            <section className="detalle-seccion">
                                <h3>
                                    Asignación actual
                                </h3>

                                <div className="detalle-grid">
                                    <div>
                                        <span>
                                            Técnico
                                        </span>

                                        <strong>
                                            {ordenSeleccionada.Tecnico ||
                                                "Sin asignar"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Código técnico
                                        </span>

                                        <strong>
                                            {ordenSeleccionada.CodigoTecnico ||
                                                "Sin dato"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Estado interno
                                        </span>

                                        <strong>
                                            {mostrarEstado(
                                                ordenSeleccionada.EstadoAsignacion ||
                                                "Sin dato"
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Estado asignación
                                        </span>

                                        <strong>
                                            {mostrarEstado(
                                                ordenSeleccionada.EstadoAsignacionTecnico ||
                                                "Sin dato"
                                            )}
                                        </strong>
                                    </div>
                                </div>

                                <div className="detalle-direccion">
                                    <span>
                                        Observaciones
                                    </span>

                                    <strong>
                                        {ordenSeleccionada.ObservacionesAsignacion ||
                                            "Sin observaciones"}
                                    </strong>
                                </div>

                                <h3 className="titulo-historial-asignacion">
                                    Última asignación registrada
                                </h3>

                                <div className="detalle-grid">
                                    <div>
                                        <span>
                                            Técnico
                                        </span>

                                        <strong>
                                            {ordenSeleccionada.UltimoTecnico ||
                                                "Sin registro"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Código técnico
                                        </span>

                                        <strong>
                                            {ordenSeleccionada.CodigoUltimoTecnico ||
                                                "Sin dato"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Tipo
                                        </span>

                                        <strong>
                                            {mostrarEstado(
                                                ordenSeleccionada.UltimoTipoAsignacion ||
                                                "Sin dato"
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Estado
                                        </span>

                                        <strong>
                                            {mostrarEstado(
                                                ordenSeleccionada.UltimoEstadoAsignacionTecnico ||
                                                "Sin dato"
                                            )}
                                        </strong>
                                    </div>
                                </div>

                                <div className="detalle-direccion">
                                    <span>
                                        Observaciones de la última asignación
                                    </span>

                                    <strong>
                                        {ordenSeleccionada.UltimasObservacionesAsignacion ||
                                            "Sin observaciones"}
                                    </strong>
                                </div>
                            </section>

                            <section className="detalle-seccion">
                                <h3>
                                    Actualización
                                </h3>

                                <div className="detalle-grid">
                                    <div>
                                        <span>
                                            Archivo importado
                                        </span>

                                        <strong>
                                            {ordenSeleccionada.NombreArchivo ||
                                                "Sin dato"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Última actualización
                                        </span>

                                        <strong>
                                            {formatearFechaHora(
                                                ordenSeleccionada.FechaActualizacionActividad ||
                                                ordenSeleccionada.FechaActualizacion
                                            )}
                                        </strong>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            )}

            {/* =====================================
                MODAL CAMBIO DE ESTADO
            ===================================== */}
            {modalEstadoAbierto &&
                ordenCambioEstado && (
                    <div
                        className="modal-overlay modal-overlay-estado"
                        onMouseDown={(evento) => {
                            if (
                                evento.target ===
                                evento.currentTarget
                            ) {
                                cerrarCambioEstado();
                            }
                        }}
                    >
                        <div className="modal-cambio-estado">
                            <div className="modal-encabezado">
                                <div>
                                    <h2>
                                        Cambiar estado
                                    </h2>

                                    <p>
                                        OT{" "}
                                        {
                                            ordenCambioEstado.CodigoOT
                                        }
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    className="boton-cerrar"
                                    disabled={
                                        guardandoEstado
                                    }
                                    onClick={
                                        cerrarCambioEstado
                                    }
                                >
                                    ×
                                </button>
                            </div>

                            <form
                                className="formulario-cambio-estado"
                                onSubmit={
                                    guardarCambioEstado
                                }
                            >
                                {errorEstado && (
                                    <div className="mensaje-modal-estado-error">
                                        {errorEstado}
                                    </div>
                                )}

                                <div className="estado-actual-card">
                                    <span>
                                        Estado actual
                                    </span>

                                    <strong>
                                        {mostrarEstado(
                                            ordenCambioEstado.EstadoOT
                                        )}
                                    </strong>

                                    <small>
                                        {ordenCambioEstado.Cliente ||
                                            "Sin cliente"}
                                    </small>
                                </div>

                                <div className="campo-estado-ot">
                                    <label htmlFor="nuevo-estado-ot">
                                        Nuevo estado
                                    </label>

                                    <select
                                        id="nuevo-estado-ot"
                                        value={
                                            nuevoEstado
                                        }
                                        disabled={
                                            guardandoEstado
                                        }
                                        onChange={(evento) =>
                                            setNuevoEstado(
                                                evento
                                                    .target
                                                    .value
                                            )
                                        }
                                    >
                                        <option value="">
                                            Seleccione un estado
                                        </option>

                                        {estadosParaCambio.map(
                                            (estado) => (
                                                <option
                                                    key={
                                                        estado
                                                    }
                                                    value={
                                                        estado
                                                    }
                                                >
                                                    {mostrarEstado(
                                                        estado
                                                    )}
                                                </option>
                                            )
                                        )}
                                    </select>
                                </div>

                                <div className="campo-estado-ot">
                                    <label htmlFor="motivo-estado-ot">
                                        Motivo
                                    </label>

                                    <textarea
                                        id="motivo-estado-ot"
                                        rows="4"
                                        maxLength="500"
                                        disabled={
                                            guardandoEstado
                                        }
                                        placeholder="Indique el motivo del cambio de estado."
                                        value={
                                            motivoEstado
                                        }
                                        onChange={(evento) =>
                                            setMotivoEstado(
                                                evento
                                                    .target
                                                    .value
                                            )
                                        }
                                    />

                                    <small>
                                        {motivoEstado.length}/500 caracteres
                                    </small>
                                </div>

                                {(
                                    nuevoEstado ===
                                        "REPROGRAMADA" ||
                                    nuevoEstado ===
                                        "CANCELADA"
                                ) &&
                                    ordenCambioEstado.IdAsignacion && (
                                        <div className="aviso-cambio-estado">
                                            La asignación activa también será cancelada y la OT quedará disponible según su nuevo estado.
                                        </div>
                                    )}

                                {nuevoEstado ===
                                    "FINALIZADA" &&
                                    ordenCambioEstado.IdAsignacion && (
                                        <div className="aviso-cambio-estado aviso-finalizacion">
                                            La asignación activa será finalizada junto con la OT.
                                        </div>
                                    )}

                                <div className="acciones-cambio-estado">
                                    <button
                                        type="button"
                                        className="boton-volver-estado"
                                        disabled={
                                            guardandoEstado
                                        }
                                        onClick={
                                            cerrarCambioEstado
                                        }
                                    >
                                        Volver
                                    </button>

                                    <button
                                        type="submit"
                                        className="boton-confirmar-estado"
                                        disabled={
                                            guardandoEstado ||
                                            !nuevoEstado ||
                                            motivoEstado
                                                .trim()
                                                .length <
                                                5
                                        }
                                    >
                                        {guardandoEstado
                                            ? "Guardando..."
                                            : "Confirmar cambio"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
        </>
    );
}

export default TablaOrdenes;