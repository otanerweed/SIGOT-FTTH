import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState
} from "react";

import api from "../services/api";

import "./ImportarPage.css";

const REGISTROS_POR_PAGINA = 8;

function ImportarPage() {
    const inputArchivoRef = useRef(null);

    const [archivo, setArchivo] =
        useState(null);

    const [resultado, setResultado] =
        useState(null);

    const [mensajeError, setMensajeError] =
        useState("");

    const [importando, setImportando] =
        useState(false);

    const [historial, setHistorial] =
        useState([]);

    const [
        cargandoHistorial,
        setCargandoHistorial
    ] = useState(true);

    const [
        errorHistorial,
        setErrorHistorial
    ] = useState("");

    const [
        busquedaHistorial,
        setBusquedaHistorial
    ] = useState("");

    const [
        paginaHistorial,
        setPaginaHistorial
    ] = useState(1);

    // =====================================
    // FUNCIONES AUXILIARES
    // =====================================
    function obtenerTexto(valor) {
        return String(valor ?? "").trim();
    }

    function mostrarEstado(valor) {
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

    function obtenerClaseEstado(estado) {
        const valor = obtenerTexto(estado)
            .toUpperCase();

        if (valor === "ABIERTA") {
            return "estado-operacion-abierta";
        }

        if (valor === "CERRADA") {
            return "estado-operacion-cerrada";
        }

        if (
            valor === "ANULADA" ||
            valor === "CANCELADA"
        ) {
            return "estado-operacion-anulada";
        }

        return "estado-operacion-neutro";
    }

    // =====================================
    // CARGAR HISTORIAL
    // =====================================
    const cargarHistorial =
        useCallback(async () => {
            try {
                setCargandoHistorial(true);
                setErrorHistorial("");

                const respuesta =
                    await api.get(
                        "/importador/historial"
                    );

                setHistorial(
                    Array.isArray(
                        respuesta.data
                    )
                        ? respuesta.data
                        : []
                );
            } catch (error) {
                console.error(
                    "Error al cargar el historial de importaciones:",
                    error
                );

                setErrorHistorial(
                    error.response?.data?.mensaje ||
                        "No se pudo cargar el historial de importaciones."
                );
            } finally {
                setCargandoHistorial(false);
            }
        }, []);

    useEffect(() => {
        cargarHistorial();
    }, [cargarHistorial]);

    // =====================================
    // SELECCIONAR ARCHIVO
    // =====================================
    const seleccionarArchivo = (
        evento
    ) => {
        const archivoSeleccionado =
            evento.target.files[0];

        setArchivo(
            archivoSeleccionado || null
        );

        setResultado(null);
        setMensajeError("");
    };

    // =====================================
    // IMPORTAR EXCEL
    // =====================================
    const importarExcel = async () => {
        if (!archivo) {
            setMensajeError(
                "Debe seleccionar un archivo Excel."
            );

            return;
        }

        const extension = archivo.name
            .split(".")
            .pop()
            .toLowerCase();

        if (
            ![
                "xlsx",
                "xls"
            ].includes(extension)
        ) {
            setMensajeError(
                "El archivo seleccionado no es válido. Use un archivo .xlsx o .xls."
            );

            return;
        }

        try {
            setImportando(true);
            setMensajeError("");
            setResultado(null);

            const formData =
                new FormData();

            formData.append(
                "archivo",
                archivo
            );

            const respuesta =
                await api.post(
                    "/importador/ofsc",
                    formData
                );

            setResultado(
                respuesta.data
            );

            setArchivo(null);

            if (
                inputArchivoRef.current
            ) {
                inputArchivoRef.current.value =
                    "";
            }

            await cargarHistorial();
        } catch (error) {
            const mensaje =
                error.response?.data?.mensaje ||
                error.response?.data?.error ||
                "No se pudo procesar el archivo OFSC.";

            setMensajeError(mensaje);
        } finally {
            setImportando(false);
        }
    };

    const resumen =
        resultado?.resumen;

    const cantidadSinCambios =
        resumen?.sinCambios ??
        resumen?.duplicadas ??
        0;

    // =====================================
    // FILTRAR HISTORIAL
    // =====================================
    const historialFiltrado =
        useMemo(() => {
            const texto =
                busquedaHistorial
                    .trim()
                    .toLowerCase();

            if (!texto) {
                return historial;
            }

            return historial.filter(
                (operacion) => {
                    const contenido = [
                        operacion.IdOperacion,
                        operacion.NombreArchivo,
                        operacion.Estado,
                        operacion.Observaciones,
                        operacion.UsuarioResponsable,
                        operacion.NombreUsuarioResponsable,
                        operacion.RolResponsable
                    ]
                        .map(obtenerTexto)
                        .join(" ")
                        .toLowerCase();

                    return contenido.includes(
                        texto
                    );
                }
            );
        }, [
            historial,
            busquedaHistorial
        ]);

    useEffect(() => {
        setPaginaHistorial(1);
    }, [busquedaHistorial]);

    // =====================================
    // PAGINACIÓN
    // =====================================
    const totalPaginasHistorial =
        Math.max(
            1,
            Math.ceil(
                historialFiltrado.length /
                    REGISTROS_POR_PAGINA
            )
        );

    useEffect(() => {
        if (
            paginaHistorial >
            totalPaginasHistorial
        ) {
            setPaginaHistorial(
                totalPaginasHistorial
            );
        }
    }, [
        paginaHistorial,
        totalPaginasHistorial
    ]);

    const indiceInicial =
        (paginaHistorial - 1) *
        REGISTROS_POR_PAGINA;

    const indiceFinal =
        indiceInicial +
        REGISTROS_POR_PAGINA;

    const historialVisible =
        historialFiltrado.slice(
            indiceInicial,
            indiceFinal
        );

    return (
        <section className="importar-page">
            <div className="importar-encabezado">
                <h1>
                    Importar archivo OFSC
                </h1>

                <p>
                    Seleccione un archivo Excel exportado
                    desde OFSC para registrar órdenes
                    nuevas y sincronizar sus estados.
                </p>
            </div>

            <div className="importar-card">
                <div className="campo-archivo">
                    <label htmlFor="archivo-ofsc">
                        Archivo Excel
                    </label>

                    <input
                        ref={inputArchivoRef}
                        id="archivo-ofsc"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={
                            seleccionarArchivo
                        }
                        disabled={importando}
                    />

                    <small>
                        Formatos permitidos: .xlsx y .xls
                    </small>
                </div>

                {archivo && (
                    <div className="archivo-seleccionado">
                        <strong>
                            Archivo seleccionado:
                        </strong>{" "}
                        {archivo.name}
                    </div>
                )}

                <button
                    type="button"
                    className="boton-importar"
                    onClick={importarExcel}
                    disabled={importando}
                >
                    {importando
                        ? "Procesando archivo..."
                        : "Importar y sincronizar"}
                </button>
            </div>

            {mensajeError && (
                <div className="mensaje mensaje-error">
                    {mensajeError}
                </div>
            )}

            {resultado && (
                <div className="resultado-importacion">
                    <div className="mensaje mensaje-exito">
                        {resultado.mensaje}
                    </div>

                    {resultado.idOperacion && (
                        <p className="operacion-creada">
                            Operación registrada:
                            <strong>
                                {" "}#
                                {
                                    resultado.idOperacion
                                }
                            </strong>
                        </p>
                    )}

                    {resumen && (
                        <div className="resumen-importacion">
                            <div className="resumen-item">
                                <span>
                                    Total leídas
                                </span>

                                <strong>
                                    {resumen.totalLeidas ??
                                        0}
                                </strong>
                            </div>

                            <div className="resumen-item">
                                <span>
                                    Nuevas
                                </span>

                                <strong>
                                    {resumen.insertadas ??
                                        0}
                                </strong>
                            </div>

                            <div className="resumen-item">
                                <span>
                                    Actualizadas
                                </span>

                                <strong>
                                    {resumen.actualizadas ??
                                        0}
                                </strong>
                            </div>

                            <div className="resumen-item">
                                <span>
                                    Sin cambios
                                </span>

                                <strong>
                                    {cantidadSinCambios}
                                </strong>
                            </div>

                            <div className="resumen-item">
                                <span>
                                    Rechazadas
                                </span>

                                <strong>
                                    {resumen.rechazadas ??
                                        0}
                                </strong>
                            </div>
                        </div>
                    )}

                    <div className="importar-nota">
                        Los datos procesados pueden revisarse
                        en el módulo{" "}
                        <strong>
                            Órdenes
                        </strong>.
                    </div>
                </div>
            )}

            <div className="historial-importaciones">
                <div className="historial-importaciones-encabezado">
                    <div>
                        <h2>
                            Historial de importaciones
                        </h2>

                        <p>
                            Consulte los archivos procesados y
                            el usuario responsable de cada operación.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="boton-actualizar-historial"
                        onClick={
                            cargarHistorial
                        }
                        disabled={
                            cargandoHistorial
                        }
                    >
                        {cargandoHistorial
                            ? "Actualizando..."
                            : "Actualizar"}
                    </button>
                </div>

                <div className="historial-filtros">
                    <label htmlFor="buscar-importacion">
                        Buscar
                    </label>

                    <input
                        id="buscar-importacion"
                        type="search"
                        placeholder="Archivo, responsable, usuario, rol o estado"
                        value={
                            busquedaHistorial
                        }
                        onChange={(evento) =>
                            setBusquedaHistorial(
                                evento.target.value
                            )
                        }
                    />
                </div>

                {errorHistorial && (
                    <div className="mensaje mensaje-error">
                        {errorHistorial}
                    </div>
                )}

                {cargandoHistorial && (
                    <div className="estado-historial">
                        Cargando historial de importaciones...
                    </div>
                )}

                {!cargandoHistorial &&
                    !errorHistorial &&
                    historial.length === 0 && (
                        <div className="estado-historial">
                            No existen importaciones registradas.
                        </div>
                    )}

                {!cargandoHistorial &&
                    historial.length > 0 && (
                        <>
                            <div className="tabla-historial-contenedor">
                                <table className="tabla-historial-importaciones">
                                    <thead>
                                        <tr>
                                            <th>
                                                Operación
                                            </th>

                                            <th>
                                                Archivo
                                            </th>

                                            <th>
                                                Fecha
                                            </th>

                                            <th>
                                                Cantidades
                                            </th>

                                            <th>
                                                Estado
                                            </th>

                                            <th>
                                                Responsable
                                            </th>

                                            <th>
                                                Rol
                                            </th>

                                            <th>
                                                Observaciones
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {historialVisible.length >
                                        0 ? (
                                            historialVisible.map(
                                                (
                                                    operacion
                                                ) => (
                                                    <tr
                                                        key={
                                                            operacion.IdOperacion
                                                        }
                                                    >
                                                        <td>
                                                            <strong className="codigo-operacion">
                                                                #
                                                                {
                                                                    operacion.IdOperacion
                                                                }
                                                            </strong>
                                                        </td>

                                                        <td>
                                                            <strong className="nombre-archivo-importacion">
                                                                {operacion.NombreArchivo ||
                                                                    "Sin nombre"}
                                                            </strong>
                                                        </td>

                                                        <td>
                                                            {formatearFechaHora(
                                                                operacion.FechaImportacion
                                                            )}
                                                        </td>

                                                        <td>
                                                            <div className="cantidades-operacion">
                                                                <span>
                                                                    OT:{" "}
                                                                    <strong>
                                                                        {operacion.CantidadOT ??
                                                                            0}
                                                                    </strong>
                                                                </span>

                                                                <span>
                                                                    Asignadas:{" "}
                                                                    <strong>
                                                                        {operacion.CantidadAsignadas ??
                                                                            0}
                                                                    </strong>
                                                                </span>

                                                                <span>
                                                                    Pendientes:{" "}
                                                                    <strong>
                                                                        {operacion.CantidadPendientes ??
                                                                            0}
                                                                    </strong>
                                                                </span>

                                                                <span>
                                                                    Finalizadas:{" "}
                                                                    <strong>
                                                                        {operacion.CantidadFinalizadas ??
                                                                            0}
                                                                    </strong>
                                                                </span>
                                                            </div>
                                                        </td>

                                                        <td>
                                                            <span
                                                                className={`badge-estado-operacion ${obtenerClaseEstado(
                                                                    operacion.Estado
                                                                )}`}
                                                            >
                                                                {mostrarEstado(
                                                                    operacion.Estado ||
                                                                        "Sin estado"
                                                                )}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            <strong className="responsable-importacion">
                                                                {operacion.UsuarioResponsable ||
                                                                    "Sin responsable"}
                                                            </strong>

                                                            <small>
                                                                {operacion.NombreUsuarioResponsable
                                                                    ? `@${operacion.NombreUsuarioResponsable}`
                                                                    : operacion.IdUsuario
                                                                      ? `ID usuario: ${operacion.IdUsuario}`
                                                                      : "Sin usuario"}
                                                            </small>
                                                        </td>

                                                        <td>
                                                            <span className="badge-rol-importacion">
                                                                {operacion.RolResponsable ||
                                                                    "Sin rol"}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            <div className="observaciones-importacion">
                                                                {operacion.Observaciones ||
                                                                    "Sin observaciones"}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            )
                                        ) : (
                                            <tr>
                                                <td
                                                    colSpan="8"
                                                    className="sin-resultados-historial"
                                                >
                                                    No se encontraron importaciones con la búsqueda realizada.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {historialFiltrado.length >
                                0 && (
                                <div className="paginacion-historial">
                                    <span>
                                        Mostrando{" "}
                                        {indiceInicial +
                                            1}{" "}
                                        a{" "}
                                        {Math.min(
                                            indiceFinal,
                                            historialFiltrado.length
                                        )}{" "}
                                        de{" "}
                                        {
                                            historialFiltrado.length
                                        }
                                    </span>

                                    <div className="botones-paginacion-historial">
                                        <button
                                            type="button"
                                            disabled={
                                                paginaHistorial ===
                                                1
                                            }
                                            onClick={() =>
                                                setPaginaHistorial(
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
                                                paginaHistorial
                                            }{" "}
                                            de{" "}
                                            {
                                                totalPaginasHistorial
                                            }
                                        </span>

                                        <button
                                            type="button"
                                            disabled={
                                                paginaHistorial ===
                                                totalPaginasHistorial
                                            }
                                            onClick={() =>
                                                setPaginaHistorial(
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

export default ImportarPage;