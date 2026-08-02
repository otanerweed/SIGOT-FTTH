import { useEffect, useState } from "react";

import {
    actualizarEstadoTecnico,
    actualizarTecnico,
    crearTecnico,
    obtenerTecnicos
} from "../services/tecnicoService";

import "./Tecnicos.css";

function Tecnicos() {
    const formularioInicial = {
        CodigoTecnico: "",
        NombreCompleto: "",
        Telefono: "",
        TipoTecnico: "FTTH",
        DistritoBase: "",
        CapacidadMaxima: 4,
        Disponible: true
    };

    const [tecnicos, setTecnicos] = useState([]);
    const [formulario, setFormulario] = useState(
        formularioInicial
    );

    const [idTecnicoEditar, setIdTecnicoEditar] =
        useState(null);

    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);

    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");

    useEffect(() => {
        cargarTecnicos();
    }, []);

    async function cargarTecnicos() {
        try {
            setCargando(true);
            setError("");

            const data = await obtenerTecnicos();

            setTecnicos(
                Array.isArray(data) ? data : []
            );
        } catch (error) {
            console.error(
                "Error al cargar técnicos:",
                error
            );

            setError(
                error.response?.data?.mensaje ||
                    "No se pudieron cargar los técnicos."
            );
        } finally {
            setCargando(false);
        }
    }

    function manejarCambio(evento) {
        const {
            name,
            value,
            type,
            checked
        } = evento.target;

        setFormulario((formularioActual) => ({
            ...formularioActual,
            [name]:
                type === "checkbox"
                    ? checked
                    : value
        }));
    }

    function editarTecnico(tecnico) {
        setIdTecnicoEditar(tecnico.IdTecnico);

        setFormulario({
            CodigoTecnico:
                tecnico.CodigoTecnico || "",

            NombreCompleto:
                tecnico.NombreCompleto || "",

            Telefono:
                tecnico.Telefono || "",

            TipoTecnico:
                tecnico.TipoTecnico || "FTTH",

            DistritoBase:
                tecnico.DistritoBase || "",

            CapacidadMaxima:
                tecnico.CapacidadMaxima || 1,

            Disponible:
                Boolean(tecnico.Disponible)
        });

        setMensaje("");
        setError("");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }

    function cancelarEdicion() {
        setIdTecnicoEditar(null);
        setFormulario(formularioInicial);
        setMensaje("");
        setError("");
    }

    async function cambiarEstadoTecnico(tecnico) {
        const nuevoEstado = !tecnico.Activo;

        const accion = nuevoEstado
            ? "activar"
            : "desactivar";

        const confirmado = window.confirm(
            `¿Está seguro de ${accion} al técnico ${tecnico.NombreCompleto}?`
        );

        if (!confirmado) {
            return;
        }

        try {
            setMensaje("");
            setError("");

            const respuesta =
                await actualizarEstadoTecnico(
                    tecnico.IdTecnico,
                    nuevoEstado
                );

            setMensaje(
                respuesta.mensaje ||
                    "Estado actualizado correctamente."
            );

            if (
                idTecnicoEditar === tecnico.IdTecnico &&
                !nuevoEstado
            ) {
                setIdTecnicoEditar(null);
                setFormulario(formularioInicial);
            }

            await cargarTecnicos();
        } catch (error) {
            console.error(
                "Error al cambiar el estado:",
                error
            );

            setError(
                error.response?.data?.mensaje ||
                    "No se pudo cambiar el estado del técnico."
            );
        }
    }

    async function guardarTecnico(evento) {
        evento.preventDefault();

        try {
            setGuardando(true);
            setMensaje("");
            setError("");

            const datos = {
                CodigoTecnico:
                    formulario.CodigoTecnico.trim(),

                NombreCompleto:
                    formulario.NombreCompleto.trim(),

                Telefono:
                    formulario.Telefono.trim(),

                TipoTecnico:
                    formulario.TipoTecnico.trim(),

                DistritoBase:
                    formulario.DistritoBase.trim(),

                CapacidadMaxima: Number(
                    formulario.CapacidadMaxima
                ),

                Disponible: Boolean(
                    formulario.Disponible
                )
            };

            if (idTecnicoEditar) {
                const respuesta =
                    await actualizarTecnico(
                        idTecnicoEditar,
                        datos
                    );

                setMensaje(
                    respuesta.mensaje ||
                        "Técnico actualizado correctamente."
                );
            } else {
                const respuesta =
                    await crearTecnico(datos);

                setMensaje(
                    respuesta.mensaje ||
                        "Técnico registrado correctamente."
                );
            }

            setIdTecnicoEditar(null);
            setFormulario(formularioInicial);

            await cargarTecnicos();
        } catch (error) {
            console.error(
                "Error al guardar técnico:",
                error
            );

            setError(
                error.response?.data?.mensaje ||
                    "No se pudo guardar el técnico."
            );
        } finally {
            setGuardando(false);
        }
    }

    return (
        <section className="tecnicos-page">
            <header className="tecnicos-encabezado">
                <div>
                    <h1>Técnicos</h1>

                    <p>
                        Registre y actualice los técnicos
                        disponibles para las asignaciones.
                    </p>
                </div>
            </header>

            <form
                className="tecnicos-formulario"
                onSubmit={guardarTecnico}
            >
                <h2>
                    {idTecnicoEditar
                        ? "Editar técnico"
                        : "Registrar técnico"}
                </h2>

                {mensaje && (
                    <div className="mensaje-exito">
                        {mensaje}
                    </div>
                )}

                {error && (
                    <div className="mensaje-error">
                        {error}
                    </div>
                )}

                <div className="formulario-grid">
                    <div>
                        <label htmlFor="CodigoTecnico">
                            Código
                        </label>

                        <input
                            id="CodigoTecnico"
                            name="CodigoTecnico"
                            type="text"
                            value={
                                formulario.CodigoTecnico
                            }
                            onChange={manejarCambio}
                            placeholder="Ejemplo: TEC006"
                            maxLength="20"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="NombreCompleto">
                            Nombre completo
                        </label>

                        <input
                            id="NombreCompleto"
                            name="NombreCompleto"
                            type="text"
                            value={
                                formulario.NombreCompleto
                            }
                            onChange={manejarCambio}
                            placeholder="Nombre del técnico"
                            maxLength="150"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="Telefono">
                            Teléfono
                        </label>

                        <input
                            id="Telefono"
                            name="Telefono"
                            type="text"
                            value={formulario.Telefono}
                            onChange={manejarCambio}
                            placeholder="999999999"
                            maxLength="20"
                        />
                    </div>

                    <div>
                        <label htmlFor="TipoTecnico">
                            Tipo de técnico
                        </label>

                        <select
                            id="TipoTecnico"
                            name="TipoTecnico"
                            value={
                                formulario.TipoTecnico
                            }
                            onChange={manejarCambio}
                            required
                        >
                            <option value="FTTH">
                                FTTH
                            </option>

                            <option value="TSS">
                                TSS
                            </option>

                            <option value="MULTISKILL">
                                Multiskill
                            </option>
                        </select>
                    </div>

                    <div>
                        <label htmlFor="DistritoBase">
                            Distrito base
                        </label>

                        <input
                            id="DistritoBase"
                            name="DistritoBase"
                            type="text"
                            value={
                                formulario.DistritoBase
                            }
                            onChange={manejarCambio}
                            placeholder="Ejemplo: La Victoria"
                            maxLength="50"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="CapacidadMaxima">
                            Capacidad máxima
                        </label>

                        <input
                            id="CapacidadMaxima"
                            name="CapacidadMaxima"
                            type="number"
                            min="1"
                            max="20"
                            value={
                                formulario.CapacidadMaxima
                            }
                            onChange={manejarCambio}
                            required
                        />
                    </div>

                    <div className="campo-checkbox">
                        <label>
                            <input
                                name="Disponible"
                                type="checkbox"
                                checked={
                                    formulario.Disponible
                                }
                                onChange={manejarCambio}
                            />

                            Disponible para asignación
                        </label>
                    </div>
                </div>

                <div className="formulario-acciones">
                    <button
                        type="submit"
                        disabled={guardando}
                    >
                        {guardando
                            ? "Guardando..."
                            : idTecnicoEditar
                            ? "Actualizar técnico"
                            : "Registrar técnico"}
                    </button>

                    {idTecnicoEditar && (
                        <button
                            type="button"
                            onClick={cancelarEdicion}
                            disabled={guardando}
                        >
                            Cancelar
                        </button>
                    )}
                </div>
            </form>

            <section className="lista-tecnicos">
                <div className="lista-encabezado">
                    <div>
                        <h2>Lista de técnicos</h2>

                        <p>
                            Técnicos registrados:{" "}
                            <strong>
                                {tecnicos.length}
                            </strong>
                        </p>
                    </div>

                    <button
                        type="button"
                        className="boton-actualizar-tecnicos"
                        onClick={cargarTecnicos}
                        disabled={cargando}
                    >
                        {cargando
                            ? "Actualizando..."
                            : "Actualizar"}
                    </button>
                </div>

                {cargando && (
                    <div className="estado-tecnicos">
                        Cargando técnicos...
                    </div>
                )}

                {!cargando &&
                    error &&
                    tecnicos.length === 0 && (
                        <div className="mensaje-error">
                            {error}
                        </div>
                    )}

                {!cargando &&
                    tecnicos.length === 0 &&
                    !error && (
                        <div className="estado-tecnicos">
                            No existen técnicos
                            registrados.
                        </div>
                    )}

                {!cargando &&
                    tecnicos.length > 0 && (
                        <div className="tabla-tecnicos-contenedor">
                            <table className="tabla-tecnicos">
                                <thead>
                                    <tr>
                                        <th>Código</th>
                                        <th>Nombre</th>
                                        <th>Teléfono</th>
                                        <th>Tipo</th>
                                        <th>Distrito</th>
                                        <th>Capacidad</th>
                                        <th>Disponible</th>
                                        <th>Activo</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {tecnicos.map(
                                        (tecnico) => (
                                            <tr
                                                key={
                                                    tecnico.IdTecnico
                                                }
                                            >
                                                <td>
                                                    <strong className="codigo-tecnico">
                                                        {
                                                            tecnico.CodigoTecnico
                                                        }
                                                    </strong>
                                                </td>

                                                <td>
                                                    {
                                                        tecnico.NombreCompleto
                                                    }
                                                </td>

                                                <td>
                                                    {tecnico.Telefono ||
                                                        "Sin teléfono"}
                                                </td>

                                                <td>
                                                    {
                                                        tecnico.TipoTecnico
                                                    }
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
                                                    <span
                                                        className={
                                                            tecnico.Disponible
                                                                ? "badge-tecnico badge-disponible"
                                                                : "badge-tecnico badge-no-disponible"
                                                        }
                                                    >
                                                        {tecnico.Disponible
                                                            ? "Disponible"
                                                            : "No disponible"}
                                                    </span>
                                                </td>

                                                <td>
                                                    <span
                                                        className={
                                                            tecnico.Activo
                                                                ? "badge-tecnico badge-activo"
                                                                : "badge-tecnico badge-inactivo"
                                                        }
                                                    >
                                                        {tecnico.Activo
                                                            ? "Activo"
                                                            : "Inactivo"}
                                                    </span>
                                                </td>

                                                <td>
                                                    <div className="acciones-tecnico">
                                                        <button
                                                            type="button"
                                                            className="boton-editar"
                                                            onClick={() =>
                                                                editarTecnico(
                                                                    tecnico
                                                                )
                                                            }
                                                            disabled={
                                                                !tecnico.Activo
                                                            }
                                                        >
                                                            Editar
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className={
                                                                tecnico.Activo
                                                                    ? "boton-desactivar"
                                                                    : "boton-activar"
                                                            }
                                                            onClick={() =>
                                                                cambiarEstadoTecnico(
                                                                    tecnico
                                                                )
                                                            }
                                                        >
                                                            {tecnico.Activo
                                                                ? "Desactivar"
                                                                : "Activar"}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
            </section>
        </section>
    );
}

export default Tecnicos;