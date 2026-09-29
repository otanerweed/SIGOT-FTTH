import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";

import DetalleTSS from
    "../components/DetalleTSS";

import {
    obtenerDetalleTSS,
    obtenerTSS
} from "../services/tssService";

import "./TSSPage.css";

const LIMITE_POR_PAGINA = 20;

const FILTROS_INICIALES = {
    busqueda: "",
    estado: "",
    turno: "",
    fechaDesde: "",
    fechaHasta: "",
    proyecto: ""
};

const ESTADOS_TSS = [
    "PENDIENTE_PROGRAMACION",
    "PROGRAMADO",
    "EN_EJECUCION",
    "FACTIBLE",
    "PDT_LPU",
    "NO_CONCLUIDO",
    "FALLIDO_CAMPO",
    "FALLIDO_ESCRITORIO",
    "REPROGRAMAR"
];

const PROYECTOS_TSS = [
    {
        codigo: "RED_ENTEL",
        nombre: "RED ENTEL"
    }
];

function obtenerTexto(valor) {
    const texto = String(valor ?? "").trim();

    return texto || "—";
}

function mostrarEstado(valor) {
    return obtenerTexto(valor).replace(/_/g, " ");
}

function mostrarProyecto(valor) {
    const proyecto = String(valor ?? "")
        .trim()
        .toUpperCase();

    if (proyecto === "RED_ENTEL") {
        return "RED ENTEL";
    }

    if (
        proyecto === "SIN_PROYECTO" ||
        proyecto === ""
    ) {
        return "Sin proyecto";
    }

    return obtenerTexto(valor);
}

function claseProyecto(valor) {
    const proyecto = String(valor ?? "")
        .trim()
        .toUpperCase();

    if (proyecto === "RED_ENTEL") {
        return "tss-proyecto-badge tss-proyecto-badge--entel";
    }

    return "tss-proyecto-badge tss-proyecto-badge--sin";
}

function obtenerProyectoRegistro(registro) {
    return (
        registro.ProyectoCodigo ||
        registro.CodigoProyecto ||
        registro.Proyecto ||
        "SIN_PROYECTO"
    );
}

function formatearFecha(valor) {
    if (!valor) {
        return "Sin programar";
    }

    const coincidencia = String(valor).match(
        /^(\d{4})-(\d{2})-(\d{2})/
    );

    if (coincidencia) {
        return `${coincidencia[3]}/${coincidencia[2]}/${coincidencia[1]}`;
    }

    return obtenerTexto(valor);
}

function formatearFechaHora(valor) {
    if (!valor) {
        return "—";
    }

    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
        return obtenerTexto(valor);
    }

    return fecha.toLocaleString("es-PE", {
        dateStyle: "short",
        timeStyle: "short"
    });
}

function claseEstado(valor) {
    const estado = String(valor ?? "")
        .trim()
        .toUpperCase();

    if (
        [
            "FACTIBLE",
            "FINALIZADA"
        ].includes(estado)
    ) {
        return "tss-badge--exito";
    }

    if (
        [
            "FALLIDO_CAMPO",
            "FALLIDO_ESCRITORIO",
            "NO_CONCLUIDO",
            "CANCELADA"
        ].includes(estado)
    ) {
        return "tss-badge--peligro";
    }

    if (
        [
            "PENDIENTE",
            "PENDIENTE_PROGRAMACION",
            "PROGRAMADO",
            "REPROGRAMAR",
            "REPROGRAMADA",
            "PDT_LPU"
        ].includes(estado)
    ) {
        return "tss-badge--advertencia";
    }

    if (
        [
            "ASIGNADA",
            "EN_RUTA",
            "INICIADA",
            "EN_EJECUCION"
        ].includes(estado)
    ) {
        return "tss-badge--informacion";
    }

    return "tss-badge--neutro";
}

function crearPaginasVisibles(
    paginaActual,
    totalPaginas
) {
    const inicio = Math.max(
        1,
        Math.min(
            paginaActual - 2,
            totalPaginas - 4
        )
    );

    const fin = Math.min(
        totalPaginas,
        inicio + 4
    );

    return Array.from(
        { length: fin - inicio + 1 },
        (_, indice) => inicio + indice
    );
}

