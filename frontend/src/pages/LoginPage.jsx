import {
    useEffect,
    useState
} from "react";

import {
    useNavigate
} from "react-router-dom";

import {
    guardarSesion,
    haySesion,
    iniciarSesion
} from "../services/authService";

import "./LoginPage.css";

function LoginPage() {
    const navigate = useNavigate();

    const [usuario, setUsuario] =
        useState("");

    const [password, setPassword] =
        useState("");

    const [mostrarPassword, setMostrarPassword] =
        useState(false);

    const [cargando, setCargando] =
        useState(false);

    const [error, setError] =
        useState("");

    useEffect(() => {
        if (haySesion()) {
            navigate("/", {
                replace: true
            });
        }
    }, [navigate]);

    const manejarEnvio = async (evento) => {
        evento.preventDefault();

        const usuarioLimpio =
            usuario.trim();

        if (!usuarioLimpio || !password) {
            setError(
                "Ingrese el usuario y la contraseña."
            );

            return;
        }

        try {
            setCargando(true);
            setError("");

            const respuesta =
                await iniciarSesion(
                    usuarioLimpio,
                    password
                );

            guardarSesion(
                respuesta.token,
                respuesta.usuario
            );

            navigate("/", {
                replace: true
            });
        } catch (errorPeticion) {
            console.error(
                "Error al iniciar sesión:",
                errorPeticion
            );

            setError(
                errorPeticion.response?.data?.mensaje ||
                    "No se pudo iniciar sesión."
            );
        } finally {
            setCargando(false);
        }
    };

    return (
        <main className="login-page">
            <section className="login-presentacion">
                <div className="login-marca">
                    <span className="login-logo">
                        S
                    </span>

                    <div>
                        <h1>SIGOT-FTTH</h1>

                        <p>
                            Sistema Inteligente de Gestión
                            de Órdenes de Trabajo
                        </p>
                    </div>
                </div>

                <div className="login-descripcion">
                    <h2>
                        Gestión operativa centralizada
                    </h2>

                    <p>
                        Administre órdenes, técnicos,
                        asignaciones y reportes desde una
                        sola plataforma.
                    </p>
                </div>
            </section>

            <section className="login-formulario-seccion">
                <form
                    className="login-formulario"
                    onSubmit={manejarEnvio}
                >
                    <div className="login-formulario-encabezado">
                        <h2>Iniciar sesión</h2>

                        <p>
                            Ingrese sus credenciales para
                            acceder al sistema.
                        </p>
                    </div>

                    {error && (
                        <div className="login-error">
                            {error}
                        </div>
                    )}

                    <div className="login-campo">
                        <label htmlFor="usuario">
                            Usuario
                        </label>

                        <input
                            id="usuario"
                            name="usuario"
                            type="text"
                            value={usuario}
                            onChange={(evento) =>
                                setUsuario(
                                    evento.target.value
                                )
                            }
                            placeholder="Ingrese su usuario"
                            autoComplete="username"
                            disabled={cargando}
                            autoFocus
                        />
                    </div>

                    <div className="login-campo">
                        <label htmlFor="password">
                            Contraseña
                        </label>

                        <div className="login-password-contenedor">
                            <input
                                id="password"
                                name="password"
                                type={
                                    mostrarPassword
                                        ? "text"
                                        : "password"
                                }
                                value={password}
                                onChange={(evento) =>
                                    setPassword(
                                        evento.target.value
                                    )
                                }
                                placeholder="Ingrese su contraseña"
                                autoComplete="current-password"
                                disabled={cargando}
                            />

                            <button
                                type="button"
                                className="login-mostrar-password"
                                onClick={() =>
                                    setMostrarPassword(
                                        (valorActual) =>
                                            !valorActual
                                    )
                                }
                                disabled={cargando}
                            >
                                {mostrarPassword
                                    ? "Ocultar"
                                    : "Mostrar"}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="login-boton"
                        disabled={cargando}
                    >
                        {cargando
                            ? "Ingresando..."
                            : "Ingresar"}
                    </button>

                    <p className="login-pie">
                        Acceso autorizado para usuarios de
                        SIGOT-FTTH.
                    </p>
                </form>
            </section>
        </main>
    );
}

export default LoginPage;