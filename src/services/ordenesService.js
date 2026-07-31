const { sql } = require("../config/database");

const {
    guardarActividadOFSC,
    resolverEstadoOrdenDesdeActividad,
    resolverEventoActividad
} = require("./actividadOfscService");

// Temporal hasta implementar login y JWT.
const ID_USUARIO_SISTEMA = 1;

/**
 * Limpia valores de texto.
 */
function limpiarTexto(valor) {
    if (valor === undefined || valor === null) {
        return null;
    }

    const texto = String(valor).trim();

    return texto === "" ? null : texto;
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
        return Number.isNaN(valor.getTime())
            ? null
            : valor;
    }

    const fecha = new Date(valor);

    return Number.isNaN(fecha.getTime())
        ? null
        : fecha;
}

/**
 * Normaliza textos para compararlos.
 */
function normalizarTexto(valor) {
    const texto = limpiarTexto(valor);

    if (!texto) {
        return null;
    }

    return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();
}

/**
 * Normaliza los estados generales de la OT.
 */
function normalizarEstadoOT(valor) {
    const estado = normalizarTexto(valor);

    if (!estado) {
        return "PENDIENTE";
    }

    const equivalencias = {
        PENDIENTE: "PENDIENTE",

        INICIADO: "INICIADA",
        INICIADA: "INICIADA",

        SUSPENDIDO: "SUSPENDIDA",
        SUSPENDIDA: "SUSPENDIDA",

        "NO REALIZADO": "NO_REALIZADO",
        NO_REALIZADO: "NO_REALIZADO",

        REPROGRAMADO: "REPROGRAMADA",
        REPROGRAMADA: "REPROGRAMADA",

        FINALIZADO: "FINALIZADA",
        FINALIZADA: "FINALIZADA",

        CANCELADO: "CANCELADA",
        CANCELADA: "CANCELADA"
    };

    return equivalencias[estado] || estado;
}

/**
 * Convierte una fecha a YYYY-MM-DD.
 */
function fechaComparable(valor) {
    const fecha = limpiarFecha(valor);

    if (!fecha) {
        return null;
    }

    const anio = fecha.getFullYear();

    const mes = String(
        fecha.getMonth() + 1
    ).padStart(2, "0");

    const dia = String(
        fecha.getDate()
    ).padStart(2, "0");

    return `${anio}-${mes}-${dia}`;
}

/**
 * Compara dos textos.
 */
function textosIguales(valorA, valorB) {
    return limpiarTexto(valorA) ===
        limpiarTexto(valorB);
}

/**
 * Compara coordenadas.
 */
function numerosIguales(valorA, valorB) {
    const numeroA = limpiarNumero(valorA);
    const numeroB = limpiarNumero(valorB);

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

    return Math.abs(
        numeroA - numeroB
    ) < 0.0000001;
}

/**
 * Conserva el valor actual cuando el Excel
 * llega con una celda vacía.
 */
function conservarValor(
    valorNuevo,
    valorActual
) {
    return valorNuevo === null ||
        valorNuevo === undefined
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
        normalizarEstadoOT(estadoActual);

    const recibido =
        normalizarEstadoOT(estadoRecibido);

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
                    WITH (
                        UPDLOCK,
                        HOLDLOCK
                    )

                OUTER APPLY
                (
                    SELECT TOP 1
                        a.IdAsignacion
                    FROM dbo.Asignaciones a
                    WHERE a.IdOrden = ot.IdOrden
                      AND a.Estado = 'ACTIVA'
                    ORDER BY
                        a.FechaAsignacion DESC,
                        a.IdAsignacion DESC
                ) asignacionActiva

                OUTER APPLY
                (
                    SELECT TOP 1
                        a.IdAsignacion
                    FROM dbo.Asignaciones a
                    WHERE a.IdOrden = ot.IdOrden
                    ORDER BY
                        a.FechaAsignacion DESC,
                        a.IdAsignacion DESC
                ) ultimaAsignacion

                WHERE ot.CodigoOT = @CodigoOT;
            `);

    return resultado.recordset[0] || null;
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
                limpiarTexto(actividad.codigoOT)
            )

            .input(
                "CodigoServicio",
                sql.VarChar(30),
                limpiarTexto(
                    actividad.codigoServicio
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
                sql.VarChar(20),
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
                INSERT INTO dbo.OrdenesTrabajo
                (
                    IdOperacion,
                    CodigoOT,
                    CodigoServicio,
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

    return resultado.recordset[0].IdOrden;
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
    if (!idAsignacion || !idActividad) {
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
            SET IdActividad = @IdActividad
            WHERE IdAsignacion = @IdAsignacion
              AND (
                    IdActividad IS NULL
                    OR IdActividad = @IdActividad
              );
        `);
}

