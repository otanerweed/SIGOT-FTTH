import { useEffect, useRef, useState } from "react";

import { obtenerToken } from "../services/authService";
import { API_BASE_URL } from "../services/api";
import "./ControlOperativoPage.css";
import html2canvas from "html2canvas";
import ExcelJS from "exceljs";

function formatearHora(valor) {

    if (!valor) {
        return "—";
    }

    // SQL Server TIME como texto
    // Ejemplo: "07:04:00"
    if (
        typeof valor === "string" &&
        /^\d{2}:\d{2}(:\d{2})?$/.test(valor)
    ) {
        return valor.slice(0, 5);
    }

    // Fecha/hora proveniente de OFSC
    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
        return "—";
    }

    return fecha.toLocaleTimeString("es-PE", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
}


function formatearHoraManual(valor) {

    if (!valor) {
        return "—";
    }

    // SQL Server TIME recibido como Date
    if (valor instanceof Date) {
        const horas = String(valor.getUTCHours()).padStart(2, "0");
        const minutos = String(valor.getUTCMinutes()).padStart(2, "0");

        return `${horas}:${minutos}`;
    }

    // SQL Server TIME recibido como texto
    if (typeof valor === "string") {

        const coincidencia =
            valor.match(/^(\d{2}):(\d{2})/);

        if (coincidencia) {
            return `${coincidencia[1]}:${coincidencia[2]}`;
        }
    }

    return "—";
}
function claseEstado(estado) {
    switch (estado) {
        case "A TIEMPO":
            return "estado-a-tiempo";

        case "TARDE":
            return "estado-tarde";

        case "SIN REGISTRO DE ACTIVACION":
            return "estado-sin-registro";

        default:
            return "estado-general";
    }
}