function TSSPage() {
    const [tss, setTSS] = useState([]);

    const [cargando, setCargando] =
        useState(true);

    const [error, setError] =
        useState("");

    const [errorFiltros, setErrorFiltros] =
        useState("");

    const [pagina, setPagina] =
        useState(1);

    const [paginacion, setPaginacion] =
        useState({
            pagina: 1,
            limite: LIMITE_POR_PAGINA,
            total: 0,
            totalPaginas: 1
        });

    const [filtrosFormulario, setFiltrosFormulario] =
        useState(FILTROS_INICIALES);

    const [filtrosAplicados, setFiltrosAplicados] =
        useState(FILTROS_INICIALES);

    const [detalleAbierto, setDetalleAbierto] =
        useState(false);

    const [idTSSSeleccionado, setIdTSSSeleccionado] =
        useState(null);

    const [detalle, setDetalle] =
        useState(null);

    const [cargandoDetalle, setCargandoDetalle] =
        useState(false);

    const [errorDetalle, setErrorDetalle] =
        useState("");

    const solicitudListadoRef =
        useRef(0);

    const solicitudDetalleRef =
        useRef(0);

    const ultimoBotonDetalleRef =
        useRef(null);

    const cargarListado = useCallback(
        async () => {
            const solicitudActual =
                solicitudListadoRef.current + 1;

            solicitudListadoRef.current =
                solicitudActual;

            try {
                setCargando(true);
                setError("");

                const respuesta =
                    await obtenerTSS({
                        pagina,
                        limite:
                            LIMITE_POR_PAGINA,
                        buscar:
                            filtrosAplicados.busqueda,
                        estado:
                            filtrosAplicados.estado,
                        turno:
                            filtrosAplicados.turno,
                        desde:
                            filtrosAplicados.fechaDesde,
                        hasta:
                            filtrosAplicados.fechaHasta,
                        proyecto:
                            filtrosAplicados.proyecto
                    });

                if (
                    solicitudActual !==
                    solicitudListadoRef.current
                ) {
                    return;
                }

                const registros =
                    Array.isArray(
                        respuesta?.tss
                    )
                        ? respuesta.tss
                        : [];

                const datosPaginacion =
                    respuesta?.paginacion ||
                    {};

                const total =
                    Math.max(
                        0,
                        Number(
                            datosPaginacion.total
                        ) || 0
                    );

                const totalPaginas =
                    Math.max(
                        1,
                        Number(
                            datosPaginacion.totalPaginas
                        ) ||
                            Math.ceil(
                                total /
                                    LIMITE_POR_PAGINA
                            ) ||
                            1
                    );

                setTSS(registros);

                setPaginacion({
                    pagina:
                        Number(
                            datosPaginacion.pagina
                        ) || pagina,
                    limite:
                        Number(
                            datosPaginacion.limite
                        ) ||
                        LIMITE_POR_PAGINA,
                    total,
                    totalPaginas
                });

                if (
                    pagina >
                    totalPaginas
                ) {
                    setPagina(
                        totalPaginas
                    );
                }
            } catch (
                errorPeticion
            ) {
                if (
                    solicitudActual !==
                    solicitudListadoRef.current
                ) {
                    return;
                }

                setTSS([]);

                setError(
                    errorPeticion
                        .response?.data
                        ?.mensaje ||
                        "No se pudieron cargar las fichas TSS. Intente nuevamente."
                );
            } finally {
                if (
                    solicitudActual ===
                    solicitudListadoRef.current
                ) {
                    setCargando(false);
                }
            }
        },
        [
            pagina,
            filtrosAplicados
        ]
    );

    useEffect(() => {
        cargarListado();

        return () => {
            solicitudListadoRef.current += 1;
        };
    }, [cargarListado]);

    const cargarDetalle =
        useCallback(
            async (idTSS) => {
                const solicitudActual =
                    solicitudDetalleRef.current +
                    1;

                solicitudDetalleRef.current =
                    solicitudActual;

                try {
                    setCargandoDetalle(
                        true
                    );

                    setErrorDetalle("");

                    const respuesta =
                        await obtenerDetalleTSS(
                            idTSS
                        );

                    if (
                        solicitudActual ===
                        solicitudDetalleRef.current
                    ) {
                        setDetalle(
                            respuesta
                        );
                    }
                } catch (
                    errorPeticion
                ) {
                    if (
                        solicitudActual ===
                        solicitudDetalleRef.current
                    ) {
                        setErrorDetalle(
                            errorPeticion
                                .response?.data
                                ?.mensaje ||
                                "No se pudo cargar el detalle del TSS."
                        );
                    }
                } finally {
                    if (
                        solicitudActual ===
                        solicitudDetalleRef.current
                    ) {
                        setCargandoDetalle(
                            false
                        );
                    }
                }
            },
            []
        );

    const abrirDetalle = (
        registro,
        botonOrigen
    ) => {
        ultimoBotonDetalleRef.current =
            botonOrigen;

        setIdTSSSeleccionado(
            registro.IdTSS
        );

        setDetalle({
            tss: registro
        });

        setDetalleAbierto(true);

        cargarDetalle(
            registro.IdTSS
        );
    };

    const cerrarDetalle =
        useCallback(() => {
            solicitudDetalleRef.current +=
                1;

            setDetalleAbierto(
                false
            );

            setIdTSSSeleccionado(
                null
            );

            setDetalle(null);

            setErrorDetalle("");

            window.setTimeout(
                () => {
                    ultimoBotonDetalleRef.current?.focus();
                },
                0
            );
        }, []);

    const aplicarFiltros = (
        evento
    ) => {
        evento.preventDefault();

        if (
            filtrosFormulario.fechaDesde &&
            filtrosFormulario.fechaHasta &&
            filtrosFormulario.fechaDesde >
                filtrosFormulario.fechaHasta
        ) {
            setErrorFiltros(
                "La fecha inicial no puede ser posterior a la fecha final."
            );

            return;
        }

        setErrorFiltros("");

        setPagina(1);

        setFiltrosAplicados({
            ...filtrosFormulario,
            busqueda:
                filtrosFormulario.busqueda.trim()
        });
    };

    const limpiarFiltros = () => {
        setErrorFiltros("");

        setFiltrosFormulario({
            ...FILTROS_INICIALES
        });

        setFiltrosAplicados({
            ...FILTROS_INICIALES
        });

        setPagina(1);
    };

    const cambiarFiltro = (
        evento
    ) => {
        const {
            name,
            value
        } = evento.target;

        setFiltrosFormulario(
            (actuales) => ({
                ...actuales,
                [name]: value
            })
        );
    };

    const paginasVisibles =
        useMemo(
            () =>
                crearPaginasVisibles(
                    pagina,
                    paginacion.totalPaginas
                ),
            [
                pagina,
                paginacion.totalPaginas
            ]
        );

    const primerRegistro =
        paginacion.total > 0
            ? (pagina - 1) *
                  paginacion.limite +
              1
            : 0;

    const ultimoRegistro =
        Math.min(
            pagina *
                paginacion.limite,
            paginacion.total
        );

    return (
        <section className="tss-page">
            <header className="tss-encabezado">
                <div>
                    <span className="tss-sobretitulo">
                        Gestión operativa
                    </span>

                    <h1>
                        Fichas TSS
                    </h1>

                    <p>
                        Consulte la programación, el avance y la
                        trazabilidad técnica de cada orden de
                        servicio.
                    </p>
                </div>

                <button
                    type="button"
                    className="tss-boton tss-boton--primario"
                    onClick={
                        cargarListado
                    }
                    disabled={cargando}
                >
                    {cargando
                        ? "Actualizando..."
                        : "Actualizar"}
                </button>
            </header>

            <div
                className="tss-resumen"
                aria-label="Resumen"
            >
                <div className="tss-resumen-tarjeta">
                    <span>
                        Resultados
                    </span>

                    <strong>
                        {paginacion.total}
                    </strong>

                    <small>
                        Con los filtros aplicados
                    </small>
                </div>

                <div className="tss-resumen-tarjeta">
                    <span>
                        En esta página
                    </span>

                    <strong>
                        {tss.length}
                    </strong>

                    <small>
                        Hasta {paginacion.limite} registros
                    </small>
                </div>

                <div className="tss-resumen-tarjeta">
                    <span>
                        Página
                    </span>

                    <strong>
                        {pagina} /{" "}
                        {
                            paginacion.totalPaginas
                        }
                    </strong>

                    <small>
                        Orden operativo por agenda
                    </small>
                </div>
            </div>

            <form
                className="tss-filtros"
                onSubmit={
                    aplicarFiltros
                }
            >
                <div className="tss-filtros-cabecera">
                    <div>
                        <h2>
                            Buscar y filtrar
                        </h2>

                        <p>
                            Combine uno o más criterios para reducir
                            el listado.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="tss-boton-enlace"
                        onClick={
                            limpiarFiltros
                        }
                    >
                        Limpiar filtros
                    </button>
                </div>

                <div className="tss-filtros-grid">
                    <div className="tss-campo tss-campo--amplio">
                        <label htmlFor="tss-busqueda">
                            Búsqueda
                        </label>

                        <input
                            id="tss-busqueda"
                            name="busqueda"
                            type="search"
                            value={
                                filtrosFormulario.busqueda
                            }
                            onChange={
                                cambiarFiltro
                            }
                            maxLength={120}
                            placeholder="OT, cliente, distrito, técnico o NAP"
                        />
                    </div>

                    <div className="tss-campo">
                        <label htmlFor="tss-proyecto">
                            Proyecto
                        </label>

                        <select
                            id="tss-proyecto"
                            name="proyecto"
                            value={
                                filtrosFormulario.proyecto
                            }
                            onChange={
                                cambiarFiltro
                            }
                        >
                            <option value="">
                                Todos
                            </option>

                            {PROYECTOS_TSS.map(
                                (
                                    proyecto
                                ) => (
                                    <option
                                        key={
                                            proyecto.codigo
                                        }
                                        value={
                                            proyecto.codigo
                                        }
                                    >
                                        {
                                            proyecto.nombre
                                        }
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    <div className="tss-campo">
                        <label htmlFor="tss-estado">
                            Estado TSS
                        </label>

                        <select
                            id="tss-estado"
                            name="estado"
                            value={
                                filtrosFormulario.estado
                            }
                            onChange={
                                cambiarFiltro
                            }
                        >
                            <option value="">
                                Todos
                            </option>

                            {ESTADOS_TSS.map(
                                (
                                    estado
                                ) => (
                                    <option
                                        key={
                                            estado
                                        }
                                        value={
                                            estado
                                        }
                                    >
                                        {
                                            mostrarEstado(
                                                estado
                                            )
                                        }
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    <div className="tss-campo">
                        <label htmlFor="tss-turno">
                            Turno
                        </label>

                        <select
                            id="tss-turno"
                            name="turno"
                            value={
                                filtrosFormulario.turno
                            }
                            onChange={
                                cambiarFiltro
                            }
                        >
                            <option value="">
                                Todos
                            </option>

                            <option value="AM">
                                AM
                            </option>

                            <option value="PM">
                                PM
                            </option>

                            <option value="NOCTURNO">
                                Nocturno
                            </option>
                        </select>
                    </div>

                    <div className="tss-campo">
                        <label htmlFor="tss-fecha-desde">
                            Agenda desde
                        </label>

                        <input
                            id="tss-fecha-desde"
                            name="fechaDesde"
                            type="date"
                            value={
                                filtrosFormulario.fechaDesde
                            }
                            onChange={
                                cambiarFiltro
                            }
                        />
                    </div>

                    <div className="tss-campo">
                        <label htmlFor="tss-fecha-hasta">
                            Agenda hasta
                        </label>

                        <input
                            id="tss-fecha-hasta"
                            name="fechaHasta"
                            type="date"
                            value={
                                filtrosFormulario.fechaHasta
                            }
                            onChange={
                                cambiarFiltro
                            }
                        />
                    </div>
                </div>

                {errorFiltros && (
                    <p
                        className="tss-filtros-error"
                        role="alert"
                    >
                        {
                            errorFiltros
                        }
                    </p>
                )}

                <div className="tss-filtros-acciones">
                    <button
                        type="submit"
                        className="tss-boton tss-boton--primario"
                        disabled={cargando}
                    >
                        Aplicar filtros
                    </button>
                </div>
            </form>

            <div className="tss-listado">
                <div className="tss-listado-cabecera">
                    <div>
                        <h2>
                            Listado TSS
                        </h2>

                        <p>
                            Abra una ficha para consultar todo su
                            detalle y trazabilidad.
                        </p>
                    </div>

                    {!cargando &&
                        !error && (
                            <span className="tss-listado-rango">
                                {
                                    primerRegistro
                                }
                                –
                                {
                                    ultimoRegistro
                                }{" "}
                                de{" "}
                                {
                                    paginacion.total
                                }
                            </span>
                        )}
                </div>

                {cargando && (
                    <div
                        className="tss-estado"
                        role="status"
                    >
                        <span className="tss-cargador" />
                        Cargando fichas TSS...
                    </div>
                )}

                {!cargando &&
                    error && (
                        <div
                            className="tss-estado tss-estado--error"
                            role="alert"
                        >
                            <strong>
                                No pudimos cargar el listado.
                            </strong>

                            <p>
                                {
                                    error
                                }
                            </p>

                            <button
                                type="button"
                                className="tss-boton tss-boton--secundario"
                                onClick={
                                    cargarListado
                                }
                            >
                                Reintentar
                            </button>
                        </div>
                    )}

                {!cargando &&
                    !error &&
                    tss.length ===
                        0 && (
                        <div className="tss-estado tss-estado--vacio">
                            <strong>
                                No hay fichas TSS para mostrar.
                            </strong>

                            <p>
                                Cambie los filtros o revise nuevamente
                                cuando existan nuevas órdenes elegibles.
                            </p>

                            <button
                                type="button"
                                className="tss-boton tss-boton--secundario"
                                onClick={
                                    limpiarFiltros
                                }
                            >
                                Ver todos los TSS
                            </button>
                        </div>
                    )}

                {!cargando &&
                    !error &&
                    tss.length > 0 && (
                        <>
                            <div className="tss-tabla-contenedor">
                                <table className="tss-tabla">
                                    <thead>
                                        <tr>
                                            <th scope="col">
                                                TSS / OT
                                            </th>

                                            <th scope="col">
                                                Proyecto
                                            </th>

                                            <th scope="col">
                                                Cliente y zona
                                            </th>

                                            <th scope="col">
                                                Estado TSS
                                            </th>

                                            <th scope="col">
                                                Estado OT
                                            </th>

                                            <th scope="col">
                                                Programación
                                            </th>

                                            <th scope="col">
                                                Técnico
                                            </th>

                                            <th scope="col">
                                                Actualización
                                            </th>

                                            <th scope="col">
                                                Detalle
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {tss.map(
                                            (
                                                registro,
                                                indice
                                            ) => {
                                                const tecnico =
                                                    registro.Tecnico ||
                                                    registro.NombreTecnico ||
                                                    registro.NombreCompletoTecnico;

                                                const proyecto =
                                                    obtenerProyectoRegistro(
                                                        registro
                                                    );

                                                return (
                                                    <tr
                                                        key={
                                                            registro.IdTSS ||
                                                            `tss-${indice}`
                                                        }
                                                    >
                                                        <td>
                                                            <strong className="tss-identificador">
                                                                #
                                                                {
                                                                    obtenerTexto(
                                                                        registro.IdTSS
                                                                    )
                                                                }
                                                            </strong>

                                                            <small>
                                                                OT{" "}
                                                                {
                                                                    obtenerTexto(
                                                                        registro.CodigoOT
                                                                    )
                                                                }
                                                            </small>
                                                        </td>

                                                        <td>
                                                            <span
                                                                className={claseProyecto(
                                                                    proyecto
                                                                )}
                                                            >
                                                                {
                                                                    mostrarProyecto(
                                                                        proyecto
                                                                    )
                                                                }
                                                            </span>

                                                            <small>
                                                                {
                                                                    registro.ProyectoNombre ||
                                                                    (
                                                                        proyecto ===
                                                                        "RED_ENTEL"
                                                                            ? "RED ENTEL"
                                                                            : "Proyecto no asignado"
                                                                    )
                                                                }
                                                            </small>
                                                        </td>

                                                        <td>
                                                            <strong>
                                                                {
                                                                    obtenerTexto(
                                                                        registro.Cliente ||
                                                                            registro.NombreCliente
                                                                    )
                                                                }
                                                            </strong>

                                                            <small>
                                                                {
                                                                    obtenerTexto(
                                                                        registro.Distrito
                                                                    )
                                                                }
                                                            </small>
                                                        </td>

                                                        <td>
                                                            <span
                                                                className={`tss-badge ${claseEstado(
                                                                    registro.EstadoTSS
                                                                )}`}
                                                            >
                                                                {
                                                                    mostrarEstado(
                                                                        registro.EstadoTSS
                                                                    )
                                                                }
                                                            </span>
                                                        </td>

                                                        <td>
                                                            <span
                                                                className={`tss-badge ${claseEstado(
                                                                    registro.EstadoOT
                                                                )}`}
                                                            >
                                                                {
                                                                    mostrarEstado(
                                                                        registro.EstadoOT
                                                                    )
                                                                }
                                                            </span>
                                                        </td>

                                                        <td>
                                                            <strong>
                                                                {
                                                                    formatearFecha(
                                                                        registro.FechaAgenda
                                                                    )
                                                                }
                                                            </strong>

                                                            <small>
                                                                Turno{" "}
                                                                {
                                                                    obtenerTexto(
                                                                        registro.Turno
                                                                    )
                                                                }
                                                            </small>
                                                        </td>

                                                        <td>
                                                            <strong>
                                                                {
                                                                    obtenerTexto(
                                                                        tecnico
                                                                    )
                                                                }
                                                            </strong>

                                                            <small>
                                                                {
                                                                    registro.CodigoTecnico
                                                                        ? `Código ${registro.CodigoTecnico}`
                                                                        : "Sin código"
                                                                }
                                                            </small>
                                                        </td>

                                                        <td>
                                                            <span className="tss-fecha-actualizacion">
                                                                {
                                                                    formatearFechaHora(
                                                                        registro.FechaActualizacion
                                                                    )
                                                                }
                                                            </span>
                                                        </td>

                                                        <td>
                                                            <button
                                                                type="button"
                                                                className="tss-boton-detalle"
                                                                aria-label={`Ver detalle del TSS ${registro.IdTSS}`}
                                                                onClick={(
                                                                    evento
                                                                ) =>
                                                                    abrirDetalle(
                                                                        registro,
                                                                        evento.currentTarget
                                                                    )
                                                                }
                                                            >
                                                                Ver detalle
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            }
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <nav
                                className="tss-paginacion"
                                aria-label="Paginación del listado TSS"
                            >
                                <span>
                                    Mostrando{" "}
                                    {
                                        primerRegistro
                                    }{" "}
                                    a{" "}
                                    {
                                        ultimoRegistro
                                    }{" "}
                                    de{" "}
                                    {
                                        paginacion.total
                                    }
                                </span>

                                <div className="tss-paginacion-botones">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPagina(
                                                (
                                                    actual
                                                ) =>
                                                    Math.max(
                                                        1,
                                                        actual -
                                                            1
                                                    )
                                            )
                                        }
                                        disabled={
                                            pagina <=
                                            1
                                        }
                                        aria-label="Página anterior"
                                    >
                                        Anterior
                                    </button>

                                    {paginasVisibles.map(
                                        (
                                            numeroPagina
                                        ) => (
                                            <button
                                                type="button"
                                                key={
                                                    numeroPagina
                                                }
                                                className={
                                                    numeroPagina ===
                                                    pagina
                                                        ? "activo"
                                                        : ""
                                                }
                                                aria-current={
                                                    numeroPagina ===
                                                    pagina
                                                        ? "page"
                                                        : undefined
                                                }
                                                aria-label={`Ir a la página ${numeroPagina}`}
                                                onClick={() =>
                                                    setPagina(
                                                        numeroPagina
                                                    )
                                                }
                                            >
                                                {
                                                    numeroPagina
                                                }
                                            </button>
                                        )
                                    )}

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPagina(
                                                (
                                                    actual
                                                ) =>
                                                    Math.min(
                                                        paginacion.totalPaginas,
                                                        actual +
                                                            1
                                                    )
                                            )
                                        }
                                        disabled={
                                            pagina >=
                                            paginacion.totalPaginas
                                        }
                                        aria-label="Página siguiente"
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            </nav>
                        </>
                    )}
            </div>

            <DetalleTSS
                abierto={
                    detalleAbierto
                }
                detalle={detalle}
                cargando={
                    cargandoDetalle
                }
                error={
                    errorDetalle
                }
                onCerrar={
                    cerrarDetalle
                }
                onReintentar={() =>
                    idTSSSeleccionado &&
                    cargarDetalle(
                        idTSSSeleccionado
                    )
                }
            />
        </section>
    );
}

export default TSSPage;