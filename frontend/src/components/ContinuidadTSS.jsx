import {
    useMemo,
    useState
} from "react";

import {
    actualizarContinuidadTSS
} from "../services/tssService";

const OPCIONES_CONTINUIDAD = [
    {
        valor: "INSTALACION_MOMENTO",
        etiqueta: "Instalación en el momento",
        descripcion:
            "La instalación puede continuar inmediatamente después del TSS."
    },
    {
        valor: "PENDIENTE_ENTEL",
        etiqueta: "Pendiente Entel",
        descripcion:
            "Se requiere coordinación o programación por parte de Entel."
    },
    {
        valor: "POR_DEFINIR",
        etiqueta: "Por definir",
        descripcion:
            "La continuidad todavía no ha sido determinada."
    }
];

function ContinuidadTSS({
    tss,
    onActualizado
}) {
    const [continuidad, setContinuidad] =
        useState(
            tss?.ContinuidadInstalacion || ""
        );
    const continuidadActual =
    tss?.ContinuidadInstalacion || "";

    const [guardando, setGuardando] =
        useState(false);

    const [error, setError] =
        useState("");

    const [mensaje, setMensaje] =
        useState("");

    const esFactible = useMemo(
        () =>
            String(
                tss?.EstadoTSS || ""
            )
                .trim()
                .toUpperCase() ===
            "FACTIBLE",
        [tss?.EstadoTSS]
    );

    if (!esFactible) {
        return null;
    }

    async function guardarContinuidad(
        evento
    ) {
        evento.preventDefault();

        if (!continuidad) {
            setError(
                "Seleccione qué continúa después del TSS."
            );
            return;
        }

        const confirmado =
            window.confirm(
                "¿Confirma la continuidad seleccionada para este TSS?"
            );

        if (!confirmado) {
            return;
        }

        try {
            setGuardando(true);
            setError("");
            setMensaje("");

            const respuesta =
                await actualizarContinuidadTSS(
                    tss.IdTSS,
                    {
                        continuidad
                    }
                );

            setMensaje(
                respuesta?.mensaje ||
                "Continuidad actualizada correctamente."
            );

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
                "No se pudo actualizar la continuidad."
            );
        } finally {
            setGuardando(false);
        }
    }

    return (
        <section className="tss-continuidad">
            <div className="tss-continuidad-cabecera">
                <div>
                    <span className="tss-continuidad-etiqueta">
                        CONTINUIDAD OPERATIVA
                    </span>

                    <h3>
                        ¿Qué sigue después del TSS?
                    </h3>

                    <p>
                        Registre cómo continuará la orden
                        después de obtener resultado factible.
                    </p>
                    {continuidadActual && (
                        <div className="tss-continuidad-actual">
                            Continuidad actual:{" "}
                            <strong>
                                {continuidadActual.replace(
                                    /_/g,
                                    " "
                                )}
                            </strong>
                        </div>
                    )}
                </div>

                <span className="tss-continuidad-badge">
                    FACTIBLE
                </span>
            </div>

            <form
                onSubmit={guardarContinuidad}
                className="tss-continuidad-formulario"
            >
                <div className="tss-continuidad-opciones">
                    {OPCIONES_CONTINUIDAD.map(
                        (opcion) => (
                            <label
                                key={opcion.valor}
                                className={`tss-continuidad-opcion ${
                                    continuidad ===
                                    opcion.valor
                                        ? "activa"
                                        : ""
                                }`}
                            >
                                <input
                                    type="radio"
                                    name="continuidad"
                                    value={
                                        opcion.valor
                                    }
                                    checked={
                                        continuidad ===
                                        opcion.valor
                                    }
                                    onChange={(
                                        evento
                                    ) => {
                                        setContinuidad(
                                            evento
                                                .target
                                                .value
                                        );
                                        setError("");
                                        setMensaje("");
                                    }}
                                    disabled={
                                        guardando
                                    }
                                />

                                <span>
                                    <strong>
                                        {
                                            opcion.etiqueta
                                        }
                                    </strong>

                                    <small>
                                        {
                                            opcion.descripcion
                                        }
                                    </small>
                                </span>
                            </label>
                        )
                    )}
                </div>

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

                <div className="tss-continuidad-acciones">
                    <button
                        type="submit"
                        className="tss-boton tss-boton--primario"
                        disabled={
                            guardando ||
                            !continuidad ||
                            continuidad === continuidadActual
                        }
                    >
                        {guardando
                            ? "Guardando..."
                            : continuidad === continuidadActual
                            ? "Continuidad registrada"
                            : "Guardar continuidad"}
                    </button>
                </div>
            </form>
        </section>
    );
}

export default ContinuidadTSS;