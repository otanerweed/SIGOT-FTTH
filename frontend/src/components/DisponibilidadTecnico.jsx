import {
    useEffect,
    useState
} from "react";

import {
    guardarDisponibilidadTecnico,
    obtenerDisponibilidadTecnico
} from "../services/tecnicoService";

function obtenerFechaActual() {
    const ahora = new Date();

    const anio = ahora.getFullYear();
    const mes = String(
        ahora.getMonth() + 1
    ).padStart(2, "0");

    const dia = String(
        ahora.getDate()
    ).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

function formatearFecha(valor) {
    if (!valor) {
        return "—";
    }

    const coincidencia = String(valor).match(
        /^(\d{4})-(\d{2})-(\d{2})/
    );

    if (!coincidencia) {
        return valor;
    }

    return `${coincidencia[3]}/${coincidencia[2]}/${coincidencia[1]}`;
}

const FORMULARIO_INICIAL = {
    FechaVigencia: obtenerFechaActual(),
    DisponibleAM: true,
    DisponiblePM: true,
    NocturnoConfirmado: false,
    Motivo: "",
    Observaciones: ""
};

function DisponibilidadTecnico({
    tecnico,
    abierto,
    onCerrar
}) {
    const [formulario, setFormulario] =
        useState(FORMULARIO_INICIAL);

    const [historial, setHistorial] =
        useState([]);

    const [cargando, setCargando] =
        useState(false);

    const [guardando, setGuardando] =
        useState(false);

    const [mensaje, setMensaje] =
        useState("");

    const [error, setError] =
        useState("");

    useEffect(() => {
        if (!abierto || !tecnico?.IdTecnico) {
            return;
        }

        cargarDisponibilidad();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        abierto,
        tecnico?.IdTecnico
    ]);

    async function cargarDisponibilidad() {
        try {
            setCargando(true);
            setError("");
            setMensaje("");

            const respuesta =
                await obtenerDisponibilidadTecnico(
                    tecnico.IdTecnico
                );

            const registros = Array.isArray(
                respuesta?.disponibilidad
            )
                ? respuesta.disponibilidad
                : [];

            setHistorial(registros);

            /*
             * Para AM y PM heredamos visualmente
             * la última disponibilidad conocida.
             *
             * El nocturno NO se hereda porque
             * debe confirmarse expresamente
             * para una fecha concreta.
             */
            const ultimoRegistro =
                registros[0] || null;

            setFormulario({
                FechaVigencia:
                    obtenerFechaActual(),

                DisponibleAM:
                    ultimoRegistro
                        ? Boolean(
                            ultimoRegistro.DisponibleAM
                        )
                        : true,

                DisponiblePM:
                    ultimoRegistro
                        ? Boolean(
                            ultimoRegistro.DisponiblePM
                        )
                        : true,

                NocturnoConfirmado:
                    false,

                Motivo: "",
                Observaciones: ""
            });
        } catch (errorPeticion) {
            setError(
                errorPeticion.response?.data
                    ?.mensaje ||
                "No se pudo cargar la disponibilidad."
            );
        } finally {
            setCargando(false);
        }
    }

    function cambiarCampo(evento) {
        const {
            name,
            value,
            type,
            checked
        } = evento.target;

        setFormulario(
            (actual) => ({
                ...actual,
                [name]:
                    type === "checkbox"
                        ? checked
                        : value
            })
        );

        setMensaje("");
        setError("");
    }

    async function guardar(evento) {
        evento.preventDefault();

        if (!formulario.FechaVigencia) {
            setError(
                "Seleccione una fecha de vigencia."
            );
            return;
        }

        try {
            setGuardando(true);
            setError("");
            setMensaje("");

            const respuesta =
                await guardarDisponibilidadTecnico(
                    tecnico.IdTecnico,
                    {
                        FechaVigencia:
                            formulario.FechaVigencia,

                        DisponibleAM:
                            Boolean(
                                formulario.DisponibleAM
                            ),

                        DisponiblePM:
                            Boolean(
                                formulario.DisponiblePM
                            ),

                        NocturnoConfirmado:
                            Boolean(
                                formulario.NocturnoConfirmado
                            ),

                        Motivo:
                            formulario.Motivo.trim(),

                        Observaciones:
                            formulario.Observaciones.trim()
                    }
                );

            setMensaje(
                respuesta?.mensaje ||
                "Disponibilidad guardada correctamente."
            );

            await cargarDisponibilidad();
        } catch (errorPeticion) {
            setError(
                errorPeticion.response?.data
                    ?.mensaje ||
                "No se pudo guardar la disponibilidad."
            );
        } finally {
            setGuardando(false);
        }
    }

    if (!abierto || !tecnico) {
        return null;
    }

    return (
        <div
            className="disponibilidad-fondo"
            onMouseDown={(evento) => {
                if (
                    evento.target ===
                    evento.currentTarget
                ) {
                    onCerrar();
                }
            }}
        >
            <aside className="disponibilidad-panel">
                <header className="disponibilidad-cabecera">
                    <div>
                        <span className="disponibilidad-etiqueta">
                            DISPONIBILIDAD OPERATIVA
                        </span>

                        <h2>
                            {tecnico.NombreCompleto}
                        </h2>

                        <p>
                            {tecnico.CodigoTecnico}
                            {" · "}
                            {tecnico.DistritoBase}
                        </p>
                    </div>

                    <button
                        type="button"
                        className="disponibilidad-cerrar"
                        onClick={onCerrar}
                        aria-label="Cerrar disponibilidad"
                    >
                        ×
                    </button>
                </header>

                <div className="disponibilidad-contenido">
                    <section className="disponibilidad-bloque">
                        <div className="disponibilidad-bloque-cabecera">
                            <div>
                                <h3>
                                    Registrar disponibilidad
                                </h3>

                                <p>
                                    Defina la disponibilidad
                                    desde una fecha determinada.
                                </p>
                            </div>
                        </div>

                        <form
                            onSubmit={guardar}
                            className="disponibilidad-formulario"
                        >
                            <div className="disponibilidad-campo">
                                <label htmlFor="FechaVigencia">
                                    Fecha de vigencia
                                </label>

                                <input
                                    id="FechaVigencia"
                                    name="FechaVigencia"
                                    type="date"
                                    value={
                                        formulario.FechaVigencia
                                    }
                                    onChange={cambiarCampo}
                                    disabled={guardando}
                                />
                            </div>

                            <div className="disponibilidad-turnos">
                                <label className="disponibilidad-turno">
                                    <input
                                        type="checkbox"
                                        name="DisponibleAM"
                                        checked={
                                            formulario.DisponibleAM
                                        }
                                        onChange={cambiarCampo}
                                        disabled={guardando}
                                    />

                                    <span>
                                        <strong>AM</strong>
                                        <small>
                                            Disponible
                                        </small>
                                    </span>
                                </label>

                                <label className="disponibilidad-turno">
                                    <input
                                        type="checkbox"
                                        name="DisponiblePM"
                                        checked={
                                            formulario.DisponiblePM
                                        }
                                        onChange={cambiarCampo}
                                        disabled={guardando}
                                    />

                                    <span>
                                        <strong>PM</strong>
                                        <small>
                                            Disponible
                                        </small>
                                    </span>
                                </label>

                                <label className="disponibilidad-turno disponibilidad-turno--nocturno">
                                    <input
                                        type="checkbox"
                                        name="NocturnoConfirmado"
                                        checked={
                                            formulario.NocturnoConfirmado
                                        }
                                        onChange={cambiarCampo}
                                        disabled={guardando}
                                    />

                                    <span>
                                        <strong>
                                            Nocturno
                                        </strong>
                                        <small>
                                            Confirmación expresa
                                        </small>
                                    </span>
                                </label>
                            </div>

                            <div className="disponibilidad-campo">
                                <label htmlFor="Motivo">
                                    Motivo
                                </label>

                                <input
                                    id="Motivo"
                                    name="Motivo"
                                    type="text"
                                    value={
                                        formulario.Motivo
                                    }
                                    onChange={cambiarCampo}
                                    maxLength={250}
                                    placeholder="Ej.: descanso, permiso, capacitación..."
                                    disabled={guardando}
                                />
                            </div>

                            <div className="disponibilidad-campo">
                                <label htmlFor="Observaciones">
                                    Observaciones
                                </label>

                                <textarea
                                    id="Observaciones"
                                    name="Observaciones"
                                    rows={3}
                                    value={
                                        formulario.Observaciones
                                    }
                                    onChange={cambiarCampo}
                                    maxLength={500}
                                    placeholder="Información adicional..."
                                    disabled={guardando}
                                />
                            </div>

                            <div className="disponibilidad-ayuda">
                                AM y PM mantienen la última
                                disponibilidad informada hasta
                                que exista un nuevo cambio.
                                El turno nocturno requiere
                                confirmación para la fecha
                                seleccionada.
                            </div>

                            {error && (
                                <div className="disponibilidad-mensaje disponibilidad-mensaje--error">
                                    {error}
                                </div>
                            )}

                            {mensaje && (
                                <div className="disponibilidad-mensaje disponibilidad-mensaje--exito">
                                    {mensaje}
                                </div>
                            )}

                            <div className="disponibilidad-acciones">
                                <button
                                    type="submit"
                                    disabled={
                                        guardando ||
                                        cargando
                                    }
                                >
                                    {guardando
                                        ? "Guardando..."
                                        : "Guardar disponibilidad"}
                                </button>
                            </div>
                        </form>
                    </section>

                    <section className="disponibilidad-bloque">
                        <div className="disponibilidad-bloque-cabecera">
                            <div>
                                <h3>
                                    Historial
                                </h3>

                                <p>
                                    Cambios registrados para
                                    este técnico.
                                </p>
                            </div>

                            <span className="disponibilidad-contador">
                                {historial.length}
                            </span>
                        </div>

                        {cargando && (
                            <div className="disponibilidad-vacio">
                                Cargando disponibilidad...
                            </div>
                        )}

                        {!cargando &&
                            historial.length === 0 && (
                                <div className="disponibilidad-vacio">
                                    No existen registros de
                                    disponibilidad.
                                </div>
                            )}

                        {!cargando &&
                            historial.length > 0 && (
                                <div className="disponibilidad-historial">
                                    {historial.map(
                                        (registro) => (
                                            <article
                                                key={
                                                    registro.IdDisponibilidad
                                                }
                                                className="disponibilidad-registro"
                                            >
                                                <div className="disponibilidad-registro-cabecera">
                                                    <strong>
                                                        {formatearFecha(
                                                            registro.FechaVigencia
                                                        )}
                                                    </strong>

                                                    <span>
                                                        {
                                                            registro.UsuarioRegistro ||
                                                            "Usuario"
                                                        }
                                                    </span>
                                                </div>

                                                <div className="disponibilidad-registro-turnos">
                                                    <span
                                                        className={
                                                            registro.DisponibleAM
                                                                ? "activo"
                                                                : "inactivo"
                                                        }
                                                    >
                                                        AM{" "}
                                                        {registro.DisponibleAM
                                                            ? "Sí"
                                                            : "No"}
                                                    </span>

                                                    <span
                                                        className={
                                                            registro.DisponiblePM
                                                                ? "activo"
                                                                : "inactivo"
                                                        }
                                                    >
                                                        PM{" "}
                                                        {registro.DisponiblePM
                                                            ? "Sí"
                                                            : "No"}
                                                    </span>

                                                    <span
                                                        className={
                                                            registro.NocturnoConfirmado
                                                                ? "activo"
                                                                : "inactivo"
                                                        }
                                                    >
                                                        Nocturno{" "}
                                                        {registro.NocturnoConfirmado
                                                            ? "Sí"
                                                            : "No"}
                                                    </span>
                                                </div>

                                                {registro.Motivo && (
                                                    <p>
                                                        <strong>
                                                            Motivo:
                                                        </strong>{" "}
                                                        {
                                                            registro.Motivo
                                                        }
                                                    </p>
                                                )}

                                                {registro.Observaciones && (
                                                    <small>
                                                        {
                                                            registro.Observaciones
                                                        }
                                                    </small>
                                                )}
                                            </article>
                                        )
                                    )}
                                </div>
                            )}
                    </section>
                </div>
            </aside>
        </div>
    );
}

export default DisponibilidadTecnico;