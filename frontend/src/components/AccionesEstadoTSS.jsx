import {
    useMemo,
    useState
} from "react";

import {
    cambiarEstadoTSS
} from "../services/tssService";

const RESULTADOS_TSS = [
    {
        valor: "FACTIBLE",
        etiqueta: "Factible"
    },
    {
        valor: "PDT_LPU",
        etiqueta: "Pdt. LPU"
    },
    {
        valor: "NO_CONCLUIDO",
        etiqueta: "No concluido"
    },
    {
        valor: "FALLIDO_CAMPO",
        etiqueta: "Fallido campo"
    },
    {
        valor: "FALLIDO_ESCRITORIO",
        etiqueta: "Fallido escritorio"
    },
    {
        valor: "REPROGRAMAR",
        etiqueta: "Reprogramar"
    }
];

function AccionesEstadoTSS({
    tss,
    onActualizado
}) {
    const [resultado, setResultado] =
        useState("");

    const [motivo, setMotivo] =
        useState("");

    const [observacion, setObservacion] =
        useState("");

    const [guardando, setGuardando] =
        useState(false);

    const [error, setError] =
        useState("");

    const [mensaje, setMensaje] =
        useState("");

    const estado = useMemo(
        () =>
            String(
                tss?.EstadoTSS || ""
            )
                .trim()
                .toUpperCase(),
        [tss?.EstadoTSS]
    );

    if (
        ![
            "PROGRAMADO",
            "EN_EJECUCION"
        ].includes(estado)
    ) {
        return null;
    }

    async function ejecutarCambio(
        estadoNuevo
    ) {
        try {
            setGuardando(true);
            setError("");
            setMensaje("");

            const respuesta =
                await cambiarEstadoTSS(
                    tss.IdTSS,
                    {
                        estadoNuevo,
                        motivo:
                            motivo.trim(),
                        observacion:
                            observacion.trim()
                    }
                );

            setMensaje(
                respuesta?.mensaje ||
                "Estado actualizado correctamente."
            );

            setResultado("");
            setMotivo("");
            setObservacion("");

            if (
                typeof onActualizado ===
                "function"
            ) {
                await onActualizado();
            }
        } catch (errorPeticion) {
            setError(
                errorPeticion.response
                    ?.data?.mensaje ||
                "No se pudo actualizar el estado TSS."
            );
        } finally {
            setGuardando(false);
        }
    }

    async function iniciarTSS() {
        const confirmado =
            window.confirm(
                "¿Desea iniciar la ejecución de este TSS?"
            );

        if (!confirmado) {
            return;
        }

        await ejecutarCambio(
            "EN_EJECUCION"
        );
    }

    async function registrarResultado(
        evento
    ) {
        evento.preventDefault();

        if (!resultado) {
            setError(
                "Seleccione el resultado del TSS."
            );
            return;
        }

        const confirmado =
            window.confirm(
                "¿Confirma el resultado seleccionado para este TSS?"
            );

        if (!confirmado) {
            return;
        }

        await ejecutarCambio(
            resultado
        );
    }

    return (
        <section className="tss-estado-operativo">
            <div className="tss-estado-operativo-cabecera">
                <div>
                    <span className="tss-estado-operativo-etiqueta">
                        FLUJO OPERATIVO
                    </span>

                    <h3>
                        {estado === "PROGRAMADO"
                            ? "Iniciar atención TSS"
                            : "Registrar resultado TSS"}
                    </h3>

                    <p>
                        {estado === "PROGRAMADO"
                            ? "Confirme el inicio de la atención técnica."
                            : "Seleccione el resultado obtenido durante la atención."}
                    </p>
                </div>

                <span className="tss-estado-operativo-badge">
                    {estado.replace(
                        /_/g,
                        " "
                    )}
                </span>
            </div>

            {estado === "PROGRAMADO" && (
                <div className="tss-estado-operativo-acciones">
                    <button
                        type="button"
                        className="tss-boton tss-boton--primario"
                        onClick={iniciarTSS}
                        disabled={guardando}
                    >
                        {guardando
                            ? "Iniciando..."
                            : "Iniciar TSS"}
                    </button>
                </div>
            )}

            {estado ===
                "EN_EJECUCION" && (
                <form
                    onSubmit={
                        registrarResultado
                    }
                    className="tss-estado-operativo-formulario"
                >
                    <div className="tss-campo">
                        <label htmlFor="resultadoTSS">
                            Resultado
                        </label>

                        <select
                            id="resultadoTSS"
                            value={
                                resultado
                            }
                            onChange={(
                                evento
                            ) =>
                                setResultado(
                                    evento
                                        .target
                                        .value
                                )
                            }
                            disabled={
                                guardando
                            }
                        >
                            <option value="">
                                Seleccione resultado
                            </option>

                            {RESULTADOS_TSS.map(
                                (item) => (
                                    <option
                                        key={
                                            item.valor
                                        }
                                        value={
                                            item.valor
                                        }
                                    >
                                        {
                                            item.etiqueta
                                        }
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    <div className="tss-campo">
                        <label htmlFor="motivoTSS">
                            Motivo
                        </label>

                        <input
                            id="motivoTSS"
                            type="text"
                            value={motivo}
                            onChange={(
                                evento
                            ) =>
                                setMotivo(
                                    evento
                                        .target
                                        .value
                                )
                            }
                            maxLength={250}
                            placeholder="Opcional"
                            disabled={
                                guardando
                            }
                        />
                    </div>

                    <div className="tss-campo">
                        <label htmlFor="observacionTSS">
                            Observación
                        </label>

                        <textarea
                            id="observacionTSS"
                            value={
                                observacion
                            }
                            onChange={(
                                evento
                            ) =>
                                setObservacion(
                                    evento
                                        .target
                                        .value
                                )
                            }
                            maxLength={500}
                            rows={3}
                            placeholder="Detalle adicional del resultado..."
                            disabled={
                                guardando
                            }
                        />
                    </div>

                    <div className="tss-estado-operativo-acciones">
                        <button
                            type="submit"
                            className="tss-boton tss-boton--primario"
                            disabled={
                                guardando
                            }
                        >
                            {guardando
                                ? "Guardando..."
                                : "Confirmar resultado"}
                        </button>
                    </div>
                </form>
            )}

            {error && (
                <div className="tss-programacion-mensaje tss-programacion-mensaje--error">
                    {error}
                </div>
            )}

            {mensaje && (
                <div className="tss-programacion-mensaje tss-programacion-mensaje--exito">
                    {mensaje}
                </div>
            )}
        </section>
    );
}

export default AccionesEstadoTSS;