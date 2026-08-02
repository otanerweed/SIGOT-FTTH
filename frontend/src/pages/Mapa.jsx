import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";

import {
    CircleMarker,
    MapContainer,
    Popup,
    TileLayer,
    useMap
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import {
    obtenerOrdenes
} from "../services/ordenesService";

import "./Mapa.css";

const CENTRO_LIMA = [
    -12.0464,
    -77.0428
];

const ZOOM_INICIAL = 11;

// =====================================
// FUNCIONES GENERALES
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

function obtenerCoordenada(valor) {
    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {
        return null;
    }

    const numero = Number(
        String(valor)
            .trim()
            .replace(",", ".")
    );

    return Number.isFinite(numero)
        ? numero
        : null;
}

// =====================================
// VALIDAR UBICACIÓN DENTRO DE PERÚ
// =====================================
function estaDentroDePeru(
    latitud,
    longitud
) {
    return (
        latitud >= -19.5 &&
        latitud <= 0.5 &&
        longitud >= -82.5 &&
        longitud <= -68
    );
}

// =====================================
// NORMALIZAR LATITUD Y LONGITUD
// =====================================
function normalizarCoordenadas(
    latitudOriginal,
    longitudOriginal
) {
    const latitud =
        obtenerCoordenada(
            latitudOriginal
        );

    const longitud =
        obtenerCoordenada(
            longitudOriginal
        );

    if (
        latitud === null ||
        longitud === null
    ) {
        return null;
    }

    if (
        latitud === 0 &&
        longitud === 0
    ) {
        return null;
    }

    /*
     * Coordenadas correctas:
     * latitud primero y longitud después.
     */
    if (
        estaDentroDePeru(
            latitud,
            longitud
        )
    ) {
        return {
            latitud,
            longitud,
            coordenadasInvertidas: false
        };
    }

    /*
     * Corrige automáticamente cuando
     * latitud y longitud llegaron invertidas.
     */
    if (
        estaDentroDePeru(
            longitud,
            latitud
        )
    ) {
        return {
            latitud: longitud,
            longitud: latitud,
            coordenadasInvertidas: true
        };
    }

    /*
     * No se muestra si la coordenada está
     * fuera del territorio peruano.
     */
    return null;
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

function mostrarEstado(valor) {
    return obtenerTexto(valor)
        .replaceAll("_", " ");
}

function obtenerColorEstado(estado) {
    const valor =
        normalizarTexto(estado);

    if (valor === "FINALIZADA") {
        return "#16a34a";
    }

    if (valor === "CANCELADA") {
        return "#dc2626";
    }

    if (valor === "REPROGRAMADA") {
        return "#9333ea";
    }

    if (valor === "INICIADA") {
        return "#2563eb";
    }

    if (valor === "SUSPENDIDA") {
        return "#ea580c";
    }

    if (valor === "NO_REALIZADO") {
        return "#7c2d12";
    }

    return "#d97706";
}

function obtenerClaseEstado(estado) {
    const valor =
        normalizarTexto(estado);

    if (valor === "FINALIZADA") {
        return "mapa-estado-finalizada";
    }

    if (valor === "CANCELADA") {
        return "mapa-estado-cancelada";
    }

    if (valor === "REPROGRAMADA") {
        return "mapa-estado-reprogramada";
    }

    if (valor === "INICIADA") {
        return "mapa-estado-iniciada";
    }

    if (valor === "SUSPENDIDA") {
        return "mapa-estado-suspendida";
    }

    return "mapa-estado-pendiente";
}

// =====================================
// AJUSTAR MAPA A LOS MARCADORES
// =====================================
function AjustarVistaMapa({
    ordenes
}) {
    const mapa = useMap();

    useEffect(() => {
        if (ordenes.length === 0) {
            mapa.setView(
                CENTRO_LIMA,
                ZOOM_INICIAL
            );

            return;
        }

        if (ordenes.length === 1) {
            mapa.setView(
                [
                    ordenes[0].LatitudMapa,
                    ordenes[0].LongitudMapa
                ],
                16
            );

            return;
        }

        const limites = ordenes.map(
            (orden) => [
                orden.LatitudMapa,
                orden.LongitudMapa
            ]
        );

        mapa.fitBounds(
            limites,
            {
                padding: [
                    40,
                    40
                ],
                maxZoom: 15
            }
        );
    }, [
        mapa,
        ordenes
    ]);

    return null;
}

function Mapa() {
    const [ordenes, setOrdenes] =
        useState([]);

    const [busqueda, setBusqueda] =
        useState("");

    const [
        distritoSeleccionado,
        setDistritoSeleccionado
    ] = useState("TODOS");

    const [
        estadoSeleccionado,
        setEstadoSeleccionado
    ] = useState("TODOS");

    const [cargando, setCargando] =
        useState(true);

    const [error, setError] =
        useState("");

    // =====================================
    // CARGAR ÓRDENES
    // =====================================
    const cargarOrdenes =
        useCallback(async () => {
            try {
                setCargando(true);
                setError("");

                const respuesta =
                    await obtenerOrdenes();

                setOrdenes(
                    Array.isArray(respuesta)
                        ? respuesta
                        : []
                );
            } catch (errorPeticion) {
                console.error(
                    "Error al cargar las órdenes del mapa:",
                    errorPeticion
                );

                setError(
                    errorPeticion.response?.data?.mensaje ||
                        "No se pudieron cargar las órdenes para el mapa."
                );
            } finally {
                setCargando(false);
            }
        }, []);

    useEffect(() => {
        cargarOrdenes();
    }, [cargarOrdenes]);

    // =====================================
    // DISTRITOS DISPONIBLES
    // =====================================
    const distritosDisponibles =
        useMemo(() => {
            const distritos = ordenes
                .map((orden) =>
                    obtenerTexto(
                        orden.Distrito
                    )
                )
                .filter(Boolean);

            return [
                ...new Set(distritos)
            ].sort((a, b) =>
                a.localeCompare(
                    b,
                    "es"
                )
            );
        }, [ordenes]);

    // =====================================
    // ESTADOS DISPONIBLES
    // =====================================
    const estadosDisponibles =
        useMemo(() => {
            const estados = ordenes
                .map((orden) =>
                    normalizarTexto(
                        orden.EstadoOT
                    )
                )
                .filter(Boolean);

            return [
                ...new Set(estados)
            ].sort();
        }, [ordenes]);

    // =====================================
    // FILTRAR ÓRDENES
    // =====================================
    const ordenesFiltradas =
        useMemo(() => {
            const textoBusqueda =
                normalizarTexto(busqueda);

            return ordenes.filter(
                (orden) => {
                    const distrito =
                        obtenerTexto(
                            orden.Distrito
                        );

                    const estado =
                        normalizarTexto(
                            orden.EstadoOT
                        );

                    const cumpleDistrito =
                        distritoSeleccionado ===
                            "TODOS" ||
                        distrito ===
                            distritoSeleccionado;

                    const cumpleEstado =
                        estadoSeleccionado ===
                            "TODOS" ||
                        estado ===
                            estadoSeleccionado;

                    const contenido =
                        normalizarTexto(
                            [
                                orden.CodigoOT,
                                orden.CodigoServicio,
                                orden.Cliente,
                                orden.Direccion,
                                orden.Distrito,
                                orden.Tecnico,
                                orden.CodigoTecnico,
                                orden.EstadoOT
                            ].join(" ")
                        );

                    const cumpleBusqueda =
                        textoBusqueda === "" ||
                        contenido.includes(
                            textoBusqueda
                        );

                    return (
                        cumpleDistrito &&
                        cumpleEstado &&
                        cumpleBusqueda
                    );
                }
            );
        }, [
            ordenes,
            busqueda,
            distritoSeleccionado,
            estadoSeleccionado
        ]);

    // =====================================
    // ÓRDENES CON COORDENADAS VÁLIDAS
    // =====================================
    const ordenesEnMapa =
        useMemo(() => {
            return ordenesFiltradas
                .map((orden) => {
                    const coordenadas =
                        normalizarCoordenadas(
                            orden.LatitudCliente,
                            orden.LongitudCliente
                        );

                    if (!coordenadas) {
                        return null;
                    }

                    return {
                        ...orden,

                        LatitudMapa:
                            coordenadas.latitud,

                        LongitudMapa:
                            coordenadas.longitud,

                        CoordenadasInvertidas:
                            coordenadas.coordenadasInvertidas
                    };
                })
                .filter(Boolean);
        }, [ordenesFiltradas]);

    // =====================================
    // TOTAL DE ÓRDENES GEORREFERENCIADAS
    // =====================================
    const totalConCoordenadas =
        useMemo(() => {
            return ordenes.filter(
                (orden) =>
                    Boolean(
                        normalizarCoordenadas(
                            orden.LatitudCliente,
                            orden.LongitudCliente
                        )
                    )
            ).length;
        }, [ordenes]);

    const totalSinCoordenadas =
        ordenes.length -
        totalConCoordenadas;

    const filtradasSinCoordenadas =
        ordenesFiltradas.length -
        ordenesEnMapa.length;

    function limpiarFiltros() {
        setBusqueda("");

        setDistritoSeleccionado(
            "TODOS"
        );

        setEstadoSeleccionado(
            "TODOS"
        );
    }

    return (
        <section className="mapa-page">
            <header className="mapa-encabezado">
                <div>
                    <h1>
                        Mapa de órdenes
                    </h1>

                    <p>
                        Visualice la ubicación de las
                        órdenes FTTH registradas en el
                        sistema.
                    </p>
                </div>

                <button
                    type="button"
                    className="boton-actualizar-mapa"
                    onClick={cargarOrdenes}
                    disabled={cargando}
                >
                    {cargando
                        ? "Actualizando..."
                        : "Actualizar"}
                </button>
            </header>

            {error && (
                <div className="mensaje-mapa-error">
                    {error}
                </div>
            )}

            <div className="mapa-resumen">
                <div className="mapa-tarjeta-resumen">
                    <span>
                        Total de órdenes
                    </span>

                    <strong>
                        {ordenes.length}
                    </strong>
                </div>

                <div className="mapa-tarjeta-resumen">
                    <span>
                        Georreferenciadas
                    </span>

                    <strong>
                        {totalConCoordenadas}
                    </strong>
                </div>

                <div className="mapa-tarjeta-resumen">
                    <span>
                        Sin coordenadas válidas
                    </span>

                    <strong>
                        {totalSinCoordenadas}
                    </strong>
                </div>

                <div className="mapa-tarjeta-resumen">
                    <span>
                        Visibles en mapa
                    </span>

                    <strong>
                        {ordenesEnMapa.length}
                    </strong>
                </div>
            </div>

            <div className="mapa-filtros">
                <div className="mapa-grupo-filtro mapa-filtro-busqueda">
                    <label htmlFor="buscar-mapa">
                        Buscar
                    </label>

                    <input
                        id="buscar-mapa"
                        type="search"
                        placeholder="OT, cliente, dirección o técnico"
                        value={busqueda}
                        onChange={(evento) =>
                            setBusqueda(
                                evento.target.value
                            )
                        }
                    />
                </div>

                <div className="mapa-grupo-filtro">
                    <label htmlFor="distrito-mapa">
                        Distrito
                    </label>

                    <select
                        id="distrito-mapa"
                        value={
                            distritoSeleccionado
                        }
                        onChange={(evento) =>
                            setDistritoSeleccionado(
                                evento.target.value
                            )
                        }
                    >
                        <option value="TODOS">
                            Todos
                        </option>

                        {distritosDisponibles.map(
                            (distrito) => (
                                <option
                                    key={distrito}
                                    value={distrito}
                                >
                                    {distrito}
                                </option>
                            )
                        )}
                    </select>
                </div>

                <div className="mapa-grupo-filtro">
                    <label htmlFor="estado-mapa">
                        Estado
                    </label>

                    <select
                        id="estado-mapa"
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

                <button
                    type="button"
                    className="boton-limpiar-mapa"
                    onClick={limpiarFiltros}
                >
                    Limpiar filtros
                </button>
            </div>

            <div className="mapa-contenedor-principal">
                <div className="mapa-tarjeta">
                    <div className="mapa-tarjeta-encabezado">
                        <div>
                            <h2>
                                Ubicación de las OT
                            </h2>

                            <p>
                                {ordenesEnMapa.length}{" "}
                                marcadores encontrados.
                            </p>
                        </div>

                        <div className="mapa-leyenda">
                            <span>
                                <i className="leyenda-pendiente" />
                                Pendiente
                            </span>

                            <span>
                                <i className="leyenda-finalizada" />
                                Finalizada
                            </span>

                            <span>
                                <i className="leyenda-cancelada" />
                                Cancelada
                            </span>

                            <span>
                                <i className="leyenda-reprogramada" />
                                Reprogramada
                            </span>
                        </div>
                    </div>

                    {cargando ? (
                        <div className="estado-mapa">
                            Cargando mapa...
                        </div>
                    ) : (
                        <MapContainer
                            center={CENTRO_LIMA}
                            zoom={ZOOM_INICIAL}
                            scrollWheelZoom
                            className="mapa-leaflet"
                        >
                            <TileLayer
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                            />

                            <AjustarVistaMapa
                                ordenes={
                                    ordenesEnMapa
                                }
                            />

                            {ordenesEnMapa.map(
                                (orden) => (
                                    <CircleMarker
                                        key={
                                            orden.IdOrden
                                        }
                                        center={[
                                            orden.LatitudMapa,
                                            orden.LongitudMapa
                                        ]}
                                        radius={9}
                                        pathOptions={{
                                            color:
                                                obtenerColorEstado(
                                                    orden.EstadoOT
                                                ),

                                            fillColor:
                                                obtenerColorEstado(
                                                    orden.EstadoOT
                                                ),

                                            fillOpacity:
                                                0.85,

                                            weight: 3
                                        }}
                                    >
                                        <Popup
                                            minWidth={260}
                                            maxWidth={330}
                                        >
                                            <div className="popup-orden-mapa">
                                                <div className="popup-mapa-titulo">
                                                    <strong>
                                                        OT{" "}
                                                        {
                                                            orden.CodigoOT
                                                        }
                                                    </strong>

                                                    <span
                                                        className={`popup-estado-mapa ${obtenerClaseEstado(
                                                            orden.EstadoOT
                                                        )}`}
                                                    >
                                                        {mostrarEstado(
                                                            orden.EstadoOT ||
                                                                "Sin estado"
                                                        )}
                                                    </span>
                                                </div>

                                                {orden.CoordenadasInvertidas && (
                                                    <div className="mapa-aviso-coordenadas">
                                                        Las coordenadas fueron corregidas automáticamente.
                                                    </div>
                                                )}

                                                <div className="popup-mapa-dato">
                                                    <span>
                                                        Cliente
                                                    </span>

                                                    <strong>
                                                        {orden.Cliente ||
                                                            "Sin cliente"}
                                                    </strong>
                                                </div>

                                                <div className="popup-mapa-dato">
                                                    <span>
                                                        Dirección
                                                    </span>

                                                    <strong>
                                                        {orden.Direccion ||
                                                            "Sin dirección"}
                                                    </strong>
                                                </div>

                                                <div className="popup-mapa-dato">
                                                    <span>
                                                        Distrito
                                                    </span>

                                                    <strong>
                                                        {orden.Distrito ||
                                                            "Sin distrito"}
                                                    </strong>
                                                </div>

                                                <div className="popup-mapa-dato">
                                                    <span>
                                                        Agenda
                                                    </span>

                                                    <strong>
                                                        {formatearFecha(
                                                            orden.FechaAgenda
                                                        )}{" "}
                                                        -{" "}
                                                        {orden.Horario ||
                                                            "Sin horario"}
                                                    </strong>
                                                </div>

                                                <div className="popup-mapa-dato">
                                                    <span>
                                                        Técnico
                                                    </span>

                                                    <strong>
                                                        {orden.Tecnico ||
                                                            "Sin técnico asignado"}
                                                    </strong>
                                                </div>

                                                <a
                                                    className="popup-enlace-mapa"
                                                    href={`https://www.google.com/maps?q=${orden.LatitudMapa},${orden.LongitudMapa}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                >
                                                    Abrir ubicación
                                                </a>
                                            </div>
                                        </Popup>
                                    </CircleMarker>
                                )
                            )}
                        </MapContainer>
                    )}
                </div>

                <aside className="mapa-panel-ordenes">
                    <div className="mapa-panel-encabezado">
                        <h2>
                            Órdenes visibles
                        </h2>

                        <span>
                            {ordenesEnMapa.length}
                        </span>
                    </div>

                    {filtradasSinCoordenadas >
                        0 && (
                        <div className="mapa-aviso-coordenadas">
                            {
                                filtradasSinCoordenadas
                            }{" "}
                            resultado(s) no aparecen
                            porque no tienen coordenadas
                            válidas dentro de Perú.
                        </div>
                    )}

                    <div className="mapa-lista-ordenes">
                        {ordenesEnMapa.length >
                        0 ? (
                            ordenesEnMapa.map(
                                (orden) => (
                                    <article
                                        className="mapa-item-orden"
                                        key={
                                            orden.IdOrden
                                        }
                                    >
                                        <div className="mapa-item-superior">
                                            <strong>
                                                OT{" "}
                                                {
                                                    orden.CodigoOT
                                                }
                                            </strong>

                                            <span
                                                className={`popup-estado-mapa ${obtenerClaseEstado(
                                                    orden.EstadoOT
                                                )}`}
                                            >
                                                {mostrarEstado(
                                                    orden.EstadoOT ||
                                                        "Sin estado"
                                                )}
                                            </span>
                                        </div>

                                        <h3>
                                            {orden.Cliente ||
                                                "Sin cliente"}
                                        </h3>

                                        <p>
                                            {orden.Direccion ||
                                                "Sin dirección"}
                                        </p>

                                        <small>
                                            {orden.Distrito ||
                                                "Sin distrito"}
                                            {" · "}
                                            {orden.Tecnico ||
                                                "Sin técnico"}
                                        </small>

                                        {orden.CoordenadasInvertidas && (
                                            <small>
                                                Coordenadas corregidas automáticamente.
                                            </small>
                                        )}

                                        <a
                                            href={`https://www.google.com/maps?q=${orden.LatitudMapa},${orden.LongitudMapa}`}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            Ver ubicación
                                        </a>
                                    </article>
                                )
                            )
                        ) : (
                            <div className="mapa-sin-resultados">
                                No existen órdenes con
                                coordenadas válidas para
                                los filtros seleccionados.
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </section>
    );
}

export default Mapa;