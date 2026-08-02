import { useRef, useState } from "react";
import api from "../services/api";
import "./ImportarPage.css";

function ImportarPage() {
    const inputArchivoRef = useRef(null);

    const [archivo, setArchivo] = useState(null);
    const [resultado, setResultado] = useState(null);
    const [mensajeError, setMensajeError] = useState("");
    const [importando, setImportando] = useState(false);

    const seleccionarArchivo = (evento) => {
        const archivoSeleccionado = evento.target.files[0];

        setArchivo(archivoSeleccionado || null);
        setResultado(null);
        setMensajeError("");
    };

    const importarExcel = async () => {
        if (!archivo) {
            setMensajeError(
                "Debe seleccionar un archivo Excel."
            );
            return;
        }

        const extension = archivo.name
            .split(".")
            .pop()
            .toLowerCase();

        if (!["xlsx", "xls"].includes(extension)) {
            setMensajeError(
                "El archivo seleccionado no es válido. Use un archivo .xlsx o .xls."
            );
            return;
        }

        try {
            setImportando(true);
            setMensajeError("");
            setResultado(null);

            const formData = new FormData();
            formData.append("archivo", archivo);

            const respuesta = await api.post(
                "/importador/ofsc",
                formData
            );

            setResultado(respuesta.data);
            setArchivo(null);

            if (inputArchivoRef.current) {
                inputArchivoRef.current.value = "";
            }
        } catch (error) {
            const mensaje =
                error.response?.data?.mensaje ||
                error.response?.data?.error ||
                "No se pudo procesar el archivo OFSC.";

            setMensajeError(mensaje);
        } finally {
            setImportando(false);
        }
    };

    const resumen = resultado?.resumen;

    const cantidadSinCambios =
        resumen?.sinCambios ??
        resumen?.duplicadas ??
        0;

    return (
        <section className="importar-page">
            <div className="importar-encabezado">
                <h1>Importar archivo OFSC</h1>

                <p>
                    Seleccione un archivo Excel exportado desde OFSC
                    para registrar órdenes nuevas y sincronizar sus
                    estados.
                </p>
            </div>

            <div className="importar-card">
                <div className="campo-archivo">
                    <label htmlFor="archivo-ofsc">
                        Archivo Excel
                    </label>

                    <input
                        ref={inputArchivoRef}
                        id="archivo-ofsc"
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={seleccionarArchivo}
                        disabled={importando}
                    />

                    <small>
                        Formatos permitidos: .xlsx y .xls
                    </small>
                </div>

                {archivo && (
                    <div className="archivo-seleccionado">
                        <strong>Archivo seleccionado:</strong>{" "}
                        {archivo.name}
                    </div>
                )}

                <button
                    type="button"
                    className="boton-importar"
                    onClick={importarExcel}
                    disabled={importando}
                >
                    {importando
                        ? "Procesando archivo..."
                        : "Importar y sincronizar"}
                </button>
            </div>

            {mensajeError && (
                <div className="mensaje mensaje-error">
                    {mensajeError}
                </div>
            )}

            {resultado && (
                <div className="resultado-importacion">
                    <div className="mensaje mensaje-exito">
                        {resultado.mensaje}
                    </div>

                    {resultado.idOperacion && (
                        <p className="operacion-creada">
                            Operación registrada:
                            <strong>
                                {" "}#{resultado.idOperacion}
                            </strong>
                        </p>
                    )}

                    {resumen && (
                        <div className="resumen-importacion">
                            <div className="resumen-item">
                                <span>Total leídas</span>
                                <strong>
                                    {resumen.totalLeidas ?? 0}
                                </strong>
                            </div>

                            <div className="resumen-item">
                                <span>Nuevas</span>
                                <strong>
                                    {resumen.insertadas ?? 0}
                                </strong>
                            </div>

                            <div className="resumen-item">
                                <span>Actualizadas</span>
                                <strong>
                                    {resumen.actualizadas ?? 0}
                                </strong>
                            </div>

                            <div className="resumen-item">
                                <span>Sin cambios</span>
                                <strong>
                                    {cantidadSinCambios}
                                </strong>
                            </div>

                            <div className="resumen-item">
                                <span>Rechazadas</span>
                                <strong>
                                    {resumen.rechazadas ?? 0}
                                </strong>
                            </div>
                        </div>
                    )}

                    <div className="importar-nota">
                        Los datos procesados pueden revisarse en el
                        módulo <strong>Órdenes</strong>.
                    </div>
                </div>
            )}
        </section>
    );
}

export default ImportarPage;