function ControlOperativoPage() {
    const [fecha, setFecha] = useState("2026-09-10");
    const [datos, setDatos] = useState([]);
    const [, setResumenCelulas] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [error, setError] = useState("");
    const [mostrarCorreccion, setMostrarCorreccion] = useState(false);
    const [tecnicoCorreccion, setTecnicoCorreccion] = useState(null);
    const [mostrarJornada, setMostrarJornada] = useState(false);
    const [tecnicoJornada, setTecnicoJornada] = useState(null);
    const [horaCorreccion, setHoraCorreccion] = useState("");
    const [horaCierreCorreccion, setHoraCierreCorreccion] = useState("");
    const [observacionInicioSeleccionada, setObservacionInicioSeleccionada] = useState("");
    const [observacionCierreSeleccionada, setObservacionCierreSeleccionada] = useState("");
    const [observacionInicioTexto, setObservacionInicioTexto] = useState("");
    const [observacionCierreTexto, setObservacionCierreTexto] = useState("");
    const [observacionAdicional, setObservacionAdicional] = useState("");
    const [guardandoCorreccion, setGuardandoCorreccion] = useState(false);
    const [estadoJornada, setEstadoJornada] = useState("LABORABLE");
    const [motivoJornada, setMotivoJornada] = useState("");
    const [observacionJornada, setObservacionJornada] = useState("");
    const [guardandoJornada, setGuardandoJornada] = useState(false);
    const [reporteSemanal, setReporteSemanal] = useState(null);
    const reporteImagenRef = useRef(null);

    async function cargarControlRuta() {
        try {
            setCargando(true);
            setError("");

            const token = obtenerToken();
            const respuesta = await fetch(
                `${API_BASE_URL}/control-operativo/ruta?fecha=${fecha}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const resultado = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    resultado.mensaje ||
                    "No se pudo obtener el control operativo."
                );
            }

            setDatos(resultado.datos || []);
            setResumenCelulas(
                resultado.resumenCelulas || []
            );
        } catch (err) {
            console.error(
                "Error al cargar Control Operativo:",
                err
            );

            setDatos([]);
            setError(err.message);
        } finally {
            setCargando(false);
        }
    }

    async function probarReporteSemanal() {
        try {

            const token = obtenerToken();

            // =====================================
            // CALCULAR LUNES Y SÁBADO DE LA SEMANA
            // SEGÚN LA FECHA SELECCIONADA
            // =====================================

            const [anio, mes, dia] =
                fecha.split("-").map(Number);

            const fechaSeleccionada = new Date(
                Date.UTC(anio, mes - 1, dia)
            );

            const diaSemana =
                fechaSeleccionada.getUTCDay();

            // Domingo = 0
            // Lunes   = 1
            const diferenciaLunes =
                diaSemana === 0
                    ? -6
                    : 1 - diaSemana;

            const fechaLunes =
                new Date(fechaSeleccionada);

            fechaLunes.setUTCDate(
                fechaLunes.getUTCDate() +
                diferenciaLunes
            );

            const fechaSabado =
                new Date(fechaLunes);

            fechaSabado.setUTCDate(
                fechaSabado.getUTCDate() + 5
            );

            const formatearFechaAPI = (fecha) => {
                const anio = fecha.getUTCFullYear();
                const mes = String(
                    fecha.getUTCMonth() + 1
                ).padStart(2, "0");
                const dia = String(
                    fecha.getUTCDate()
                ).padStart(2, "0");

                return `${anio}-${mes}-${dia}`;
            };

            const fechaInicio =
                formatearFechaAPI(fechaLunes);

            const fechaFin =
                formatearFechaAPI(fechaSabado);


        // =====================================
        // CONSULTAR REPORTE
        // =====================================

        const respuesta = await fetch(
            `${API_BASE_URL}/control-operativo/reporte-semanal?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const resultado =
            await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                resultado.mensaje ||
                "No se pudo obtener el reporte semanal."
            );
        }

        setReporteSemanal(resultado);

        console.log(
            "REPORTE SEMANAL:",
            resultado
        );

    } catch (error) {

        console.error(
            "ERROR REPORTE SEMANAL:",
            error
        );

    }
}
    // =====================================
    // ABRIR CORRECCIÓN DE INICIO Y CIERRE
    // =====================================

    function abrirCorreccionRuta(item) {
        setTecnicoCorreccion(item);

        // =====================================
        // CARGAR HORA DE INICIO
        // =====================================

        setHoraCorreccion(
            item.InicioRutaUTC
                ? new Date(item.InicioRutaUTC).toLocaleTimeString(
                    "es-PE",
                    {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false
                    }
                )
                : ""
        );

        // =====================================
        // CARGAR HORA DE CIERRE
        // =====================================

        setHoraCierreCorreccion(
            item.FinRutaUTC
                ? new Date(item.FinRutaUTC).toLocaleTimeString(
                    "es-PE",
                    {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false
                    }
                )
                : ""
        );

        // =====================================
        // OBSERVACIONES ESTÁNDAR
        // =====================================

        const observacionesInicio = [
            "OFSC no registró la activación de ruta.",
            "Inicio registrado fuera de OFSC.",
            "Incidencia de aplicativo OFSC.",
            "Corrección validada por supervisor."
        ];

        const observacionesCierre = [
            "OFSC no registró el cierre de ruta.",
            "Cierre registrado fuera de OFSC.",
            "Incidencia de aplicativo OFSC.",
            "Corrección validada por supervisor."
        ];

        // =====================================
        // CARGAR OBSERVACIÓN DE INICIO
        // =====================================

        const observacionInicioGuardada =
            item.ObservacionInicioRuta?.trim() || "";

        const observacionInicioEncontrada =
            observacionesInicio.find(
                (observacion) =>
                    observacionInicioGuardada === observacion ||
                    observacionInicioGuardada.startsWith(
                        `${observacion} `
                    )
            );

        if (observacionInicioEncontrada) {
            setObservacionInicioSeleccionada(
                observacionInicioEncontrada
            );

            const textoAdicional =
                observacionInicioGuardada
                    .slice(observacionInicioEncontrada.length)
                    .trim();

            setObservacionInicioTexto(
                textoAdicional
            );
        } else if (observacionInicioGuardada) {
            setObservacionInicioSeleccionada("OTRA");
            setObservacionInicioTexto(
                observacionInicioGuardada
            );
        } else {
            setObservacionInicioSeleccionada("");
            setObservacionInicioTexto("");
        }

        // =====================================
        // CARGAR OBSERVACIÓN DE CIERRE
        // =====================================

        const observacionCierreGuardada =
            item.ObservacionCierreRuta?.trim() || "";

        const observacionCierreEncontrada =
            observacionesCierre.find(
                (observacion) =>
                    observacionCierreGuardada === observacion ||
                    observacionCierreGuardada.startsWith(
                        `${observacion} `
                    )
            );

        if (observacionCierreEncontrada) {
            setObservacionCierreSeleccionada(
                observacionCierreEncontrada
            );

            const textoAdicional =
                observacionCierreGuardada
                    .slice(observacionCierreEncontrada.length)
                    .trim();

            setObservacionCierreTexto(
                textoAdicional
            );
        } else if (observacionCierreGuardada) {
            setObservacionCierreSeleccionada("OTRA");
            setObservacionCierreTexto(
                observacionCierreGuardada
            );
        } else {
            setObservacionCierreSeleccionada("");
            setObservacionCierreTexto("");
        }

        // =====================================
        // LIMPIAR OBSERVACIÓN ADICIONAL
        // =====================================

        setObservacionAdicional("");

        setMostrarCorreccion(true);
    }

    // =====================================
    // ABRIR GESTIÓN DE JORNADA
    // =====================================

    function abrirGestionJornada(item) {
        console.log("ABRIENDO JORNADA:", item);

        setTecnicoJornada(item);

        setEstadoJornada(item.EstadoJornada || "LABORABLE");
        setMotivoJornada(item.MotivoJornada || "");
        setObservacionJornada(item.ObservacionJornada || "");

        setMostrarJornada(true);
    }
    // =====================================
    // GUARDAR CORRECCIÓN DE INICIO Y/O CIERRE
    // =====================================

    async function guardarCorreccionRuta() {
        if (!tecnicoCorreccion) {
            return;
        }

        if (!horaCorreccion && !horaCierreCorreccion) {
            alert(
                "Debe indicar la hora de inicio, la hora de cierre o ambas."
            );
            return;
        }

        try {
            setGuardandoCorreccion(true);

            const token = obtenerToken();

            // =====================================
            // CONSTRUIR OBSERVACIÓN DE INICIO
            // =====================================

            let observacionInicioBase = "";

            if (observacionInicioSeleccionada === "OTRA") {
                observacionInicioBase =
                    observacionInicioTexto.trim();
            } else if (observacionInicioSeleccionada) {
                observacionInicioBase =
                    observacionInicioSeleccionada;
            } else {
                observacionInicioBase =
                    tecnicoCorreccion.ObservacionInicioRuta ||
                    "Corrección manual de inicio de ruta.";
            }

            const observacionInicioFinal = [
                observacionInicioBase,
                observacionAdicional.trim()
            ]
                .filter(Boolean)
                .join(" ");

            // =====================================
            // CONSTRUIR OBSERVACIÓN DE CIERRE
            // =====================================

            let observacionCierreBase = "";

            if (observacionCierreSeleccionada === "OTRA") {
                observacionCierreBase =
                    observacionCierreTexto.trim();
            } else if (observacionCierreSeleccionada) {
                observacionCierreBase =
                    observacionCierreSeleccionada;
            } else {
                observacionCierreBase =
                    tecnicoCorreccion.ObservacionCierreRuta ||
                    "Corrección manual de cierre de ruta.";
            }

            const observacionCierreFinal = [
                observacionCierreBase,
                observacionAdicional.trim()
            ]
                .filter(Boolean)
                .join(" ");

            // =====================================
            // CORREGIR INICIO DE RUTA
            // =====================================

            if (horaCorreccion) {
                const respuestaInicio = await fetch(
                    `${API_BASE_URL}/control-operativo/ruta/correccion`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            fecha,
                            idTecnico:
                                tecnicoCorreccion.IdTecnico,
                            horaInicioReal:
                                `${horaCorreccion}:00`,
                            observacion:
                                observacionInicioFinal
                        })
                    }
                );

                const resultadoInicio =
                    await respuestaInicio.json();

                if (!respuestaInicio.ok) {
                    throw new Error(
                        resultadoInicio.mensaje ||
                        "No se pudo guardar la corrección de inicio."
                    );
                }
            }

            // =====================================
            // CORREGIR CIERRE DE RUTA
            // =====================================

            if (horaCierreCorreccion) {
                const respuestaCierre = await fetch(
                    `${API_BASE_URL}/control-operativo/ruta/cierre/correccion`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            fecha,
                            idTecnico:
                                tecnicoCorreccion.IdTecnico,
                            horaCierreReal:
                                `${horaCierreCorreccion}:00`,
                            observacion:
                                observacionCierreFinal
                        })
                    }
                );

                const resultadoCierre =
                    await respuestaCierre.json();

                if (!respuestaCierre.ok) {
                    throw new Error(
                        resultadoCierre.mensaje ||
                        "No se pudo guardar la corrección de cierre."
                    );
                }
            }

            alert("Corrección guardada correctamente.");

            setMostrarCorreccion(false);
            setTecnicoCorreccion(null);

            setHoraCorreccion("");
            setHoraCierreCorreccion("");

            setObservacionInicioSeleccionada("");
            setObservacionCierreSeleccionada("");

            setObservacionInicioTexto("");
            setObservacionCierreTexto("");

            setObservacionAdicional("");

            await cargarControlRuta();

        } catch (err) {
            console.error(
                "Error al guardar corrección:",
                err
            );

            alert(err.message);

        } finally {
            setGuardandoCorreccion(false);
        }
    }

    async function guardarJornada() {
        if (!tecnicoJornada) return;

        if (estadoJornada === "NO LABORABLE" && !motivoJornada) {
            alert("Seleccione el motivo de la jornada.");
            return;
        }

        try {
            setGuardandoJornada(true);

            const token = obtenerToken();

            const respuesta = await fetch(
                `${API_BASE_URL}/control-operativo/ruta/jornada`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        fecha: fecha,
                        idTecnico: tecnicoJornada.IdTecnico,
                        estadoJornada: estadoJornada,
                        motivo: estadoJornada === "NO LABORABLE"
                            ? motivoJornada
                            : null,
                        observacion: observacionJornada || null,
                    }),
                }
            );

            const data = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(
                    data.mensaje || "No se pudo guardar la jornada."
                );
            }

            alert("Jornada guardada correctamente.");

            setMostrarJornada(false);
            setTecnicoJornada(null);

            setEstadoJornada("LABORABLE");
            setMotivoJornada("");
            setObservacionJornada("");


        } catch (error) {
            console.error("Error al guardar jornada:", error);
            alert(error.message || "Ocurrió un error al guardar la jornada.");
        } finally {
            setGuardandoJornada(false);
        }
    }

    useEffect(() => {
        cargarControlRuta();
        probarReporteSemanal();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fecha]);

    const [supervisorFiltro, setSupervisorFiltro] =
        useState("TODOS");

    const [estadoFiltro, setEstadoFiltro] =
        useState("TODOS");

    const [cierreFiltro, setCierreFiltro] =
        useState("TODOS");

    const [tecnicoFiltro, setTecnicoFiltro] = useState("");

    const supervisores = [
        ...new Set(
            datos
                .map((item) => item.Supervisor)
                .filter(Boolean)
        )
    ].sort();

    const datosFiltrados = datos.filter(
        (item) => {
            const coincideSupervisor =
                supervisorFiltro === "TODOS" ||
                item.Supervisor === supervisorFiltro;   
                      
            const textoTecnico = tecnicoFiltro
                .trim()
                .toLowerCase();

            const coincideTecnico =
                textoTecnico === "" ||
                item.NombreCompleto?.toLowerCase().includes(textoTecnico) ||
                item.DNI?.toString().toLowerCase().includes(textoTecnico);

            const coincideEstado =
                estadoFiltro === "TODOS" ||
                (estadoFiltro === "NO LABORABLE" &&
                    item.EstadoJornada === "NO LABORABLE") ||
                (estadoFiltro !== "NO LABORABLE" &&
                    item.EstadoInicioRuta === estadoFiltro);

            const coincideCierre =
                cierreFiltro === "TODOS" ||
                (
                    cierreFiltro === "CERRO" &&
                    item.FinRutaUTC
                ) ||
                (
                    cierreFiltro === "SIN_CIERRE" &&
                    !item.FinRutaUTC
                );

            return (
                coincideSupervisor &&
                coincideTecnico &&
                coincideEstado &&
                coincideCierre
            );
        }
    );

    const totalET = datosFiltrados.length;

    const noLaborable = datosFiltrados.filter(
        (item) => item.EstadoJornada === "NO LABORABLE"
    ).length;

    const aTiempo = datosFiltrados.filter(
        (item) =>
            item.EstadoJornada !== "NO LABORABLE" &&
            item.EstadoInicioRuta === "A TIEMPO"
    ).length;

    const tarde = datosFiltrados.filter(
        (item) =>
            item.EstadoJornada !== "NO LABORABLE" &&
            item.EstadoInicioRuta === "TARDE"
    ).length;

    const sinRegistro = datosFiltrados.filter(
        (item) =>
            item.EstadoJornada !== "NO LABORABLE" &&
            item.EstadoInicioRuta === "SIN REGISTRO DE ACTIVACION"
    ).length;

    const cerroRuta = datosFiltrados.filter(
        (item) =>
            item.EstadoJornada !== "NO LABORABLE" &&
            item.InicioRutaUTC &&
            item.FinRutaUTC
    ).length;

    const cerroSinInicio = datosFiltrados.filter(
        (item) =>
            item.EstadoJornada !== "NO LABORABLE" &&
            !item.InicioRutaUTC &&
            item.FinRutaUTC
    ).length;

    const sinCierre = datosFiltrados.filter(
        (item) =>
            item.EstadoJornada !== "NO LABORABLE" &&
            !item.FinRutaUTC
    ).length;

        const resumenCelulasFiltradas = datosFiltrados.reduce(
        (acumulado, item) => {

            const clave =
                `${item.Celula}-${item.Supervisor}`;

            let resumen = acumulado.find(
                (celula) =>
                    celula.clave === clave
            );

            if (!resumen) {
                resumen = {
                    clave,
                    Celula: item.Celula,
                    Supervisor: item.Supervisor,
                    TotalET: 0,
                    NoLaborable: 0,
                    A_Tiempo: 0,
                    Tarde: 0,
                    SinRegistro: 0,
                    CerroRuta: 0,
                    CerroSinInicio: 0,
                    SinCierre: 0
                };

                acumulado.push(resumen);
            }

            // =====================================
            // JORNADA NO LABORABLE
            // =====================================

            if (item.EstadoJornada === "NO LABORABLE") {
                resumen.NoLaborable++;
                return acumulado;
            }

            // =====================================
            // ET LABORABLE
            // =====================================

            resumen.TotalET++;

            if (
                item.EstadoInicioRuta ===
                "A TIEMPO"
            ) {
                resumen.A_Tiempo++;
            }

            if (
                item.EstadoInicioRuta ===
                "TARDE"
            ) {
                resumen.Tarde++;
            }

            if (
                item.EstadoInicioRuta ===
                "SIN REGISTRO DE ACTIVACION"
            ) {
                resumen.SinRegistro++;
            }

            if (
                item.InicioRutaUTC &&
                item.FinRutaUTC
            ) {
                resumen.CerroRuta++;

            } else if (
                !item.InicioRutaUTC &&
                item.FinRutaUTC
            ) {
                resumen.CerroSinInicio++;

            } else {
                resumen.SinCierre++;
            }

            return acumulado;

        },
        []
    );


    // =====================================
    // GENERAR IMAGEN DEL REPORTE SEMANAL
    // =====================================

    async function generarImagenWhatsApp() {

        if (!reporteImagenRef.current) {
            alert("No se encontró la plantilla del reporte.");
            return;
        }

        try {

            const canvas = await html2canvas(
                reporteImagenRef.current,
                {
                    backgroundColor: "#ffffff",
                    scale: 2,
                    useCORS: true
                }
            );

            const imagen = canvas.toDataURL("image/png");

            const enlace = document.createElement("a");

            enlace.href = imagen;

            enlace.download =
                `Control_Ruta_${reporteSemanal?.fechaInicio || "reporte"}_${reporteSemanal?.fechaFin || ""}.png`;

            enlace.click();

        } catch (error) {

            console.error(
                "Error al generar imagen del reporte:",
                error
            );

            alert(
                "No se pudo generar la imagen del reporte."
            );
        }
    }

    
        // =====================================
        // GENERAR IMAGEN DEL REPORTE SEMANAL
        // =====================================


        // =====================================
        // EXPORTAR REPORTE SEMANAL A EXCEL
        // =====================================

        async function exportarExcelSemanal() {

            if (!reporteSemanal?.ok || !reporteSemanal?.detalleReporte?.length) {
                alert("No hay información disponible para exportar.");
                return;
            }

            try {

                const filas = [];

                reporteSemanal.detalleReporte.forEach((grupo) => {

                    grupo.tecnicos.forEach((tecnico) => {

                        tecnico.dias.forEach((dia) => {

                            const fechaTexto = String(dia.fecha).slice(0, 10);

                            const [anio, mes, diaNumero] = fechaTexto.split("-");
                            const fechaExcel = `${diaNumero}/${mes}/${anio}`;

                            filas.push({
                                "Célula": grupo.Celula,
                                "Supervisor": grupo.Supervisor,
                                "Código ET": tecnico.CodigoTecnico,
                                "Especialista Técnico": tecnico.NombreCompleto,
                                "Tipo": tecnico.TipoTecnico,
                                "Fecha": fechaExcel,

                                "Inicio de Ruta":
                                    dia.estadoJornada === "NO LABORABLE"
                                        ? "NO APLICA"
                                        : dia.inicioManual
                                            ? formatearHoraManual(dia.inicioManual)
                                            : dia.inicioRuta
                                                ? formatearHora(dia.inicioRuta)
                                                : "—",

                                "Estado Inicio":
                                    dia.estadoJornada === "NO LABORABLE"
                                        ? "NO LABORABLE"
                                        : dia.estadoInicio,

                                "Cierre de Ruta":
                                    dia.estadoJornada === "NO LABORABLE"
                                        ? "NO APLICA"
                                        : dia.cierreManual
                                            ? formatearHoraManual(dia.cierreManual)
                                            : dia.finRuta
                                                ? formatearHora(dia.finRuta)
                                                : "—",

                                "Estado Cierre":
                                    dia.estadoJornada === "NO LABORABLE"
                                        ? "NO APLICA"
                                        : dia.estadoCierre
                            });

                        });

                    });

                });

                const libro = new ExcelJS.Workbook();

                libro.creator = "SIGOT-FTTH";
                libro.lastModifiedBy = "SIGOT-FTTH";
                libro.created = new Date();
                libro.modified = new Date();

                const hoja = libro.addWorksheet("Control de Ruta");

                // =====================================
                // CONFIGURACIÓN DE LA HOJA
                // =====================================

                hoja.views = [
                    {
                        state: "frozen",
                        ySplit: 5
                    }
                ];

                hoja.mergeCells("A1:J1");
                hoja.mergeCells("A2:J2");
                hoja.mergeCells("A3:J3");

                hoja.getCell("A1").value = "HOME CONNECTED SAC";
                hoja.getCell("A2").value = "CONTROL DE RUTA";
                hoja.getCell("A3").value =
                    `Periodo: ${reporteSemanal.fechaInicio} al ${reporteSemanal.fechaFin}`;

                // =====================================
                // TÍTULOS
                // =====================================

                hoja.getCell("A1").font = {
                    name: "Arial",
                    size: 16,
                    bold: true,
                    color: { argb: "FFFFFF" }
                };

                hoja.getCell("A1").alignment = {
                    horizontal: "center",
                    vertical: "middle"
                };

                hoja.getCell("A1").fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "1F4E78" }
                };

                hoja.getCell("A2").font = {
                    name: "Arial",
                    size: 14,
                    bold: true,
                    color: { argb: "1F1F1F" }
                };

                hoja.getCell("A2").alignment = {
                    horizontal: "center",
                    vertical: "middle"
                };

                hoja.getCell("A3").font = {
                    name: "Arial",
                    size: 11,
                    italic: true,
                    color: { argb: "595959" }
                };

                hoja.getCell("A3").alignment = {
                    horizontal: "center",
                    vertical: "middle"
                };

                hoja.getRow(1).height = 28;
                hoja.getRow(2).height = 24;
                hoja.getRow(3).height = 22;

                // =====================================
                // ENCABEZADOS
                // =====================================

                const encabezados = [
                    "Célula",
                    "Supervisor",
                    "Código ET",
                    "Especialista Técnico",
                    "Tipo",
                    "Fecha",
                    "Inicio de Ruta",
                    "Estado Inicio",
                    "Cierre de Ruta",
                    "Estado Cierre"
                ];

                const filaEncabezado = hoja.getRow(5);

                encabezados.forEach((encabezado, indice) => {
                    const celda = filaEncabezado.getCell(indice + 1);

                    celda.value = encabezado;

                    celda.font = {
                        name: "Arial",
                        size: 10,
                        bold: true,
                        color: { argb: "FFFFFF" }
                    };

                    celda.fill = {
                        type: "pattern",
                        pattern: "solid",
                        fgColor: { argb: "305496" }
                    };

                    celda.alignment = {
                        horizontal: "center",
                        vertical: "middle",
                        wrapText: true
                    };

                    celda.border = {
                        top: { style: "thin", color: { argb: "D9E2F3" } },
                        bottom: { style: "thin", color: { argb: "D9E2F3" } },
                        left: { style: "thin", color: { argb: "D9E2F3" } },
                        right: { style: "thin", color: { argb: "D9E2F3" } }
                    };
                });

                filaEncabezado.height = 32;

                // =====================================
                // DATOS
                // =====================================

                filas.forEach((fila) => {

                    const nuevaFila = hoja.addRow(
                        encabezados.map((campo) => fila[campo])
                    );

                    nuevaFila.eachCell((celda) => {

                        celda.font = {
                            name: "Arial",
                            size: 10
                        };

                        celda.alignment = {
                            vertical: "middle"
                        };

                        celda.border = {
                            top: { style: "thin", color: { argb: "E6E6E6" } },
                            bottom: { style: "thin", color: { argb: "E6E6E6" } },
                            left: { style: "thin", color: { argb: "E6E6E6" } },
                            right: { style: "thin", color: { argb: "E6E6E6" } }
                        };

                    });

                });

                // =====================================
                // ANCHOS
                // =====================================

                hoja.columns = [
                    { key: "celula", width: 12 },
                    { key: "supervisor", width: 28 },
                    { key: "codigo", width: 14 },
                    { key: "especialista", width: 34 },
                    { key: "tipo", width: 16 },
                    { key: "fecha", width: 14 },
                    { key: "inicio", width: 18 },
                    { key: "estadoInicio", width: 18 },
                    { key: "cierre", width: 18 },
                    { key: "estadoCierre", width: 18 }
                ];

                // =====================================
                // ALINEACIÓN
                // =====================================

                hoja.eachRow((fila, numeroFila) => {

                    if (numeroFila >= 6) {

                        fila.getCell(1).alignment = {
                            horizontal: "center",
                            vertical: "middle"
                        };

                        fila.getCell(3).alignment = {
                            horizontal: "center",
                            vertical: "middle"
                        };

                        fila.getCell(5).alignment = {
                            horizontal: "center",
                            vertical: "middle"
                        };

                        fila.getCell(6).alignment = {
                            horizontal: "center",
                            vertical: "middle"
                        };

                        fila.getCell(7).alignment = {
                            horizontal: "center",
                            vertical: "middle"
                        };

                        fila.getCell(8).alignment = {
                            horizontal: "center",
                            vertical: "middle"
                        };

                        fila.getCell(9).alignment = {
                            horizontal: "center",
                            vertical: "middle"
                        };

                        fila.getCell(10).alignment = {
                            horizontal: "center",
                            vertical: "middle"
                        };

                    }

                });

                // =====================================
                // COLORES DE ESTADOS
                // =====================================

                for (let filaNumero = 6; filaNumero <= filas.length + 5; filaNumero++) {

                    const fila = hoja.getRow(filaNumero);

                    const estadoInicio = fila.getCell(8);
                    const estadoCierre = fila.getCell(10);

                    // Estado de inicio
                    if (estadoInicio.value === "A_TIEMPO") {

                        estadoInicio.fill = {
                            type: "pattern",
                            pattern: "solid",
                            fgColor: { argb: "E2F0D9" }
                        };

                        estadoInicio.font = {
                            name: "Arial",
                            size: 10,
                            bold: true,
                            color: { argb: "548235" }
                        };

                    } else if (estadoInicio.value === "TARDE") {

                        estadoInicio.fill = {
                            type: "pattern",
                            pattern: "solid",
                            fgColor: { argb: "FFF2CC" }
                        };

                        estadoInicio.font = {
                            name: "Arial",
                            size: 10,
                            bold: true,
                            color: { argb: "BF9000" }
                        };

                    } else if (estadoInicio.value === "SIN_REGISTRO") {

                        estadoInicio.fill = {
                            type: "pattern",
                            pattern: "solid",
                            fgColor: { argb: "F4CCCC" }
                        };

                        estadoInicio.font = {
                            name: "Arial",
                            size: 10,
                            bold: true,
                            color: { argb: "990000" }
                        };

                    } else if (estadoInicio.value === "NO LABORABLE") {

                        estadoInicio.fill = {
                            type: "pattern",
                            pattern: "solid",
                            fgColor: { argb: "E7E6E6" }
                        };

                        estadoInicio.font = {
                            name: "Arial",
                            size: 10,
                            bold: true,
                            color: { argb: "666666" }
                        };

                    }

                    // Estado de cierre
                    if (estadoCierre.value === "CERRO") {

                        estadoCierre.fill = {
                            type: "pattern",
                            pattern: "solid",
                            fgColor: { argb: "E2F0D9" }
                        };

                        estadoCierre.font = {
                            name: "Arial",
                            size: 10,
                            bold: true,
                            color: { argb: "548235" }
                        };

                    } else if (estadoCierre.value === "SIN_CIERRE") {

                        estadoCierre.fill = {
                            type: "pattern",
                            pattern: "solid",
                            fgColor: { argb: "FCE4D6" }
                        };

                        estadoCierre.font = {
                            name: "Arial",
                            size: 10,
                            bold: true,
                            color: { argb: "C65911" }
                        };

                    } else if (estadoCierre.value === "NO APLICA") {

                        estadoCierre.fill = {
                            type: "pattern",
                            pattern: "solid",
                            fgColor: { argb: "E7E6E6" }
                        };

                        estadoCierre.font = {
                            name: "Arial",
                            size: 10,
                            bold: true,
                            color: { argb: "666666" }
                        };

                    }

                }

                // =====================================
                // FILTRO
                // =====================================

                hoja.autoFilter = {
                    from: "A5",
                    to: `J${filas.length + 5}`
                };

                // =====================================
                // DESCARGA
                // =====================================

                const buffer = await libro.xlsx.writeBuffer();

                const blob = new Blob(
                    [buffer],
                    {
                        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    }
                );

                const url = URL.createObjectURL(blob);

                const enlace = document.createElement("a");

                enlace.href = url;

                enlace.download =
                    `Control_Ruta_${reporteSemanal.fechaInicio}_${reporteSemanal.fechaFin}.xlsx`;

                document.body.appendChild(enlace);

                enlace.click();

                document.body.removeChild(enlace);

                setTimeout(() => {
                    URL.revokeObjectURL(url);
                }, 1000);

            } catch (error) {

                console.error(
                    "Error al exportar Excel con ExcelJS:",
                    error
                );

                alert(
                    "No se pudo generar el archivo Excel."
                );
            }
        }


        return (    
        <div className="control-operativo-page">

            <div className="control-operativo-header">
                <div>
                    <span className="control-operativo-subtitulo">
                        CENTRO DE OPERACIONES
                    </span>

                    <h1>
                        Control Operativo
                    </h1>

                    <p>
                        Control diario de inicio y cierre
                        de ruta de los Especialistas Técnicos.
                    </p>
                </div>

                <div className="control-operativo-filtros">

                    <div className="control-operativo-filtro">
                        <label htmlFor="fecha-control">
                            Fecha
                        </label>

                        <input
                            id="fecha-control"
                            type="date"
                            value={fecha}
                            onChange={(e) =>
                                setFecha(e.target.value)
                            }
                        />
                    </div>

                    <div className="control-operativo-filtro">
                        <label htmlFor="supervisor-control">
                            Supervisor
                        </label>

                        <select
                            id="supervisor-control"
                            value={supervisorFiltro}
                            onChange={(e) =>
                                setSupervisorFiltro(e.target.value)
                            }
                        >
                            <option value="TODOS">
                                Todos
                            </option>

                            {supervisores.map((supervisor) => (
                                <option
                                    key={supervisor}
                                    value={supervisor}
                                >
                                    {supervisor}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="control-operativo-filtro">
                        <label htmlFor="estado-control">
                            Estado
                        </label>

                        <select
                            id="estado-control"
                            value={estadoFiltro}
                            onChange={(e) =>
                                setEstadoFiltro(e.target.value)
                            }
                        >
                            <option value="TODOS">
                                Todos
                            </option>

                            <option value="A TIEMPO">
                                A tiempo
                            </option>

                            <option value="TARDE">
                                Tarde
                            </option>

                            <option value="SIN REGISTRO DE ACTIVACION">
                                Sin registro
                            </option>
                            <option value="NO LABORABLE">
                                No laborable
                            </option>
                        </select>
                    </div>

                    <div className="control-operativo-filtro">
                        <label htmlFor="cierre-control">
                            Cierre de ruta
                        </label>

                        <select
                            id="cierre-control"
                            value={cierreFiltro}
                            onChange={(e) =>
                                setCierreFiltro(e.target.value)
                            }
                        >
                            <option value="TODOS">
                                Todos
                            </option>

                            <option value="CERRO">
                                Cerró ruta
                            </option>

                            <option value="SIN_CIERRE">
                                Sin cierre
                            </option>
                        </select>
                    </div>

                    <div className="control-operativo-filtro">
                        <label htmlFor="tecnico-control">
                            Buscar técnico
                        </label>

                        <input
                            id="tecnico-control"
                            type="text"
                            value={tecnicoFiltro}
                            onChange={(e) =>
                                setTecnicoFiltro(e.target.value)
                            }
                            placeholder="Nombre, apellido o DNI"
                        />
                    </div>

                </div>
            </div>

            <div className="control-operativo-cards">

                <div className="control-operativo-card">
                    <span>Total ET</span>
                    <strong>{totalET}</strong>
                    <small>
                        Especialistas registrados
                    </small>
                </div>

                <div className="control-operativo-card">
                    <span>A tiempo</span>
                    <strong>{aTiempo}</strong>
                    <small>
                        Inicio hasta las 07:30
                    </small>
                </div>

                <div className="control-operativo-card">
                    <span>Tarde</span>
                    <strong>{tarde}</strong>
                    <small>
                        Inicio posterior a las 07:30
                    </small>
                </div>

                <div className="control-operativo-card">
                    <span>Sin registro</span>
                    <strong>{sinRegistro}</strong>
                    <small>
                        Sin evidencia de activación
                    </small>
                </div>

                <div className="control-operativo-card">
                    <span>No laborable</span>
                    <strong>{noLaborable}</strong>
                    <small>
                        Jornada no laborable
                    </small>
                </div>

                <div className="control-operativo-card">
                    <span>Cerró ruta</span>
                    <strong>{cerroRuta}</strong>
                    <small>
                        Ruta cerrada correctamente
                    </small>
                </div>
                
                <div className="control-operativo-card">
                    <span>Cerró sin inicio</span>
                    <strong>{cerroSinInicio}</strong>
                    <small>
                        Cierre sin evidencia de inicio
                    </small>
                </div>

                <div className="control-operativo-card">
                    <span>Sin cierre</span>
                    <strong>{sinCierre}</strong>
                    <small>
                        Sin evidencia de cierre
                    </small>
                </div>            


            </div>
            <div className="control-operativo-celulas">            

                <div className="control-operativo-seccion-titulo">
                    <div>
                        <h2>Control por célula</h2>
                        <span>
                            Seguimiento consolidado por supervisor
                        </span>
                    </div>
                </div>

                <div className="control-operativo-celulas-grid">

                    {resumenCelulasFiltradas.map((celula) => (
                        <div
                            className="control-operativo-celula-card"
                            key={`${celula.Celula}-${celula.Supervisor}`}
                        >
                            <div className="celula-card-header">
                                <div>
                                    <span className="celula-nombre">
                                        {celula.Celula}
                                    </span>

                                    <strong>
                                        {celula.Supervisor}
                                    </strong>
                                </div>

                                <span className="celula-total">
                                    {celula.TotalET} ET
                                </span>
                            </div>

                            <div className="celula-indicadores">

                                <div>
                                    <span>A tiempo</span>
                                    <strong>
                                        {celula.A_Tiempo}
                                    </strong>
                                </div>

                                <div>
                                    <span>Tarde</span>
                                    <strong>
                                        {celula.Tarde}
                                    </strong>
                                </div>

                                <div>
                                    <span>Sin registro</span>
                                    <strong>
                                        {celula.SinRegistro}
                                    </strong>
                                </div>

                                <div>
                                    <span>No laborable</span>
                                    <strong>
                                        {celula.NoLaborable}
                                    </strong>
                                </div>

                                <div>
                                    <span>Cerró ruta</span>
                                    <strong>
                                        {celula.CerroRuta}
                                    </strong>
                                </div>

                                <div>
                                    <span>Cerró sin inicio</span>
                                    <strong>
                                        {celula.CerroSinInicio}
                                    </strong>
                                </div>

                                <div>
                                    <span>Sin cierre</span>
                                    <strong>
                                        {celula.SinCierre}
                                    </strong>
                                </div>

                            </div>
                        </div>
                    ))}

                </div>

                        </div>

                        {/* =====================================
                            REPORTE SEMANAL
                        ===================================== */}

                        {reporteSemanal?.ok && (
                            <div className="control-operativo-reporte-semanal">

                                <div className="control-operativo-semanal-header">

                                    <div>
                                        <span className="control-operativo-semanal-etiqueta">
                                            CONTROL DE RUTA
                                        </span>

                                        <h2>
                                            Reporte semanal
                                        </h2>

                                        <p>
                                            Periodo:{" "}
                                            {reporteSemanal.fechaInicio} al{" "}
                                            {reporteSemanal.fechaFin}
                                        </p>
                                    </div>

                                </div>


                                {/* ================================
                                    ACCIONES DEL REPORTE
                                ================================= */}

                                <div className="control-operativo-semanal-acciones">

                                    <button
                                        type="button"
                                        className="btn-reporte-whatsapp"
                                        onClick={generarImagenWhatsApp}
                                    >
                                        📲 Generar WhatsApp
                                    </button>

                                    <button
                                        type="button"
                                        className="btn-reporte-excel"
                                        onClick={exportarExcelSemanal}
                                    >
                                        📥 Exportar Excel
                                    </button>

                                </div>

                            </div>
                                                )}

                        {/* =====================================
                            PLANTILLA PARA IMAGEN DE WHATSAPP
                        ===================================== */}

                        {reporteSemanal?.ok && (
                            <div
                                ref={reporteImagenRef}
                                style={{
                                    position: "absolute",
                                    left: "-10000px",
                                    top: "0",
                                    width: "1000px",
                                    background: "#ffffff",
                                    color: "#0f172a",
                                    fontFamily:
                                        "Arial, Helvetica, sans-serif",
                                    padding: "36px",
                                    boxSizing: "border-box"
                                }}
                            >

                                {/* ================================
                                    ENCABEZADO
                                ================================= */}

                                <div
                                    style={{
                                        borderBottom:
                                            "3px solid #2563eb",
                                        paddingBottom: "18px",
                                        marginBottom: "24px"
                                    }}
                                >

                                    <div
                                        style={{
                                            fontSize: "13px",
                                            fontWeight: "700",
                                            color: "#2563eb",
                                            letterSpacing: "0.8px",
                                            marginBottom: "6px"
                                        }}
                                    >
                                        HOME CONNECTED SAC
                                    </div>

                                    <div
                                        style={{
                                            fontSize: "28px",
                                            fontWeight: "800",
                                            marginBottom: "6px"
                                        }}
                                    >
                                        CONTROL DE RUTA
                                    </div>

                                    <div
                                        style={{
                                            fontSize: "18px",
                                            fontWeight: "600",
                                            color: "#475569"
                                        }}
                                    >
                                        REPORTE SEMANAL
                                        </div>

                                    <div
                                        style={{
                                            marginTop: "10px",
                                            fontSize: "14px",
                                            color: "#64748b"
                                        }}
                                    >
                                        Periodo operativo:{" "}

                                        {(() => {

                                            const fechasOperativas =
                                                (reporteSemanal.detalle || [])
                                                    .map(item =>
                                                        String(
                                                            item.FechaControl
                                                        ).slice(0, 10)
                                                    )
                                                    .filter(Boolean)
                                                    .sort();

                                            const fechaInicio =
                                                fechasOperativas[0] ||
                                                reporteSemanal.fechaInicio;

                                            const fechaFin =
                                                fechasOperativas[
                                                    fechasOperativas.length - 1
                                                ] ||
                                                reporteSemanal.fechaFin;

                                            const formatearFecha = (
                                                fecha
                                            ) =>
                                                new Date(
                                                    `${fecha}T12:00:00`
                                                ).toLocaleDateString(
                                                    "es-PE",
                                                    {
                                                        day: "2-digit",
                                                        month: "2-digit",
                                                        year: "numeric"
                                                    }
                                                );

                                            return (
                                                `${formatearFecha(fechaInicio)} al ` +
                                                `${formatearFecha(fechaFin)}`
                                            );

                                        })()}
                                    </div>

                                    </div>


                                {/* ================================
                                    RESUMEN GENERAL
                                ================================= */}

                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns:
                                            "repeat(4, 1fr)",
                                        gap: "10px",
                                        marginBottom: "24px"
                                    }}
                                >

                                    <div
                                        style={{
                                            padding: "14px",
                                            border:
                                                "1px solid #dbeafe",
                                            borderRadius: "10px",
                                            background: "#eff6ff",
                                            textAlign: "center"
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: "11px",
                                                color: "#64748b"
                                            }}
                                        >
                                            ET laborables
                                        </div>

                                        <strong
                                            style={{
                                                display: "block",
                                                fontSize: "24px",
                                                marginTop: "4px"
                                            }}
                                        >
                                            {
                                                reporteSemanal.resumen
                                                    .totalET
                                            }
                                        </strong>
                                    </div>


                                    <div
                                        style={{
                                            padding: "14px",
                                            border:
                                                "1px solid #dcfce7",
                                            borderRadius: "10px",
                                            background: "#f0fdf4",
                                            textAlign: "center"
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: "11px",
                                                color: "#64748b"
                                            }}
                                        >
                                            A tiempo
                                        </div>

                                        <strong
                                            style={{
                                                display: "block",
                                                fontSize: "24px",
                                                marginTop: "4px"
                                            }}
                                        >
                                            {
                                                reporteSemanal.resumen
                                                    .aTiempo
                                            }
                                        </strong>
                                    </div>


                                    <div
                                        style={{
                                            padding: "14px",
                                            border:
                                                "1px solid #fef3c7",
                                            borderRadius: "10px",
                                            background: "#fffbeb",
                                            textAlign: "center"
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: "11px",
                                                color: "#64748b"
                                            }}
                                        >
                                            Tarde
                                        </div>

                                        <strong
                                            style={{
                                                display: "block",
                                                fontSize: "24px",
                                                marginTop: "4px"
                                            }}
                                        >
                                            {
                                                reporteSemanal.resumen
                                                    .tarde
                                            }
                                        </strong>
                                    </div>


                                    <div
                                        style={{
                                            padding: "14px",
                                            border:
                                                "1px solid #fee2e2",
                                            borderRadius: "10px",
                                            background: "#fef2f2",
                                            textAlign: "center"
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: "11px",
                                                color: "#64748b"
                                            }}
                                        >
                                            Sin cierre
                                        </div>

                                        <strong
                                            style={{
                                                display: "block",
                                                fontSize: "24px",
                                                marginTop: "4px"
                                            }}
                                        >
                                            {
                                                reporteSemanal.resumen
                                                    .sinCierre
                                            }
                                        </strong>
                                    </div>

                                </div>


                                {/* ================================
                                    CÉLULAS
                                ================================= */}

                                {reporteSemanal.detalleReporte?.map(
                                    (celula) => (

                                        <div
                                            key={`${celula.Celula}-${celula.Supervisor}`}
                                            style={{
                                                marginBottom: "24px",
                                                border:
                                                    "1px solid #dfe6ef",
                                                borderRadius: "12px",
                                                overflow: "hidden"
                                            }}
                                        >

                                            {/* CABECERA CÉLULA */}

                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent:
                                                        "space-between",
                                                    alignItems: "center",
                                                    padding:
                                                        "14px 16px",
                                                    background:
                                                        "#f8fafc",
                                                    borderBottom:
                                                        "1px solid #e2e8f0"
                                                }}
                                            >

                                                <div>

                                                    <div
                                                        style={{
                                                            fontSize: "17px",
                                                            fontWeight:
                                                                "800"
                                                        }}
                                                    >
                                                        {celula.Celula}
                                                    </div>

                                                    <div
                                                        style={{
                                                            marginTop: "3px",
                                                            fontSize: "12px",
                                                            color: "#64748b"
                                                        }}
                                                    >
                                                        Supervisor:{" "}
                                                        {
                                                            celula.Supervisor
                                                        }
                                                    </div>

                                                </div>

                                                <div
                                                    style={{
                                                        fontSize: "13px",
                                                        fontWeight:
                                                            "700",
                                                        color: "#334155"
                                                    }}
                                                >
                                                    {celula.TotalET} ET
                                                </div>

                                            </div>


                                            {/* TABLA */}

                                            <table
                                                style={{
                                                    width: "100%",
                                                    borderCollapse:
                                                        "collapse",
                                                    tableLayout:
                                                        "fixed"
                                                }}
                                            >

                                                <thead>

                                                    <tr>

                                                        <th
                                                            style={{
                                                                width:
                                                                    "270px",
                                                                textAlign:
                                                                    "left",
                                                                padding:
                                                                    "10px",
                                                                fontSize:
                                                                    "11px",
                                                                color:
                                                                    "#64748b",
                                                                background:
                                                                    "#ffffff",
                                                                borderBottom:
                                                                    "1px solid #e2e8f0"
                                                            }}
                                                        >
                                                            ESPECIALISTA TÉCNICO
                                                        </th>

                                                        {[
                                                            ...new Set(
                                                                (
                                                                    reporteSemanal
                                                                        .detalle ||
                                                                    []
                                                                )
                                                                    .map(
                                                                        (
                                                                            item
                                                                        ) =>
                                                                            String(
                                                                                item.FechaControl
                                                                            ).slice(
                                                                                0,
                                                                                10
                                                                            )
                                                                    )
                                                                    .filter(
                                                                        (
                                                                            fecha
                                                                        ) => {
                                                                            const dia =
                                                                                new Date(
                                                                                    `${fecha}T12:00:00`
                                                                                ).getDay();

                                                                            return (
                                                                                dia !==
                                                                                0
                                                                            );
                                                                        }
                                                                    )
                                                            )
                                                        ]
                                                            .sort()
                                                            .map(
                                                                (
                                                                    fecha
                                                                ) => (

                                                                    <th
                                                                        key={
                                                                            fecha
                                                                        }
                                                                        style={{
                                                                            padding:
                                                                                "8px 4px",
                                                                            fontSize:
                                                                                "10px",
                                                                            textAlign:
                                                                                "center",
                                                                            color:
                                                                                "#64748b",
                                                                            borderBottom:
                                                                                "1px solid #e2e8f0"
                                                                        }}
                                                                    >
                                                                        {new Date(
                                                                            `${fecha}T12:00:00`
                                                                        ).toLocaleDateString(
                                                                            "es-PE",
                                                                            {
                                                                                weekday:
                                                                                    "short",
                                                                                day: "2-digit"
                                                                            }
                                                                        )}
                                                                    </th>

                                                                )
                                                            )}

                                                    </tr>

                                                </thead>


                                                <tbody>

                                                    {celula.tecnicos
                                                        ?.slice()
                                                        .sort(
                                                            (
                                                                a,
                                                                b
                                                            ) =>
                                                                a.NombreCompleto.localeCompare(
                                                                    b.NombreCompleto
                                                                )
                                                        )
                                                        .map(
                                                            (
                                                                tecnico
                                                            ) => (

                                                                <tr
                                                                    key={
                                                                        tecnico.IdTecnico
                                                                    }
                                                                >

                                                                    <td
                                                                        style={{
                                                                            padding:
                                                                                "10px",
                                                                            borderBottom:
                                                                                "1px solid #eef2f7",
                                                                            fontSize:
                                                                                "11px",
                                                                            fontWeight:
                                                                                "700",
                                                                            color:
                                                                                "#1e293b"
                                                                        }}
                                                                    >
                                                                        {
                                                                            tecnico.NombreCompleto
                                                                        }
                                                                    </td>


                                                                    {[
                                                                        ...new Set(
                                                                            (
                                                                                reporteSemanal
                                                                                    .detalle ||
                                                                                []
                                                                            )
                                                                                .map(
                                                                                    (
                                                                                        item
                                                                                    ) =>
                                                                                        String(
                                                                                            item.FechaControl
                                                                                        ).slice(
                                                                                            0,
                                                                                            10
                                                                                        )
                                                                                )
                                                                                .filter(
                                                                                    (
                                                                                        fecha
                                                                                    ) => {
                                                                                        const dia =
                                                                                            new Date(
                                                                                                `${fecha}T12:00:00`
                                                                                            ).getDay();

                                                                                        return (
                                                                                            dia !==
                                                                                            0
                                                                                        );
                                                                                    }
                                                                                )
                                                                        )
                                                                    ]
                                                                        .sort()
                                                                        .map(
                                                                            (
                                                                                fecha
                                                                            ) => {

                                                                                const dia =
                                                                                    tecnico.dias?.find(
                                                                                        (
                                                                                            item
                                                                                        ) =>
                                                                                            String(
                                                                                                item.fecha
                                                                                            ).slice(
                                                                                                0,
                                                                                                10
                                                                                            ) ===
                                                                                            fecha
                                                                                    );

                                                                                const estadoInicio =
                                                                                    dia?.estadoInicio ||
                                                                                    "";

                                                                                const estadoCierre =
                                                                                    dia?.estadoCierre ||
                                                                                    "";

                                                                                const horaInicio =
                                                                                    dia?.inicioManual
                                                                                        ? formatearHoraManual(dia.inicioManual)
                                                                                        : dia?.inicioRuta
                                                                                        ? formatearHora(dia.inicioRuta)
                                                                                        : "—";

                                                                                const horaCierre =
                                                                                    dia?.cierreManual
                                                                                        ? formatearHoraManual(dia.cierreManual)
                                                                                        : dia?.finRuta
                                                                                        ? formatearHora(dia.finRuta)
                                                                                        : "—";

                                                                                let fondo =
                                                                                    "#ffffff";

                                                                                if (
                                                                                    estadoInicio ===
                                                                                    "A_TIEMPO"
                                                                                ) {
                                                                                    fondo =
                                                                                        "#f0fdf4";
                                                                                }

                                                                                if (
                                                                                    estadoInicio ===
                                                                                    "TARDE"
                                                                                ) {
                                                                                    fondo =
                                                                                        "#fffbeb";
                                                                                }

                                                                                if (
                                                                                    estadoInicio ===
                                                                                    "SIN_REGISTRO"
                                                                                ) {
                                                                                    fondo =
                                                                                        "#fef2f2";
                                                                                }

                                                                                if (
                                                                                    estadoInicio ===
                                                                                    "NO LABORABLE"
                                                                                ) {
                                                                                    fondo =
                                                                                        "#f8fafc";
                                                                                }

                                                                                return (
                                                                                    <td
                                                                                        key={fecha}
                                                                                        style={{
                                                                                            padding: "6px 3px",
                                                                                            textAlign: "center",
                                                                                            verticalAlign: "middle",
                                                                                            background: fondo,
                                                                                            borderBottom: "1px solid #eef2f7"
                                                                                        }}
                                                                                    >

                                                                                        {/* ESTADO DE INICIO */}

                                                                                        <div
                                                                                            style={{
                                                                                                fontSize: "12px",
                                                                                                fontWeight: "800"
                                                                                            }}
                                                                                        >
                                                                                            {estadoInicio === "A_TIEMPO"
                                                                                                ? "🟢"
                                                                                                : estadoInicio === "TARDE"
                                                                                                ? "🟡"
                                                                                                : estadoInicio === "SIN_REGISTRO"
                                                                                                ? "🔴"
                                                                                                : estadoInicio === "NO LABORABLE"
                                                                                                ? "⚪"
                                                                                                : "—"}
                                                                                        </div>


                                                                                        {/* HORA DE INICIO */}

                                                                                        <div
                                                                                            style={{
                                                                                                marginTop: "3px",
                                                                                                fontSize: "10px",
                                                                                                fontWeight: "700",
                                                                                                color: "#475569"
                                                                                            }}
                                                                                        >
                                                                                            {estadoInicio === "NO LABORABLE"
                                                                                                ? "No lab."
                                                                                                : horaInicio}
                                                                                        </div>


                                                                                                {/* ESTADO DE CIERRE */}

                                                                                                {estadoInicio === "NO LABORABLE" ? (

                                                                                                    <div
                                                                                                        style={{
                                                                                                            marginTop: "2px",
                                                                                                            fontSize: "9px",
                                                                                                            fontWeight: "700",
                                                                                                            color: "#94a3b8"
                                                                                                        }}
                                                                                                    >
                                                                                                        — No aplica
                                                                                                    </div>

                                                                                                ) : estadoCierre === "CERRO" ? (

                                                                                                    <div
                                                                                                        style={{
                                                                                                            marginTop: "2px",
                                                                                                            fontSize: "9px",
                                                                                                            fontWeight: "700",
                                                                                                            color: "#16a34a"
                                                                                                        }}
                                                                                                    >
                                                                                                        ✓ {horaCierre}
                                                                                                    </div>

                                                                                                ) : (

                                                                                                    <div
                                                                                                        style={{
                                                                                                            marginTop: "2px",
                                                                                                            fontSize: "9px",
                                                                                                            fontWeight: "700",
                                                                                                            color: "#dc2626"
                                                                                                        }}
                                                                                                    >
                                                                                                        ⚠ Sin cierre
                                                                                                    </div>

                                                                                                )}

                                                                                    </td>
                                                                                );
                                                                            }
                                                                        )}

                                                                </tr>

                                                            )
                                                        )}

                                                </tbody>

                                            </table>

                                        </div>

                                    )
                                )}


                                {/* ================================
                                    LEYENDA
                                ================================= */}

                                <div
                                    style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: "16px",
                                        paddingTop: "12px",
                                        borderTop:
                                            "1px solid #e2e8f0",
                                        fontSize: "10px",
                                        color: "#64748b"
                                    }}
                                >

                                    <span>
                                        🟢 A tiempo
                                    </span>

                                    <span>
                                        🟡 Tarde
                                    </span>

                                    <span>
                                        🔴 Sin registro
                                    </span>

                                    <span>
                                        ⚪ No laborable
                                    </span>

                                    <span>
                                        ✓ Cierre registrado
                                    </span>

                                    <span>
                                        ⚠ Sin cierre
                                    </span>

                                </div>


                                {/* ================================
                                    PIE
                                ================================= */}

                                <div
                                    style={{
                                        marginTop: "18px",
                                        paddingTop: "12px",
                                        borderTop:
                                            "1px solid #e2e8f0",
                                        display: "flex",
                                        justifyContent:
                                            "space-between",
                                        gap: "15px",
                                        fontSize: "10px",
                                        color: "#94a3b8"
                                    }}
                                >

                                    <span>
                                        SIGOT-FTTH · Control Operativo
                                    </span>

                                    <span>
                                        Hora objetivo: 07:30
                                    </span>

                                </div>

                            </div>
                        )}

                        {cargando && (
                            <div className="control-operativo-mensaje">
                                Cargando información...
                            </div>
                        )}

            {error && (
                <div className="control-operativo-error">
                    {error}
                </div>
            )}

            {!cargando && !error && (
                <div className="control-operativo-tabla-container">

                    <div className="control-operativo-tabla-header">
                        <div>
                            <h2>
                                Control de ruta
                            </h2>

                            <span>
                                Hora objetivo: <strong>07:30</strong>
                            </span>
                        </div>
                    </div>

                    <div className="control-operativo-tabla-scroll">

                        <table className="control-operativo-tabla">

                            <thead>
                                <tr>
                                    <th>Especialista Técnico</th>
                                    <th>DNI</th>
                                    <th>Célula</th>
                                    <th>Supervisor</th>
                                    <th>Objetivo</th>
                                    <th>Inicio ruta</th>
                                    <th>Fin ruta</th>
                                    <th>Cierre de ruta</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>

                            <tbody>

                                {datosFiltrados.map((item) => (
                                    <tr key={item.IdTecnico}>

                                        <td>
                                            <strong>
                                                {item.NombreCompleto}
                                            </strong>
                                        </td>

                                        <td>
                                            {item.DNI || "—"}
                                        </td>

                                        <td>
                                            {item.Celula || "—"}
                                        </td>

                                        <td>
                                            {item.Supervisor || "—"}
                                        </td>

                                        <td>
                                            07:30
                                        </td>

                                        <td>
                                            {formatearHora(
                                                item.InicioRutaUTC
                                            )}
                                        </td>

                                        <td>
                                            {formatearHora(
                                                item.FinRutaUTC
                                            )}
                                        </td>

                                        <td>
                                            {item.EstadoJornada === "NO LABORABLE" ? (
                                                <span className="estado-cierre-ruta estado-cierre-alerta">
                                                    NO APLICA
                                                </span>
                                            ) : item.FinRutaUTC &&
                                            !item.InicioRutaUTC ? (
                                                <span className="estado-cierre-ruta estado-cierre-alerta">
                                                    CERRÓ SIN INICIO
                                                </span>
                                            ) : item.FinRutaUTC ? (
                                                <span className="estado-cierre-ruta estado-cierre-ok">
                                                    CERRÓ RUTA
                                                </span>
                                            ) : (
                                                <span className="estado-cierre-ruta estado-cierre-pendiente">
                                                    SIN CIERRE
                                                </span>
                                            )}
                                        </td>

                                        <td>
                                            {item.EstadoJornada === "NO LABORABLE" ? (
                                                <>
                                                    <span className="estado-jornada-no-laborable">
                                                        NO LABORABLE
                                                    </span>

                                                    {item.MotivoJornada && (
                                                        <span className="jornada-motivo">
                                                            • {item.MotivoJornada}
                                                        </span>
                                                    )}

                                                    <button
                                                        type="button"
                                                        className="btn-jornada"
                                                        onClick={() =>
                                                            abrirGestionJornada(item)
                                                        }
                                                        title="Gestionar jornada"
                                                    >
                                                        ⚙️ Jornada
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <span
                                                        className={claseEstado(
                                                            item.EstadoInicioRuta
                                                        )}
                                                    >
                                                        {item.EstadoInicioRuta}
                                                    </span>

                                                    {item.InicioRutaCorregido === 1 ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                className="btn-corregir-ruta btn-editar-correccion"
                                                                onClick={() =>
                                                                    abrirCorreccionRuta(item)
                                                                }
                                                                title="Editar corrección"
                                                            >
                                                                ✏️ Editar
                                                            </button>

                                                            <span
                                                                className="ruta-corregida"
                                                                title={
                                                                    item.ObservacionInicioRuta ||
                                                                    "Corrección manual de inicio de ruta"
                                                                }
                                                            >
                                                                ✓ Corregido
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className="btn-corregir-ruta"
                                                            onClick={() =>
                                                                abrirCorreccionRuta(item)
                                                            }
                                                        >
                                                            ✏️ Corregir
                                                        </button>
                                                    )}

                                                    <button
                                                        type="button"
                                                        className="btn-jornada"
                                                        onClick={() =>
                                                            abrirGestionJornada(item)
                                                        }
                                                        title="Gestionar jornada"
                                                    >
                                                        ⚙️ Jornada
                                                    </button>
                                                </>
                                            )}
                                        </td>

                                    </tr>
                                ))}

                            </tbody>

                        </table>



                    </div>

                        {mostrarCorreccion && tecnicoCorreccion && (
    <div className="modal-correccion-overlay">

        <div className="modal-correccion">

            <div className="modal-correccion-header">
                <div>
                    <h3>
                        Corregir ruta
                    </h3>

                    <p>
                        {tecnicoCorreccion.NombreCompleto}
                    </p>
                </div>

                <button
                    type="button"
                    className="modal-correccion-cerrar"
                    onClick={() => {
                        setMostrarCorreccion(false);
                        setTecnicoCorreccion(null);
                    }}
                >
                    ×
                </button>
            </div>

            <div className="modal-correccion-body">

                <div className="modal-correccion-info">

                    <div>
                        <span>DNI</span>
                        <strong>
                            {tecnicoCorreccion.DNI || "—"}
                        </strong>
                    </div>

                    <div>
                        <span>Célula</span>
                        <strong>
                            {tecnicoCorreccion.Celula || "—"}
                        </strong>
                    </div>

                    <div>
                        <span>Estado actual</span>
                        <strong>
                            {tecnicoCorreccion.EstadoInicioRuta}
                        </strong>
                    </div>

                </div>

                <div className="form-correccion-grupo">
                    <label>
                        Hora real de inicio
                    </label>

                    <div className="campo-hora-manual">

                        <input
                            type="text"
                            value={horaCorreccion}
                            onChange={(e) => {
                                const valor = e.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 4);

                                let horaFormateada = valor;

                                if (valor.length > 2) {
                                    horaFormateada =
                                        `${valor.slice(0, 2)}:${valor.slice(2)}`;
                                }

                                setHoraCorreccion(horaFormateada);
                            }}
                            placeholder="HH:MM"
                            maxLength={5}
                            inputMode="numeric"
                        />

                        <button
                            type="button"
                            className="boton-reloj-hora"
                            onClick={() =>
                                document
                                    .getElementById("selector-hora-correccion")
                                    ?.showPicker()
                            }
                            title="Seleccionar hora"
                        >
                            🕒
                        </button>

                        <input
                            type="time"
                            id="selector-hora-correccion"
                            className="selector-hora-oculto"
                            value={horaCorreccion}
                            onChange={(e) =>
                                setHoraCorreccion(e.target.value)
                            }
                        />

                    </div>
                </div>

                <div className="form-correccion-grupo">
                    <label>
                        Hora real de cierre
                    </label>

                    <div className="campo-hora-manual">

                        <input
                            type="text"
                            value={horaCierreCorreccion}
                            onChange={(e) => {
                                const valor = e.target.value
                                    .replace(/\D/g, "")
                                    .slice(0, 4);

                                let horaFormateada = valor;

                                if (valor.length > 2) {
                                    horaFormateada =
                                        `${valor.slice(0, 2)}:${valor.slice(2)}`;
                                }

                                setHoraCierreCorreccion(horaFormateada);
                            }}
                            placeholder="HH:MM"
                            maxLength={5}
                            inputMode="numeric"
                        />

                        <button
                            type="button"
                            className="boton-reloj-hora"
                            onClick={() =>
                                document
                                    .getElementById(
                                        "selector-hora-cierre-correccion"
                                    )
                                    ?.showPicker()
                            }
                            title="Seleccionar hora"
                        >
                            🕒
                        </button>

                        <input
                            type="time"
                            id="selector-hora-cierre-correccion"
                            className="selector-hora-oculto"
                            value={horaCierreCorreccion}
                            onChange={(e) =>
                                setHoraCierreCorreccion(e.target.value)
                            }
                        />

                    </div>
                </div>

                <div className="form-correccion-grupo">

                    <label>
                        Observación de inicio
                    </label>

                    <select
                        value={observacionInicioSeleccionada}
                        onChange={(e) => {
                            const valor = e.target.value;

                            setObservacionInicioSeleccionada(valor);

                            if (valor !== "OTRA") {
                                setObservacionInicioTexto("");
                            }
                        }}
                    >
                        <option value="">
                            Seleccionar observación...
                        </option>

                        <option value="OFSC no registró la activación de ruta.">
                            OFSC no registró la activación de ruta.
                        </option>

                        <option value="Inicio registrado fuera de OFSC.">
                            Inicio registrado fuera de OFSC.
                        </option>

                        <option value="Incidencia de aplicativo OFSC.">
                            Incidencia de aplicativo OFSC.
                        </option>

                        <option value="Corrección validada por supervisor.">
                            Corrección validada por supervisor.
                        </option>

                        <option value="OTRA">
                            Otra observación
                        </option>
                    </select>

                    {observacionInicioSeleccionada === "OTRA" && (
                        <textarea
                            value={observacionInicioTexto}
                            onChange={(e) =>
                                setObservacionInicioTexto(e.target.value)
                            }
                            rows="3"
                            placeholder="Escriba la observación de inicio..."
                        />
                    )}

                </div>

                <div className="form-correccion-grupo">

                    <label>
                        Observación de cierre
                    </label>

                    <select
                        value={observacionCierreSeleccionada}
                        onChange={(e) => {
                            const valor = e.target.value;

                            setObservacionCierreSeleccionada(valor);

                            if (valor !== "OTRA") {
                                setObservacionCierreTexto("");
                            }
                        }}
                    >
                        <option value="">
                            Seleccionar observación...
                        </option>

                        <option value="OFSC no registró el cierre de ruta.">
                            OFSC no registró el cierre de ruta.
                        </option>

                        <option value="Cierre registrado fuera de OFSC.">
                            Cierre registrado fuera de OFSC.
                        </option>

                        <option value="Incidencia de aplicativo OFSC.">
                            Incidencia de aplicativo OFSC.
                        </option>

                        <option value="Corrección validada por supervisor.">
                            Corrección validada por supervisor.
                        </option>

                        <option value="OTRA">
                            Otra observación
                        </option>
                    </select>

                    {observacionCierreSeleccionada === "OTRA" && (
                        <textarea
                            value={observacionCierreTexto}
                            onChange={(e) =>
                                setObservacionCierreTexto(e.target.value)
                            }
                            rows="3"
                            placeholder="Escriba la observación de cierre..."
                        />
                    )}

                </div>

                <div className="form-correccion-grupo">

                    <label>
                        Observación adicional del supervisor
                    </label>

                    <textarea
                        value={observacionAdicional}
                        onChange={(e) =>
                            setObservacionAdicional(e.target.value)
                        }
                        rows="3"
                        placeholder="Escriba aquí cualquier detalle adicional..."
                    />

                </div>

            </div>

            <div className="modal-correccion-footer">

                <button
                    type="button"
                    className="btn-cancelar-correccion"
                    onClick={() => {
                        setMostrarCorreccion(false);
                        setTecnicoCorreccion(null);
                    }}
                    disabled={guardandoCorreccion}
                >
                    Cancelar
                </button>

                <button
                    type="button"
                    className="btn-guardar-correccion"
                    onClick={guardarCorreccionRuta}
                    disabled={guardandoCorreccion}
                >
                    {guardandoCorreccion
                        ? "Guardando..."
                        : "Guardar corrección"}
                </button>

            </div>

        </div>

    </div>
)}


