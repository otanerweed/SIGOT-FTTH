import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";

import {
    obtenerReporteGeneral
} from "../services/reportesService";

import "./ReportesPage.css";

function ReportesPage() {
    const [reporte, setReporte] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    const cargarReporte = useCallback(async () => {
        try {
            setCargando(true);
            setError("");

            const respuesta =
                await obtenerReporteGeneral();

            setReporte(
                respuesta?.reporte || null
            );
        } catch (error) {
            console.error(
                "Error al cargar el reporte:",
                error
            );

            setError(
                error.response?.data?.mensaje ||
                    "No se pudo cargar el reporte general."
            );
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargarReporte();
    }, [cargarReporte]);

    const resumenOrdenes =
        reporte?.resumenOrdenes || {};

    const resumenAsignaciones =
        reporte?.resumenAsignaciones || {};

    const resultadosOfsc =
        reporte?.resultadosOfsc || {};

    const asignacionesPorTecnico =
        reporte?.asignacionesPorTecnico || [];

    const ordenesPorDistrito =
        reporte?.ordenesPorDistrito || [];

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

    if (cargando) {
        return (
            <section className="reportes-page">
                <div className="estado-reportes">
                    Cargando reporte general...
                </div>
            </section>
        );
    }

    if (error) {
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

                <button
                    type="button"
                    className="boton-actualizar-reportes"
                    onClick={cargarReporte}
                >
                    Actualizar
                </button>
            </header>

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
                            {asignacionesPorTecnico.map(
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
                                            {
                                                tecnico.DistritoBase
                                            }
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
                            {ordenesPorDistrito.map(
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
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </section>
    );
}

export default ReportesPage;