/**
 * Actualiza la asignación activa de acuerdo
 * con el estado general de la OT.
 */
async function actualizarAsignacionActiva(
    transaction,
    idAsignacion,
    idActividad,
    estadoOT
) {
    if (!idAsignacion) {
        return;
    }

    await vincularAsignacionActividad(
        transaction,
        idAsignacion,
        idActividad
    );

    let nuevoEstado = null;
    let observacion = null;

    if (estadoOT === "REPROGRAMADA") {
        nuevoEstado = "CANCELADA";

        observacion =
            "Asignación cerrada por reprogramación recibida desde OFSC.";
    }

    if (estadoOT === "FINALIZADA") {
        nuevoEstado = "FINALIZADA";

        observacion =
            "Asignación finalizada según el estado recibido desde OFSC.";
    }

    if (estadoOT === "CANCELADA") {
        nuevoEstado = "CANCELADA";

        observacion =
            "Asignación cancelada según el estado recibido desde OFSC.";
    }

    /*
     * INICIADA, SUSPENDIDA y NO_REALIZADO
     * conservan la asignación ACTIVA.
     */
    if (!nuevoEstado) {
        return;
    }

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
                Estado = @NuevoEstado,

                Observaciones =
                    CASE
                        WHEN Observaciones IS NULL
                          OR LTRIM(RTRIM(Observaciones)) = ''
                        THEN @Observacion

                        ELSE CONCAT(
                            Observaciones,
                            ' | ',
                            @Observacion
                        )
                    END

            WHERE IdAsignacion = @IdAsignacion
              AND Estado = 'ACTIVA';
        `);
}

/**
 * Registra un cambio general de la OT.
 *
 * No depende de una asignación técnica.
 */
async function registrarHistorialOT(
    transaction,
    idOrden,
    idActividad,
    idOperacion,
    estadoAnterior,
    estadoNuevo,
    evento,
    actividad
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
            ID_USUARIO_SISTEMA
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
    estadoOT
) {
    const datosFinales = {
        codigoServicio: conservarValor(
            limpiarTexto(
                actividad.codigoServicio
            ),
            ordenExistente.CodigoServicio
        ),

        productoPlan: conservarValor(
            limpiarTexto(
                actividad.productoPlan
            ),
            ordenExistente.ProductoPlan
        ),

        tipoServicio: conservarValor(
            limpiarTexto(
                actividad.tipoServicio
            ),
            ordenExistente.TipoServicio
        ),

        cliente: conservarValor(
            limpiarTexto(
                actividad.cliente
            ),
            ordenExistente.Cliente
        ),

        dni: conservarValor(
            limpiarTexto(
                actividad.dni
            ),
            ordenExistente.DNI
        ),

        telefono: conservarValor(
            limpiarTexto(
                actividad.telefono
            ),
            ordenExistente.Telefono
        ),

        direccion: conservarValor(
            limpiarTexto(
                actividad.direccion
            ),
            ordenExistente.Direccion
        ),

        distrito: conservarValor(
            limpiarTexto(
                actividad.distrito
            ),
            ordenExistente.Distrito
        ),

        latitudCliente: conservarValor(
            limpiarNumero(
                actividad.latitud
            ),
            ordenExistente.LatitudCliente
        ),

        longitudCliente: conservarValor(
            limpiarNumero(
                actividad.longitud
            ),
            ordenExistente.LongitudCliente
        ),

        rfs: conservarValor(
            limpiarTexto(
                actividad.rfs
            ),
            ordenExistente.RFS
        ),

        fechaAgenda: conservarValor(
            limpiarFecha(
                actividad.fechaAgenda
            ),
            ordenExistente.FechaAgenda
        ),

        horario: conservarValor(
            limpiarTexto(
                actividad.horario
            ),
            ordenExistente.Horario
        )
    };

    const tieneAsignacionActiva =
        Boolean(
            ordenExistente.IdAsignacionActiva
        );

    const estadoAsignacion =
        resolverEstadoAsignacionOrden(
            estadoOT,
            tieneAsignacionActiva
        );

    const hayCambiosDatos =
        !textosIguales(
            ordenExistente.CodigoServicio,
            datosFinales.codigoServicio
        ) ||
        !textosIguales(
            ordenExistente.ProductoPlan,
            datosFinales.productoPlan
        ) ||
        !textosIguales(
            ordenExistente.TipoServicio,
            datosFinales.tipoServicio
        ) ||
        !textosIguales(
            ordenExistente.Cliente,
            datosFinales.cliente
        ) ||
        !textosIguales(
            ordenExistente.DNI,
            datosFinales.dni
        ) ||
        !textosIguales(
            ordenExistente.Telefono,
            datosFinales.telefono
        ) ||
        !textosIguales(
            ordenExistente.Direccion,
            datosFinales.direccion
        ) ||
        !textosIguales(
            ordenExistente.Distrito,
            datosFinales.distrito
        ) ||
        !numerosIguales(
            ordenExistente.LatitudCliente,
            datosFinales.latitudCliente
        ) ||
        !numerosIguales(
            ordenExistente.LongitudCliente,
            datosFinales.longitudCliente
        ) ||
        !textosIguales(
            ordenExistente.RFS,
            datosFinales.rfs
        ) ||
        fechaComparable(
            ordenExistente.FechaAgenda
        ) !==
            fechaComparable(
                datosFinales.fechaAgenda
            ) ||
        !textosIguales(
            ordenExistente.Horario,
            datosFinales.horario
        ) ||
        normalizarEstadoOT(
            ordenExistente.EstadoOT
        ) !== estadoOT ||
        normalizarTexto(
            ordenExistente.EstadoAsignacion
        ) !==
            normalizarTexto(
                estadoAsignacion
            );

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
            sql.VarChar(20),
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

            WHERE IdOrden =
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
    idOperacion
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
        !Number.isInteger(idOperacion) ||
        idOperacion <= 0
    ) {
        throw new Error(
            "El IdOperacion no es válido."
        );
    }

    let insertadas = 0;
    let actualizadas = 0;
    let sinCambios = 0;
    let rechazadas = 0;

    let actividadesInsertadas = 0;
    let actividadesActualizadas = 0;
    let actividadesSinCambios = 0;

    const detalleRechazadas = [];

    for (
        let indice = 0;
        indice < actividades.length;
        indice++
    ) {
        const actividad = actividades[indice];

        const numeroFilaExcel =
            indice + 2;

        const codigoOT =
            limpiarTexto(
                actividad.codigoOT
            );

        const idActividadOFSC =
            limpiarTexto(
                actividad.idActividadOFSC
            );

        if (!codigoOT) {
            rechazadas++;

            detalleRechazadas.push({
                fila: numeroFilaExcel,
                motivo:
                    "La fila no contiene Código OT."
            });

            continue;
        }

        if (!idActividadOFSC) {
            rechazadas++;

            detalleRechazadas.push({
                fila: numeroFilaExcel,
                codigoOT,
                motivo:
                    "La fila no contiene ID de actividad OFSC."
            });

            continue;
        }

        try {
            let ordenExistente =
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

                await registrarHistorialOT(
                    transaction,
                    idOrden,
                    resultadoActividad.idActividad,
                    idOperacion,
                    null,
                    estadoDesdeActividad,
                    resolverEventoActividad(
                        actividad
                    ),
                    actividad
                );

                insertadas++;

                if (
                    resultadoActividad.insertada
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
                estadoAnterior !== estadoFinal;

            const ordenActualizada =
                await actualizarOrden(
                    transaction,
                    ordenExistente,
                    actividad,
                    estadoFinal
                );

            /*
             * Relacionar la actividad con la
             * asignación que estaba activa.
             */
            const idAsignacionRelacionada =
                ordenExistente.IdAsignacionActiva ||
                ordenExistente.IdUltimaAsignacion;

            await vincularAsignacionActividad(
                transaction,
                idAsignacionRelacionada,
                resultadoActividad.idActividad
            );

            /*
             * Cerrar o finalizar la asignación.
             */
            await actualizarAsignacionActiva(
                transaction,
                ordenExistente.IdAsignacionActiva,
                resultadoActividad.idActividad,
                estadoFinal
            );

            /*
             * Registrar historial solamente cuando
             * cambió el estado general de la OT.
             */
            if (cambioEstado) {
                await registrarHistorialOT(
                    transaction,
                    ordenExistente.IdOrden,
                    resultadoActividad.idActividad,
                    idOperacion,
                    estadoAnterior,
                    estadoFinal,
                    resultadoActividad.evento,
                    actividad
                );
            }

            const huboCambio =
                ordenActualizada ||
                resultadoActividad.insertada ||
                resultadoActividad.actualizada ||
                cambioEstado;

            if (huboCambio) {
                actualizadas++;
            } else {
                sinCambios++;
            }
        } catch (error) {
            throw new Error(
                `Error en la fila ${numeroFilaExcel}, ` +
                `actividad ${idActividadOFSC}, ` +
                `OT ${codigoOT}: ${error.message}`
            );
        }
    }

    return {
        totalLeidas:
            actividades.length,

        insertadas,
        actualizadas,
        sinCambios,

        /*
         * Compatibilidad temporal con frontend.
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
    guardarOrdenes
};