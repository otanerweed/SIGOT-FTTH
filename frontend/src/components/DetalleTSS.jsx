import {
    useEffect,
    useRef
} from "react";

import ProgramarTSS from "./ProgramarTSS";
import AccionesEstadoTSS from "./AccionesEstadoTSS";
import ContinuidadTSS from "./ContinuidadTSS";

function obtenerTexto(valor) {
    const texto = String(valor ?? "").trim();

    return texto || "—";
}

function mostrarEstado(valor) {
    return obtenerTexto(valor)
        .replace(/_/g, " ");
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

function mostrarBooleano(valor) {
    return valor === true || Number(valor) === 1
        ? "Sí"
        : "No";
}

function claseEstado(valor) {
    const estado = String(valor ?? "")
        .trim()
        .toUpperCase();

    if (
        [
            "FACTIBLE",
            "COMPLETA",
            "COMPLETADA",
            "CONFIRMADA",
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
            "NO_DISPONIBLE",
            "CANCELADA",
            "OBSERVADA"
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
            "ACTIVA",
            "EN_EJECUCION"
        ].includes(estado)
    ) {
        return "tss-badge--informacion";
    }

    return "tss-badge--neutro";
}

function BadgeEstado({ valor }) {
    return (
        <span
            className={`tss-badge ${claseEstado(
                valor
            )}`}
        >
            {mostrarEstado(valor)}
        </span>
    );
}

function Dato({ etiqueta, valor }) {
    return (
        <div className="tss-detalle-dato">
            <dt>{etiqueta}</dt>
            <dd>{obtenerTexto(valor)}</dd>
        </div>
    );
}

function SeccionColeccion({
    titulo,
    elementos,
    children,
    abierta = false
}) {
    const lista = Array.isArray(elementos)
        ? elementos
        : [];

    return (
        <details
            className="tss-detalle-acordeon"
            open={abierta}
        >
            <summary>
                <span>{titulo}</span>

                <span className="tss-detalle-contador">
                    {lista.length}
                </span>
            </summary>

            <div className="tss-detalle-acordeon-contenido">
                {lista.length > 0 ? (
                    lista.map(children)
                ) : (
                    <p className="tss-detalle-vacio">
                        No hay registros disponibles.
                    </p>
                )}
            </div>
        </details>
    );
}

function DetalleTSS({
    abierto,
    detalle,
    cargando,
    error,
    onCerrar,
    onReintentar
}) {
    const botonCerrarRef = useRef(null);

    useEffect(() => {
        if (!abierto) {
            return undefined;
        }

        const desbordamientoAnterior =
            document.body.style.overflow;

        document.body.style.overflow =
            "hidden";

        const controlarTeclado = (evento) => {
            if (evento.key === "Escape") {
                onCerrar();
            }
        };

        document.addEventListener(
            "keydown",
            controlarTeclado
        );

        window.setTimeout(() => {
            botonCerrarRef.current?.focus();
        }, 0);

        return () => {
            document.body.style.overflow =
                desbordamientoAnterior;

            document.removeEventListener(
                "keydown",
                controlarTeclado
            );
        };
    }, [abierto, onCerrar]);

    if (!abierto) {
        return null;
    }

    const tss =
        detalle?.tss || null;

    const historial =
        detalle?.historialEstados || [];

    const evidencias =
        detalle?.evidencias || [];

    const tiposEvidencia =
        detalle?.tiposEvidencia || [];

    const documentos =
        detalle?.documentos || [];

    const validaciones =
        detalle?.validacionesTCE || [];

    const agenda =
        detalle?.agenda || [];

    const seguimientoTSS =
        detalle?.seguimientoTSS || [];

    const disponibilidad =
        Array.isArray(
            detalle?.disponibilidad
        )
            ? detalle.disponibilidad
            : detalle?.disponibilidad
              ? [detalle.disponibilidad]
              : [];

    const tecnico =
        tss?.Tecnico ||
        tss?.NombreTecnico ||
        tss?.NombreCompletoTecnico;

    return (
        <div
            className="tss-detalle-fondo"
            onMouseDown={(evento) => {
                if (
                    evento.target ===
                    evento.currentTarget
                ) {
                    onCerrar();
                }
            }}
        >
            <aside
                className="tss-detalle-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="tss-detalle-titulo"
                aria-busy={cargando}
            >
                <header className="tss-detalle-cabecera">
                    <div>
                        <span className="tss-detalle-etiqueta">
                            Ficha técnica de servicio
                        </span>

                        <h2 id="tss-detalle-titulo">
                            {tss?.IdTSS
                                ? `TSS #${tss.IdTSS}`
                                : "Detalle TSS"}
                        </h2>

                        {tss?.CodigoOT && (
                            <p>
                                OT {tss.CodigoOT}
                            </p>
                        )}
                    </div>

                    <button
                        ref={botonCerrarRef}
                        type="button"
                        className="tss-detalle-cerrar"
                        onClick={onCerrar}
                        aria-label="Cerrar detalle TSS"
                    >
                        ×
                    </button>
                </header>

                <div className="tss-detalle-cuerpo">
                    {cargando && (
                        <div
                            className="tss-detalle-mensaje"
                            role="status"
                        >
                            Cargando información del TSS...
                        </div>
                    )}

                    {!cargando && error && (
                        <div
                            className="tss-detalle-mensaje tss-detalle-mensaje--error"
                            role="alert"
                        >
                            <p>{error}</p>

                            <button
                                type="button"
                                onClick={onReintentar}
                            >
                                Reintentar
                            </button>
                        </div>
                    )}

                    {!cargando &&
                        !error &&
                        tss && (
                            <>
                                <div className="tss-detalle-estados">
                                    <div>
                                        <span>
                                            Estado TSS
                                        </span>

                                        <BadgeEstado
                                            valor={
                                                tss.EstadoTSS
                                            }
                                        />
                                    </div>

                                    <div>
                                        <span>
                                            Estado OT
                                        </span>

                                        <BadgeEstado
                                            valor={
                                                tss.EstadoOT
                                            }
                                        />
                                    </div>
                                </div>

                                <ProgramarTSS
                                    tss={tss}
                                    onProgramado={
                                        onReintentar
                                    }
                                />

                                <AccionesEstadoTSS
                                    tss={tss}
                                    onActualizado={
                                        onReintentar
                                    }
                                />

                                <ContinuidadTSS
                                    tss={tss}
                                    onActualizado={
                                        onReintentar
                                    }
                                />

                                <section className="tss-detalle-seccion">
                                    <h3>
                                        Orden y cliente
                                    </h3>

                                    <dl className="tss-detalle-grid">
                                        <Dato
                                            etiqueta="Código OT"
                                            valor={
                                                tss.CodigoOT
                                            }
                                        />

                                        <Dato
                                            etiqueta="Cliente"
                                            valor={
                                                tss.Cliente ||
                                                tss.NombreCliente
                                            }
                                        />

                                        <Dato
                                            etiqueta="Tipo de actividad"
                                            valor={
                                                tss.TipoServicio ||
                                                tss.ProductoPlan
                                            }
                                        />

                                        <Dato
                                            etiqueta="Distrito"
                                            valor={
                                                tss.Distrito
                                            }
                                        />

                                        <Dato
                                            etiqueta="Dirección"
                                            valor={
                                                tss.Direccion
                                            }
                                        />

                                        <Dato
                                            etiqueta="Creado"
                                            valor={formatearFechaHora(
                                                tss.FechaCreacion
                                            )}
                                        />
                                    </dl>
                                </section>

                                <section className="tss-detalle-seccion">
                                    <h3>
                                        Programación técnica
                                    </h3>

                                    <dl className="tss-detalle-grid">
                                        <Dato
                                            etiqueta="Técnico"
                                            valor={
                                                tecnico
                                            }
                                        />

                                        <Dato
                                            etiqueta="Código técnico"
                                            valor={
                                                tss.CodigoTecnico
                                            }
                                        />

                                        <Dato
                                            etiqueta="Fecha"
                                            valor={formatearFecha(
                                                tss.FechaAgendaTSS ||
                                                tss.FechaAgenda
                                            )}
                                        />

                                        <Dato
                                            etiqueta="Turno"
                                            valor={
                                                tss.Turno
                                            }
                                        />

                                        <Dato
                                            etiqueta="Proyecto"
                                            valor={
                                                tss.ProyectoNombre ||
                                                tss.ProyectoCodigo ||
                                                "Sin proyecto"
                                            }
                                        />

                                        <Dato
                                            etiqueta="NAP"
                                            valor={
                                                tss.CodigoNAP ||
                                                tss.NombreNAP
                                            }
                                        />

                                        <Dato
                                            etiqueta="Puerto NAP"
                                            valor={
                                                tss.PuertoNAPTSS ||
                                                tss.PuertoNAP
                                            }
                                        />

                                        <Dato
                                            etiqueta="RFS"
                                            valor={
                                                tss.RFSTSS ||
                                                tss.RFS
                                            }
                                        />

                                        <Dato
                                            etiqueta="Continuidad"
                                            valor={mostrarEstado(
                                                tss.ContinuidadInstalacion
                                            )}
                                        />

                                        <Dato
                                            etiqueta="Formulario enviado"
                                            valor={mostrarBooleano(
                                                tss.FormularioEnviado
                                            )}
                                        />

                                        <Dato
                                            etiqueta="Última actualización"
                                            valor={formatearFechaHora(
                                                tss.FechaActualizacion
                                            )}
                                        />
                                    </dl>

                                    {tss.Observaciones && (
                                        <div className="tss-detalle-observacion">
                                            <strong>
                                                Observaciones
                                            </strong>

                                            <p>
                                                {
                                                    tss.Observaciones
                                                }
                                            </p>
                                        </div>
                                    )}
                                </section>

                                <div className="tss-detalle-colecciones">
                                    <SeccionColeccion
                                        titulo="Historial de estados"
                                        elementos={
                                            historial
                                        }
                                        abierta
                                    >
                                        {(
                                            item,
                                            indice
                                        ) => (
                                            <article
                                                className="tss-detalle-item"
                                                key={
                                                    item.IdHistorialTSS ||
                                                    `historial-${indice}`
                                                }
                                            >
                                                <div className="tss-detalle-item-cabecera">
                                                    <BadgeEstado
                                                        valor={
                                                            item.EstadoNuevo
                                                        }
                                                    />

                                                    <time>
                                                        {formatearFechaHora(
                                                            item.FechaEvento
                                                        )}
                                                    </time>
                                                </div>

                                                <p>
                                                    {mostrarEstado(
                                                        item.EstadoAnterior ||
                                                            "Sin estado anterior"
                                                    )}{" "}
                                                    →{" "}
                                                    {mostrarEstado(
                                                        item.EstadoNuevo
                                                    )}
                                                </p>

                                                {(item.Motivo ||
                                                    item.Observacion) && (
                                                    <small>
                                                        {item.Motivo ||
                                                            item.Observacion}
                                                    </small>
                                                )}
                                            </article>
                                        )}
                                    </SeccionColeccion>

                                    <SeccionColeccion
                                        titulo="Seguimiento TSS"
                                        elementos={
                                            seguimientoTSS
                                        }
                                    >
                                        {(
                                            item,
                                            indice
                                        ) => (
                                            <article
                                                className="tss-detalle-item"
                                                key={
                                                    item.IdSeguimientoTSS ||
                                                    `seguimiento-tss-${indice}`
                                                }
                                            >
                                                <div className="tss-detalle-item-cabecera">
                                                    <strong>
                                                        {mostrarEstado(
                                                            item.Evento ||
                                                                "Evento TSS"
                                                        )}
                                                    </strong>

                                                    <time>
                                                        {formatearFechaHora(
                                                            item.FechaEvento
                                                        )}
                                                    </time>
                                                </div>

                                                {(item.EstadoAnterior ||
                                                    item.EstadoNuevo) && (
                                                    <p>
                                                        {mostrarEstado(
                                                            item.EstadoAnterior ||
                                                                "Sin definir"
                                                        )}{" "}
                                                        →{" "}
                                                        {mostrarEstado(
                                                            item.EstadoNuevo ||
                                                                "Sin definir"
                                                        )}
                                                    </p>
                                                )}

                                                {item.Comentario && (
                                                    <small>
                                                        {
                                                            item.Comentario
                                                        }
                                                    </small>
                                                )}

                                                {item.UsuarioResponsable && (
                                                    <small>
                                                        Registrado por{" "}
                                                        <strong>
                                                            {
                                                                item.UsuarioResponsable
                                                            }
                                                        </strong>

                                                        {item.RolResponsable
                                                            ? ` · ${item.RolResponsable}`
                                                            : ""}
                                                    </small>
                                                )}
                                            </article>
                                        )}
                                    </SeccionColeccion>

                                    <SeccionColeccion
                                        titulo="Evidencias registradas"
                                        elementos={
                                            evidencias
                                        }
                                    >
                                        {(
                                            item,
                                            indice
                                        ) => (
                                            <article
                                                className="tss-detalle-item"
                                                key={
                                                    item.IdEvidenciaTSS ||
                                                    `evidencia-${indice}`
                                                }
                                            >
                                                <div className="tss-detalle-item-cabecera">
                                                    <strong>
                                                        {item.NombreEvidencia ||
                                                            item.TipoEvidencia ||
                                                            "Evidencia"}
                                                    </strong>

                                                    <BadgeEstado
                                                        valor={
                                                            item.EstadoEvidencia
                                                        }
                                                    />
                                                </div>

                                                <p>
                                                    {item.NombreArchivo ||
                                                        item.MotivoNoAplica ||
                                                        "Sin archivo registrado"}
                                                </p>

                                                {item.Observacion && (
                                                    <small>
                                                        {
                                                            item.Observacion
                                                        }
                                                    </small>
                                                )}
                                            </article>
                                        )}
                                    </SeccionColeccion>

                                    <SeccionColeccion
                                        titulo="Tipos de evidencia requeridos"
                                        elementos={
                                            tiposEvidencia
                                        }
                                    >
                                        {(
                                            item,
                                            indice
                                        ) => (
                                            <article
                                                className="tss-detalle-item"
                                                key={
                                                    item.IdTipoEvidencia ||
                                                    `tipo-${indice}`
                                                }
                                            >
                                                <div className="tss-detalle-item-cabecera">
                                                    <strong>
                                                        {obtenerTexto(
                                                            item.Nombre
                                                        )}
                                                    </strong>

                                                    <span className="tss-detalle-mini-etiqueta">
                                                        {mostrarBooleano(
                                                            item.Obligatoria
                                                        ) ===
                                                        "Sí"
                                                            ? "Obligatoria"
                                                            : "Opcional"}
                                                    </span>
                                                </div>

                                                {item.Descripcion && (
                                                    <p>
                                                        {
                                                            item.Descripcion
                                                        }
                                                    </p>
                                                )}
                                            </article>
                                        )}
                                    </SeccionColeccion>

                                    <SeccionColeccion
                                        titulo="Documentos generados"
                                        elementos={
                                            documentos
                                        }
                                    >
                                        {(
                                            item,
                                            indice
                                        ) => (
                                            <article
                                                className="tss-detalle-item"
                                                key={
                                                    item.IdDocumentoTSS ||
                                                    `documento-${indice}`
                                                }
                                            >
                                                <div className="tss-detalle-item-cabecera">
                                                    <strong>
                                                        {obtenerTexto(
                                                            item.NombreArchivo
                                                        )}
                                                    </strong>

                                                    <BadgeEstado
                                                        valor={
                                                            item.TipoDocumento
                                                        }
                                                    />
                                                </div>

                                                <p>
                                                    Generado:{" "}
                                                    {formatearFechaHora(
                                                        item.FechaGeneracion
                                                    )}
                                                </p>

                                                <small>
                                                    {mostrarBooleano(
                                                        item.Vigente
                                                    ) ===
                                                    "Sí"
                                                        ? "Documento vigente"
                                                        : "Documento no vigente"}
                                                </small>
                                            </article>
                                        )}
                                    </SeccionColeccion>

                                    <SeccionColeccion
                                        titulo="Validaciones TCE"
                                        elementos={
                                            validaciones
                                        }
                                    >
                                        {(
                                            item,
                                            indice
                                        ) => (
                                            <article
                                                className="tss-detalle-item"
                                                key={
                                                    item.IdValidacionTCE ||
                                                    `validacion-${indice}`
                                                }
                                            >
                                                <div className="tss-detalle-item-cabecera">
                                                    <strong>
                                                        {item.CodigoNAPValidado ||
                                                            "Validación NAP"}
                                                    </strong>

                                                    <BadgeEstado
                                                        valor={
                                                            item.Resultado
                                                        }
                                                    />
                                                </div>

                                                <p>
                                                    Puerto:{" "}
                                                    {obtenerTexto(
                                                        item.PuertoConfirmado
                                                    )}
                                                </p>

                                                <small>
                                                    {item.Observaciones ||
                                                        `Solicitada: ${formatearFechaHora(
                                                            item.FechaSolicitud
                                                        )}`}
                                                </small>
                                            </article>
                                        )}
                                    </SeccionColeccion>

                                    <SeccionColeccion
                                        titulo="Agenda técnica"
                                        elementos={
                                            agenda
                                        }
                                    >
                                        {(
                                            item,
                                            indice
                                        ) => (
                                            <article
                                                className="tss-detalle-item"
                                                key={
                                                    item.IdAgenda ||
                                                    `agenda-${indice}`
                                                }
                                            >
                                                <div className="tss-detalle-item-cabecera">
                                                    <strong>
                                                        {formatearFecha(
                                                            item.FechaAgenda
                                                        )}{" "}
                                                        ·{" "}
                                                        {obtenerTexto(
                                                            item.Turno
                                                        )}
                                                    </strong>

                                                    <BadgeEstado
                                                        valor={
                                                            item.EstadoAgenda
                                                        }
                                                    />
                                                </div>

                                                <p>
                                                    {item.Tecnico ||
                                                        item.NombreTecnico ||
                                                        "Técnico sin identificar"}
                                                </p>

                                                {item.Observaciones && (
                                                    <small>
                                                        {
                                                            item.Observaciones
                                                        }
                                                    </small>
                                                )}
                                            </article>
                                        )}
                                    </SeccionColeccion>

                                    <SeccionColeccion
                                        titulo="Disponibilidad del técnico"
                                        elementos={
                                            disponibilidad
                                        }
                                    >
                                        {(
                                            item,
                                            indice
                                        ) => (
                                            <article
                                                className="tss-detalle-item"
                                                key={
                                                    item.IdDisponibilidad ||
                                                    `disponibilidad-${indice}`
                                                }
                                            >
                                                <div className="tss-detalle-item-cabecera">
                                                    <strong>
                                                        {formatearFecha(
                                                            item.FechaVigencia
                                                        )}
                                                    </strong>

                                                    <span className="tss-detalle-mini-etiqueta">
                                                        AM{" "}
                                                        {mostrarBooleano(
                                                            item.DisponibleAM
                                                        )}{" "}
                                                        · PM{" "}
                                                        {mostrarBooleano(
                                                            item.DisponiblePM
                                                        )}
                                                    </span>
                                                </div>

                                                <p>
                                                    Nocturno confirmado:{" "}
                                                    {mostrarBooleano(
                                                        item.NocturnoConfirmado
                                                    )}
                                                </p>

                                                {(item.Motivo ||
                                                    item.Observaciones) && (
                                                    <small>
                                                        {item.Motivo ||
                                                            item.Observaciones}
                                                    </small>
                                                )}
                                            </article>
                                        )}
                                    </SeccionColeccion>
                                </div>
                            </>
                        )}
                </div>
            </aside>
        </div>
    );
}

export default DetalleTSS;