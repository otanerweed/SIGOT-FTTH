const {
    sql
} = require("../config/database");

const {
    guardarActividadOFSC,
    resolverEstadoOrdenDesdeActividad,
    resolverEventoActividad
} = require("./actividadOfscService");
const {
    registrarDetalleImportacion,
    registrarCambiosOFSC,
    crearTSSInicial,
    requiereTSSInicial
} = require("./importacionV2Service");

const {
    registrarHistorialAsignacion
} = require("./historialAsignacionService");

/**
 * Limpia valores de texto.
 */
function limpiarTexto(valor) {
    if (
        valor === undefined ||
        valor === null
    ) {
        return null;
    }

    const texto =
        String(valor).trim();

    return texto === ""
        ? null
        : texto;
}

/**
 * Convierte coordenadas a número decimal.
 */
function limpiarNumero(valor) {
    if (
        valor === undefined ||
        valor === null ||
        valor === ""
    ) {
        return null;
    }

    const numero = Number(
        String(valor)
            .trim()
            .replace(",", ".")
    );

    return Number.isFinite(numero)
        ? numero
        : null;
}

/**
 * Limpia y valida fechas.
 */
function limpiarFecha(valor) {
    if (
        valor === undefined ||
        valor === null ||
        valor === ""
    ) {
        return null;
    }

    if (valor instanceof Date) {
        return Number.isNaN(
            valor.getTime()
        )
            ? null
            : valor;
    }

    const fecha =
        new Date(valor);

    return Number.isNaN(
        fecha.getTime()
    )
        ? null
        : fecha;
}

/**
 * Normaliza textos para compararlos.
 */
function normalizarTexto(valor) {
    const texto =
        limpiarTexto(valor);

    if (!texto) {
        return null;
    }

    return texto
        .normalize("NFD")
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toUpperCase();
}

/**
 * Normaliza los estados generales de la OT.
 */
function normalizarEstadoOT(valor) {
    const estado =
        normalizarTexto(valor);

    if (!estado) {
        return "PENDIENTE";
    }

    const equivalencias = {
        PENDIENTE:
            "PENDIENTE",

        INICIADO:
            "INICIADA",

        INICIADA:
            "INICIADA",

        SUSPENDIDO:
            "SUSPENDIDA",

        SUSPENDIDA:
            "SUSPENDIDA",

        "NO REALIZADO":
            "NO_REALIZADO",

        NO_REALIZADO:
            "NO_REALIZADO",

        REPROGRAMADO:
            "REPROGRAMADA",

        REPROGRAMADA:
            "REPROGRAMADA",

        FINALIZADO:
            "FINALIZADA",

        FINALIZADA:
            "FINALIZADA",

        CANCELADO:
            "CANCELADA",

        CANCELADA:
            "CANCELADA"
    };

    return equivalencias[estado] ||
        estado;
}

/**
 * Convierte una fecha a YYYY-MM-DD.
 */