{/* ========================================================= */}
{/* MODAL DE GESTIÓN DE JORNADA                               */}
{/* ========================================================= */}

{mostrarJornada && tecnicoJornada && (
    <div className="modal-correccion-overlay">

        <div className="modal-correccion">

            <div className="modal-correccion-header">

                <div>

                    <h3>
                        Gestionar jornada
                    </h3>

                    <p>
                        {tecnicoJornada.NombreCompleto}
                    </p>

                </div>

                <button
                    type="button"
                    className="modal-correccion-cerrar"
                    onClick={() => {
                        setMostrarJornada(false);
                        setTecnicoJornada(null);
                    }}
                >
                    ×
                </button>

            </div>


            <div className="modal-correccion-body">

                <div className="modal-correccion-info">

                    <div>
                        <span>DNI</span>

                        <strong>
                            {tecnicoJornada.DNI || "—"}
                        </strong>
                    </div>

                    <div>
                        <span>Célula</span>

                        <strong>
                            {tecnicoJornada.Celula || "—"}
                        </strong>
                    </div>

                    <div>
                        <span>Fecha</span>

                        <strong>
                            {fecha}
                        </strong>
                    </div>

                </div>


                <div className="form-correccion-grupo">

                    <label>
                        Estado de jornada
                    </label>

                    <select
                        value={estadoJornada}
                        onChange={(e) => {
                            const nuevoEstado = e.target.value;

                            setEstadoJornada(nuevoEstado);

                            if (nuevoEstado === "LABORABLE") {
                                setMotivoJornada("");
                            }
                        }}
                    >

                        <option value="LABORABLE">
                            LABORABLE
                        </option>

                        <option value="NO LABORABLE">
                            NO LABORABLE
                        </option>

                    </select>

                </div>


                {estadoJornada === "NO LABORABLE" && (

                    <div className="form-correccion-grupo">

                        <label>
                            Motivo
                        </label>

                        <select
                            value={motivoJornada}
                            onChange={(e) =>
                                setMotivoJornada(e.target.value)
                            }
                        >

                            <option value="">
                                Seleccionar motivo
                            </option>

                            <option value="Día no laborable">
                                Día no laborable
                            </option>

                            <option value="Vacaciones">
                                Vacaciones
                            </option>

                            <option value="Descanso">
                                Descanso
                            </option>

                            <option value="Otro">
                                Otro
                            </option>

                        </select>

                    </div>

                )}


                <div className="form-correccion-grupo">

                    <label>
                        Observación
                    </label>

                    <textarea
                        value={observacionJornada}
                        onChange={(e) =>
                            setObservacionJornada(e.target.value)
                        }
                        placeholder="Ingrese una observación..."
                        rows="4"
                    />

                </div>

            </div>


            <div className="modal-correccion-footer">

                <button
                    type="button"
                    className="btn-cancelar-correccion"
                    onClick={() => {
                        setMostrarJornada(false);
                        setTecnicoJornada(null);
                    }}
                >
                    Cancelar
                </button>


                <button
                    type="button"
                    className="btn-guardar-correccion"
                    onClick={guardarJornada}
                    disabled={guardandoJornada}
                >
                    {guardandoJornada
                        ? "Guardando..."
                        : "Guardar jornada"}
                </button>

            </div>

        </div>

    </div>
)}


</div>
)}

</div>
);
}

export default ControlOperativoPage;