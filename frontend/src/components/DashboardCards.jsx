import { useEffect, useState } from "react";
import "./Dashboard.css";

function DashboardCards({
    dashboard,
    kpis,
    fechaDesde,
    setFechaDesde,
    fechaHasta,
    setFechaHasta,
    distritoSeleccionado,
    setDistritoSeleccionado,
    aplicarFiltros,
    cargandoKPI,
    filtrosAplicados
}) {
    
        const datosKPI =
        kpis?.kpis || {};

    const detalleWinet =
        kpis?.detalleWinet || [];

    const resumenWinetCelulas =
        kpis?.resumenWinetCelulas || []; 
        
    const consolidadoOTWinet =
        kpis?.consolidadoOTWinet || [];

    
    
    const [celulaSeleccionada, setCelulaSeleccionada] =
        useState(null);

    const celulaDetalleSeleccionada =
        celulaSeleccionada === null
            ? null
            : resumenWinetCelulas.find(
                (item) =>
                    String(item.idCelula) ===
                    String(celulaSeleccionada)
            );

    const [etSeleccionado, setEtSeleccionado] =
        useState(null);

    const [eventoOperativoSeleccionado, setEventoOperativoSeleccionado] =
        useState(null);

    const [otSeleccionada, setOtSeleccionada] =
        useState(null);

    const [ordenEspecialistas, setOrdenEspecialistas] =
        useState(null);

    useEffect(() => {
        setEventoOperativoSeleccionado(null);
        setOtSeleccionada(null);
    }, [kpis]);

    const detalleWinetFiltrado =
        detalleWinet
            .filter(
                (item) =>
                    celulaSeleccionada === null ||
                    String(item.idCelula) ===
                    String(celulaSeleccionada)
            );

    const detalleWinetOrdenado =
        [...detalleWinetFiltrado].sort(
            (a, b) => {
                if (
                    ordenEspecialistas ===
                    "FINALIZADAS"
                ) {
                    return (
                        Number(b.finalizadas || 0) -
                        Number(a.finalizadas || 0)
                    );
                }
                if (
                    ordenEspecialistas ===
                    "ASIGNADAS"
                ) {
                    return (
                        Number(b.asignadas || 0) -
                        Number(a.asignadas || 0)
                    );
                }

                if (
                    ordenEspecialistas ===
                    "NO_REALIZADAS"
                ) {
                    return (
                        Number(b.noRealizadas || 0) -
                        Number(a.noRealizadas || 0)
                    );
                }
                if (
                    ordenEspecialistas ===
                    "EFECTIVIDAD"
                ) {
                    return (
                        Number(b.efectividad || 0) -
                        Number(a.efectividad || 0)
                    );
                }
                if (
                    ordenEspecialistas ===
                    "FINALIZADAS_DIA"
                ) {
                    const diasA =
                        new Set(
                            (a.actividades || [])
                                .map((actividad) => {
                                    if (!actividad.fechaActividad) {
                                        return null;
                                    }

                                    const fecha =
                                        new Date(
                                            actividad.fechaActividad
                                        );

                                    if (
                                        Number.isNaN(
                                            fecha.getTime()
                                        )
                                    ) {
                                        return null;
                                    }

                                    return fecha
                                        .toISOString()
                                        .slice(0, 10);
                                })
                                .filter(Boolean)
                        ).size;

                    const diasB =
                        new Set(
                            (b.actividades || [])
                                .map((actividad) => {
                                    if (!actividad.fechaActividad) {
                                        return null;
                                    }

                                    const fecha =
                                        new Date(
                                            actividad.fechaActividad
                                        );

                                    if (
                                        Number.isNaN(
                                            fecha.getTime()
                                        )
                                    ) {
                                        return null;
                                    }

                                    return fecha
                                        .toISOString()
                                        .slice(0, 10);
                                })
                                .filter(Boolean)
                        ).size;

                    const ritmoA =
                        diasA > 0
                            ? Number(
                                a.finalizadas || 0
                            ) / diasA
                            : 0;

                    const ritmoB =
                        diasB > 0
                            ? Number(
                                b.finalizadas || 0
                            ) / diasB
                            : 0;

                    return ritmoB - ritmoA;
                }   

                if (
                    ordenEspecialistas ===
                    "TIEMPO_PROM_OT"
                ) {
                    const obtenerTiempoPromedioOT =
                        (item) => {
                            const otsFinalizadas =
                                consolidadoOTWinet.filter(
                                    (ot) =>
                                        String(ot.idTecnico) ===
                                            String(item.idTecnico) &&
                                        String(
                                            ot.estadoActual || ""
                                        )
                                            .trim()
                                            .toUpperCase() ===
                                            "FINALIZADA" &&
                                        Number(
                                            ot.tiempoRegistradoTotal
                                        ) > 0
                                );

                            return otsFinalizadas.length > 0
                                ? otsFinalizadas.reduce(
                                    (total, ot) =>
                                        total +
                                        Number(
                                            ot.tiempoRegistradoTotal
                                        ),
                                    0
                                ) /
                                    otsFinalizadas.length
                                : 0;
                        };

                    const tiempoA =
                        obtenerTiempoPromedioOT(a);

                    const tiempoB =
                        obtenerTiempoPromedioOT(b);

                    return tiempoB - tiempoA;
                }
                return 0;
            }
        );

    const etDetalleSeleccionado =
        etSeleccionado === null
            ? null
            : detalleWinet.find(
                (item) =>
                    String(item.idTecnico) ===
                    String(etSeleccionado)
            );

    const actividadesETSeleccionado =
        etDetalleSeleccionado?.actividades || [];

    const diasConActividadETSeleccionado =
         etSeleccionado === null
                ? null
                : new Set(
                    actividadesETSeleccionado
                        .map((actividad) => {
                            const fecha =
                                actividad.fechaActividad;

                            if (!fecha) {
                                return null;
                            }

                            const fechaNormalizada =
                                new Date(fecha);

                            if (
                                Number.isNaN(
                                    fechaNormalizada.getTime()
                                )
                            ) {
                                return null;
                            }

                            return fechaNormalizada
                                .toISOString()
                                .slice(0, 10);
                        })
                        .filter(Boolean)
                ).size;   
    const finalizadasPorDiaActividadET =
        etSeleccionado === null ||
        !diasConActividadETSeleccionado ||
        diasConActividadETSeleccionado === 0
            ? null
            : Number(
                (
                    Number(
                        etDetalleSeleccionado?.finalizadas || 0
                    ) /
                    diasConActividadETSeleccionado
                ).toFixed(2)
            );            

    const obtenerIndicadoresEspecialista = (item) => {
        const actividades =
            item?.actividades || [];

        const diasConActividad =
            new Set(
                actividades
                    .map((actividad) => {
                        const fecha =
                            actividad.fechaActividad;

                        if (!fecha) {
                            return null;
                        }

                        const fechaNormalizada =
                            new Date(fecha);

                        if (
                            Number.isNaN(
                                fechaNormalizada.getTime()
                            )
                        ) {
                            return null;
                        }

                        return fechaNormalizada
                            .toISOString()
                            .slice(0, 10);
                    })
                    .filter(Boolean)
            ).size;

        const finalizadasPorDia =
            diasConActividad > 0
                ? Number(
                    (
                        Number(item.finalizadas || 0) /
                        diasConActividad
                    ).toFixed(2)
                )
                : null;

        const otsFinalizadas =
            consolidadoOTWinet.filter(
                (ot) =>
                    String(ot.idTecnico) ===
                        String(item.idTecnico) &&
                    String(
                        ot.estadoActual || ""
                    )
                        .trim()
                        .toUpperCase() ===
                        "FINALIZADA" &&
                    Number(
                        ot.tiempoRegistradoTotal
                    ) > 0
            );

        const tiempoPromedioOT =
            otsFinalizadas.length > 0
                ? Math.round(
                    otsFinalizadas.reduce(
                        (total, ot) =>
                            total +
                            Number(
                                ot.tiempoRegistradoTotal
                            ),
                        0
                    ) /
                        otsFinalizadas.length
                )
                : null;

        return {
            diasConActividad,
            finalizadasPorDia,
            tiempoPromedioOT
        };
    };

    const obtenerIndicadoresCelula = (item) => {
        const especialistasCelula =
            detalleWinet.filter(
                (et) =>
                    String(et.idCelula) ===
                    String(item.idCelula) &&
                    (
                        item.idSupervisor === null ||
                        item.idSupervisor === undefined ||
                        String(et.idSupervisor) ===
                        String(item.idSupervisor)
                    )
            );

        const actividadesCelula =
            especialistasCelula.flatMap(
                (et) => et.actividades || []
            );

        const diasConActividad =
            new Set(
                actividadesCelula
                    .map((actividad) => {
                        const fecha =
                            actividad.fechaActividad;

                        if (!fecha) {
                            return null;
                        }

                        const fechaNormalizada =
                            new Date(fecha);

                        if (
                            Number.isNaN(
                                fechaNormalizada.getTime()
                            )
                        ) {
                            return null;
                        }

                        return fechaNormalizada
                            .toISOString()
                            .slice(0, 10);
                    })
                    .filter(Boolean)
            ).size;

        const finalizadasPorDia =
            diasConActividad > 0
                ? Number(
                    (
                        Number(item.finalizadas || 0) /
                        diasConActividad
                    ).toFixed(2)
                )
                : null;

        const otsFinalizadas =
            consolidadoOTWinet.filter(
                (ot) =>
                    String(ot.idCelula) ===
                        String(item.idCelula) &&
                    (
                        item.idSupervisor === null ||
                        item.idSupervisor === undefined ||
                        String(ot.idSupervisor) ===
                        String(item.idSupervisor)
                    ) &&
                    String(
                        ot.estadoActual || ""
                    )
                        .trim()
                        .toUpperCase() ===
                        "FINALIZADA" &&
                    Number(
                        ot.tiempoRegistradoTotal
                    ) > 0
            );

        const tiempoPromedioOT =
            otsFinalizadas.length > 0
                ? Math.round(
                    otsFinalizadas.reduce(
                        (total, ot) =>
                            total +
                            Number(
                                ot.tiempoRegistradoTotal
                            ),
                        0
                    ) /
                        otsFinalizadas.length
                )
                : null;

        return {
            diasConActividad,
            finalizadasPorDia,
            tiempoPromedioOT
        };
    };
    const actividadesReprogramadas =
        detalleWinet.flatMap(
            (item) =>
                (item.actividades || [])
                    .filter(
                        (actividad) =>
                            String(
                                actividad.estado || ""
                            )
                                .trim()
                                .toUpperCase() ===
                                "NO_REALIZADO" &&
                            String(
                                actividad.resultadoNoRealizado || ""
                            )
                                .trim()
                                .toUpperCase() ===
                                "REPROGRAMADA"
                    )
                    .map(
                        (actividad) => ({
                            ...actividad,
                            et:
                                item.et,
                            celula:
                                item.celula,
                            supervisor:
                                item.supervisor
                        })
                    )
        );
    const actividadesCierresAutomaticos =
        detalleWinet.flatMap(
            (item) =>
                (item.actividades || [])
                    .filter(
                        (actividad) =>
                            String(
                                actividad.estado || ""
                            )
                                .trim()
                                .toUpperCase() ===
                                "NO_REALIZADO" &&
                            String(
                                actividad.resultadoNoRealizado || ""
                            )
                                .trim()
                                .toUpperCase() ===
                                "CIERRE_AUTOMATICO"
                    )
                    .map(
                        (actividad) => ({
                            ...actividad,
                            et:
                                item.et,
                            celula:
                                item.celula,
                            supervisor:
                                item.supervisor
                        })
                    )
        );
    const consolidadoOTETSeleccionado =
        consolidadoOTWinet.filter(
            (ot) =>
                etSeleccionado === null ||
                String(ot.idTecnico) ===
                String(etSeleccionado)
        );
            const otsFinalizadasETSeleccionado =
                etSeleccionado === null
                    ? []
                    : consolidadoOTETSeleccionado.filter(
                        (ot) =>
                            String(
                                ot.estadoActual || ""
                            )
                                .trim()
                                .toUpperCase() ===
                                "FINALIZADA" &&
                            Number(
                                ot.tiempoRegistradoTotal
                            ) > 0
                    );

            const tiempoPromedioOTFinalizadaET =
                otsFinalizadasETSeleccionado.length === 0
                    ? null
                    : Math.round(
                        otsFinalizadasETSeleccionado.reduce(
                            (total, ot) =>
                                total +
                                Number(
                                    ot.tiempoRegistradoTotal
                                ),
                            0
                        ) /
                            otsFinalizadasETSeleccionado.length
                    );
    const tiempoRegistradoTotalETSeleccionado =
        etSeleccionado === null
            ? null
            : consolidadoOTETSeleccionado.reduce(
                (total, ot) =>
                    total +
                    Number(
                        ot.tiempoRegistradoTotal
                    ),
                0
            );
    const otDetalleSeleccionada =
        otSeleccionada === null
            ? null
            : consolidadoOTWinet.find(
                (ot) =>
                    String(ot.idOrden) ===
                    String(otSeleccionada)
            );

    const formatearDuracion =
        (minutos) => {

            if (
                minutos === null ||
                minutos === undefined ||
                Number.isNaN(
                    Number(minutos)
                ) ||
                Number(minutos) <= 0
            ) {
                return "—";
            }

            const totalMinutos =
                Math.round(
                    Number(minutos)
                );

            const horas =
                Math.floor(
                    totalMinutos / 60
                );

            const minutosRestantes =
                totalMinutos % 60;

            if (horas === 0) {
                return `${minutosRestantes} min`;
            }

            return `${horas} h ${String(
                minutosRestantes
            ).padStart(2, "0")} min`;
        };

        const calcularBrechaSegmentos = (
            segmentoAnterior,
            segmentoActual
        ) => {
            if (
                !segmentoAnterior?.horaFin ||
                !segmentoActual?.horaInicio
            ) {
                return 0;
            }

            const finAnterior =
                new Date(segmentoAnterior.horaFin);

            const inicioActual =
                new Date(segmentoActual.horaInicio);

            if (
                Number.isNaN(finAnterior.getTime()) ||
                Number.isNaN(inicioActual.getTime())
            ) {
                return 0;
            }

            const hueco =
                Math.round(
                    (
                        inicioActual.getTime() -
                        finAnterior.getTime()
                    ) / 60000
                );

            return hueco > 0 ? hueco : 0;
        };

        const formatearEstadoVisible = (estado) => {
            const estados = {
                FINALIZADA: "Finalizada",
                NO_REALIZADO: "No realizado",
                CIERRE_AUTOMATICO: "Cierre automático",
                REPROGRAMADA: "Reprogramada",
                REPROGRAMADO: "Reprogramado",
                SUSPENDIDA: "Suspendida",
                INICIADA: "Iniciada",
                PENDIENTE: "Pendiente",
                CANCELADA: "Cancelada",
                ASIGNADA: "Asignada"
            };

        return estados[estado] || estado || "—";
    };

    const cards = [
        {
            titulo: "OTs nuevas",
            valor:
                dashboard?.otsNuevas ?? 0,
            detalle:
                "Nuevas en esta importación OFSC",
            tipo: "info"
        },
        {
            titulo: "OTs actualizadas",
            valor:
                dashboard?.otsActualizadas ?? 0,
            detalle:"OTs existentes con cambios detectados en OFSC",
            tipo: "info"
        },
        {
            titulo: "OTs sin cambios",
            valor:
                dashboard?.otsSinCambios ?? 0,
            detalle:
                "Sin variaciones detectadas en OFSC",
            tipo: "neutral"
        },
        {
            titulo: "Errores de importación",
            valor:
                dashboard?.otsRechazadas ?? 0,
            detalle:
                "Filas con error",
            tipo:
                (dashboard?.otsRechazadas ?? 0) > 0
                    ? "danger"
                    : "success"
        },
    ];

    const totalSuspensiones =
        resumenWinetCelulas.reduce(
            (total, item) =>
                total +
                Number(item.suspensiones || 0),
            0
        );

    const totalMinutosSuspendidos =
        resumenWinetCelulas.reduce(
            (total, item) =>
                total +
                Number(item.minutosSuspendidos || 0),
            0
        );

    return (
        <section className="dashboardResumen">

            {/* =====================================
                KPIs DE ACTIVIDADES OFSC
            ===================================== */}

            <div className="dashboardKPIHeader">

                <div className="dashboardKPIHeaderTitulo">
                    <span>
                        Indicadores de actividades OFSC
                    </span>

                    <p>
                        Métricas operativas de RED WINET según fecha y distrito.
                    </p>
                </div>

                <div className="dashboardKPIFiltros">

                    <div className="dashboardKPIFiltro">

                        <label htmlFor="filtro-fecha-desde-kpi">
                            Desde
                        </label>

                        <input
                            id="filtro-fecha-desde-kpi"
                            type="date"
                            value={
                                fechaDesde
                            }
                            onChange={
                                (evento) =>
                                    setFechaDesde(
                                        evento.target.value
                                    )
                            }
                        />

                    </div>


                    <div className="dashboardKPIFiltro">

                        <label htmlFor="filtro-fecha-hasta-kpi">
                            Hasta
                        </label>

                        <input
                            id="filtro-fecha-hasta-kpi"
                            type="date"
                            value={
                                fechaHasta
                            }
                            onChange={
                                (evento) =>
                                    setFechaHasta(
                                        evento.target.value
                                    )
                            }
                        />

                    </div>


                    <div className="dashboardKPIFiltro">

                        <label htmlFor="filtro-distrito-kpi">
                            Distrito
                        </label>

                        <select
                            id="filtro-distrito-kpi"
                            value={
                                distritoSeleccionado
                            }
                            onChange={
                                (evento) =>
                                    setDistritoSeleccionado(
                                        evento.target.value
                                    )
                            }
                        >
                            <option value="TODOS">
                                Todos
                            </option>

                            {(
                                kpis?.distritos || []
                            ).map(
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

                        <button
                            type="button"
                            className="dashboardKPIFiltrosBoton"
                            onClick={aplicarFiltros}
                            disabled={cargandoKPI}
                        >
                            {cargandoKPI
                                ? "Actualizando..."
                                : "Aplicar filtros"}
                        </button>

                </div>

            </div>

            {(
                filtrosAplicados.fechaDesde ||
                filtrosAplicados.fechaHasta ||
                filtrosAplicados.distrito
            ) && (
                <div className="dashboardPeriodoAplicado">
                    <strong>Período aplicado:</strong>{" "}
                    {filtrosAplicados.fechaDesde
                        ? `${filtrosAplicados.fechaDesde.slice(8, 10)}/${filtrosAplicados.fechaDesde.slice(5, 7)}/${filtrosAplicados.fechaDesde.slice(0, 4)}`
                        : "Sin fecha inicial"}
                    {" – "}
                    {filtrosAplicados.fechaHasta
                        ? `${filtrosAplicados.fechaHasta.slice(8, 10)}/${filtrosAplicados.fechaHasta.slice(5, 7)}/${filtrosAplicados.fechaHasta.slice(0, 4)}`
                        : "Sin fecha final"}
                    {" · "}
                    Distrito:{" "}
                    {filtrosAplicados.distrito || "Todos"}
                </div>
            )}



            <div className="dashboardCards dashboardCardsKPI">

                <article className="dashboardCard dashboardCard--info">
                    <div className="dashboardCardCabecera">
                        <span className="dashboardCardTitulo">
                            Total actividades
                        </span>

                        <span
                            className="dashboardCardIndicador"
                            aria-hidden="true"
                        />
                    </div>

                    <div className="dashboardCardValor">
                        {datosKPI.totalActividades ?? 0}
                    </div>

                    <span className="dashboardCardDetalle">
                        Válidas: excluye canceladas y suspendidas
                    </span>
                </article>

                <article className="dashboardCard dashboardCard--success">
                    <div className="dashboardCardCabecera">
                        <span className="dashboardCardTitulo">
                            Finalizadas
                        </span>

                        <span
                            className="dashboardCardIndicador"
                            aria-hidden="true"
                        />
                    </div>

                    <div className="dashboardCardValor">
                        {datosKPI.finalizadas ?? 0}
                    </div>

                    <span className="dashboardCardDetalle">
                        Actividades finalizadas
                    </span>
                </article>

                <article className="dashboardCard dashboardCard--danger">
                    <div className="dashboardCardCabecera">
                        <span className="dashboardCardTitulo">
                            No realizadas
                        </span>

                        <span
                            className="dashboardCardIndicador"
                            aria-hidden="true"
                        />
                    </div>

                    <div className="dashboardCardValor">
                        {datosKPI.noRealizados ?? 0}
                    </div>

                    <span className="dashboardCardDetalle">
                        Reprogramadas: {datosKPI.reprogramadas ?? 0}
                        {" · "}
                        Cierres automáticos: {datosKPI.cierresAutomaticos ?? 0}
                    </span>
                </article>

                <article className="dashboardCard dashboardCard--success">
                    <div className="dashboardCardCabecera">
                        <span className="dashboardCardTitulo">
                            Efectividad
                        </span>

                        <span
                            className="dashboardCardIndicador"
                            aria-hidden="true"
                        />
                    </div>

                    <div className="dashboardCardValor">
                        {datosKPI.efectividad ?? 0}%
                    </div>

                    <span className="dashboardCardDetalle">
                        Finalizadas / actividades válidas
                    </span>
                </article>

                <article className="dashboardCard dashboardCard--neutral">
                    <div className="dashboardCardCabecera">
                        <span className="dashboardCardTitulo">
                            Tiempo promedio por OT finalizada
                        </span>

                        <span
                            className="dashboardCardIndicador"
                            aria-hidden="true"
                        />
                    </div>

                    <div className="dashboardCardValor">
                        {formatearDuracion(
                            datosKPI.promedioDuracionMinutos
                        )}
                    </div>

                    <span className="dashboardCardDetalle">
                        Promedio del tiempo registrado por OT finalizada
                    </span>
                </article>

            </div>
            
            {/* =====================================
                CONTROL OPERATIVO RED WINET
            ===================================== */}

            <section className="dashboardWinetControl">

                <div className="dashboardSeccionTitulo">
                    <div>
                        <h2>
                            Control operativo
                        </h2>

                        <p>
                            Excepciones y eventos operativos de RED WINET según los filtros seleccionados.
                        </p>
                    </div>
                </div>

                <div className="dashboardCards dashboardCardsKPI">

                    <article
                        className={`dashboardCard dashboardCard--warning ${
                            eventoOperativoSeleccionado === "REPROGRAMADAS"
                                ? "dashboardCard--seleccionada"
                                : ""
                        }`}
                        onClick={() => {
                            setEventoOperativoSeleccionado(
                                (actual) =>
                                    actual === "REPROGRAMADAS"
                                        ? null
                                        : "REPROGRAMADAS"
                            );
                            setOtSeleccionada(null);
                        }}
                        style={{
                            cursor: "pointer"
                        }}
                    >
                        <div className="dashboardCardCabecera">
                            <span className="dashboardCardTitulo">
                                Reprogramadas
                            </span>

                            <span
                                className="dashboardCardIndicador"
                                aria-hidden="true"
                            />
                        </div>

                        <div className="dashboardCardValor">
                            {datosKPI.reprogramadas ?? 0}
                        </div>

                        <span className="dashboardCardDetalle">
                            Actividades no realizadas por reprogramación
                        </span>
                    </article>


                    <article
                        className={`dashboardCard dashboardCard--danger ${
                            eventoOperativoSeleccionado === "CIERRES_AUTOMATICOS"
                                ? "dashboardCard--seleccionada"
                                : ""
                        }`}
                        onClick={() => {
                            setEventoOperativoSeleccionado(
                                (actual) =>
                                    actual === "CIERRES_AUTOMATICOS"
                                        ? null
                                        : "CIERRES_AUTOMATICOS"
                            );
                            setOtSeleccionada(null);
                        }}
                    >
                        <div className="dashboardCardCabecera">
                            <span className="dashboardCardTitulo">
                                Cierres automáticos
                            </span>

                            <span
                                className="dashboardCardIndicador"
                                aria-hidden="true"
                            />
                        </div>

                        <div className="dashboardCardValor">
                            {datosKPI.cierresAutomaticos ?? 0}
                        </div>

                        <span className="dashboardCardDetalle">
                            Actividades cerradas automáticamente
                        </span>
                    </article>


                    <article className="dashboardCard dashboardCard--neutral">
                        <div className="dashboardCardCabecera">
                            <span className="dashboardCardTitulo">
                                Suspensiones
                            </span>

                            <span
                                className="dashboardCardIndicador"
                                aria-hidden="true"
                            />
                        </div>

                        <div className="dashboardCardValor">
                            {totalSuspensiones}
                        </div>

                        <span className="dashboardCardDetalle">
                            Eventos de suspensión
                        </span>
                    </article>


                    <article className="dashboardCard dashboardCard--neutral">
                        <div className="dashboardCardCabecera">
                            <span className="dashboardCardTitulo">
                                Tiempo suspendido total
                            </span>

                            <span
                                className="dashboardCardIndicador"
                                aria-hidden="true"
                            />
                        </div>

                        <div className="dashboardCardValor">
                            {formatearDuracion(
                                totalMinutosSuspendidos
                            )}
                        </div>

                        <span className="dashboardCardDetalle">
                            Tiempo total en suspensión
                        </span>
                    </article>

                </div>

                {eventoOperativoSeleccionado === "REPROGRAMADAS" && (
                    <div className="dashboardWinetActividades">
                        <div className="dashboardWinetResumenTitulo">
                            Actividades reprogramadas
                        </div>

                        {actividadesReprogramadas.length === 0 ? (
                            <div className="dashboardWinetVacio">
                                No hay actividades reprogramadas
                                para los filtros seleccionados.
                            </div>
                        ) : (
                            <div className="dashboardWinetTablaContenedor">
                                <table className="dashboardWinetTabla">
                                    <thead>
                                        <tr>
                                            <th>OT</th>
                                            <th>ET</th>
                                            <th>CÉLULA</th>
                                            <th>SUPERVISOR</th>
                                            <th>FECHA</th>
                                            <th>RESULTADO</th>
                                            <th>DETALLE / RAZÓN REGISTRADA</th>
                                            <th>INICIO</th>
                                            <th>FIN</th>
                                            <th>DURACIÓN</th>
                                            <th>DISTRITO</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {actividadesReprogramadas.map(
                                            (actividad) => (
                                                <tr
                                                    key={
                                                        actividad.idActividad
                                                    }
                                                    onClick={() => {
                                                        setOtSeleccionada(actividad.idOrden);

                                                        setTimeout(() => {
                                                            document
                                                                .querySelector(".dashboardWinetTrazabilidad")
                                                                ?.scrollIntoView({
                                                                    behavior: "smooth",
                                                                    block: "start"
                                                                });
                                                        }, 0);
                                                    }}
                                                    style={{
                                                        cursor: "pointer",
                                                        background:
                                                            otSeleccionada ===
                                                            actividad.idOrden
                                                                ? "#eef5ff"
                                                                : undefined
                                                    }}
                                                >
                                                    <td>
                                                        {actividad.codigoOT ||
                                                            actividad.idOrden ||
                                                            "—"}
                                                    </td>

                                                    <td>
                                                        {actividad.et || "—"}
                                                    </td>

                                                    <td>
                                                        {actividad.celula || "—"}
                                                    </td>

                                                    <td>
                                                        {actividad.supervisor ||
                                                            "—"}
                                                    </td>

                                                    <td>
                                                        {actividad.fechaActividad
                                                            ? new Date(
                                                                  actividad.fechaActividad
                                                              ).toLocaleDateString(
                                                                  "es-PE",
                                                                  {
                                                                      timeZone:
                                                                          "UTC"
                                                                  }
                                                              )
                                                            : "—"}
                                                    </td>

                                                    <td>
                                                        {actividad.resultadoNoRealizado ||
                                                            "—"}
                                                    </td>

                                                    <td>
                                                        {actividad.razonReagenda ||
                                                            actividad.motivo ||
                                                            "—"}
                                                    </td>

                                                    <td>
                                                        {actividad.horaInicio
                                                            ? new Date(
                                                                actividad.horaInicio
                                                            ).toLocaleTimeString(
                                                                "es-PE",
                                                                {
                                                                    timeZone: "UTC",
                                                                    hour: "2-digit",
                                                                    minute: "2-digit"
                                                                }
                                                            )
                                                            : "—"}
                                                    </td>

                                                    <td>
                                                        {actividad.horaFin
                                                            ? new Date(
                                                                actividad.horaFin
                                                            ).toLocaleTimeString(
                                                                "es-PE",
                                                                {
                                                                    timeZone: "UTC",
                                                                    hour: "2-digit",
                                                                    minute: "2-digit"
                                                                }
                                                            )
                                                            : "—"}
                                                    </td>

                                                    <td>
                                                        {formatearDuracion(
                                                            actividad.duracionMinutos
                                                        )}
                                                    </td>

                                                    <td>
                                                        {actividad.distrito ||
                                                            "—"}
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {eventoOperativoSeleccionado === "CIERRES_AUTOMATICOS" && (
                    <div className="dashboardWinetActividades">

                        <div className="dashboardWinetResumenTitulo">
                            Actividades con cierre automático
                        </div>

                        {actividadesCierresAutomaticos.length === 0 ? (
                            <div className="dashboardWinetVacio">
                                No hay actividades con cierre automático
                                para los filtros seleccionados.
                            </div>
                        ) : (
                            <div className="dashboardWinetTablaContenedor">

                                <table className="dashboardWinetTabla">

                                    <thead>
                                        <tr>
                                            <th>OT</th>
                                            <th>ET</th>
                                            <th>CÉLULA</th>
                                            <th>SUPERVISOR</th>
                                            <th>FECHA</th>
                                            <th>RESULTADO</th>
                                            <th>DETALLE / RAZÓN REGISTRADA</th>
                                            <th>INICIO</th>
                                            <th>FIN</th>
                                            <th>DURACIÓN</th>
                                            <th>DISTRITO</th>
                                        </tr>
                                    </thead>

                                    <tbody>

                                        {actividadesCierresAutomaticos.map(
                                            (actividad) => (
                                                <tr
                                                    key={
                                                        actividad.idActividad
                                                    }
                                                    onClick={() => {
                                                        setOtSeleccionada(actividad.idOrden);

                                                        setTimeout(() => {
                                                            document
                                                                .querySelector(".dashboardWinetTrazabilidad")
                                                                ?.scrollIntoView({
                                                                    behavior: "smooth",
                                                                    block: "start"
                                                                });
                                                        }, 0);
                                                    }}
                                                    style={{
                                                        cursor: "pointer",
                                                        background:
                                                            otSeleccionada ===
                                                            actividad.idOrden
                                                                ? "#eef5ff"
                                                                : undefined
                                                    }}
                                                >

                                                    <td>
                                                        {actividad.codigoOT ||
                                                            actividad.idOrden ||
                                                            "—"}
                                                    </td>

                                                    <td>
                                                        {actividad.et || "—"}
                                                    </td>

                                                    <td>
                                                        {actividad.celula || "—"}
                                                    </td>

                                                    <td>
                                                        {actividad.supervisor ||
                                                            "—"}
                                                    </td>

                                                    <td>
                                                        {actividad.fechaActividad
                                                            ? new Date(
                                                                  actividad.fechaActividad
                                                              ).toLocaleDateString(
                                                                  "es-PE",
                                                                  {
                                                                      timeZone:
                                                                          "UTC"
                                                                  }
                                                              )
                                                            : "—"}
                                                    </td>

                                                    <td>
                                                        {actividad.resultadoNoRealizado ||
                                                            "—"}
                                                    </td>

                                                    <td>
                                                        {actividad.motivo ||
                                                            actividad.razonReagenda ||
                                                            "—"}
                                                    </td>

                                                    <td>
                                                        {actividad.horaInicio
                                                            ? new Date(
                                                                  actividad.horaInicio
                                                              ).toLocaleTimeString(
                                                                  "es-PE",
                                                                  {
                                                                      timeZone:
                                                                          "UTC",
                                                                      hour:
                                                                          "2-digit",
                                                                      minute:
                                                                          "2-digit"
                                                                  }
                                                              )
                                                            : "—"}
                                                    </td>

                                                    <td>
                                                        {actividad.horaFin
                                                            ? new Date(
                                                                  actividad.horaFin
                                                              ).toLocaleTimeString(
                                                                  "es-PE",
                                                                  {
                                                                      timeZone:
                                                                          "UTC",
                                                                      hour:
                                                                          "2-digit",
                                                                      minute:
                                                                          "2-digit"
                                                                  }
                                                              )
                                                            : "—"}
                                                    </td>

                                                    <td>
                                                        {formatearDuracion(
                                                            actividad.duracionMinutos
                                                        )}
                                                    </td>

                                                    <td>
                                                        {actividad.distrito ||
                                                            "—"}
                                                    </td>

                                                </tr>
                                            )
                                        )}

                                    </tbody>

                                </table>

                            </div>
                        )}

                    </div>
                )}

            </section>
            {/* =====================================
                DETALLE OPERATIVO RED WINET
            ===================================== */}

            {(
                <section className="dashboardWinetDetalle">

                    <div className="dashboardWinetEncabezado">
                        <div>
                            <h3>
                                Detalle operativo RED WINET
                            </h3>

                            <p>
                                Seguimiento por célula, supervisor y especialista técnico.
                            </p>
                        </div>

                        <span className="dashboardWinetTotal">
                            {detalleWinet.length} ET
                        </span>
                    </div>

                    <div
                        style={{
                            marginTop: "10px",
                            marginBottom: "18px",
                            padding: "10px 14px",
                            border: "1px solid #dbe4ee",
                            borderRadius: "8px",
                            background: "#f8fafc",
                            display: "flex",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "8px"
                        }}
                    >
                        <span
                            style={{
                                fontSize: "11px",
                                fontWeight: "700",
                                color: "#475569",
                                marginRight: "4px"
                            }}
                        >
                            CÓMO CONSULTAR:
                        </span>

                        <span
                            style={{
                                fontSize: "12px",
                                fontWeight: "600",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                background:
                                    celulaSeleccionada === null
                                        ? "#dbeafe"
                                        : "#dcfce7",
                                color:
                                    celulaSeleccionada === null
                                        ? "#1d4ed8"
                                        : "#166534"
                            }}
                        >
                            {celulaSeleccionada !== null
                                ? "✓ Célula"
                                : "① Célula"}
                        </span>

                        <span style={{ color: "#94a3b8" }}>
                            →
                        </span>

                        <span
                            style={{
                                fontSize: "12px",
                                fontWeight: "600",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                background:
                                    celulaSeleccionada !== null &&
                                    etSeleccionado === null
                                        ? "#dbeafe"
                                        : etSeleccionado !== null
                                            ? "#dcfce7"
                                            : "#f1f5f9",
                                color:
                                    celulaSeleccionada !== null &&
                                    etSeleccionado === null
                                        ? "#1d4ed8"
                                        : etSeleccionado !== null
                                            ? "#166534"
                                            : "#94a3b8"
                            }}
                        >
                            {etSeleccionado !== null
                                ? "✓ Especialista"
                                : "② Especialista"}
                        </span>

                        <span style={{ color: "#94a3b8" }}>
                            →
                        </span>

                        <span
                            style={{
                                fontSize: "12px",
                                fontWeight: "600",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                background:
                                    etSeleccionado !== null &&
                                    otSeleccionada === null
                                        ? "#dbeafe"
                                        : otSeleccionada !== null
                                            ? "#dcfce7"
                                            : "#f1f5f9",
                                color:
                                    etSeleccionado !== null &&
                                    otSeleccionada === null
                                        ? "#1d4ed8"
                                        : otSeleccionada !== null
                                            ? "#166534"
                                            : "#94a3b8"
                            }}
                        >
                            {otSeleccionada !== null
                                ? "✓ OT"
                                : "③ OT"}
                        </span>

                        <span style={{ color: "#94a3b8" }}>
                            →
                        </span>

                        <span
                            style={{
                                fontSize: "12px",
                                fontWeight: "600",
                                padding: "4px 8px",
                                borderRadius: "6px",
                                background:
                                    otSeleccionada !== null
                                        ? "#dbeafe"
                                        : "#f1f5f9",
                                color:
                                    otSeleccionada !== null
                                        ? "#1d4ed8"
                                        : "#94a3b8"
                            }}
                        >
                            ④ Trazabilidad
                        </span>

                        <span
                            style={{
                                marginLeft: "auto",
                                fontSize: "11px",
                                color: "#64748b"
                            }}
                        >
                            {otSeleccionada !== null
                                ? "Trazabilidad de la OT seleccionada."
                                : etSeleccionado !== null
                                    ? "Selecciona una OT para consultar su trazabilidad."
                                    : celulaSeleccionada !== null
                                        ? "Selecciona un especialista para consultar sus OTs."
                                        : "Selecciona una célula para comenzar."}
                        </span>
                    </div>

                    {resumenWinetCelulas.length > 0 && (
                        <div className="dashboardWinetResumenCelulas">

                            <div className="dashboardWinetResumenTitulo">
                                Desempeño por célula
                                {celulaSeleccionada !== null &&
                                    celulaDetalleSeleccionada?.celula && (
                                        <span
                                            style={{
                                                marginLeft: "8px",
                                                fontSize: "12px",
                                                fontWeight: "600",
                                                color: "#64748b"
                                            }}
                                        >
                                            · {celulaDetalleSeleccionada.celula}
                                        </span>
                                    )}
                            </div>

                            <div className="dashboardWinetTablaContenedor">

                                <table className="dashboardWinetTabla">
                                    <thead>
                                        <tr>
                                            <th>CÉLULA</th>
                                            <th>SUPERVISOR</th>
                                            <th>ASIGNADAS</th>
                                            <th>FINALIZADAS</th>
                                            <th>NO REALIZADAS</th>
                                            <th>EFECTIVIDAD</th>
                                            <th>FINALIZADAS/DÍA ACTIVO</th>
                                            <th>TIEMPO PROM. OT FINALIZADA</th>
                                        </tr>
                                    </thead>

                                    <tbody>

                                        {resumenWinetCelulas.map(
                                            (item) => {
                                                const indicadores =
                                                    obtenerIndicadoresCelula(item);

                                                return (
                                                <tr
                                                    key={`${item.idCelula}-${item.idSupervisor}`}
                                                    onClick={() => {
                                                        setCelulaSeleccionada(
                                                            celulaSeleccionada === item.idCelula
                                                                ? null
                                                                : item.idCelula
                                                        );

                                                        setEtSeleccionado(null);
                                                        setOtSeleccionada(null);
                                                    }}
                                                    style={{
                                                        cursor: "pointer",
                                                        background:
                                                            celulaSeleccionada === item.idCelula
                                                                ? "#eef5ff"
                                                                : undefined,
                                                        boxShadow:
                                                            celulaSeleccionada === item.idCelula
                                                                ? "inset 4px 0 0 #2563eb"
                                                                : "inset 4px 0 0 transparent"
                                                    }}
                                                >

                                                    <td>
                                                        {item.celula ||
                                                            "Sin célula"}
                                                    </td>

                                                    <td>
                                                        {item.supervisor ||
                                                            "Sin supervisor"}
                                                    </td>

                                                    <td>
                                                        {item.asignadas}
                                                    </td>

                                                    <td>
                                                        {item.finalizadas}
                                                    </td>

                                                    <td>
                                                        {item.noRealizadas}
                                                    </td>

                                                    <td>
                                                        <span
                                                            className={
                                                                item.efectividad >= 80
                                                                    ? "dashboardWinetEfectividad dashboardWinetEfectividadAlta"
                                                                    : item.efectividad >= 50
                                                                        ? "dashboardWinetEfectividad dashboardWinetEfectividadMedia"
                                                                        : "dashboardWinetEfectividad dashboardWinetEfectividadBaja"
                                                            }
                                                        >
                                                            {item.efectividad}%
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {indicadores.finalizadasPorDia !== null
                                                            ? indicadores.finalizadasPorDia.toFixed(2)
                                                            : "—"}
                                                    </td>    
                                                    <td>
                                                        {indicadores.tiempoPromedioOT !== null
                                                            ? formatearDuracion(
                                                                indicadores.tiempoPromedioOT
                                                            )
                                                            : "—"}
                                                    </td>          
                                               </tr>
                                            );
                                        }
                                    )}

                                    </tbody>
                                </table>

                            </div>

                        </div>
                    )}

                   

            {celulaSeleccionada !== null && (
                <>
                    <div className="dashboardWinetResumenTitulo">
                        Desempeño por especialista
                        {etSeleccionado !== null &&
                            etDetalleSeleccionado?.et && (
                                <span
                                    style={{
                                        marginLeft: "8px",
                                        fontSize: "12px",
                                        fontWeight: "600",
                                        color: "#64748b"
                                    }}
                                >
                                    · {etDetalleSeleccionado.et}
                                </span>
                            )}
                    </div>


                    {etSeleccionado !== null &&
                        etDetalleSeleccionado && (
                            <div className="dashboardWinetFichaET">

                                <div className="dashboardWinetFichaETEncabezado">
                                    <div>

                                        <div
                                            style={{
                                                fontSize: "11px",
                                                fontWeight: "700",
                                                color: "#64748b",
                                                marginBottom: "4px",
                                                textTransform: "uppercase",
                                                letterSpacing: "0.03em"
                                            }}
                                        >
                                            Especialista seleccionado
                                        </div>

                                        <div className="dashboardWinetFichaETNombre">
                                            {etDetalleSeleccionado.et}
                                        </div>

                                        <div className="dashboardWinetFichaETInfo">
                                            {etDetalleSeleccionado.celula || "Sin célula"}
                                            {" · "}
                                            {etDetalleSeleccionado.supervisor || "Sin supervisor"}
                                            {" · "}
                                            {diasConActividadETSeleccionado} días con actividad
                                            {" · "}
                                            {finalizadasPorDiaActividadET !== null
                                                ? `${finalizadasPorDiaActividadET} finalizadas/día`
                                                : "—"}
                                        </div>

                                    </div>
                                </div>

                                <div className="dashboardWinetFichaETKPIs">

                                    <div className="dashboardWinetFichaETKPI">
                                        <span>Asignadas</span>
                                        <strong>
                                            {etDetalleSeleccionado.asignadas}
                                        </strong>
                                    </div>

                                    <div className="dashboardWinetFichaETKPI">
                                        <span>Finalizadas</span>
                                        <strong>
                                            {etDetalleSeleccionado.finalizadas}
                                        </strong>
                                    </div>

                                    <div className="dashboardWinetFichaETKPI">
                                        <span>No realizadas</span>
                                        <strong>
                                            {etDetalleSeleccionado.noRealizadas}
                                        </strong>
                                    </div>

                                    <div className="dashboardWinetFichaETKPI">
                                        <span>Efectividad</span>
                                        <strong>
                                            {etDetalleSeleccionado.efectividad}%
                                        </strong>
                                    </div>

                                    <div className="dashboardWinetFichaETKPI">
                                        <span>Suspensiones</span>
                                        <strong>
                                            {etDetalleSeleccionado.suspensiones}
                                        </strong>
                                    </div>

                                    <div className="dashboardWinetFichaETKPI">
                                        <span
                                            title="Tiempo correspondiente a los segmentos suspendidos. Este tiempo está incluido en el tiempo registrado."
                                        >
                                            Tiempo suspendido
                                        </span>
                                        <strong>
                                            {formatearDuracion(
                                                etDetalleSeleccionado.minutosSuspendidos
                                            )}
                                        </strong>
                                    </div>

                                    <div className="dashboardWinetFichaETKPI">
                                        <span
                                            title="Promedio del tiempo registrado por las OTs finalizadas del especialista."
                                        >
                                            Tiempo promedio por OT
                                        </span>
                                        <strong>
                                            {formatearDuracion(
                                                tiempoPromedioOTFinalizadaET
                                            )}
                                        </strong>
                                    </div>

                                        <div className="dashboardWinetFichaETKPI">
                                        <span
                                            title="Suma de los segmentos con inicio y fin válidos, incluidas las suspensiones."
                                        >
                                            Tiempo registrado total
                                        </span>
                                            <strong>
                                                {formatearDuracion(
                                                    tiempoRegistradoTotalETSeleccionado
                                                )}
                                            </strong>
                                        </div>

                                   </div>

                                </div>
                        )}

                    <details
                        key={etSeleccionado ?? "sin-et"}
                        open={etSeleccionado === null}
                    >
                        <summary
                            style={{
                                cursor: "pointer",
                                fontSize: "12px",
                                fontWeight: "700",
                                color: "#334155",
                                padding: "8px 0",
                                userSelect: "none"
                            }}
                        >
                            {etSeleccionado !== null
                                ? "Cambiar especialista"
                                : "Especialistas de la célula"}
                            {" · "}
                            {detalleWinetOrdenado.length} ET
                        </summary>
                    {detalleWinet.length === 0 ? (
                        <div className="dashboardWinetVacio">
                            No hay actividades WINET para los filtros seleccionados.
                        </div>
                    ) : (
                        <div className="dashboardWinetTablaContenedor">
                            <table className="dashboardWinetTabla">
                                <thead>
                                    <tr>
                                        <th>CÉLULA</th>
                                        <th>SUPERVISOR</th>
                                        <th>ET</th>
                                        <th
                                            onClick={() =>
                                                setOrdenEspecialistas(
                                                    ordenEspecialistas === "ASIGNADAS"
                                                        ? null
                                                        : "ASIGNADAS"
                                                )
                                            }
                                            style={{
                                                cursor: "pointer"
                                            }}
                                        >
                                            ASIGNADAS
                                            {ordenEspecialistas === "ASIGNADAS"
                                                ? " ↓"
                                                : ""}
                                        </th>
                                        <th
                                            onClick={() =>
                                                setOrdenEspecialistas(
                                                    ordenEspecialistas === "FINALIZADAS"
                                                        ? null
                                                        : "FINALIZADAS"
                                                )
                                            }
                                            style={{
                                                cursor: "pointer"
                                            }}
                                        >
                                        FINALIZADAS
                                        {ordenEspecialistas === "FINALIZADAS"
                                            ? " ↓"
                                            : ""}
                                        </th>
                                        <th
                                            onClick={() =>
                                                setOrdenEspecialistas(
                                                    ordenEspecialistas === "NO_REALIZADAS"
                                                        ? null
                                                        : "NO_REALIZADAS"
                                                )
                                            }
                                            style={{
                                                cursor: "pointer"
                                            }}
                                        >
                                            NO REALIZADAS
                                            {ordenEspecialistas === "NO_REALIZADAS"
                                                ? " ↓"
                                                : ""}
                                        </th>
                                        <th
                                            onClick={() =>
                                                setOrdenEspecialistas(
                                                    ordenEspecialistas === "EFECTIVIDAD"
                                                        ? null
                                                        : "EFECTIVIDAD"
                                                )
                                            }
                                            style={{
                                                cursor: "pointer"
                                            }}
                                        >
                                            EFECTIVIDAD
                                            {ordenEspecialistas === "EFECTIVIDAD"
                                                ? " ↓"
                                                : ""}
                                    </th>
                                        <th
                                            onClick={() =>
                                                setOrdenEspecialistas(
                                                    ordenEspecialistas === "FINALIZADAS_DIA"
                                                        ? null
                                                        : "FINALIZADAS_DIA"
                                                )
                                            }
                                            style={{
                                                cursor: "pointer"
                                            }}
                                        >
                                            FINALIZADAS/DÍA ACTIVO
                                            {ordenEspecialistas === "FINALIZADAS_DIA"
                                                ? " ↓"
                                                : ""}
                                        </th>
                                        <th
                                            onClick={() =>
                                                setOrdenEspecialistas(
                                                    ordenEspecialistas === "TIEMPO_PROM_OT"
                                                        ? null
                                                        : "TIEMPO_PROM_OT"
                                                )
                                            }
                                            style={{
                                                cursor: "pointer"
                                            }}
                                        >
                                            TIEMPO PROM. OT FINALIZADA
                                            {ordenEspecialistas === "TIEMPO_PROM_OT"
                                                ? " ↓"
                                                : ""}
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {detalleWinetOrdenado.map((item) => {
                                        const indicadores =
                                            obtenerIndicadoresEspecialista(item);

                                        return (
                                        
                                        <tr
                                            key={`${item.idTecnico}-${item.idCelula}`}
                                            onClick={() => {
                                                setEtSeleccionado(
                                                    etSeleccionado === item.idTecnico
                                                        ? null
                                                        : item.idTecnico
                                                );

                                                setOtSeleccionada(null);
                                            }}
                                            style={{
                                                cursor: "pointer",
                                                background:
                                                    String(etSeleccionado) ===
                                                    String(item.idTecnico)
                                                        ? "#eef5ff"
                                                        : undefined
                                            }}
                                        >
                                            <td>
                                                {item.celula || "Sin célula"}
                                            </td>

                                            <td>
                                                {item.supervisor || "Sin supervisor"}
                                            </td>

                                            <td className="dashboardWinetET">
                                                {item.et}
                                            </td>

                                            <td>
                                                {item.asignadas}
                                            </td>

                                            <td>
                                                {item.finalizadas}
                                            </td>

                                            <td>
                                                {item.noRealizadas}
                                            </td>

                                            <td>
                                                <span
                                                    className={
                                                        item.efectividad >= 80
                                                            ? "dashboardWinetEfectividad dashboardWinetEfectividadAlta"
                                                            : item.efectividad >= 50
                                                                ? "dashboardWinetEfectividad dashboardWinetEfectividadMedia"
                                                                : "dashboardWinetEfectividad dashboardWinetEfectividadBaja"
                                                    }
                                                >
                                                    {item.efectividad}%
                                                </span>
                                            </td>

                                            <td>
                                                {indicadores.finalizadasPorDia !== null
                                                    ? indicadores.finalizadasPorDia.toFixed(2)
                                                    : "—"}
                                            </td>
                                                                                        <td>
                                                {indicadores.tiempoPromedioOT !== null
                                                    ? formatearDuracion(
                                                        indicadores.tiempoPromedioOT
                                                    )
                                                    : "—"}
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    )}

                </details>
            </>
        )}

        </section>
    )}

            
            {etSeleccionado !== null && (
                <div className="dashboardWinetActividades">

                    <div className="dashboardWinetResumenTitulo">
                        <span>
                            Órdenes de trabajo del especialista
                        </span>

                        {etDetalleSeleccionado?.et && (
                            <span
                                style={{
                                    marginLeft: "8px",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    color: "#64748b"
                                }}
                            >
                                · {etDetalleSeleccionado.et}
                            </span>
                        )}

                        <span
                            style={{
                                marginLeft: "8px",
                                fontSize: "12px",
                                fontWeight: "600",
                                color: "#64748b"
                            }}
                        >
                            · {consolidadoOTETSeleccionado.length} OTs
                        </span>
                    </div>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: "14px",
                            marginTop: "4px",
                            marginBottom: "8px",
                            fontSize: "11px",
                            color: "#64748b"
                        }}
                    >
                        <span>
                            <span
                                style={{
                                    display: "inline-block",
                                    width: "7px",
                                    height: "7px",
                                    borderRadius: "50%",
                                    background: "#2563eb",
                                    marginRight: "5px"
                                }}
                            />
                            Más de 1 ciclo o segmento
                        </span>

                        <span>
                            <span
                                style={{
                                    display: "inline-block",
                                    width: "7px",
                                    height: "7px",
                                    borderRadius: "50%",
                                    background: "#b45309",
                                    marginRight: "5px"
                                }}
                            />
                            Tiempo suspendido / no clasificado
                        </span>
                    </div>           
                    {consolidadoOTETSeleccionado.length === 0 ? (
                        <div className="dashboardWinetVacio">
                            El ET seleccionado no tiene OTs
                            para los filtros actuales.
                        </div>
                    ) : (
                        <div className="dashboardWinetTablaContenedor">

                            <table className="dashboardWinetTabla">

                                <thead>
                                    <tr>
                                        <th>OT</th>
                                        <th>ESTADO ACTUAL</th>
                                        <th>CICLOS</th>
                                        <th>SEGMENTOS</th>
                                        <th>PRIMER INICIO</th>
                                        <th>ÚLTIMO FIN</th>
                                        <th>REGISTRADO</th>
                                        <th>SUSPENDIDO</th>
                                        <th>NO CLASIFICADO</th>
                                        <th>TRANSCURRIDO</th>
                                        <th>DISTRITO</th>
                                    </tr>
                                </thead>

                                <tbody>

                                    {consolidadoOTETSeleccionado.map(
                                        (ot) => (
                                            <tr
                                                key={ot.idOrden}
                                                onClick={() => {
                                                    setOtSeleccionada(ot.idOrden);

                                                    setTimeout(() => {
                                                        document
                                                            .querySelector(".dashboardWinetTrazabilidad")
                                                            ?.scrollIntoView({
                                                                behavior: "smooth",
                                                                block: "start"
                                                            });
                                                    }, 0);
                                                }}
                                                style={{
                                                    cursor: "pointer",
                                                    background:
                                                        otSeleccionada === ot.idOrden
                                                            ? "#eef5ff"
                                                            : undefined
                                                }}
                                            >

                                                <td>
                                                    {ot.codigoOT ||
                                                        "—"}
                                                </td>

                                                <td>
                                                    <span
                                                        className={
                                                            ot.estadoActual === "FINALIZADA"
                                                                ? "dashboardWinetEtiqueta dashboardWinetEtiqueta--finalizada"
                                                                : ot.estadoActual === "INICIADA"
                                                                    ? "dashboardWinetEtiqueta dashboardWinetEtiqueta--iniciada"
                                                                    : ot.estadoActual === "NO_REALIZADO"
                                                                        ? "dashboardWinetEtiqueta dashboardWinetEtiqueta--noRealizado"
                                                                        : ot.estadoActual === "SUSPENDIDA"
                                                                            ? "dashboardWinetEtiqueta dashboardWinetEtiqueta--suspendida"
                                                                            : "dashboardWinetEtiqueta"
                                                        }
                                                    >
                                                        {formatearEstadoVisible(ot.estadoActual)}
                                                    </span>
                                                </td>

                                                <td>
                                                    <span
                                                        title={
                                                            Number(ot.ciclos?.length || 0) > 1
                                                                ? "Esta OT tiene múltiples ciclos. Selecciónala para revisar su trazabilidad."
                                                                : "Esta OT tiene un solo ciclo."
                                                        }
                                                        style={{
                                                            fontWeight:
                                                                Number(ot.ciclos?.length || 0) > 1
                                                                    ? "700"
                                                                    : "400",
                                                            color:
                                                                Number(ot.ciclos?.length || 0) > 1
                                                                    ? "#2563eb"
                                                                    : "inherit",
                                                            cursor:
                                                                Number(ot.ciclos?.length || 0) > 1
                                                                    ? "help"
                                                                    : "default"
                                                        }}
                                                    >
                                                        {ot.ciclos?.length || 0}
                                                    </span>
                                                </td>

                                                <td>
                                                    <span
                                                        title={
                                                            Number(ot.totalSegmentos || 0) > 1
                                                                ? "Esta OT tiene múltiples segmentos registrados en OFSC."
                                                                : "Esta OT tiene un solo segmento."
                                                        }
                                                        style={{
                                                            fontWeight:
                                                                Number(ot.totalSegmentos || 0) > 1
                                                                    ? "700"
                                                                    : "400",
                                                            color:
                                                                Number(ot.totalSegmentos || 0) > 1
                                                                    ? "#2563eb"
                                                                    : "inherit",
                                                            cursor:
                                                                Number(ot.totalSegmentos || 0) > 1
                                                                    ? "help"
                                                                    : "default"
                                                        }}
                                                    >
                                                        {ot.totalSegmentos || 0}
                                                    </span>
                                                </td>

                                                <td>
                                                    {ot.primerInicio
                                                        ? new Date(
                                                            ot.primerInicio
                                                        ).toLocaleString(
                                                            "es-PE",
                                                            {
                                                                timeZone:
                                                                    "UTC",
                                                                dateStyle:
                                                                    "short",
                                                                timeStyle:
                                                                    "short"
                                                            }
                                                        )
                                                        : "—"}
                                                </td>

                                                <td>
                                                    {ot.ultimoFin
                                                        ? new Date(
                                                            ot.ultimoFin
                                                        ).toLocaleString(
                                                            "es-PE",
                                                            {
                                                                timeZone:
                                                                    "UTC",
                                                                dateStyle:
                                                                    "short",
                                                                timeStyle:
                                                                    "short"
                                                            }
                                                        )
                                                        : "—"}
                                                </td>

                                                <td>
                                                    {formatearDuracion(
                                                        ot.tiempoRegistradoTotal
                                                    )}
                                                </td>

                                                <td>
                                                    <span
                                                        style={{
                                                            fontWeight:
                                                                Number(ot.tiempoSuspendidoTotal || 0) > 0
                                                                    ? "700"
                                                                    : "400",
                                                            color:
                                                                Number(ot.tiempoSuspendidoTotal || 0) > 0
                                                                    ? "#b45309"
                                                                    : "inherit"
                                                        }}
                                                    >
                                                        {formatearDuracion(
                                                            ot.tiempoSuspendidoTotal
                                                        )}
                                                    </span>
                                                </td>

                                                <td>
                                                    <span
                                                        style={{
                                                            fontWeight:
                                                                Number(ot.tiempoNoClasificadoTotal || 0) > 0
                                                                    ? "700"
                                                                    : "400",
                                                            color:
                                                                Number(ot.tiempoNoClasificadoTotal || 0) > 0
                                                                    ? "#b45309"
                                                                    : "inherit"
                                                        }}
                                                    >
                                                        {formatearDuracion(
                                                            ot.tiempoNoClasificadoTotal
                                                        )}
                                                    </span>
                                                </td>

                                                <td>
                                                    {formatearDuracion(
                                                        ot.tiempoTranscurridoTotal
                                                    )}
                                                </td>

                                                <td>
                                                    {ot.distrito ||
                                                        "—"}
                                                </td>

                                            </tr>
                                        )
                                    )}

                                </tbody>

                            </table>

                        </div>
                    )}

                </div>
            )}
            {otDetalleSeleccionada && (
                <div className="dashboardWinetTrazabilidad">

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: "12px",
                            marginBottom: "14px"
                        }}
                    >
                        <div>
                            <div className="dashboardWinetResumenTitulo">
                                Trazabilidad de la OT{" "}
                                {otDetalleSeleccionada.codigoOT || "—"}
                            </div>

                            <div
                                style={{
                                    marginTop: "4px",
                                    fontSize: "12px",
                                    color: "#64748b"
                                }}
                            >
                                {otDetalleSeleccionada.et || "ET no disponible"}
                                {" · "}
                                {otDetalleSeleccionada.celula || "Célula no disponible"}
                                {" · "}
                                {formatearEstadoVisible(
                                    otDetalleSeleccionada.estadoActual
                                )}
                                {" · "}
                                {otDetalleSeleccionada.ciclos?.length || 0} ciclo
                                {(otDetalleSeleccionada.ciclos?.length || 0) !== 1
                                    ? "s"
                                    : ""}
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setOtSeleccionada(null)}
                            style={{
                                border: "1px solid #cbd5e1",
                                background: "#ffffff",
                                color: "#475569",
                                borderRadius: "6px",
                                padding: "7px 12px",
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: "pointer"
                            }}
                        >
                            ✕ Cerrar trazabilidad
                        </button>
                    </div>

                    <div className="dashboardWinetOTResumen">

                        <div>
                            <span>ET actual</span>
                            <strong>
                                {otDetalleSeleccionada.et || "—"}
                            </strong>
                        </div>

                        <div>
                            <span>Supervisor</span>
                            <strong>
                                {otDetalleSeleccionada.supervisor || "—"}
                            </strong>
                        </div>

                        <div>
                            <span>Célula</span>
                            <strong>
                                {otDetalleSeleccionada.celula || "—"}
                            </strong>
                        </div>

                        <div>
                            <span>Estado actual</span>
                            <strong>
                                {formatearEstadoVisible(otDetalleSeleccionada.estadoActual)}
                            </strong>
                        </div>

                        <div>
                            <span>Ciclos</span>
                            <strong>
                                {otDetalleSeleccionada.ciclos?.length || 0}
                            </strong>
                        </div>

                        <div>
                            <span>Periodo</span>
                            <strong>
                                {otDetalleSeleccionada.primerInicio &&
                                otDetalleSeleccionada.ultimoFin
                                    ? `${new Date(
                                        otDetalleSeleccionada.primerInicio
                                    ).toLocaleDateString(
                                        "es-PE",
                                        { timeZone: "UTC" }
                                    )} → ${new Date(
                                        otDetalleSeleccionada.ultimoFin
                                    ).toLocaleDateString(
                                        "es-PE",
                                        { timeZone: "UTC" }
                                    )}`
                                    : "—"}
                            </strong>
                        </div>

                    </div>
                    <div className="dashboardWinetOTTiempos">

                        <div>
                            <span>Tiempo registrado total</span>
                            <strong>
                                {formatearDuracion(
                                    otDetalleSeleccionada.tiempoRegistradoTotal
                                )}
                            </strong>
                            <small>
                                Suma de segmentos con Inicio y Fin válidos, incluidas las suspensiones
                            </small>
                        </div>

                        <div>
                            <span>Tiempo suspendido</span>
                            <strong>
                                {formatearDuracion(
                                    otDetalleSeleccionada.tiempoSuspendidoTotal
                                )}
                            </strong>
                            <small>
                                Incluido en el tiempo registrado
                            </small>
                        </div>

                        <div>
                            <span>Tiempo no clasificado</span>
                            <strong>
                                {formatearDuracion(
                                    otDetalleSeleccionada.tiempoNoClasificadoTotal
                                )}
                            </strong>
                            <small>
                                Suma de intervalos entre actividades sin registro
                            </small>
                        </div>

                        <div>
                            <span>Tiempo transcurrido</span>
                            <strong>
                                {formatearDuracion(
                                    otDetalleSeleccionada.tiempoTranscurridoTotal
                                )}
                            </strong>
                            <small>
                                Desde el primer Inicio hasta el último Fin
                            </small>
                        </div>

                    </div>                
                    {otDetalleSeleccionada.ciclos?.map(
                        (ciclo, indiceCiclo) => (

                            <div
                                key={indiceCiclo}
                                style={{
                                    marginBottom: "20px"
                                }}
                            >

                                <div className="dashboardWinetCicloTitulo">
                                    Ciclo {indiceCiclo + 1} · {ciclo.segmentos?.length || 0}{" "}
                                    {(ciclo.segmentos?.length || 0) === 1 ? "segmento" : "segmentos"}
                                </div>

                                <div className="dashboardWinetCicloResumen">

                                    <div>
                                        <span>Fecha</span>
                                        <strong>
                                            {ciclo.segmentos?.[0]?.fechaActividad
                                                ? new Date(
                                                    ciclo.segmentos[0].fechaActividad
                                                ).toLocaleDateString(
                                                    "es-PE",
                                                    { timeZone: "UTC" }
                                                )
                                                : "—"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>ET</span>
                                        <strong>
                                            {ciclo.segmentos?.[0]?.et || "—"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Estado</span>
                                        <strong
                                            className={
                                                ciclo.segmentos?.[
                                                    ciclo.segmentos.length - 1
                                                ]?.estado === "FINALIZADA"
                                                    ? "dashboardWinetEtiqueta dashboardWinetEtiqueta--finalizada"
                                                    : ciclo.segmentos?.[
                                                        ciclo.segmentos.length - 1
                                                    ]?.estado === "INICIADA"
                                                        ? "dashboardWinetEtiqueta dashboardWinetEtiqueta--iniciada"
                                                        : ciclo.segmentos?.[
                                                            ciclo.segmentos.length - 1
                                                        ]?.estado === "NO_REALIZADO"
                                                            ? "dashboardWinetEtiqueta dashboardWinetEtiqueta--noRealizado"
                                                            : ciclo.segmentos?.[
                                                                ciclo.segmentos.length - 1
                                                            ]?.estado === "SUSPENDIDA"
                                                                ? "dashboardWinetEtiqueta dashboardWinetEtiqueta--suspendida"
                                                                : "dashboardWinetEtiqueta"
                                            }
                                        >
                                            {formatearEstadoVisible(
                                                ciclo.segmentos?.[
                                                    ciclo.segmentos.length - 1
                                                ]?.estado
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Resultado</span>
                                        <strong
                                            className={
                                                ciclo.segmentos?.[
                                                    ciclo.segmentos.length - 1
                                                ]?.resultadoNoRealizado === "REPROGRAMADA"
                                                    ? "dashboardWinetEtiqueta dashboardWinetEtiqueta--reprogramada"
                                                    : ciclo.segmentos?.[
                                                        ciclo.segmentos.length - 1
                                                    ]?.resultadoNoRealizado === "CIERRE_AUTOMATICO"
                                                        ? "dashboardWinetEtiqueta dashboardWinetEtiqueta--cierreAutomatico"
                                                        : "dashboardWinetEtiqueta"
                                            }
                                        >
                                            {formatearEstadoVisible(
                                                ciclo.segmentos?.[
                                                    ciclo.segmentos.length - 1
                                                ]?.resultadoNoRealizado
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>Duración del ciclo</span>
                                        <strong>
                                            {formatearDuracion(
                                                ciclo.tiempoTranscurridoMinutos || 0
                                            )}
                                        </strong>
                                    </div>

                                </div>

                                <div className="dashboardWinetTablaContenedor">

                                    <table className="dashboardWinetTabla">

                                        <thead>
                                            <tr>
                                                <th>ACTIVIDAD OFSC</th>
                                                <th>ET</th>
                                                <th>FECHA</th>
                                                <th>ESTADO</th>
                                                <th>RESULTADO</th>
                                                <th>DETALLE OFSC</th>
                                                <th>INICIO</th>
                                                <th>FIN</th>
                                                <th>DURACIÓN</th>
                                                <th>TIPO CIERRE</th>
                                                <th>RESP. SUSPENSIÓN</th>
                                            </tr>
                                        </thead>

                                        <tbody>

                                            {ciclo.segmentos?.map(
                                                (segmento, indiceSegmento) => (

                                                    <tr
                                                        key={
                                                            segmento.idActividad ||
                                                            `${indiceCiclo}-${indiceSegmento}`
                                                        }
                                                    >

                                                        <td>
                                                            {segmento.idActividadOFSC ||
                                                                "—"}
                                                        </td>

                                                        <td>
                                                            {segmento.et || "—"}
                                                        </td>

                                                        <td>
                                                            {segmento.fechaActividad
                                                                ? new Date(
                                                                    segmento.fechaActividad
                                                                ).toLocaleDateString(
                                                                    "es-PE",
                                                                    {
                                                                        timeZone: "UTC"
                                                                    }
                                                                )
                                                                : "—"}
                                                        </td>

                                                        <td>
                                                            <span
                                                                className={
                                                                    segmento.estado === "FINALIZADA"
                                                                        ? "dashboardWinetEtiqueta dashboardWinetEtiqueta--finalizada"
                                                                        : segmento.estado === "INICIADA"
                                                                            ? "dashboardWinetEtiqueta dashboardWinetEtiqueta--iniciada"
                                                                            : segmento.estado === "NO_REALIZADO"
                                                                                ? "dashboardWinetEtiqueta dashboardWinetEtiqueta--noRealizado"
                                                                                : segmento.estado === "SUSPENDIDA"
                                                                                    ? "dashboardWinetEtiqueta dashboardWinetEtiqueta--suspendida"
                                                                                    : "dashboardWinetEtiqueta"
                                                                }
                                                            >
                                                                {formatearEstadoVisible(segmento.estado)}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            {segmento.estado === "NO_REALIZADO" ? (
                                                                <span
                                                                    className={
                                                                        segmento.resultadoNoRealizado === "REPROGRAMADA"
                                                                            ? "dashboardWinetEtiqueta dashboardWinetEtiqueta--reprogramada"
                                                                            : segmento.resultadoNoRealizado === "CIERRE_AUTOMATICO"
                                                                                ? "dashboardWinetEtiqueta dashboardWinetEtiqueta--cierreAutomatico"
                                                                                : "dashboardWinetEtiqueta"
                                                                    }
                                                                >
                                                                    {formatearEstadoVisible(segmento.resultadoNoRealizado)}
                                                                </span>
                                                            ) : (
                                                                <span className="dashboardWinetEtiqueta">
                                                                    —
                                                                </span>
                                                            )}
                                                        </td>

                                                        <td>
                                                            {segmento.estado ===
                                                            "NO_REALIZADO"
                                                                ? segmento.motivo ||
                                                                segmento.razonReagenda ||
                                                                "—"
                                                                : segmento.estado ===
                                                                "SUSPENDIDA"
                                                                    ? segmento.motivo ||
                                                                    "—"
                                                                    : segmento.estado ===
                                                                    "FINALIZADA"
                                                                        ? segmento.resultadoGlobal ||
                                                                        "—"
                                                                        : "—"}
                                                        </td>

                                                        <td>
                                                            {segmento.horaInicio
                                                                ? new Date(
                                                                    segmento.horaInicio
                                                                ).toLocaleTimeString(
                                                                    "es-PE",
                                                                    {
                                                                        hour: "2-digit",
                                                                        minute: "2-digit",
                                                                        timeZone: "UTC"
                                                                    }
                                                                )
                                                                : "—"}
                                                        </td>

                                                        <td>
                                                            {segmento.horaFin
                                                                ? new Date(
                                                                    segmento.horaFin
                                                                ).toLocaleTimeString(
                                                                    "es-PE",
                                                                    {
                                                                        hour: "2-digit",
                                                                        minute: "2-digit",
                                                                        timeZone: "UTC"
                                                                    }
                                                                )
                                                                : "—"}
                                                        </td>

                                                        <td>
                                                            {formatearDuracion(
                                                                segmento.duracionMinutos
                                                            )}

                                                            {indiceSegmento > 0 &&
                                                                calcularBrechaSegmentos(
                                                                    ciclo.segmentos?.[indiceSegmento - 1],
                                                                    segmento
                                                                ) > 0 && (
                                                                    <small
                                                                        title="Intervalo sin actividad registrada entre el segmento anterior y este segmento."
                                                                        style={{
                                                                            display: "block",
                                                                            marginTop: "3px",
                                                                            color: "#b45309",
                                                                            fontWeight: "600",
                                                                            fontSize: "10px"
                                                                        }}
                                                                    >
                                                                        +{" "}
                                                                        {formatearDuracion(
                                                                            calcularBrechaSegmentos(
                                                                                ciclo.segmentos?.[indiceSegmento - 1],
                                                                                segmento
                                                                            )
                                                                        )}{" "}
                                                                        no clasificado
                                                                    </small>
                                                                )}
                                                        </td>

                                                        <td>
                                                            <span
                                                                className={
                                                                    segmento.tipoCierre === "REPROGRAMADA"
                                                                        ? "dashboardWinetEtiqueta dashboardWinetEtiqueta--reprogramada"
                                                                        : segmento.tipoCierre === "CIERRE_AUTOMATICO"
                                                                            ? "dashboardWinetEtiqueta dashboardWinetEtiqueta--cierreAutomatico"
                                                                            : "dashboardWinetEtiqueta"
                                                                }
                                                            >
                                                                {formatearEstadoVisible(segmento.tipoCierre)}
                                                            </span>
                                                        </td>

                                                        <td>
                                                            <span
                                                                className="dashboardWinetEtiqueta"
                                                                title="Responsable de la suspensión registrado en OFSC."
                                                            >
                                                                {segmento.responsableSuspension || "—"}
                                                            </span>
                                                        </td>

                                                    </tr>
                                                )
                                            )}

                                        </tbody>

                                    </table>

                                </div>

                            </div>
                        )
                    )}

                </div>
            )}

        {etSeleccionado !== null && otSeleccionada === null && (
            <div className="dashboardWinetActividades">
                <div className="dashboardWinetResumenTitulo">
                    <span>
                        Actividades OFSC del especialista
                    </span>

                    {etDetalleSeleccionado?.et && (
                        <span
                            style={{
                                marginLeft: "8px",
                                fontSize: "12px",
                                fontWeight: "600",
                                color: "#64748b"
                            }}
                        >
                            · {etDetalleSeleccionado.et}
                        </span>
                    )}

                    <span
                        style={{
                            marginLeft: "8px",
                            fontSize: "12px",
                            fontWeight: "600",
                            color: "#64748b"
                        }}
                    >
                        · {actividadesETSeleccionado.length} actividades
                    </span>
                </div>

                {actividadesETSeleccionado.length === 0 ? (
                    <div className="dashboardWinetVacio">
                        El ET seleccionado no tiene actividades
                        para los filtros actuales.
                    </div>
                ) : (
                    <div className="dashboardWinetTablaContenedor">
                        <table className="dashboardWinetTabla">
                            <thead>
                                <tr>
                                    <th>OT</th>
                                    <th>ACTIVIDAD OFSC</th>
                                    <th>FECHA</th>
                                    <th>ESTADO</th>
                                    <th
                                        title="Resultado registrado en OFSC. Para actividades no realizadas se muestra el resultado correspondiente a la no realización; para actividades finalizadas se muestra el resultado global."
                                    >
                                        RESULTADO
                                    </th>
                                    <th>DETALLE OFSC</th>
                                    <th>INICIO</th>
                                    <th>FIN</th>
                                    <th>DURACIÓN</th>
                                    <th>DISTRITO</th>
                                </tr>
                            </thead>

                            <tbody>
                                {actividadesETSeleccionado.map(
                                    (actividad) => (
                                        <tr
                                            key={
                                                actividad.idActividad
                                            }
                                        >
                                            <td>
                                                {actividad.codigoOT || "—"}
                                            </td>

                                            <td>
                                                {actividad.idActividadOFSC ||
                                                    "—"}
                                            </td>

                                            <td>
                                                {actividad.fechaActividad
                                                    ? new Date(
                                                        actividad.fechaActividad
                                                    ).toLocaleDateString(
                                                        "es-PE",
                                                        {
                                                            timeZone: "UTC"
                                                        }
                                                    )
                                                    : "—"}
                                            </td>

                                            <td>
                                                <span
                                                    className={
                                                        actividad.estado === "FINALIZADA"
                                                            ? "dashboardWinetEtiqueta dashboardWinetEtiqueta--finalizada"
                                                            : actividad.estado === "INICIADA"
                                                                ? "dashboardWinetEtiqueta dashboardWinetEtiqueta--iniciada"
                                                                : actividad.estado === "NO_REALIZADO"
                                                                    ? "dashboardWinetEtiqueta dashboardWinetEtiqueta--noRealizado"
                                                                    : actividad.estado === "SUSPENDIDA"
                                                                        ? "dashboardWinetEtiqueta dashboardWinetEtiqueta--suspendida"
                                                                        : "dashboardWinetEtiqueta"
                                                    }
                                                >
                                                    {formatearEstadoVisible(actividad.estado)}
                                                </span>
                                            </td>

                                            <td>
                                                <span
                                                    className="dashboardWinetEtiqueta"
                                                    title="Resultado registrado en OFSC. Este campo es independiente del estado de la actividad."
                                                >
                                                    {actividad.estado === "NO_REALIZADO"
                                                        ? (actividad.resultadoNoRealizado || "—")
                                                        : actividad.estado === "FINALIZADA"
                                                            ? formatearEstadoVisible(actividad.tipoCierre)
                                                            : "—"}
                                                </span>
                                            </td>
                                            <td>
                                                <span
                                                    className="dashboardWinetDetalleTexto"
                                                    title={
                                                        actividad.estado === "NO_REALIZADO"
                                                            ? (
                                                                actividad.motivo ||
                                                                actividad.razonReagenda ||
                                                                "—"
                                                            )
                                                            : actividad.estado === "SUSPENDIDA"
                                                                ? (
                                                                    actividad.motivo ||
                                                                    "—"
                                                                )
                                                                : actividad.estado === "FINALIZADA"
                                                                    ? (
                                                                        actividad.resultadoGlobal ||
                                                                        "—"
                                                                    )
                                                                    : "—"
                                                    }
                                                >
                                                    {actividad.estado === "NO_REALIZADO"
                                                        ? (
                                                            actividad.motivo ||
                                                            actividad.razonReagenda ||
                                                            "—"
                                                        )
                                                        : actividad.estado === "SUSPENDIDA"
                                                            ? (
                                                                actividad.motivo ||
                                                                "—"
                                                            )
                                                            : actividad.estado === "FINALIZADA"
                                                                ? (
                                                                    actividad.resultadoGlobal ||
                                                                    "—"
                                                                )
                                                                : "—"}
                                                </span>
                                            </td>     
                                            <td>
                                                {actividad.horaInicio
                                                    ? new Date(
                                                        actividad.horaInicio
                                                    ).toLocaleTimeString(
                                                        "es-PE",
                                                        {
                                                            timeZone: "UTC",
                                                            hour: "2-digit",
                                                            minute: "2-digit"
                                                        }
                                                    )
                                                    : "—"}
                                            </td>

                                            <td>
                                                {actividad.horaFin
                                                    ? new Date(
                                                        actividad.horaFin
                                                    ).toLocaleTimeString(
                                                        "es-PE",
                                                        {
                                                            timeZone: "UTC",
                                                            hour: "2-digit",
                                                            minute: "2-digit"
                                                        }
                                                    )
                                                    : "—"}
                                            </td>
                                            <td>
                                                {formatearDuracion(
                                                    actividad.duracionMinutos
                                                )}
                                            </td>   
                                            <td>
                                                {actividad.distrito ||
                                                    "—"}
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        )}       

            {/* =====================================
                CONTROL DE IMPORTACIÓN OFSC
            ===================================== */}

            <div className="dashboardGrupoTitulo dashboardGrupoTituloOperativo">
                <span>
                    {dashboard?.ultimaImportacion ? (
                        <>
                            Resultado de la última importación OFSC
                            {" · Operación #"}
                            {dashboard.ultimaImportacion.idOperacion}
                            {" · "}
                            {new Date(
                                dashboard.ultimaImportacion.fechaImportacion
                            ).toLocaleString("es-PE")}
                            {" · Archivo: "}
                            {dashboard.ultimaImportacion.nombreArchivo}
                        </>
                    ) : (
                        "Sin importación OFSC registrada"
                    )}
                </span>
            </div>

            <div className="dashboardCards">

                {cards
                    .filter(
                        (card) =>
                            [
                                "OTs nuevas",
                                "OTs actualizadas",
                                "OTs sin cambios",
                                "Errores de importación"
                            ].includes(
                                card.titulo
                            )
                    )
                    .map(
                        (card) => (
                            <article
                                className={`dashboardCard dashboardCard--${card.tipo}`}
                                key={
                                    card.titulo
                                }
                            >

                                <div className="dashboardCardCabecera">

                                    <span className="dashboardCardTitulo">
                                        {
                                            card.titulo
                                        }
                                    </span>

                                    <span
                                        className="dashboardCardIndicador"
                                        aria-hidden="true"
                                    />

                                </div>

                                <div className="dashboardCardValor">
                                    {
                                        card.valor
                                    }
                                </div>

                                <span className="dashboardCardDetalle">
                                    {
                                        card.detalle
                                    }
                                </span>

                            </article>
                        )
                    )}

            </div>     
        </section>
    );
}

export default DashboardCards;