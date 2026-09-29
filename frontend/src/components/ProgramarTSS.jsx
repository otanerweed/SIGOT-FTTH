import {
    useEffect,
    useMemo,
    useState
} from "react";

import {
    obtenerTecnicos
} from "../services/tecnicoService";

import {
    programarTSS
} from "../services/tssService";

const FORMULARIO_INICIAL = {
    idTecnico: "",
    fechaAgenda: "",
    turno: "",
    observaciones: ""
};

function ProgramarTSS({
    tss,
    onProgramado
}) {
    const [tecnicos, setTecnicos] = useState([]);
    const [formulario, setFormulario] =
        useState(FORMULARIO_INICIAL);

    const [cargandoTecnicos, setCargandoTecnicos] =
        useState(false);

    const [guardando, setGuardando] =
        useState(false);

    const [error, setError] =
        useState("");

    const [mensaje, setMensaje] =
        useState("");

    useEffect(() => {
        let activo = true;

        async function cargarTecnicos() {
            try {
                setCargandoTecnicos(true);
                setError("");

                const respuesta =
                    await obtenerTecnicos();

                if (!activo) {
                    return;
                }

                const lista = Array.isArray(respuesta)
                    ? respuesta
                    : [];

                setTecnicos(
                    lista.filter(
                        (tecnico) =>
                            Number(tecnico.Activo) === 1 ||
                            tecnico.Activo === true
                    )
                );
            } catch (errorPeticion) {
                if (!activo) {
                    return;
                }

                setError(
                    errorPeticion.response?.data?.mensaje ||
                    "No se pudieron cargar los técnicos."
                );
            } finally {
                if (activo) {
                    setCargandoTecnicos(false);
                }
            }
        }

        cargarTecnicos();

        return () => {
            activo = false;
        };
    }, []);

    const puedeProgramarse = useMemo(() => {
        const estado = String(
            tss?.EstadoTSS || ""
        )
            .trim()
            .toUpperCase();

        return [
            "PENDIENTE_PROGRAMACION",
            "REPROGRAMAR"
        ].includes(estado);
    }, [tss?.EstadoTSS]);

    if (!puedeProgramarse) {
        return null;
    }

    const cambiarCampo = (evento) => {
        const {
            name,
            value
        } = evento.target;

        setFormulario((actual) => ({
            ...actual,
            [name]: value
        }));

        setError("");
        setMensaje("");
    };

    const confirmarProgramacion =
        async (evento) => {
            evento.preventDefault();

            if (!formulario.idTecnico) {
                setError(
                    "Seleccione un técnico."
                );
                return;
            }

            if (!formulario.fechaAgenda) {
                setError(
                    "Seleccione una fecha."
                );
                return;
            }

            if (!formulario.turno) {
                setError(
                    "Seleccione un turno."
                );
                return;
            }

            try {
                setGuardando(true);
                setError("");
                setMensaje("");

                const respuesta =
                    await programarTSS(
                        tss.IdTSS,
                        {
                            idTecnico:
                                Number(
                                    formulario.idTecnico
                                ),
                            fechaAgenda:
                                formulario.fechaAgenda,
                            turno:
                                formulario.turno,
                            observaciones:
                                formulario.observaciones.trim()
                        }
                    );

                setMensaje(
                    respuesta?.mensaje ||
                    "TSS programado correctamente."
                );

                setFormulario({
                    ...FORMULARIO_INICIAL
                });

                if (
                    typeof onProgramado ===
                    "function"
                ) {
                    await onProgramado();
                }
            } catch (errorPeticion) {
                setError(
                    errorPeticion.response?.data?.mensaje ||
                    "No se pudo programar el TSS."
                );
            } finally {
                setGuardando(false);
            }
        };

    return (
        <section className="tss-programacion">
            <div className="tss-programacion-cabecera">
                <div>
                    <span className="tss-programacion-etiqueta">
                        ACCIÓN OPERATIVA
                    </span>

                    <h3>
                        {tss?.EstadoTSS ===
                        "REPROGRAMAR"
                            ? "Reprogramar TSS"
                            : "Programar TSS"}
                    </h3>

                    <p>
                        Asigne técnico, fecha y turno
                        para iniciar la atención.
                    </p>
                </div>

                <span className="tss-programacion-estado">
                    Pendiente
                </span>
            </div>

            <form
                className="tss-programacion-formulario"
                onSubmit={confirmarProgramacion}
            >
                <div className="tss-programacion-grid">
                    <div className="tss-campo">
                        <label htmlFor="tss-programar-tecnico">
                            Técnico
                        </label>

                        <select
                            id="tss-programar-tecnico"
                            name="idTecnico"
                            value={
                                formulario.idTecnico
                            }
                            onChange={cambiarCampo}
                            disabled={
                                cargandoTecnicos ||
                                guardando
                            }
                        >
                            <option value="">
                                {cargandoTecnicos
                                    ? "Cargando técnicos..."
                                    : "Seleccione técnico"}
                            </option>

                            {tecnicos.map(
                                (tecnico) => (
                                    <option
                                        key={
                                            tecnico.IdTecnico
                                        }
                                        value={
                                            tecnico.IdTecnico
                                        }
                                    >
                                        {
                                            tecnico.NombreCompleto
                                        }
                                        {tecnico.CodigoTecnico
                                            ? ` · ${tecnico.CodigoTecnico}`
                                            : ""}
                                    </option>
                                )
                            )}
                        </select>
                    </div>

                    <div className="tss-campo">
                        <label htmlFor="tss-programar-fecha">
                            Fecha
                        </label>

                        <input
                            id="tss-programar-fecha"
                            name="fechaAgenda"
                            type="date"
                            value={
                                formulario.fechaAgenda
                            }
                            onChange={cambiarCampo}
                            disabled={guardando}
                        />
                    </div>

                    <div className="tss-campo">
                        <label htmlFor="tss-programar-turno">
                            Turno
                        </label>

                        <select
                            id="tss-programar-turno"
                            name="turno"
                            value={
                                formulario.turno
                            }
                            onChange={cambiarCampo}
                            disabled={guardando}
                        >
                            <option value="">
                                Seleccione turno
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
                </div>

                <div className="tss-campo">
                    <label htmlFor="tss-programar-observaciones">
                        Observaciones
                    </label>

                    <textarea
                        id="tss-programar-observaciones"
                        name="observaciones"
                        value={
                            formulario.observaciones
                        }
                        onChange={cambiarCampo}
                        maxLength={500}
                        rows={3}
                        placeholder="Opcional: indicaciones para la programación..."
                        disabled={guardando}
                    />
                </div>

                <div className="tss-programacion-ayuda">
                    La disponibilidad y ocupación del
                    técnico se validarán antes de guardar.
                    El turno nocturno requiere confirmación
                    explícita.
                </div>

                {error && (
                    <div
                        className="tss-programacion-mensaje tss-programacion-mensaje--error"
                        role="alert"
                    >
                        {error}
                    </div>
                )}

                {mensaje && (
                    <div
                        className="tss-programacion-mensaje tss-programacion-mensaje--exito"
                        role="status"
                    >
                        {mensaje}
                    </div>
                )}

                <div className="tss-programacion-acciones">
                    <button
                        type="submit"
                        className="tss-boton tss-boton--primario"
                        disabled={
                            guardando ||
                            cargandoTecnicos
                        }
                    >
                        {guardando
                            ? "Validando y guardando..."
                            : "Confirmar programación"}
                    </button>
                </div>
            </form>
        </section>
    );
}

export default ProgramarTSS;