function fechaComparable(valor) {
    const fecha =
        limpiarFecha(valor);

    if (!fecha) {
        return null;
    }

    const anio =
        fecha.getUTCFullYear();

    const mes = String(
        fecha.getUTCMonth() + 1
    ).padStart(2, "0");

    const dia = String(
        fecha.getUTCDate()
    ).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

/**
 * Compara dos textos.
 */
function textosIguales(
    valorA,
    valorB
) {
    return (
        limpiarTexto(valorA) ===
        limpiarTexto(valorB)
    );
}

/**
 * Compara coordenadas.
 */
function numerosIguales(
    valorA,
    valorB
) {
    const numeroA =
        limpiarNumero(valorA);

    const numeroB =
        limpiarNumero(valorB);

    if (
        numeroA === null &&
        numeroB === null
    ) {
        return true;
    }

    if (
        numeroA === null ||
        numeroB === null
    ) {
        return false;
    }

    return (
        Math.abs(
            numeroA - numeroB
        ) < 0.0000001
    );
}

/**
 * Conserva el valor actual cuando el Excel
 * llega con una celda vacía.
 */
function conservarValor(
    valorNuevo,
    valorActual
) {
    return (
        valorNuevo === null ||
        valorNuevo === undefined
    )
        ? valorActual
        : valorNuevo;
}

/**
 * Evita que un archivo anterior haga retroceder
 * una OT que ya terminó definitivamente.
 */
function protegerEstadoFinal(
    estadoActual,
    estadoRecibido
) {
    const actual =
        normalizarEstadoOT(
            estadoActual
        );

    const recibido =
        normalizarEstadoOT(
            estadoRecibido
        );

    if (actual === "FINALIZADA") {
        return "FINALIZADA";
    }

    if (actual === "CANCELADA") {
        return "CANCELADA";
    }

    return recibido;
}

/**
 * Define EstadoAsignacion en OrdenesTrabajo.
 */
function resolverEstadoAsignacionOrden(
    estadoOT,
    tieneAsignacionActiva
) {
    if (estadoOT === "FINALIZADA") {
        return "FINALIZADA";
    }

    if (estadoOT === "CANCELADA") {
        return "CANCELADA";
    }

    if (estadoOT === "REPROGRAMADA") {
        return "PENDIENTE";
    }

    if (
        estadoOT === "INICIADA" ||
        estadoOT === "SUSPENDIDA" ||
        estadoOT === "NO_REALIZADO"
    ) {
        return tieneAsignacionActiva
            ? "ASIGNADA"
            : "PENDIENTE";
    }

    return tieneAsignacionActiva
        ? "ASIGNADA"
        : "PENDIENTE";
}

/**
 * Busca una OT y sus asignaciones principales.
 */
async function buscarOrden(
    transaction,
    codigoOT
) {
    const resultado =
        await new sql.Request(transaction)

            .input(
                "CodigoOT",
                sql.VarChar(30),
                codigoOT
            )

            .query(`
                SELECT
                    ot.IdOrden,
                    ot.IdOperacion,
                    ot.CodigoOT,
                    ot.CodigoServicio,
                    ot.CodigoPuntoVenta,
                    ot.ProductoPlan,
                    ot.TipoServicio,
                    ot.Cliente,
                    ot.DNI,
                    ot.Telefono,
                    ot.Direccion,
                    ot.Distrito,
                    ot.LatitudCliente,
                    ot.LongitudCliente,
                    ot.PuertoNAP,
                    ot.RFS,
                    ot.FechaAgenda,
                    ot.Horario,
                    ot.EstadoOT,
                    ot.EstadoAsignacion,

                    asignacionActiva.IdAsignacion
                        AS IdAsignacionActiva,

                    ultimaAsignacion.IdAsignacion
                        AS IdUltimaAsignacion

                FROM dbo.OrdenesTrabajo ot

                OUTER APPLY
                (
                    SELECT TOP 1
                        a.IdAsignacion
                    FROM dbo.Asignaciones a
                    WHERE
                        a.IdOrden =
                            ot.IdOrden
                        AND a.Estado =
                            'ACTIVA'
                    ORDER BY
                        a.FechaAsignacion DESC,
                        a.IdAsignacion DESC
                ) asignacionActiva

                OUTER APPLY
                (
                    SELECT TOP 1
                        a.IdAsignacion
                    FROM dbo.Asignaciones a
                    WHERE
                        a.IdOrden =
                            ot.IdOrden
                    ORDER BY
                        a.FechaAsignacion DESC,
                        a.IdAsignacion DESC
                ) ultimaAsignacion

                WHERE
                    ot.CodigoOT =
                        @CodigoOT;
            `);

    return (
        resultado.recordset[0] ||
        null
    );
}

/**
 * Inserta una OT nueva y devuelve IdOrden.
 */
async function insertarOrden(
    transaction,
    actividad,
    idOperacion,
    estadoOT
) {
    const estadoAsignacion =
        resolverEstadoAsignacionOrden(
            estadoOT,
            false
        );

    const resultado =
        await new sql.Request(transaction)

            .input(
                "IdOperacion",
                sql.Int,
                idOperacion
            )

            .input(
                "CodigoOT",
                sql.VarChar(30),
                limpiarTexto(
                    actividad.codigoOT
                )
            )

            .input(
                "CodigoServicio",
                sql.VarChar(30),
                limpiarTexto(
                    actividad.codigoServicio
                )
            )
            
            .input(
                "CodigoPuntoVenta",
                sql.VarChar(20),
                limpiarTexto(
                    actividad.codigoPuntoVenta
                )
            )
           
            .input(
                "ProductoPlan",
                sql.VarChar(150),
                limpiarTexto(
                    actividad.productoPlan
                )
            )

            .input(
                "TipoServicio",
                sql.VarChar(50),
                limpiarTexto(
                    actividad.tipoServicio
                )
            )

            .input(
                "Cliente",
                sql.VarChar(150),
                limpiarTexto(
                    actividad.cliente
                )
            )

            .input(
                "DNI",
                sql.VarChar(15),
                limpiarTexto(
                    actividad.dni
                )
            )

            .input(
                "Telefono",
                sql.VarChar(20),
                limpiarTexto(
                    actividad.telefono
                )
            )

            .input(
                "Direccion",
                sql.VarChar(250),
                limpiarTexto(
                    actividad.direccion
                )
            )

            .input(
                "Distrito",
                sql.VarChar(60),
                limpiarTexto(
                    actividad.distrito
                )
            )

            .input(
                "LatitudCliente",
                sql.Decimal(10, 7),
                limpiarNumero(
                    actividad.latitud
                )
            )

            .input(
                "LongitudCliente",
                sql.Decimal(10, 7),
                limpiarNumero(
                    actividad.longitud
                )
            )

            .input(
                "PuertoNAP",
                sql.VarChar(20),
                null
            )

            .input(
                "RFS",
                sql.VarChar(50),
                limpiarTexto(
                    actividad.rfs
                )
            )

            .input(
                "FechaAgenda",
                sql.Date,
                limpiarFecha(
                    actividad.fechaAgenda
                )
            )

            .input(
                "Horario",
                sql.VarChar(50),
                limpiarTexto(
                    actividad.horario
                )
            )

            .input(
                "EstadoOT",
                sql.VarChar(30),
                estadoOT
            )

            .input(
                "EstadoAsignacion",
                sql.VarChar(30),
                estadoAsignacion
            )

            .query(`
                DECLARE @IdProyectoDetectado INT = NULL;

                IF NULLIF(LTRIM(RTRIM(@RFS)), '') IS NOT NULL
                BEGIN
                    SELECT TOP 1
                        @IdProyectoDetectado = IdProyecto
                    FROM dbo.Proyectos
                    WHERE Codigo = 'RED_ENTEL'
                    AND Activo = 1;
                END
                ELSE
                BEGIN
                    SELECT TOP 1
                        @IdProyectoDetectado = IdProyecto
                    FROM dbo.Proyectos
                    WHERE Codigo = 'RED_WINET'
                    AND Activo = 1;
                END;

                INSERT INTO dbo.OrdenesTrabajo
                (
                    IdOperacion,
                    CodigoOT,
                    CodigoServicio,
                    CodigoPuntoVenta,
                    IdProyecto,
                    ProductoPlan,
                    TipoServicio,
                    Cliente,
                    DNI,
                    Telefono,
                    Direccion,
                    Distrito,
                    LatitudCliente,
                    LongitudCliente,
                    PuertoNAP,
                    RFS,
                    FechaAgenda,
                    Horario,
                    EstadoOT,
                    EstadoAsignacion
                )
                OUTPUT INSERTED.IdOrden
                VALUES
                (
                    @IdOperacion,
                    @CodigoOT,
                    @CodigoServicio,
                    @CodigoPuntoVenta,
                    @IdProyectoDetectado,
                    @ProductoPlan,
                    @TipoServicio,
                    @Cliente,
                    @DNI,
                    @Telefono,
                    @Direccion,
                    @Distrito,
                    @LatitudCliente,
                    @LongitudCliente,
                    @PuertoNAP,
                    @RFS,
                    @FechaAgenda,
                    @Horario,
                    @EstadoOT,
                    @EstadoAsignacion
                );
            `);

    return (
        resultado.recordset[0]
            .IdOrden
    );
}

/**
 * Vincula una asignación antigua o activa
 * con la actividad OFSC procesada.
 */
async function vincularAsignacionActividad(
    transaction,
    idAsignacion,
    idActividad
) {
    if (
        !idAsignacion ||
        !idActividad
    ) {
        return;
    }

    await new sql.Request(transaction)

        .input(
            "IdAsignacion",
            sql.Int,
            idAsignacion
        )

        .input(
            "IdActividad",
            sql.Int,
            idActividad
        )

        .query(`
            UPDATE dbo.Asignaciones
            SET
                IdActividad =
                    @IdActividad
            WHERE
                IdAsignacion =
                    @IdAsignacion
                AND (
                    IdActividad IS NULL
                    OR IdActividad =
                        @IdActividad
                );
        `);
}

/**
 * Resuelve cómo debe cerrarse una asignación activa
 * cuando OFSC informa un estado terminal o una
 * reprogramación.
 */
function resolverCierreAsignacionDesdeEstado(
    estadoOT
) {
    if (estadoOT === "REPROGRAMADA") {
        return {
            nuevoEstado: "CANCELADA",
            evento: "CANCELACION",
            observacion:
                "Asignación cerrada por reprogramación recibida desde OFSC."
        };
    }

    if (estadoOT === "FINALIZADA") {
        return {
            nuevoEstado: "FINALIZADA",
            evento: "FINALIZACION",
            observacion:
                "Asignación finalizada según el estado recibido desde OFSC."
        };
    }

    if (estadoOT === "CANCELADA") {
        return {
            nuevoEstado: "CANCELADA",
            evento: "CANCELACION",
            observacion:
                "Asignación cancelada según el estado recibido desde OFSC."
        };
    }

    return null;
}

/**
 * Normaliza una fila rechazada para mostrarla en la
 * respuesta y conservarla en DetalleImportacionOFSC.
 */
function normalizarFilaRechazada(rechazo = {}) {
    const filaRecibida = Number(
        rechazo.fila
    );

    const fila =
        Number.isInteger(filaRecibida) &&
        filaRecibida > 0
            ? filaRecibida
            : null;

    const codigoOT = limpiarTexto(
        rechazo.codigoOT
    );

    const idActividadOFSC = limpiarTexto(
        rechazo.idActividadOFSC
    );

    const motivo =
        limpiarTexto(rechazo.motivo) ||
        "La fila no cumple las validaciones del importador.";

    const mensaje = [
        fila
            ? `Fila Excel ${fila}.`
            : "Fila Excel sin número disponible.",
        `OT: ${codigoOT || "(vacía)"}.`,
        `ID actividad OFSC: ${idActividadOFSC || "(vacío)"}.`,
        `Motivo: ${motivo}`
    ]
        .join(" ")
        .slice(0, 500);

    return {
        fila,
        codigoOT,
        idActividadOFSC,
        motivo,
        mensaje
    };
}

/**
 * Actualiza la asignación activa de acuerdo
 * con el estado general de la OT.
 */
async function actualizarAsignacionActiva(
    transaction,
    idAsignacion,
    idActividad,
    estadoOT,
    idUsuario
) {
    if (!idAsignacion) {
        return;
    }

    await vincularAsignacionActividad(
        transaction,
        idAsignacion,
        idActividad
    );

    const cierre =
        resolverCierreAsignacionDesdeEstado(
            estadoOT
        );

    /*
     * INICIADA, SUSPENDIDA y NO_REALIZADO
     * conservan la asignación ACTIVA.
     */
    if (!cierre) {
        return;
    }

    const {
        nuevoEstado,
        evento,
        observacion
    } = cierre;

    const resultadoActualizacion =
        await new sql.Request(transaction)

        .input(
            "IdAsignacion",
            sql.Int,
            idAsignacion
        )

        .input(
            "NuevoEstado",
            sql.VarChar(20),
            nuevoEstado
        )

        .input(
            "Observacion",
            sql.VarChar(500),
            observacion
        )

        .query(`
            UPDATE dbo.Asignaciones
            SET
                Estado =
                    @NuevoEstado,

                Observaciones =
                    CASE
                        WHEN
                            Observaciones IS NULL
                            OR LTRIM(
                                RTRIM(
                                    Observaciones
                                )
                            ) = ''
                        THEN
                            @Observacion

                        ELSE
                            LEFT(
                                CONCAT(
                                    Observaciones,
                                    ' | ',
                                    @Observacion
                                ),
                                500
                            )
                    END

            OUTPUT
                DELETED.IdOrden,
                DELETED.IdTecnico,
                DELETED.Estado
                    AS EstadoAnterior

            WHERE
                IdAsignacion =
                    @IdAsignacion
                AND Estado =
                    'ACTIVA';
        `);

    if (
        resultadoActualizacion
            .recordset?.length !== 1
    ) {
        return;
    }

    const asignacionAnterior =
        resultadoActualizacion.recordset[0];

    await registrarHistorialAsignacion(
        transaction,
        {
            idAsignacion,
            idOrden:
                asignacionAnterior.IdOrden,
            idTecnicoAnterior:
                asignacionAnterior.IdTecnico,
            idTecnicoNuevo:
                nuevoEstado === "FINALIZADA"
                    ? asignacionAnterior.IdTecnico
                    : null,
            evento,
            estadoAnterior:
                asignacionAnterior.EstadoAnterior,
            estadoNuevo:
                nuevoEstado,
            motivo:
                observacion,
            fuente:
                "OFSC",
            idUsuario,
            idActividad
        }
    );
}

/**
 * Registra un cambio general de la OT.
 *
 * El usuario responsable se obtiene del JWT
 * y se recibe desde el controlador de importación.
 */
async function registrarHistorialOT(
    transaction,
    idOrden,
    idActividad,
    idOperacion,
    estadoAnterior,
    estadoNuevo,
    evento,
    actividad,
    idUsuario
) {
    const motivo =
        limpiarTexto(
            actividad.motivoCancelacion
        ) ||
        limpiarTexto(
            actividad.motivo
        ) ||
        limpiarTexto(
            actividad.razonReagenda
        ) ||
        limpiarTexto(
            actividad.tipoCierreOriginal
        ) ||
        limpiarTexto(
            actividad.tipoCierre
        );

    await new sql.Request(transaction)

        .input(
            "IdOrden",
            sql.Int,
            idOrden
        )

        .input(
            "IdActividad",
            sql.Int,
            idActividad
        )

        .input(
            "IdOperacion",
            sql.Int,
            idOperacion
        )

        .input(
            "EstadoAnterior",
            sql.VarChar(30),
            estadoAnterior
        )

        .input(
            "EstadoNuevo",
            sql.VarChar(30),
            estadoNuevo
        )

        .input(
            "Evento",
            sql.VarChar(50),
            evento
        )

        .input(
            "Motivo",
            sql.VarChar(500),
            motivo
        )

        .input(
            "Fuente",
            sql.VarChar(20),
            "OFSC"
        )

        .input(
            "IdUsuario",
            sql.Int,
            idUsuario
        )

        .query(`
            INSERT INTO dbo.HistorialEstadosOT
            (
                IdOrden,
                IdActividad,
                IdOperacion,
                EstadoAnterior,
                EstadoNuevo,
                Evento,
                Motivo,
                Fuente,
                FechaEvento,
                IdUsuario
            )
            VALUES
            (
                @IdOrden,
                @IdActividad,
                @IdOperacion,
                @EstadoAnterior,
                @EstadoNuevo,
                @Evento,
                @Motivo,
                @Fuente,
                SYSDATETIME(),
                @IdUsuario
            );
        `);
}

/**
 * Actualiza los datos generales y el estado
 * de una OT existente.
 */
async function actualizarOrden(
    transaction,
    ordenExistente,
    actividad,
    estadoOT,
    cambiosDetectados = []
) {
    const datosFinales = {
        codigoServicio:
            conservarValor(
                limpiarTexto(
                    actividad.codigoServicio
                ),
                ordenExistente.CodigoServicio
            ),

        codigoPuntoVenta:
            conservarValor(
                limpiarTexto(
                    actividad.codigoPuntoVenta
                ),
                ordenExistente.CodigoPuntoVenta
            ),

        productoPlan:
            conservarValor(
                limpiarTexto(
                    actividad.productoPlan
                ),
                ordenExistente.ProductoPlan
            ),

        tipoServicio:
            conservarValor(
                limpiarTexto(
                    actividad.tipoServicio
                ),
                ordenExistente.TipoServicio
            ),

        cliente:
            conservarValor(
                limpiarTexto(
                    actividad.cliente
                ),
                ordenExistente.Cliente
            ),

        dni:
            conservarValor(
                limpiarTexto(
                    actividad.dni
                ),
                ordenExistente.DNI
            ),

        telefono:
            conservarValor(
                limpiarTexto(
                    actividad.telefono
                ),
                ordenExistente.Telefono
            ),

        direccion:
            conservarValor(
                limpiarTexto(
                    actividad.direccion
                ),
                ordenExistente.Direccion
            ),

        distrito:
            conservarValor(
                limpiarTexto(
                    actividad.distrito
                ),
                ordenExistente.Distrito
            ),

        latitudCliente:
            conservarValor(
                limpiarNumero(
                    actividad.latitud
                ),
                ordenExistente.LatitudCliente
            ),

        longitudCliente:
            conservarValor(
                limpiarNumero(
                    actividad.longitud
                ),
                ordenExistente.LongitudCliente
            ),

        rfs:
            conservarValor(
                limpiarTexto(
                    actividad.rfs
                ),
                ordenExistente.RFS
            ),

        fechaAgenda:
            conservarValor(
                limpiarFecha(
                    actividad.fechaAgenda
                ),
                ordenExistente.FechaAgenda
            ),

        horario:
            conservarValor(
                limpiarTexto(
                    actividad.horario
                ),
                ordenExistente.Horario
            )
    };

    const tieneAsignacionActiva =
        Boolean(
            ordenExistente
                .IdAsignacionActiva
        );

    const estadoAsignacion =
        resolverEstadoAsignacionOrden(
            estadoOT,
            tieneAsignacionActiva
        );

    /*
     * Los cambios se calculan contra los valores
     * finales que realmente serán guardados.
     */
    const candidatosCambio = [
        {
            campo: "CodigoServicio",
            valorAnterior: ordenExistente.CodigoServicio,
            valorNuevo: datosFinales.codigoServicio,
            comparar: textosIguales
        },
        {
            campo: "CodigoPuntoVenta",
            valorAnterior: ordenExistente.CodigoPuntoVenta,
            valorNuevo: datosFinales.codigoPuntoVenta,
            comparar: textosIguales
        },
        {
            campo: "ProductoPlan",
            valorAnterior: ordenExistente.ProductoPlan,
            valorNuevo: datosFinales.productoPlan,
            comparar: textosIguales
        },
        {
            campo: "TipoServicio",
            valorAnterior: ordenExistente.TipoServicio,
            valorNuevo: datosFinales.tipoServicio,
            comparar: textosIguales
        },
        {
            campo: "Cliente",
            valorAnterior: ordenExistente.Cliente,
            valorNuevo: datosFinales.cliente,
            comparar: textosIguales
        },
        {
            campo: "DNI",
            valorAnterior: ordenExistente.DNI,
            valorNuevo: datosFinales.dni,
            comparar: textosIguales
        },
        {
            campo: "Telefono",
            valorAnterior: ordenExistente.Telefono,
            valorNuevo: datosFinales.telefono,
            comparar: textosIguales
        },
        {
            campo: "Direccion",
            valorAnterior: ordenExistente.Direccion,
            valorNuevo: datosFinales.direccion,
            comparar: textosIguales
        },
        {
            campo: "Distrito",
            valorAnterior: ordenExistente.Distrito,
            valorNuevo: datosFinales.distrito,
            comparar: textosIguales
        },
        {
            campo: "LatitudCliente",
            valorAnterior: ordenExistente.LatitudCliente,
            valorNuevo: datosFinales.latitudCliente,
            comparar: numerosIguales
        },
        {
            campo: "LongitudCliente",
            valorAnterior: ordenExistente.LongitudCliente,
            valorNuevo: datosFinales.longitudCliente,
            comparar: numerosIguales
        },
        {
            campo: "RFS",
            valorAnterior: ordenExistente.RFS,
            valorNuevo: datosFinales.rfs,
            comparar: textosIguales
        },
        {
            campo: "FechaAgenda",
            valorAnterior:
                fechaComparable(
                    ordenExistente.FechaAgenda
                ),
            valorNuevo:
                fechaComparable(
                    datosFinales.fechaAgenda
                ),
            comparar: textosIguales
        },
        {
            campo: "Horario",
            valorAnterior: ordenExistente.Horario,
            valorNuevo: datosFinales.horario,
            comparar: textosIguales
        },
        {
            campo: "EstadoOT",
            valorAnterior:
                normalizarEstadoOT(
                    ordenExistente.EstadoOT
                ),
            valorNuevo:
                normalizarEstadoOT(
                    estadoOT
                ),
            comparar: textosIguales
        },
        {
            campo: "EstadoAsignacion",
            valorAnterior:
                normalizarTexto(
                    ordenExistente.EstadoAsignacion
                ),
            valorNuevo:
                normalizarTexto(
                    estadoAsignacion
                ),
            comparar: textosIguales
        }
    ];

    const cambios =
        candidatosCambio
            .filter((cambio) =>
                !cambio.comparar(
                    cambio.valorAnterior,
                    cambio.valorNuevo
                )
            )
            .map((cambio) => ({
                campo: cambio.campo,
                valorAnterior:
                    cambio.valorAnterior,
                valorNuevo:
                    cambio.valorNuevo
            }));

    cambiosDetectados.push(
        ...cambios
    );

    const hayCambiosDatos =
        cambios.length > 0;

    if (!hayCambiosDatos) {
        return false;
    }

    await new sql.Request(transaction)

        .input(
            "IdOrden",
            sql.Int,
            ordenExistente.IdOrden
        )

        .input(
            "CodigoServicio",
            sql.VarChar(30),
            datosFinales.codigoServicio
        )
        .input(
            "CodigoPuntoVenta",
            sql.VarChar(20),
            datosFinales.codigoPuntoVenta
        )

        .input(
            "ProductoPlan",
            sql.VarChar(150),
            datosFinales.productoPlan
        )

        .input(
            "TipoServicio",
            sql.VarChar(50),
            datosFinales.tipoServicio
        )

        .input(
            "Cliente",
            sql.VarChar(150),
            datosFinales.cliente
        )

        .input(
            "DNI",
            sql.VarChar(15),
            datosFinales.dni
        )

        .input(
            "Telefono",
            sql.VarChar(20),
            datosFinales.telefono
        )

        .input(
            "Direccion",
            sql.VarChar(250),
            datosFinales.direccion
        )

        .input(
            "Distrito",
            sql.VarChar(60),
            datosFinales.distrito
        )

        .input(
            "LatitudCliente",
            sql.Decimal(10, 7),
            datosFinales.latitudCliente
        )

        .input(
            "LongitudCliente",
            sql.Decimal(10, 7),
            datosFinales.longitudCliente
        )

        .input(
            "RFS",
            sql.VarChar(50),
            datosFinales.rfs
        )

        .input(
            "FechaAgenda",
            sql.Date,
            datosFinales.fechaAgenda
        )

        .input(
            "Horario",
            sql.VarChar(50),
            datosFinales.horario
        )

        .input(
            "EstadoOT",
            sql.VarChar(30),
            estadoOT
        )

        .input(
            "EstadoAsignacion",
            sql.VarChar(30),
            estadoAsignacion
        )

        .query(`
            UPDATE dbo.OrdenesTrabajo
            SET
                CodigoServicio =
                    @CodigoServicio,
                CodigoPuntoVenta =
                    @CodigoPuntoVenta,

                IdProyecto =
                (
                    SELECT TOP 1
                        P.IdProyecto
                    FROM dbo.Proyectos P
                    WHERE
                        P.Codigo =
                            CASE
                                WHEN NULLIF(LTRIM(RTRIM(@RFS)), '') IS NOT NULL
                                    THEN 'RED_ENTEL'
                                ELSE 'RED_WINET'
                            END
                        AND P.Activo = 1
                ),

                ProductoPlan =
                    @ProductoPlan,

                TipoServicio =
                    @TipoServicio,

                Cliente =
                    @Cliente,

                DNI =
                    @DNI,

                Telefono =
                    @Telefono,

                Direccion =
                    @Direccion,

                Distrito =
                    @Distrito,

                LatitudCliente =
                    @LatitudCliente,

                LongitudCliente =
                    @LongitudCliente,

                RFS =
                    @RFS,

                FechaAgenda =
                    @FechaAgenda,

                Horario =
                    @Horario,

                EstadoOT =
                    @EstadoOT,

                EstadoAsignacion =
                    @EstadoAsignacion,

                FechaActualizacion =
                    GETDATE()

            WHERE
                IdOrden =
                    @IdOrden;
        `);

    return true;
}

/**
 * Guarda las filas del Excel como actividades OFSC.
 *
 * Una OT puede contener varias actividades.
 */
async function guardarOrdenes(
    transaction,
    actividades,
    idOperacion,
    idUsuario,
    opciones = {}
) {
    if (!transaction) {
        throw new Error(
            "Se necesita una transacción para guardar las órdenes."
        );
    }

    if (!Array.isArray(actividades)) {
        throw new Error(
            "La información recibida del Excel no es válida."
        );
    }

    if (
        !Number.isInteger(
            idOperacion
        ) ||
        idOperacion <= 0
    ) {
        throw new Error(
            "El IdOperacion no es válido."
        );
    }

    if (
        !Number.isInteger(
            idUsuario
        ) ||
        idUsuario <= 0
    ) {
        throw new Error(
            "El IdUsuario no es válido."
        );
    }

    const filasRechazadasLectura =
        Array.isArray(
            opciones.filasRechazadas
        )
            ? opciones.filasRechazadas
            : [];

    const totalFilasRecibido = Number(
        opciones.totalFilasLeidas
    );

    const totalFilasLeidas =
        Number.isInteger(totalFilasRecibido) &&
        totalFilasRecibido >=
            actividades.length +
            filasRechazadasLectura.length
            ? totalFilasRecibido
            : actividades.length +
                filasRechazadasLectura.length;

    let insertadas = 0;
    let actualizadas = 0;
    let sinCambios = 0;
    let rechazadas = 0;

    const resultadosPorOT = new Map();

    let actividadesInsertadas = 0;
    let actividadesActualizadas = 0;
    let actividadesSinCambios = 0;

    const detalleRechazadas = [];

    async function registrarFilaRechazada(
        rechazoRecibido
    ) {
        const rechazo =
            normalizarFilaRechazada(
                rechazoRecibido
            );

        rechazadas++;

        detalleRechazadas.push({
            fila: rechazo.fila,
            codigoOT: rechazo.codigoOT,
            idActividadOFSC:
                rechazo.idActividadOFSC,
            motivo: rechazo.motivo
        });

        await registrarDetalleImportacion(
            transaction,
            {
                idOperacion,
                idOrden: null,
                codigoOT:
                    rechazo.codigoOT
                        ?.slice(0, 30) ||
                    null,
                resultado: "ERROR",
                mensaje: rechazo.mensaje
            }
        );
    }

    for (
        const rechazoLectura of
        filasRechazadasLectura
    ) {
        await registrarFilaRechazada(
            rechazoLectura
        );
    }

    for (
        let indice = 0;
        indice < actividades.length;
        indice++
    ) {
        const actividad =
            actividades[indice];

        const numeroFilaExcel =
            Number.isInteger(
                actividad.numeroFilaExcel
            )
                ? actividad.numeroFilaExcel
                : indice + 2;

        const codigoOT =
            limpiarTexto(
                actividad.codigoOT
            );

        const idActividadOFSC =
            limpiarTexto(
                actividad.idActividadOFSC
            );

        if (!codigoOT) {
            await registrarFilaRechazada({
                fila: numeroFilaExcel,
                codigoOT: null,
                idActividadOFSC,
                motivo:
                    "La fila no contiene Código OT."
            });

            continue;
        }

        if (!idActividadOFSC) {
            await registrarFilaRechazada({
                fila: numeroFilaExcel,
                codigoOT,
                idActividadOFSC: null,
                motivo:
                    "La fila no contiene ID de actividad OFSC."
            });

            continue;
        }

        try {
            const ordenExistente =
                await buscarOrden(
                    transaction,
                    codigoOT
                );

            const estadoDesdeActividad =
                resolverEstadoOrdenDesdeActividad(
                    actividad
                );

            /*
             * Crear una nueva OT.
             */
            if (!ordenExistente) {
                const idOrden =
                    await insertarOrden(
                        transaction,
                        actividad,
                        idOperacion,
                        estadoDesdeActividad
                    );

                const resultadoActividad =
                    await guardarActividadOFSC(
                        transaction,
                        actividad,
                        idOrden,
                        idOperacion
                    );

                /*
                * Registrar el primer estado
                * de la nueva OT.
                */
                await registrarHistorialOT(
                    transaction,
                    idOrden,
                    resultadoActividad
                        .idActividad,
                    idOperacion,
                    null,
                    estadoDesdeActividad,
                    resolverEventoActividad(
                        actividad
                    ),
                    actividad,
                    idUsuario
                );

                /*
                * SIGOT V2:
                * Solo las OTs nuevas que todavía pueden
                * programarse generan un TSS inicial.
                */
                const estadoInicialOT =
                    normalizarEstadoOT(
                        estadoDesdeActividad
                    );

                const debeCrearTSS =
                    requiereTSSInicial(
                        estadoInicialOT
                    );

                if (debeCrearTSS) {
                    await crearTSSInicial(
                        transaction,
                        idOrden,
                        idUsuario
                    );
                }

                /*
                * Registrar el resultado de esta fila
                * dentro de la importación.
                */
                await registrarDetalleImportacion(
                    transaction,
                    {
                        idOperacion,
                        idOrden,
                        codigoOT,
                        resultado: "NUEVA",
                        mensaje:
                            debeCrearTSS
                                ? "OT nueva registrada. Se evaluó la creación de TSS según el proyecto."
                                : `OT nueva registrada sin TSS porque su estado inicial es ${estadoInicialOT}.`
                    }
                );

                resultadosPorOT.set(
                    codigoOT,
                    "NUEVA"
                );

                if (
                    resultadoActividad
                        .insertada
                ) {
                    actividadesInsertadas++;
                }

                continue;
            }

            /*
             * Guardar o actualizar la actividad.
             */
            const resultadoActividad =
                await guardarActividadOFSC(
                    transaction,
                    actividad,
                    ordenExistente.IdOrden,
                    idOperacion
                );

            if (
                resultadoActividad.insertada
            ) {
                actividadesInsertadas++;
            }

            if (
                resultadoActividad.actualizada
            ) {
                actividadesActualizadas++;
            }

            if (
                resultadoActividad.sinCambios
            ) {
                actividadesSinCambios++;
            }

            const estadoAnterior =
                normalizarEstadoOT(
                    ordenExistente.EstadoOT
                );

            /*
             * FINALIZADA y CANCELADA son estados
             * definitivos y no deben retroceder.
             */
            const estadoFinal =
                protegerEstadoFinal(
                    estadoAnterior,
                    resultadoActividad.estadoOT
                );

            const cambioEstado =
                estadoAnterior !==
                estadoFinal;

            const cambiosOrden = [];

            const ordenActualizada =
                await actualizarOrden(
                    transaction,
                    ordenExistente,
                    actividad,
                    estadoFinal,
                    cambiosOrden
                );

            /*
             * Relacionar la actividad con la
             * asignación que estaba activa.
             */
            const idAsignacionRelacionada =
                ordenExistente
                    .IdAsignacionActiva ||
                ordenExistente
                    .IdUltimaAsignacion;

            await vincularAsignacionActividad(
                transaction,
                idAsignacionRelacionada,
                resultadoActividad
                    .idActividad
            );

            /*
             * Cerrar o finalizar la asignación.
             */
            await actualizarAsignacionActiva(
                transaction,
                ordenExistente
                    .IdAsignacionActiva,
                resultadoActividad
                    .idActividad,
                estadoFinal,
                idUsuario
            );

            /*
             * Registrar historial solamente cuando
             * cambió el estado general de la OT.
             */
            if (cambioEstado) {
                await registrarHistorialOT(
                    transaction,
                    ordenExistente.IdOrden,
                    resultadoActividad
                        .idActividad,
                    idOperacion,
                    estadoAnterior,
                    estadoFinal,
                    resultadoActividad
                        .evento,
                    actividad,
                    idUsuario
                );
            }

            const huboCambio =
                ordenActualizada ||
                resultadoActividad.insertada ||
                resultadoActividad.actualizada ||
                cambioEstado;

            const cambiosImportacion = [
                ...cambiosOrden,
                ...(
                    resultadoActividad
                        .cambios || []
                )
            ];

            if (huboCambio) {
                /*
                 * Registrar los campos generales y
                 * de actividad que realmente cambiaron.
                 */
                if (
                    cambiosImportacion
                        .length > 0
                ) {
                    await registrarCambiosOFSC(
                        transaction,
                        ordenExistente.IdOrden,
                        idOperacion,
                        cambiosImportacion
                    );
                }

                await registrarDetalleImportacion(
                    transaction,
                    {
                        idOperacion,
                        idOrden:
                            ordenExistente.IdOrden,
                        codigoOT,
                        resultado:
                            "ACTUALIZADA",
                        mensaje:
                            cambiosImportacion
                                .length > 0
                                ? `OT actualizada. ${cambiosImportacion.length} cambio(s) OFSC registrado(s).`
                                : "OT actualizada por cambios en su actividad OFSC."
                    }
                );

                                const resultadoPrevio =
                                    resultadosPorOT.get(
                                        codigoOT
                                    );

                                if (
                                    resultadoPrevio !== "NUEVA"
                                ) {
                                    resultadosPorOT.set(
                                        codigoOT,
                                        "ACTUALIZADA"
                                    );
                                }
                            } else {
                                await registrarDetalleImportacion(
                                    transaction,
                                    {
                                        idOperacion,
                                        idOrden:
                                            ordenExistente.IdOrden,
                                        codigoOT,
                                        resultado:
                                            "SIN_CAMBIOS",
                                        mensaje:
                                            "La OT y su actividad OFSC no presentan cambios."
                                    }
                                );

                                if (
                                    !resultadosPorOT.has(
                                        codigoOT
                                    )
                                ) {
                                    resultadosPorOT.set(
                                        codigoOT,
                                        "SIN_CAMBIOS"
                                    );
                                }
            }
        } catch (error) {
            throw new Error(
                `Error en la fila ${numeroFilaExcel}, ` +
                `actividad ${idActividadOFSC}, ` +
                `OT ${codigoOT}: ${error.message}`
            );
        }
    }

        for (
            const resultado of
            resultadosPorOT.values()
        ) {
            if (resultado === "NUEVA") {
                insertadas++;
            }

            if (resultado === "ACTUALIZADA") {
                actualizadas++;
            }

            if (resultado === "SIN_CAMBIOS") {
                sinCambios++;
            }
        }

    return {
        totalLeidas:
            totalFilasLeidas,

        insertadas,
        actualizadas,
        sinCambios,

        /*
         * Compatibilidad temporal
         * con el frontend.
         */
        duplicadas:
            sinCambios,

        rechazadas,
        detalleRechazadas,

        actividades: {
            insertadas:
                actividadesInsertadas,

            actualizadas:
                actividadesActualizadas,

            sinCambios:
                actividadesSinCambios
        }
    };
}

module.exports = {
    guardarOrdenes,
    resolverCierreAsignacionDesdeEstado,
    normalizarFilaRechazada
};
