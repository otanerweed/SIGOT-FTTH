import {
    useCallback,
    useEffect,
    useMemo,
    useState
} from "react";

import {
    actualizarEstadoUsuario,
    actualizarUsuario,
    crearUsuario,
    obtenerRoles,
    obtenerUsuarios
} from "../services/usuarioService";

import {
    obtenerUsuario
} from "../services/authService";

import "./UsuariosPage.css";

const REGISTROS_POR_PAGINA = 8;

const FORMULARIO_INICIAL = {
    IdRol: "",
    NombreCompleto: "",
    Usuario: "",
    Correo: "",
    Password: "",
    ConfirmarPassword: ""
};

function UsuariosPage() {
    const usuarioSesion = obtenerUsuario();

    const idUsuarioSesion = Number(
        usuarioSesion?.IdUsuario ??
        usuarioSesion?.idUsuario ??
        0
    );

    const [usuarios, setUsuarios] =
        useState([]);

    const [roles, setRoles] =
        useState([]);

    const [busqueda, setBusqueda] =
        useState("");

    const [rolSeleccionado, setRolSeleccionado] =
        useState("TODOS");

    const [estadoSeleccionado, setEstadoSeleccionado] =
        useState("TODOS");

    const [paginaActual, setPaginaActual] =
        useState(1);

    const [cargando, setCargando] =
        useState(true);

    const [guardando, setGuardando] =
        useState(false);

    const [modalAbierto, setModalAbierto] =
        useState(false);

    const [modoEdicion, setModoEdicion] =
        useState(false);

    const [idUsuarioEditando, setIdUsuarioEditando] =
        useState(null);

    const [formulario, setFormulario] =
        useState(FORMULARIO_INICIAL);

    const [mensaje, setMensaje] =
        useState("");

    const [error, setError] =
        useState("");

    const [errorFormulario, setErrorFormulario] =
        useState("");

    // =====================================
    // CARGAR USUARIOS Y ROLES
    // =====================================
    const cargarDatos = useCallback(async () => {
        try {
            setCargando(true);
            setError("");

            const [
                usuariosRespuesta,
                rolesRespuesta
            ] = await Promise.all([
                obtenerUsuarios(),
                obtenerRoles()
            ]);

            setUsuarios(
                Array.isArray(usuariosRespuesta)
                    ? usuariosRespuesta
                    : []
            );

            setRoles(
                Array.isArray(rolesRespuesta)
                    ? rolesRespuesta
                    : []
            );
        } catch (errorPeticion) {
            console.error(
                "Error al cargar usuarios:",
                errorPeticion
            );

            setError(
                errorPeticion.response?.data?.mensaje ||
                "No se pudieron cargar los usuarios."
            );
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    // =====================================
    // FUNCIONES AUXILIARES
    // =====================================
    function obtenerTexto(valor) {
        return String(valor ?? "").trim();
    }

    function formatearFecha(valor) {
        if (!valor) {
            return "Sin registro";
        }

        const fecha = new Date(valor);

        if (Number.isNaN(fecha.getTime())) {
            return obtenerTexto(valor);
        }

        return fecha.toLocaleString(
            "es-PE"
        );
    }

    function obtenerClaseRol(rol) {
        const valor = obtenerTexto(rol)
            .toLowerCase();

        if (valor === "administrador") {
            return "rol-administrador";
        }

        if (valor === "coordinador") {
            return "rol-coordinador";
        }

        if (valor === "supervisor") {
            return "rol-supervisor";
        }

        return "rol-consulta";
    }

    // =====================================
    // ABRIR FORMULARIO DE CREACIÓN
    // =====================================
    function abrirNuevoUsuario() {
        setModoEdicion(false);
        setIdUsuarioEditando(null);
        setFormulario(
            FORMULARIO_INICIAL
        );
        setErrorFormulario("");
        setModalAbierto(true);
    }

    // =====================================
    // ABRIR FORMULARIO DE EDICIÓN
    // =====================================
    function abrirEditarUsuario(usuario) {
        setModoEdicion(true);
        setIdUsuarioEditando(
            usuario.IdUsuario
        );

        setFormulario({
            IdRol: String(
                usuario.IdRol ?? ""
            ),
            NombreCompleto:
                usuario.NombreCompleto || "",
            Usuario:
                usuario.Usuario || "",
            Correo:
                usuario.Correo || "",
            Password: "",
            ConfirmarPassword: ""
        });

        setErrorFormulario("");
        setModalAbierto(true);
    }

    function cerrarModal() {
        if (guardando) {
            return;
        }

        setModalAbierto(false);
        setErrorFormulario("");
    }

    function manejarCambio(evento) {
        const {
            name,
            value
        } = evento.target;

        setFormulario((anterior) => ({
            ...anterior,
            [name]: value
        }));
    }

    // =====================================
    // GUARDAR USUARIO
    // =====================================
    async function guardarUsuario(evento) {
        evento.preventDefault();

        setErrorFormulario("");
        setMensaje("");
        setError("");

        const nombreCompleto =
            formulario.NombreCompleto.trim();

        const nombreUsuario =
            formulario.Usuario.trim();

        const correo =
            formulario.Correo.trim();

        const password =
            formulario.Password;

        const confirmarPassword =
            formulario.ConfirmarPassword;

        const idRol =
            Number(formulario.IdRol);

        if (!nombreCompleto) {
            setErrorFormulario(
                "El nombre completo es obligatorio."
            );

            return;
        }

        if (!nombreUsuario) {
            setErrorFormulario(
                "El nombre de usuario es obligatorio."
            );

            return;
        }

        if (
            !Number.isInteger(idRol) ||
            idRol <= 0
        ) {
            setErrorFormulario(
                "Debe seleccionar un rol."
            );

            return;
        }

        if (
            !modoEdicion &&
            password.length < 8
        ) {
            setErrorFormulario(
                "La contraseña debe tener como mínimo 8 caracteres."
            );

            return;
        }

        if (
            modoEdicion &&
            password &&
            password.length < 8
        ) {
            setErrorFormulario(
                "La nueva contraseña debe tener como mínimo 8 caracteres."
            );

            return;
        }

        if (
            password !==
            confirmarPassword
        ) {
            setErrorFormulario(
                "Las contraseñas no coinciden."
            );

            return;
        }

        const datos = {
            IdRol: idRol,
            NombreCompleto:
                nombreCompleto,
            Usuario:
                nombreUsuario,
            Correo:
                correo,
            Password:
                password
        };

        try {
            setGuardando(true);

            let respuesta;

            if (modoEdicion) {
                respuesta =
                    await actualizarUsuario(
                        idUsuarioEditando,
                        datos
                    );
            } else {
                respuesta =
                    await crearUsuario(
                        datos
                    );
            }

            setMensaje(
                respuesta.mensaje ||
                (
                    modoEdicion
                        ? "Usuario actualizado correctamente."
                        : "Usuario registrado correctamente."
                )
            );

            setModalAbierto(false);
            setFormulario(
                FORMULARIO_INICIAL
            );

            await cargarDatos();
        } catch (errorPeticion) {
            console.error(
                "Error al guardar usuario:",
                errorPeticion
            );

            setErrorFormulario(
                errorPeticion.response?.data?.mensaje ||
                "No se pudo guardar el usuario."
            );
        } finally {
            setGuardando(false);
        }
    }

    // =====================================
    // ACTIVAR O DESACTIVAR USUARIO
    // =====================================
    async function cambiarEstado(usuario) {
        const nuevoEstado =
            !Boolean(usuario.Estado);

        if (
            Number(usuario.IdUsuario) ===
                idUsuarioSesion &&
            nuevoEstado === false
        ) {
            setError(
                "No puede desactivar su propia cuenta."
            );

            return;
        }

        const accion = nuevoEstado
            ? "activar"
            : "desactivar";

        const confirmado = window.confirm(
            `¿Desea ${accion} al usuario ${usuario.NombreCompleto}?`
        );

        if (!confirmado) {
            return;
        }

        try {
            setMensaje("");
            setError("");

            const respuesta =
                await actualizarEstadoUsuario(
                    usuario.IdUsuario,
                    nuevoEstado
                );

            setMensaje(
                respuesta.mensaje ||
                "Estado actualizado correctamente."
            );

            await cargarDatos();
        } catch (errorPeticion) {
            console.error(
                "Error al actualizar estado:",
                errorPeticion
            );

            setError(
                errorPeticion.response?.data?.mensaje ||
                "No se pudo actualizar el estado del usuario."
            );
        }
    }

    // =====================================
    // FILTRADO
    // =====================================
    const usuariosFiltrados =
        useMemo(() => {
            const textoBusqueda =
                busqueda.trim().toLowerCase();

            return usuarios.filter(
                (usuario) => {
                    const rol =
                        obtenerTexto(
                            usuario.Rol
                        );

                    const estado =
                        Boolean(usuario.Estado)
                            ? "ACTIVO"
                            : "INACTIVO";

                    const cumpleRol =
                        rolSeleccionado ===
                            "TODOS" ||
                        rol ===
                            rolSeleccionado;

                    const cumpleEstado =
                        estadoSeleccionado ===
                            "TODOS" ||
                        estado ===
                            estadoSeleccionado;

                    const contenido = [
                        usuario.NombreCompleto,
                        usuario.Usuario,
                        usuario.Correo,
                        usuario.Rol
                    ]
                        .map(obtenerTexto)
                        .join(" ")
                        .toLowerCase();

                    const cumpleBusqueda =
                        textoBusqueda === "" ||
                        contenido.includes(
                            textoBusqueda
                        );

                    return (
                        cumpleRol &&
                        cumpleEstado &&
                        cumpleBusqueda
                    );
                }
            );
        }, [
            usuarios,
            busqueda,
            rolSeleccionado,
            estadoSeleccionado
        ]);

    useEffect(() => {
        setPaginaActual(1);
    }, [
        busqueda,
        rolSeleccionado,
        estadoSeleccionado
    ]);

    // =====================================
    // RESUMEN
    // =====================================
    const totalActivos =
        usuarios.filter(
            (usuario) =>
                Boolean(usuario.Estado)
        ).length;

    const totalInactivos =
        usuarios.length -
        totalActivos;

    const totalAdministradores =
        usuarios.filter(
            (usuario) =>
                usuario.Rol ===
                "Administrador"
        ).length;

    // =====================================
    // PAGINACIÓN
    // =====================================
    const totalPaginas = Math.max(
        1,
        Math.ceil(
            usuariosFiltrados.length /
            REGISTROS_POR_PAGINA
        )
    );

    useEffect(() => {
        if (
            paginaActual >
            totalPaginas
        ) {
            setPaginaActual(
                totalPaginas
            );
        }
    }, [
        paginaActual,
        totalPaginas
    ]);

    const indiceInicial =
        (paginaActual - 1) *
        REGISTROS_POR_PAGINA;

    const indiceFinal =
        indiceInicial +
        REGISTROS_POR_PAGINA;

    const usuariosVisibles =
        usuariosFiltrados.slice(
            indiceInicial,
            indiceFinal
        );

    return (
        <section className="usuarios-page">
            <header className="usuarios-encabezado">
                <div>
                    <h1>Gestión de usuarios</h1>

                    <p>
                        Registre usuarios, asigne roles
                        y administre el acceso al sistema.
                    </p>
                </div>

                <div className="usuarios-acciones-encabezado">
                    <button
                        type="button"
                        className="boton-usuarios-secundario"
                        onClick={cargarDatos}
                        disabled={cargando}
                    >
                        {cargando
                            ? "Actualizando..."
                            : "Actualizar"}
                    </button>

                    <button
                        type="button"
                        className="boton-nuevo-usuario"
                        onClick={abrirNuevoUsuario}
                    >
                        + Nuevo usuario
                    </button>
                </div>
            </header>

            {mensaje && (
                <div className="mensaje-usuarios mensaje-usuarios-exito">
                    {mensaje}
                </div>
            )}

            {error && (
                <div className="mensaje-usuarios mensaje-usuarios-error">
                    {error}
                </div>
            )}

            <div className="usuarios-resumen">
                <div className="usuario-tarjeta-resumen">
                    <span>Total</span>
                    <strong>
                        {usuarios.length}
                    </strong>
                </div>

                <div className="usuario-tarjeta-resumen">
                    <span>Activos</span>
                    <strong>
                        {totalActivos}
                    </strong>
                </div>

                <div className="usuario-tarjeta-resumen">
                    <span>Inactivos</span>
                    <strong>
                        {totalInactivos}
                    </strong>
                </div>

                <div className="usuario-tarjeta-resumen">
                    <span>Administradores</span>
                    <strong>
                        {totalAdministradores}
                    </strong>
                </div>
            </div>

            <div className="usuarios-contenedor">
                <div className="usuarios-filtros">
                    <div className="usuario-grupo-filtro usuario-filtro-busqueda">
                        <label htmlFor="buscar-usuario">
                            Buscar
                        </label>

                        <input
                            id="buscar-usuario"
                            type="search"
                            placeholder="Nombre, usuario, correo o rol"
                            value={busqueda}
                            onChange={(evento) =>
                                setBusqueda(
                                    evento.target.value
                                )
                            }
                        />
                    </div>

                    <div className="usuario-grupo-filtro">
                        <label htmlFor="filtro-rol">
                            Rol
                        </label>

                        <select
                            id="filtro-rol"
                            value={rolSeleccionado}
                            onChange={(evento) =>
                                setRolSeleccionado(
                                    evento.target.value
                                )
                            }
                        >
                            <option value="TODOS">
                                Todos
                            </option>

                            {roles.map((rol) => (
                                <option
                                    key={rol.IdRol}
                                    value={rol.Nombre}
                                >
                                    {rol.Nombre}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="usuario-grupo-filtro">
                        <label htmlFor="filtro-estado-usuario">
                            Estado
                        </label>

                        <select
                            id="filtro-estado-usuario"
                            value={estadoSeleccionado}
                            onChange={(evento) =>
                                setEstadoSeleccionado(
                                    evento.target.value
                                )
                            }
                        >
                            <option value="TODOS">
                                Todos
                            </option>

                            <option value="ACTIVO">
                                Activos
                            </option>

                            <option value="INACTIVO">
                                Inactivos
                            </option>
                        </select>
                    </div>
                </div>

                {cargando && (
                    <div className="estado-usuarios">
                        Cargando usuarios...
                    </div>
                )}

                {!cargando &&
                    usuarios.length === 0 && (
                        <div className="estado-usuarios">
                            No existen usuarios registrados.
                        </div>
                    )}

                {!cargando &&
                    usuarios.length > 0 && (
                        <>
                            <div className="tabla-usuarios-contenedor">
                                <table className="tabla-usuarios">
                                    <thead>
                                        <tr>
                                            <th>Usuario</th>
                                            <th>Nombre completo</th>
                                            <th>Correo</th>
                                            <th>Rol</th>
                                            <th>Estado</th>
                                            <th>Registro</th>
                                            <th>Acciones</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {usuariosVisibles.length >
                                        0 ? (
                                            usuariosVisibles.map(
                                                (usuario) => {
                                                    const esUsuarioActual =
                                                        Number(
                                                            usuario.IdUsuario
                                                        ) ===
                                                        idUsuarioSesion;

                                                    return (
                                                        <tr
                                                            key={
                                                                usuario.IdUsuario
                                                            }
                                                        >
                                                            <td>
                                                                <strong className="nombre-usuario-tabla">
                                                                    {
                                                                        usuario.Usuario
                                                                    }
                                                                </strong>

                                                                <small>
                                                                    ID:{" "}
                                                                    {
                                                                        usuario.IdUsuario
                                                                    }
                                                                </small>
                                                            </td>

                                                            <td>
                                                                <strong>
                                                                    {
                                                                        usuario.NombreCompleto
                                                                    }
                                                                </strong>

                                                                {esUsuarioActual && (
                                                                    <small className="usuario-actual">
                                                                        Sesión actual
                                                                    </small>
                                                                )}
                                                            </td>

                                                            <td>
                                                                {usuario.Correo ||
                                                                    "Sin correo"}
                                                            </td>

                                                            <td>
                                                                <span
                                                                    className={`badge-rol-usuario ${obtenerClaseRol(
                                                                        usuario.Rol
                                                                    )}`}
                                                                >
                                                                    {
                                                                        usuario.Rol
                                                                    }
                                                                </span>
                                                            </td>

                                                            <td>
                                                                <span
                                                                    className={
                                                                        usuario.Estado
                                                                            ? "badge-estado-usuario usuario-activo"
                                                                            : "badge-estado-usuario usuario-inactivo"
                                                                    }
                                                                >
                                                                    {usuario.Estado
                                                                        ? "Activo"
                                                                        : "Inactivo"}
                                                                </span>
                                                            </td>

                                                            <td>
                                                                {formatearFecha(
                                                                    usuario.FechaRegistro
                                                                )}
                                                            </td>

                                                            <td>
                                                                <div className="acciones-usuario">
                                                                    <button
                                                                        type="button"
                                                                        className="boton-editar-usuario"
                                                                        onClick={() =>
                                                                            abrirEditarUsuario(
                                                                                usuario
                                                                            )
                                                                        }
                                                                    >
                                                                        Editar
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        className={
                                                                            usuario.Estado
                                                                                ? "boton-desactivar-usuario"
                                                                                : "boton-activar-usuario"
                                                                        }
                                                                        onClick={() =>
                                                                            cambiarEstado(
                                                                                usuario
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            esUsuarioActual &&
                                                                            usuario.Estado
                                                                        }
                                                                        title={
                                                                            esUsuarioActual &&
                                                                            usuario.Estado
                                                                                ? "No puede desactivar su propia cuenta."
                                                                                : ""
                                                                        }
                                                                    >
                                                                        {usuario.Estado
                                                                            ? "Desactivar"
                                                                            : "Activar"}
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                }
                                            )
                                        ) : (
                                            <tr>
                                                <td
                                                    colSpan="7"
                                                    className="sin-resultados-usuarios"
                                                >
                                                    No se encontraron usuarios con los filtros seleccionados.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {usuariosFiltrados.length >
                                0 && (
                                <div className="paginacion-usuarios">
                                    <span>
                                        Mostrando{" "}
                                        {indiceInicial + 1} a{" "}
                                        {Math.min(
                                            indiceFinal,
                                            usuariosFiltrados.length
                                        )}{" "}
                                        de{" "}
                                        {
                                            usuariosFiltrados.length
                                        }
                                    </span>

                                    <div className="botones-paginacion-usuarios">
                                        <button
                                            type="button"
                                            disabled={
                                                paginaActual === 1
                                            }
                                            onClick={() =>
                                                setPaginaActual(
                                                    (pagina) =>
                                                        pagina - 1
                                                )
                                            }
                                        >
                                            Anterior
                                        </button>

                                        <span>
                                            Página{" "}
                                            {paginaActual} de{" "}
                                            {totalPaginas}
                                        </span>

                                        <button
                                            type="button"
                                            disabled={
                                                paginaActual ===
                                                totalPaginas
                                            }
                                            onClick={() =>
                                                setPaginaActual(
                                                    (pagina) =>
                                                        pagina + 1
                                                )
                                            }
                                        >
                                            Siguiente
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
            </div>

            {modalAbierto && (
                <div
                    className="modal-usuario-fondo"
                    onMouseDown={(evento) => {
                        if (
                            evento.target ===
                            evento.currentTarget
                        ) {
                            cerrarModal();
                        }
                    }}
                >
                    <div className="modal-usuario">
                        <div className="modal-usuario-encabezado">
                            <div>
                                <h2>
                                    {modoEdicion
                                        ? "Editar usuario"
                                        : "Nuevo usuario"}
                                </h2>

                                <p>
                                    {modoEdicion
                                        ? "Actualice los datos y el rol del usuario."
                                        : "Complete los datos para registrar una cuenta."}
                                </p>
                            </div>

                            <button
                                type="button"
                                className="cerrar-modal-usuario"
                                onClick={cerrarModal}
                                disabled={guardando}
                            >
                                ×
                            </button>
                        </div>

                        <form
                            className="formulario-usuario"
                            onSubmit={guardarUsuario}
                        >
                            {errorFormulario && (
                                <div className="mensaje-usuarios mensaje-usuarios-error">
                                    {errorFormulario}
                                </div>
                            )}

                            <div className="formulario-usuario-grid">
                                <div className="campo-usuario campo-usuario-completo">
                                    <label htmlFor="NombreCompleto">
                                        Nombre completo
                                    </label>

                                    <input
                                        id="NombreCompleto"
                                        name="NombreCompleto"
                                        type="text"
                                        maxLength="150"
                                        value={
                                            formulario.NombreCompleto
                                        }
                                        onChange={manejarCambio}
                                        disabled={guardando}
                                        required
                                    />
                                </div>

                                <div className="campo-usuario">
                                    <label htmlFor="Usuario">
                                        Usuario
                                    </label>

                                    <input
                                        id="Usuario"
                                        name="Usuario"
                                        type="text"
                                        maxLength="50"
                                        value={
                                            formulario.Usuario
                                        }
                                        onChange={manejarCambio}
                                        disabled={guardando}
                                        autoComplete="off"
                                        required
                                    />
                                </div>

                                <div className="campo-usuario">
                                    <label htmlFor="IdRol">
                                        Rol
                                    </label>

                                    <select
                                        id="IdRol"
                                        name="IdRol"
                                        value={
                                            formulario.IdRol
                                        }
                                        onChange={manejarCambio}
                                        disabled={guardando}
                                        required
                                    >
                                        <option value="">
                                            Seleccione
                                        </option>

                                        {roles.map((rol) => (
                                            <option
                                                key={rol.IdRol}
                                                value={rol.IdRol}
                                            >
                                                {rol.Nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="campo-usuario campo-usuario-completo">
                                    <label htmlFor="Correo">
                                        Correo
                                    </label>

                                    <input
                                        id="Correo"
                                        name="Correo"
                                        type="email"
                                        maxLength="100"
                                        value={
                                            formulario.Correo
                                        }
                                        onChange={manejarCambio}
                                        disabled={guardando}
                                        placeholder="usuario@correo.com"
                                    />
                                </div>

                                <div className="campo-usuario">
                                    <label htmlFor="Password">
                                        {modoEdicion
                                            ? "Nueva contraseña"
                                            : "Contraseña"}
                                    </label>

                                    <input
                                        id="Password"
                                        name="Password"
                                        type="password"
                                        minLength="8"
                                        value={
                                            formulario.Password
                                        }
                                        onChange={manejarCambio}
                                        disabled={guardando}
                                        autoComplete="new-password"
                                        required={!modoEdicion}
                                        placeholder={
                                            modoEdicion
                                                ? "Dejar vacío para conservar"
                                                : "Mínimo 8 caracteres"
                                        }
                                    />
                                </div>

                                <div className="campo-usuario">
                                    <label htmlFor="ConfirmarPassword">
                                        Confirmar contraseña
                                    </label>

                                    <input
                                        id="ConfirmarPassword"
                                        name="ConfirmarPassword"
                                        type="password"
                                        minLength="8"
                                        value={
                                            formulario.ConfirmarPassword
                                        }
                                        onChange={manejarCambio}
                                        disabled={guardando}
                                        autoComplete="new-password"
                                        required={!modoEdicion}
                                    />
                                </div>
                            </div>

                            {modoEdicion && (
                                <p className="nota-password-usuario">
                                    Deje la contraseña vacía para mantener la actual.
                                </p>
                            )}

                            <div className="acciones-formulario-usuario">
                                <button
                                    type="button"
                                    className="boton-cancelar-usuario"
                                    onClick={cerrarModal}
                                    disabled={guardando}
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="boton-guardar-usuario"
                                    disabled={guardando}
                                >
                                    {guardando
                                        ? "Guardando..."
                                        : modoEdicion
                                            ? "Guardar cambios"
                                            : "Registrar usuario"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}

export default UsuariosPage;