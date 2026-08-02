import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";

import * as XLSX from "xlsx";

import {
    obtenerReporteGeneral
} from "../services/reportesService";

import "./ReportesPage.css";

function ReportesPage() {
    const [reporte, setReporte] =
        useState(null);

    const [cargando, setCargando] =
        useState(true);

    const [exportando, setExportando] =
        useState(false);

    const [error, setError] =
        useState("");

    // =====================================
    // CARGAR REPORTE
    // =====================================
    const cargarReporte =
        useCallback(async () => {
            try {
                setCargando(true);
                setError("");

                const respuesta =
                    await obtenerReporteGeneral();

                setReporte(
                    respuesta?.reporte || null
                );
            } catch (errorPeticion) {
                console.error(
                    "Error al cargar el reporte:",
                    errorPeticion
                );

                setError(
                    errorPeticion.response?.data?.mensaje ||
                        "No se pudo cargar el reporte general."
                );
            } finally {
                setCargando(false);
            }
        }, []);

    useEffect(() => {
        cargarReporte();
    }, [cargarReporte]);

    // =====================================
    // INFORMACIÓN DEL REPORTE
    // =====================================
    const resumenOrdenes =
        useMemo(
            () =>
                reporte?.resumenOrdenes ||
                {},
            [reporte]
        );

    const resumenAsignaciones =
        useMemo(
            () =>
                reporte?.resumenAsignaciones ||
                {},
            [reporte]
        );

    const resultadosOfsc =
        useMemo(
            () =>
                reporte?.resultadosOfsc ||
                {},
            [reporte]
        );

    const asignacionesPorTecnico =
        useMemo(
            () =>
                reporte?.asignacionesPorTecnico ||
                [],
            [reporte]
        );

    const ordenesPorDistrito =
        useMemo(
            () =>
                reporte?.ordenesPorDistrito ||
                [],
            [reporte]
        );

    // =====================================
    // PORCENTAJES
    // =====================================
    const porcentajeFinalizadas =
        useMemo(() => {
            const total =
                Number(
                    resumenOrdenes.TotalOrdenes
                ) || 0;

            const finalizadas =
                Number(
                    resumenOrdenes.Finalizadas
                ) || 0;

            if (total === 0) {
                return 0;
            }

            return Number(
                (
                    (finalizadas / total) *
                    100
                ).toFixed(1)
            );
        }, [resumenOrdenes]);

    const porcentajeCanceladas =
        useMemo(() => {
            const total =
                Number(
                    resumenOrdenes.TotalOrdenes
                ) || 0;

            const canceladas =
                Number(
                    resumenOrdenes.Canceladas
                ) || 0;

            if (total === 0) {
                return 0;
            }

            return Number(
                (
                    (canceladas / total) *
                    100
                ).toFixed(1)
            );
        }, [resumenOrdenes]);

    // =====================================
    // OBTENER VALOR NUMÉRICO
    // =====================================
    function obtenerNumero(valor) {
        return Number(valor) || 0;
    }

    // =====================================
    // EXPORTAR REPORTE A EXCEL
    // =====================================
    function exportarExcel() {
        if (!reporte) {
            setError(
                "No existen datos disponibles para exportar."
            );

            return;
        }

        try {
            setExportando(true);
            setError("");

            const libro =
                XLSX.utils.book_new();

            libro.Props = {
                Title:
                    "Reporte general SIGOT-FTTH",
                Subject:
                    "Indicadores operativos",
                Author:
                    "SIGOT-FTTH",
                CreatedDate:
                    new Date()
            };

            // =================================
            // HOJA 1: RESUMEN GENERAL
            // =================================
            const datosResumen = [
                [
                    "REPORTE GENERAL SIGOT-FTTH"
                ],
                [
                    "Fecha de generación",
                    new Date().toLocaleString(
                        "es-PE"
                    )
                ],
                [],
                [
                    "RESUMEN DE ÓRDENES"
                ],
                [
                    "Indicador",
                    "Cantidad"
                ],
                [
                    "Total de órdenes",
                    obtenerNumero(
                        resumenOrdenes.TotalOrdenes
                    )
                ],
                [
                    "Pendientes",
                    obtenerNumero(
                        resumenOrdenes.Pendientes
                    )
                ],
                [
                    "Iniciadas",
                    obtenerNumero(
                        resumenOrdenes.Iniciadas
                    )
                ],
                [
                    "Suspendidas",
                    obtenerNumero(
                        resumenOrdenes.Suspendidas
                    )
                ],
                [
                    "No realizadas",
                    obtenerNumero(
                        resumenOrdenes.NoRealizadas
                    )
                ],
                [
                    "Reprogramadas",
                    obtenerNumero(
                        resumenOrdenes.Reprogramadas
                    )
                ],
                [
                    "Finalizadas",
                    obtenerNumero(
                        resumenOrdenes.Finalizadas
                    )
                ],
                [
                    "Canceladas",
                    obtenerNumero(
                        resumenOrdenes.Canceladas
                    )
                ],
                [
                    "Porcentaje de cumplimiento",
                    `${porcentajeFinalizadas}%`
                ],
                [
                    "Porcentaje de cancelación",
                    `${porcentajeCanceladas}%`
                ],
                [],
                [
                    "RESUMEN DE ASIGNACIONES"
                ],
                [
                    "Indicador",
                    "Cantidad"
                ],
                [
                    "Total de asignaciones",
                    obtenerNumero(
                        resumenAsignaciones.TotalAsignaciones
                    )
                ],
                [
                    "Activas",
                    obtenerNumero(
                        resumenAsignaciones.Activas
                    )
                ],
                [
                    "Finalizadas",
                    obtenerNumero(
                        resumenAsignaciones.Finalizadas
                    )
                ],
                [
                    "Canceladas",
                    obtenerNumero(
                        resumenAsignaciones.Canceladas
                    )
                ],
                [],
                [
                    "RESULTADOS OFSC"
                ],
                [
                    "Indicador",
                    "Cantidad"
                ],
                [
                    "Total no realizadas",
                    obtenerNumero(
                        resultadosOfsc.TotalNoRealizadas
                    )
                ],
                [
                    "Reprogramaciones",
                    obtenerNumero(
                        resultadosOfsc.Reprogramaciones
                    )
                ],
                [
                    "Cierres automáticos",
                    obtenerNumero(
                        resultadosOfsc.CierresAutomaticos
                    )
                ],
                [
                    "Actividades finalizadas",
                    obtenerNumero(
                        resultadosOfsc.ActividadesFinalizadas
                    )
                ],
                [
                    "Actividades canceladas",
                    obtenerNumero(
                        resultadosOfsc.ActividadesCanceladas
                    )
                ]
            ];

            const hojaResumen =
                XLSX.utils.aoa_to_sheet(
                    datosResumen
                );

            hojaResumen["!cols"] = [
                {
                    wch: 34
                },
                {
                    wch: 24
                }
            ];

            XLSX.utils.book_append_sheet(
                libro,
                hojaResumen,
                "Resumen general"
            );

            // =================================
            // HOJA 2: TÉCNICOS
            // =================================
            const datosTecnicos =
                asignacionesPorTecnico.map(
                    (tecnico) => ({
                        "Código técnico":
                            tecnico.CodigoTecnico ||
                            "",
                        "Nombre completo":
                            tecnico.Tecnico ||
                            "",
                        "Distrito base":
                            tecnico.DistritoBase ||
                            "",
                        "Capacidad máxima":
                            obtenerNumero(
                                tecnico.CapacidadMaxima
                            ),
                        "Total asignaciones":
                            obtenerNumero(
                                tecnico.TotalAsignaciones
                            ),
                        "Asignaciones activas":
                            obtenerNumero(
                                tecnico.Activas
                            ),
                        "Asignaciones finalizadas":
                            obtenerNumero(
                                tecnico.Finalizadas
                            ),
                        "Asignaciones canceladas":
                            obtenerNumero(
                                tecnico.Canceladas
                            ),
                        Disponible:
                            tecnico.Disponible
                                ? "Sí"
                                : "No",
                        Activo:
                            tecnico.Activo
                                ? "Sí"
                                : "No"
                    })
                );

            const hojaTecnicos =
                datosTecnicos.length > 0
                    ? XLSX.utils.json_to_sheet(
                          datosTecnicos
                      )
                    : XLSX.utils.aoa_to_sheet([
                          [
                              "No existen técnicos registrados."
                          ]
                      ]);

            hojaTecnicos["!cols"] = [
                {
                    wch: 18
                },
                {
                    wch: 30
                },
                {
                    wch: 22
                },
                {
                    wch: 18
                },
                {
                    wch: 20
                },
                {
                    wch: 20
                },
                {
                    wch: 24
                },
                {
                    wch: 22
                },
                {
                    wch: 14
                },
                {
                    wch: 12
                }
            ];

            XLSX.utils.book_append_sheet(
                libro,
                hojaTecnicos,
                "Asignaciones técnicos"
            );

            // =================================
            // HOJA 3: DISTRITOS
            // =================================
            const datosDistritos =
                ordenesPorDistrito.map(
                    (distrito) => ({
                        Distrito:
                            distrito.Distrito ||
                            "Sin distrito",
                        "Total de órdenes":
                            obtenerNumero(
                                distrito.TotalOrdenes
                            ),
                        Pendientes:
                            obtenerNumero(
                                distrito.Pendientes
                            ),
                        Reprogramadas:
                            obtenerNumero(
                                distrito.Reprogramadas
                            ),
                        Finalizadas:
                            obtenerNumero(
                                distrito.Finalizadas
                            ),
                        Canceladas:
                            obtenerNumero(
                                distrito.Canceladas
                            )
                    })
                );

            const hojaDistritos =
                datosDistritos.length > 0
                    ? XLSX.utils.json_to_sheet(
                          datosDistritos
                      )
                    : XLSX.utils.aoa_to_sheet([
                          [
                              "No existen órdenes por distrito."
                          ]
                      ]);

            hojaDistritos["!cols"] = [
                {
                    wch: 25
                },
                {
                    wch: 18
                },
                {
                    wch: 15
                },
                {
                    wch: 18
                },
                {
                    wch: 15
                },
                {
                    wch: 15
                }
            ];

            XLSX.utils.book_append_sheet(
                libro,
                hojaDistritos,
                "Órdenes por distrito"
            );

            // =================================
            // NOMBRE DEL ARCHIVO
            // =================================
            const fecha = new Date();

            const anio =
                fecha.getFullYear();

            const mes = String(
                fecha.getMonth() + 1
            ).padStart(2, "0");

            const dia = String(
                fecha.getDate()
            ).padStart(2, "0");

            const horas = String(
                fecha.getHours()
            ).padStart(2, "0");

            const minutos = String(
                fecha.getMinutes()
            ).padStart(2, "0");

            const nombreArchivo =
                `Reporte_SIGOT_FTTH_${anio}-${mes}-${dia}_${horas}-${minutos}.xlsx`;

            XLSX.writeFile(
                libro,
                nombreArchivo
            );
        } catch (errorExportacion) {
            console.error(
                "Error al exportar reporte:",
                errorExportacion
            );

            setError(
                "No se pudo generar el archivo Excel."
            );
        } finally {
            setExportando(false);
        }
    }

    // =====================================
    // CARGANDO
    // =====================================
    if (cargando) {
        return (
            <section className="reportes-page">
                <div className="estado-reportes">
                    Cargando reporte general...
                </div>
            </section>
        );
    }

    // =====================================
    // ERROR
    // =====================================
    if (error && !reporte) {
        return (
            <section className="reportes-page">
                <div className="mensaje-reporte-error">
                    {error}
                </div>

                <button
                    type="button"
                    className="boton-reintentar"
                    onClick={cargarReporte}
                >
                    Reintentar
                </button>
            </section>
        );
    }

    return (
        <section className="reportes-page">
            <header className="reportes-encabezado">
                <div>
                    <h1>Reportes</h1>

                    <p>
                        Consulte indicadores generales,
                        resultados OFSC y distribución
                        de asignaciones.
                    </p>
                </div>

                <div className="reportes-acciones">
                    <button
                        type="button"
                        className="boton-exportar-reportes"
                        onClick={exportarExcel}
                        disabled={
                            exportando ||
                            cargando ||
                            !reporte
                        }
                    >
                        {exportando
                            ? "Exportando..."
                            : "Exportar Excel"}
                    </button>

                    <button
                        type="button"
                        className="boton-actualizar-reportes"
                        onClick={cargarReporte}
                        disabled={
                            cargando ||
                            exportando
                        }
                    >
                        {cargando
                            ? "Actualizando..."
                            : "Actualizar"}
                    </button>
                </div>
            </header>

            {error && (
                <div className="mensaje-reporte-error">
                    {error}
                </div>
            )}

            <div className="reportes-resumen-principal">
                <div className="tarjeta-reporte">
                    <span>
                        Total de órdenes
                    </span>

                    <strong>
                        {resumenOrdenes.TotalOrdenes ??
                            0}
                    </strong>
                </div>

                <div className="tarjeta-reporte">
                    <span>
                        Pendientes
                    </span>

                    <strong>
                        {resumenOrdenes.Pendientes ??
                            0}
                    </strong>
                </div>

                <div className="tarjeta-reporte">
                    <span>
                        Reprogramadas
                    </span>

                    <strong>
                        {resumenOrdenes.Reprogramadas ??
                            0}
                    </strong>
                </div>

                <div className="tarjeta-reporte">
                    <span>
                        Finalizadas
                    </span>

                    <strong>
                        {resumenOrdenes.Finalizadas ??
                            0}
                    </strong>
                </div>

                <div className="tarjeta-reporte">
                    <span>
                        Canceladas
                    </span>

                    <strong>
                        {resumenOrdenes.Canceladas ??
                            0}
                    </strong>
                </div>
            </div>

            <div className="reportes-grid-doble">
                <section className="bloque-reporte">
                    <div className="bloque-reporte-encabezado">
                        <div>
                            <h2>
                                Resumen de órdenes
                            </h2>

                            <p>
                                Estado actual de las
                                órdenes registradas.
                            </p>
                        </div>
                    </div>

                    <div className="indicadores-lista">
                        <div>
                            <span>
                                Iniciadas
                            </span>

                            <strong>
                                {resumenOrdenes.Iniciadas ??
                                    0}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Suspendidas
                            </span>

                            <strong>
                                {resumenOrdenes.Suspendidas ??
                                    0}
                            </strong>
                        </div>

                        <div>
                            <span>
                                No realizadas
                            </span>

                            <strong>
                                {resumenOrdenes.NoRealizadas ??
                                    0}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Cumplimiento
                            </span>

                            <strong>
                                {porcentajeFinalizadas}%
                            </strong>
                        </div>

                        <div>
                            <span>
                                Cancelación
                            </span>

                            <strong>
                                {porcentajeCanceladas}%
                            </strong>
                        </div>
                    </div>
                </section>

                <section className="bloque-reporte">
                    <div className="bloque-reporte-encabezado">
                        <div>
                            <h2>
                                Resumen de asignaciones
                            </h2>

                            <p>
                                Distribución de las
                                asignaciones registradas.
                            </p>
                        </div>
                    </div>

                    <div className="indicadores-lista">
                        <div>
                            <span>
                                Total
                            </span>

                            <strong>
                                {resumenAsignaciones.TotalAsignaciones ??
                                    0}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Activas
                            </span>

                            <strong>
                                {resumenAsignaciones.Activas ??
                                    0}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Finalizadas
                            </span>

                            <strong>
                                {resumenAsignaciones.Finalizadas ??
                                    0}
                            </strong>
                        </div>

                        <div>
                            <span>
                                Canceladas
                            </span>

                            <strong>
                                {resumenAsignaciones.Canceladas ??
                                    0}
                            </strong>
                        </div>
                    </div>
                </section>
            </div>

            <section className="bloque-reporte">
                <div className="bloque-reporte-encabezado">
                    <div>
                        <h2>
                            Resultados OFSC
                        </h2>

                        <p>
                            Actividades no realizadas,
                            reprogramaciones y cierres.
                        </p>
                    </div>
                </div>

                <div className="ofsc-resumen">
                    <div>
                        <span>
                            Total no realizadas
                        </span>

                        <strong>
                            {resultadosOfsc.TotalNoRealizadas ??
                                0}
                        </strong>
                    </div>

                    <div>
                        <span>
                            Reprogramaciones
                        </span>

                        <strong>
                            {resultadosOfsc.Reprogramaciones ??
                                0}
                        </strong>
                    </div>

                    <div>
                        <span>
                            Cierres automáticos
                        </span>

                        <strong>
                            {resultadosOfsc.CierresAutomaticos ??
                                0}
                        </strong>
                    </div>

                    <div>
                        <span>
                            Actividades finalizadas
                        </span>

                        <strong>
                            {resultadosOfsc.ActividadesFinalizadas ??
                                0}
                        </strong>
                    </div>

                    <div>
                        <span>
                            Actividades canceladas
                        </span>

                        <strong>
                            {resultadosOfsc.ActividadesCanceladas ??
                                0}
                        </strong>
                    </div>
                </div>
            </section>

            <section className="bloque-reporte">
                <div className="bloque-reporte-encabezado">
                    <div>
                        <h2>
                            Asignaciones por técnico
                        </h2>

                        <p>
                            Carga histórica registrada
                            por cada técnico.
                        </p>
                    </div>
                </div>

                <div className="tabla-reporte-contenedor">
                    <table className="tabla-reporte">
                        <thead>
                            <tr>
                                <th>Técnico</th>
                                <th>Distrito base</th>
                                <th>Capacidad</th>
                                <th>Total</th>
                                <th>Activas</th>
                                <th>Finalizadas</th>
                                <th>Canceladas</th>
                                <th>Disponible</th>
                                <th>Activo</th>
                            </tr>
                        </thead>

                        <tbody>
                            {asignacionesPorTecnico.length >
                            0 ? (
                                asignacionesPorTecnico.map(
                                    (tecnico) => (
                                        <tr
                                            key={
                                                tecnico.IdTecnico
                                            }
                                        >
                                            <td>
                                                <strong>
                                                    {
                                                        tecnico.Tecnico
                                                    }
                                                </strong>

                                                <small>
                                                    {
                                                        tecnico.CodigoTecnico
                                                    }
                                                </small>
                                            </td>

                                            <td>
                                                {tecnico.DistritoBase ||
                                                    "Sin distrito"}
                                            </td>

                                            <td>
                                                {
                                                    tecnico.CapacidadMaxima
                                                }
                                            </td>

                                            <td>
                                                {
                                                    tecnico.TotalAsignaciones
                                                }
                                            </td>

                                            <td>
                                                {
                                                    tecnico.Activas
                                                }
                                            </td>

                                            <td>
                                                {
                                                    tecnico.Finalizadas
                                                }
                                            </td>

                                            <td>
                                                {
                                                    tecnico.Canceladas
                                                }
                                            </td>

                                            <td>
                                                <span
                                                    className={
                                                        tecnico.Disponible
                                                            ? "badge-reporte badge-reporte-activo"
                                                            : "badge-reporte badge-reporte-inactivo"
                                                    }
                                                >
                                                    {tecnico.Disponible
                                                        ? "Sí"
                                                        : "No"}
                                                </span>
                                            </td>

                                            <td>
                                                <span
                                                    className={
                                                        tecnico.Activo
                                                            ? "badge-reporte badge-reporte-activo"
                                                            : "badge-reporte badge-reporte-inactivo"
                                                    }
                                                >
                                                    {tecnico.Activo
                                                        ? "Sí"
                                                        : "No"}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                )
                            ) : (
                                <tr>
                                    <td colSpan="9">
                                        No existen técnicos registrados.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="bloque-reporte">
                <div className="bloque-reporte-encabezado">
                    <div>
                        <h2>
                            Órdenes por distrito
                        </h2>

                        <p>
                            Distribución territorial de
                            las órdenes registradas.
                        </p>
                    </div>
                </div>

                <div className="tabla-reporte-contenedor">
                    <table className="tabla-reporte">
                        <thead>
                            <tr>
                                <th>Distrito</th>
                                <th>Total</th>
                                <th>Pendientes</th>
                                <th>Reprogramadas</th>
                                <th>Finalizadas</th>
                                <th>Canceladas</th>
                            </tr>
                        </thead>

                        <tbody>
                            {ordenesPorDistrito.length >
                            0 ? (
                                ordenesPorDistrito.map(
                                    (distrito) => (
                                        <tr
                                            key={
                                                distrito.Distrito
                                            }
                                        >
                                            <td>
                                                <strong>
                                                    {
                                                        distrito.Distrito
                                                    }
                                                </strong>
                                            </td>

                                            <td>
                                                {
                                                    distrito.TotalOrdenes
                                                }
                                            </td>

                                            <td>
                                                {
                                                    distrito.Pendientes
                                                }
                                            </td>

                                            <td>
                                                {
                                                    distrito.Reprogramadas
                                                }
                                            </td>

                                            <td>
                                                {
                                                    distrito.Finalizadas
                                                }
                                            </td>

                                            <td>
                                                {
                                                    distrito.Canceladas
                                                }
                                            </td>
                                        </tr>
                                    )
                                )
                            ) : (
                                <tr>
                                    <td colSpan="6">
                                        No existen órdenes por distrito.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </section>
    );
}

export default ReportesPage;