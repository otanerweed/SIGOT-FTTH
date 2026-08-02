import { useCallback, useEffect, useState } from "react";
import TablaOrdenes from "../components/TablaOrdenes";
import { obtenerOrdenes } from "../services/ordenesService";
import "./OrdenesPage.css";

function OrdenesPage() {
    const [ordenes, setOrdenes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    const cargarOrdenes = useCallback(async () => {
        try {
            setCargando(true);
            setError("");

            const data = await obtenerOrdenes();

            setOrdenes(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error al cargar las órdenes:", error);

            setError(
                error.response?.data?.mensaje ||
                "No se pudieron cargar las órdenes de trabajo."
            );
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargarOrdenes();
    }, [cargarOrdenes]);

    return (
        <section className="ordenes-page">
            <header className="ordenes-encabezado">
                <div>
                    <h1>Órdenes de trabajo</h1>

                    <p>
                        Consulte las órdenes importadas desde OFSC y revise
                        su estado de asignación.
                    </p>
                </div>

                <button
                    type="button"
                    className="boton-actualizar"
                    onClick={cargarOrdenes}
                    disabled={cargando}
                >
                    {cargando ? "Actualizando..." : "Actualizar"}
                </button>
            </header>

            {cargando && (
                <div className="estado-pagina">
                    Cargando órdenes de trabajo...
                </div>
            )}

            {!cargando && error && (
                <div className="estado-pagina estado-error">
                    {error}
                </div>
            )}

            {!cargando && !error && (
                <TablaOrdenes ordenes={ordenes} />
            )}
        </section>
    );
}

export default OrdenesPage;