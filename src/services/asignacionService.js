const {
    conectarDB,
    sql
} = require("../config/database");

const {
    sincronizarOperacion
} = require("./operacionService");

// =====================================
// CREAR ERROR DE NEGOCIO
// =====================================
function crearErrorNegocio(
    mensaje,
    statusCode = 400
) {
    const error = new Error(mensaje);
    error.statusCode = statusCode;

    return error;
}

// =====================================
// VALIDAR IDENTIFICADOR
// =====================================
function validarId(valor) {
    const id = Number(valor);

    return Number.isInteger(id) && id > 0
        ? id
        : null;
}

// =====================================
// VALIDAR MOTIVO
// =====================================
function validarMotivo(motivoRecibido) {
    const motivo = String(
        motivoRecibido || ""
    ).trim();

    if (motivo.length < 5) {
        throw crearErrorNegocio(
            "El motivo debe contener al menos 5 caracteres."
        );
    }

    if (motivo.length > 350) {
        throw crearErrorNegocio(
            "El motivo no puede superar los 350 caracteres."
        );
    }

    return motivo;
}

// =====================================
// CONSTRUIR OBSERVACIÓN
// =====================================
function construirObservacion(
    observacionActual,
    nuevaObservacion
) {
    const anterior = String(
        observacionActual || ""
    ).trim();

    const nueva = String(
        nuevaObservacion || ""
    ).trim();

    return [
        anterior,
        nueva
    ]
        .filter(Boolean)
        .join(" | ")
        .slice(0, 500);
}

// =====================================
// OBTENER TÉCNICO DENTRO DE TRANSACCIÓN
// =====================================
async function obtenerTecnicoTransaccion(
    transaction,
    idTecnico
) {
    const resultado =
        await new sql.Request(transaction)
            .input(
                "IdTecnico",
                sql.Int,
                idTecnico
            )
            .query(`
                SELECT
                    IdTecnico,
                    CodigoTecnico,
                    NombreCompleto,
                    Telefono,
                    TipoTecnico,
                    DistritoBase,
                    CapacidadMaxima,
                    Disponible,
                    Activo
                FROM dbo.Tecnicos
                    WITH (
                        UPDLOCK,
                        HOLDLOCK
                    )
                WHERE
                    IdTecnico = @IdTecnico;
            `);

    return resultado.recordset[0] || null;
}

// =====================================
// VALIDAR TÉCNICO
// =====================================
function validarTecnicoDisponible(tecnico) {
    if (!tecnico) {
        throw crearErrorNegocio(
            "El técnico seleccionado no existe.",
            404
        );
    }

    if (!tecnico.Activo) {
        throw crearErrorNegocio(
            "El técnico seleccionado se encuentra inactivo.",
            409
        );
    }

    if (!tecnico.Disponible) {
        throw crearErrorNegocio(
            "El técnico seleccionado no se encuentra disponible.",
            409
        );
    }

    const capacidadMaxima = Number(
        tecnico.CapacidadMaxima ?? 0
    );

    if (
        !Number.isInteger(capacidadMaxima) ||
        capacidadMaxima <= 0
    ) {
        throw crearErrorNegocio(
            "El técnico seleccionado no tiene una capacidad máxima válida.",
            409
        );
    }
}

// =====================================
// OBTENER CARGA DEL TÉCNICO
// =====================================
async function obtenerCargaTecnico(
    transaction,
    idTecnico,
    fechaAgenda,
    horario,
    idOrdenExcluir = null
) {
    const resultado =
        await new sql.Request(transaction)
            .input(
                "IdTecnico",
                sql.Int,
                idTecnico
            )
            .input(
                "FechaAgenda",
                sql.Date,
                fechaAgenda
            )
            .input(
                "Horario",
                sql.VarChar(20),
                horario
            )
            .input(
                "IdOrdenExcluir",
                sql.Int,
                idOrdenExcluir
            )
            .query(`
                SELECT
                    COUNT(*) AS CargaTurno
                FROM dbo.Asignaciones A
                INNER JOIN dbo.OrdenesTrabajo OT
                    ON OT.IdOrden = A.IdOrden
                WHERE
                    A.IdTecnico = @IdTecnico
                    AND A.Estado = 'ACTIVA'
                    AND OT.EstadoAsignacion = 'ASIGNADA'
                    AND OT.FechaAgenda = @FechaAgenda
                    AND ISNULL(
                        OT.Horario,
                        ''
                    ) = ISNULL(
                        @Horario,
                        ''
                    )
                    AND
                    (
                        @IdOrdenExcluir IS NULL
                        OR A.IdOrden <> @IdOrdenExcluir
                    );
            `);

    return Number(
        resultado.recordset[0]?.CargaTurno ?? 0
    );
}

// =====================================
// VALIDAR CAPACIDAD DEL TÉCNICO
// =====================================
async function validarCapacidadTecnico(
    transaction,
    tecnico,
    fechaAgenda,
    horario,
    idOrdenExcluir = null
) {
    const cargaTurno =
        await obtenerCargaTecnico(
            transaction,
            tecnico.IdTecnico,
            fechaAgenda,
            horario,
            idOrdenExcluir
        );

    const capacidadMaxima = Number(
        tecnico.CapacidadMaxima
    );

    if (cargaTurno >= capacidadMaxima) {
        throw crearErrorNegocio(
            (
                `El técnico ${tecnico.NombreCompleto} ` +
                `ya alcanzó su capacidad máxima de ` +
                `${capacidadMaxima} orden(es) para ` +
                `la fecha y horario seleccionados.`
            ),
            409
        );
    }

    return {
        cargaTurno,
        capacidadMaxima
    };
}

// =====================================
// BUSCAR TÉCNICO PARA ASIGNACIÓN AUTOMÁTICA
// =====================================
async function buscarTecnico(
    transaction,
    orden,
    mismoDistrito
) {
    const filtroDistrito =
        mismoDistrito
            ? `
                AND LTRIM(
                    RTRIM(T.DistritoBase)
                ) = LTRIM(
                    RTRIM(@Distrito)
                )
            `
            : "";

    const resultado =
        await new sql.Request(transaction)
            .input(
                "Distrito",
                sql.VarChar(60),
                orden.Distrito
            )
            .input(
                "FechaAgenda",
                sql.Date,
                orden.FechaAgenda
            )
            .input(
                "Horario",
                sql.VarChar(20),
                orden.Horario
            )
            .query(`
                SELECT TOP 1
                    T.IdTecnico,
                    T.CodigoTecnico,
                    T.NombreCompleto,
                    T.DistritoBase,
                    T.CapacidadMaxima,
                    C.CargaTurno
                FROM dbo.Tecnicos T
                    WITH (
                        UPDLOCK,
                        HOLDLOCK
                    )
                CROSS APPLY
                (
                    SELECT
                        COUNT(*) AS CargaTurno
                    FROM dbo.Asignaciones A2
                    INNER JOIN dbo.OrdenesTrabajo OT2
                        ON OT2.IdOrden = A2.IdOrden
                    WHERE
                        A2.IdTecnico = T.IdTecnico
                        AND A2.Estado = 'ACTIVA'
                        AND OT2.EstadoAsignacion = 'ASIGNADA'
                        AND OT2.FechaAgenda = @FechaAgenda
                        AND ISNULL(
                            OT2.Horario,
                            ''
                        ) = ISNULL(
                            @Horario,
                            ''
                        )
                ) C
                WHERE
                    T.Activo = 1
                    AND T.Disponible = 1
                    ${filtroDistrito}
                    AND C.CargaTurno <
                        T.CapacidadMaxima
                ORDER BY
                    C.CargaTurno ASC,
                    T.NombreCompleto ASC;
            `);

    return resultado.recordset[0] || null;
}

// =====================================
// OPCIONES PARA ASIGNACIÓN MANUAL
// =====================================
async function obtenerOpcionesAsignacionManual() {
    const pool = await conectarDB();

    const resultadoOrdenes =
        await pool.request().query(`
            SELECT
                IdOrden,
                IdOperacion,
                CodigoOT,
                CodigoServicio,
                Cliente,
                Direccion,
                Distrito,
                FechaAgenda,
                Horario,
                EstadoOT,
                EstadoAsignacion
            FROM dbo.OrdenesTrabajo
            WHERE
                EstadoAsignacion IN
                (
                    'PENDIENTE',
                    'SIN ASIGNAR'
                )
            ORDER BY
                CASE
                    WHEN FechaAgenda IS NULL
                    THEN 1
                    ELSE 0
                END,
                FechaAgenda ASC,
                Horario ASC,
                CodigoOT ASC;
        `);

    const resultadoTecnicos =
        await pool.request().query(`
            SELECT
                IdTecnico,
                CodigoTecnico,
                NombreCompleto,
                Telefono,
                TipoTecnico,
                DistritoBase,
                CapacidadMaxima,
                Disponible,
                Activo
            FROM dbo.Tecnicos
            WHERE
                Activo = 1
                AND Disponible = 1
            ORDER BY
                NombreCompleto ASC;
        `);

    return {
        ordenes:
            resultadoOrdenes.recordset,

        tecnicos:
            resultadoTecnicos.recordset
    };
}

// =====================================
// ASIGNACIÓN MANUAL
// =====================================
async function asignarOrdenManualmente(
    idOrdenRecibido,
    idTecnicoRecibido,
    idUsuarioRecibido
) {
    const idOrden =
        validarId(idOrdenRecibido);

    const idTecnico =
        validarId(idTecnicoRecibido);

    const idUsuario =
        validarId(idUsuarioRecibido);

    if (!idOrden) {
        throw crearErrorNegocio(
            "Debe seleccionar una orden válida."
        );
    }

    if (!idTecnico) {
        throw crearErrorNegocio(
            "Debe seleccionar un técnico válido."
        );
    }

    if (!idUsuario) {
        throw crearErrorNegocio(
            "No se pudo identificar al usuario autenticado.",
            401
        );
    }

    const pool = await conectarDB();

    const transaction =
        new sql.Transaction(pool);

    let transactionIniciada = false;

    try {
        await transaction.begin(
            sql.ISOLATION_LEVEL.SERIALIZABLE
        );

        transactionIniciada = true;

        const resultadoOrden =
            await new sql.Request(transaction)
                .input(
                    "IdOrden",
                    sql.Int,
                    idOrden
                )
                .query(`
                    SELECT
                        IdOrden,
                        IdOperacion,
                        CodigoOT,
                        Cliente,
                        Distrito,
                        FechaAgenda,
                        Horario,
                        EstadoOT,
                        EstadoAsignacion
                    FROM dbo.OrdenesTrabajo
                        WITH (
                            UPDLOCK,
                            HOLDLOCK
                        )
                    WHERE
                        IdOrden = @IdOrden
                        AND EstadoAsignacion IN
                        (
                            'PENDIENTE',
                            'SIN ASIGNAR'
                        );
                `);

        if (
            resultadoOrden.recordset.length === 0
        ) {
            throw crearErrorNegocio(
                "La orden ya fue asignada o no está disponible para asignación.",
                409
            );
        }

        const orden =
            resultadoOrden.recordset[0];

        if (
            !orden.FechaAgenda ||
            !orden.Horario
        ) {
            throw crearErrorNegocio(
                "La orden debe tener fecha y horario antes de ser asignada."
            );
        }

        const tecnico =
            await obtenerTecnicoTransaccion(
                transaction,
                idTecnico
            );

        validarTecnicoDisponible(tecnico);

        const {
            cargaTurno,
            capacidadMaxima
        } = await validarCapacidadTecnico(
            transaction,
            tecnico,
            orden.FechaAgenda,
            orden.Horario
        );

        const observaciones =
            (
                `Asignación manual realizada desde SIGOT-FTTH. ` +
                `Carga del técnico antes de asignar: ` +
                `${cargaTurno}/${capacidadMaxima}.`
            );

        const resultadoAsignacion =
            await new sql.Request(transaction)
                .input(
                    "IdOrden",
                    sql.Int,
                    idOrden
                )
                .input(
                    "IdTecnico",
                    sql.Int,
                    idTecnico
                )
                .input(
                    "IdUsuario",
                    sql.Int,
                    idUsuario
                )
                .input(
                    "Observaciones",
                    sql.VarChar(500),
                    observaciones
                )
                .query(`
                    INSERT INTO dbo.Asignaciones
                    (
                        IdOrden,
                        IdTecnico,
                        FechaAsignacion,
                        TipoAsignacion,
                        Estado,
                        IdUsuario,
                        Observaciones
                    )
                    OUTPUT
                        INSERTED.IdAsignacion
                    VALUES
                    (
                        @IdOrden,
                        @IdTecnico,
                        GETDATE(),
                        'MANUAL',
                        'ACTIVA',
                        @IdUsuario,
                        @Observaciones
                    );
                `);

        const idAsignacion =
            resultadoAsignacion.recordset[0]
                .IdAsignacion;

        const resultadoActualizacion =
            await new sql.Request(transaction)
                .input(
                    "IdOrden",
                    sql.Int,
                    idOrden
                )
                .query(`
                    UPDATE dbo.OrdenesTrabajo
                    SET
                        EstadoAsignacion =
                            'ASIGNADA',
                        FechaActualizacion =
                            GETDATE()
                    WHERE
                        IdOrden = @IdOrden
                        AND EstadoAsignacion IN
                        (
                            'PENDIENTE',
                            'SIN ASIGNAR'
                        );
                `);

        if (
            resultadoActualizacion
                .rowsAffected[0] !== 1
        ) {
            throw crearErrorNegocio(
                "La orden fue modificada por otro usuario. Actualice la pantalla y vuelva a intentarlo.",
                409
            );
        }

        await sincronizarOperacion(
            transaction,
            orden.IdOperacion
        );

        await transaction.commit();

        transactionIniciada = false;

        console.log(
            (
                `OT ${orden.CodigoOT} asignada manualmente ` +
                `a ${tecnico.NombreCompleto} ` +
                `por el usuario ${idUsuario}.`
            )
        );

        return {
            idAsignacion,
            idOrden,
            codigoOT:
                orden.CodigoOT,
            idTecnico,
            tecnico:
                tecnico.NombreCompleto,
            codigoTecnico:
                tecnico.CodigoTecnico,
            cargaAnterior:
                cargaTurno,
            cargaActual:
                cargaTurno + 1,
            capacidadMaxima
        };
    } catch (error) {
        if (transactionIniciada) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error(
                    "Error al revertir la asignación manual:",
                    rollbackError.message
                );
            }
        }

        throw error;
    }
}

// =====================================
// REASIGNAR ORDEN
// =====================================
async function reasignarOrden(
    idAsignacionRecibido,
    idTecnicoNuevoRecibido,
    motivoRecibido,
    idUsuarioRecibido
) {
    const idAsignacion =
        validarId(idAsignacionRecibido);

    const idTecnicoNuevo =
        validarId(idTecnicoNuevoRecibido);

    const idUsuario =
        validarId(idUsuarioRecibido);

    if (!idAsignacion) {
        throw crearErrorNegocio(
            "La asignación seleccionada no es válida."
        );
    }

    if (!idTecnicoNuevo) {
        throw crearErrorNegocio(
            "Debe seleccionar un técnico válido."
        );
    }

    if (!idUsuario) {
        throw crearErrorNegocio(
            "No se pudo identificar al usuario autenticado.",
            401
        );
    }

    const motivo =
        validarMotivo(motivoRecibido);

    const pool = await conectarDB();

    const transaction =
        new sql.Transaction(pool);

    let transactionIniciada = false;

    try {
        await transaction.begin(
            sql.ISOLATION_LEVEL.SERIALIZABLE
        );

        transactionIniciada = true;

        const resultadoAsignacionActual =
            await new sql.Request(transaction)
                .input(
                    "IdAsignacion",
                    sql.Int,
                    idAsignacion
                )
                .query(`
                    SELECT
                        A.IdAsignacion,
                        A.IdOrden,
                        A.IdTecnico,
                        A.IdActividad,
                        A.TipoAsignacion,
                        A.Estado,
                        A.Observaciones,

                        OT.IdOperacion,
                        OT.CodigoOT,
                        OT.Cliente,
                        OT.Distrito,
                        OT.FechaAgenda,
                        OT.Horario,
                        OT.EstadoAsignacion,

                        T.CodigoTecnico
                            AS CodigoTecnicoActual,

                        T.NombreCompleto
                            AS TecnicoActual
                    FROM dbo.Asignaciones A
                        WITH (
                            UPDLOCK,
                            HOLDLOCK
                        )
                    INNER JOIN dbo.OrdenesTrabajo OT
                        ON OT.IdOrden = A.IdOrden
                    INNER JOIN dbo.Tecnicos T
                        ON T.IdTecnico = A.IdTecnico
                    WHERE
                        A.IdAsignacion = @IdAsignacion
                        AND A.Estado = 'ACTIVA';
                `);

        if (
            resultadoAsignacionActual
                .recordset.length === 0
        ) {
            throw crearErrorNegocio(
                "La asignación ya no se encuentra activa.",
                409
            );
        }

        const asignacionActual =
            resultadoAsignacionActual.recordset[0];

        if (
            Number(asignacionActual.IdTecnico) ===
            idTecnicoNuevo
        ) {
            throw crearErrorNegocio(
                "Debe seleccionar un técnico diferente al actual."
            );
        }

        if (
            !asignacionActual.FechaAgenda ||
            !asignacionActual.Horario
        ) {
            throw crearErrorNegocio(
                "La orden debe tener fecha y horario para ser reasignada."
            );
        }

        const tecnicoNuevo =
            await obtenerTecnicoTransaccion(
                transaction,
                idTecnicoNuevo
            );

        validarTecnicoDisponible(
            tecnicoNuevo
        );

        const {
            cargaTurno,
            capacidadMaxima
        } = await validarCapacidadTecnico(
            transaction,
            tecnicoNuevo,
            asignacionActual.FechaAgenda,
            asignacionActual.Horario,
            asignacionActual.IdOrden
        );

        const observacionAnterior =
            construirObservacion(
                asignacionActual.Observaciones,
                (
                    `Reasignada por el usuario ${idUsuario}. ` +
                    `Nuevo técnico: ${tecnicoNuevo.NombreCompleto}. ` +
                    `Motivo: ${motivo}`
                )
            );

        const resultadoCancelacion =
            await new sql.Request(transaction)
                .input(
                    "IdAsignacion",
                    sql.Int,
                    idAsignacion
                )
                .input(
                    "IdUsuario",
                    sql.Int,
                    idUsuario
                )
                .input(
                    "Observaciones",
                    sql.VarChar(500),
                    observacionAnterior
                )
                .query(`
                    UPDATE dbo.Asignaciones
                    SET
                        Estado = 'CANCELADA',
                        IdUsuario = @IdUsuario,
                        Observaciones = @Observaciones
                    WHERE
                        IdAsignacion = @IdAsignacion
                        AND Estado = 'ACTIVA';
                `);

        if (
            resultadoCancelacion.rowsAffected[0] !== 1
        ) {
            throw crearErrorNegocio(
                "La asignación fue modificada por otro usuario. Actualice la pantalla.",
                409
            );
        }

        const nuevaObservacion =
            construirObservacion(
                "",
                (
                    `Reasignación realizada desde SIGOT-FTTH. ` +
                    `Técnico anterior: ${asignacionActual.TecnicoActual}. ` +
                    `Motivo: ${motivo}. ` +
                    `Carga previa del nuevo técnico: ` +
                    `${cargaTurno}/${capacidadMaxima}.`
                )
            );

        const resultadoNuevaAsignacion =
            await new sql.Request(transaction)
                .input(
                    "IdOrden",
                    sql.Int,
                    asignacionActual.IdOrden
                )
                .input(
                    "IdTecnico",
                    sql.Int,
                    idTecnicoNuevo
                )
                .input(
                    "IdActividad",
                    sql.Int,
                    asignacionActual.IdActividad || null
                )
                .input(
                    "IdUsuario",
                    sql.Int,
                    idUsuario
                )
                .input(
                    "Observaciones",
                    sql.VarChar(500),
                    nuevaObservacion
                )
                .query(`
                    INSERT INTO dbo.Asignaciones
                    (
                        IdOrden,
                        IdTecnico,
                        FechaAsignacion,
                        TipoAsignacion,
                        Estado,
                        IdUsuario,
                        Observaciones,
                        IdActividad
                    )
                    OUTPUT
                        INSERTED.IdAsignacion
                    VALUES
                    (
                        @IdOrden,
                        @IdTecnico,
                        GETDATE(),
                        'REASIGNACION',
                        'ACTIVA',
                        @IdUsuario,
                        @Observaciones,
                        @IdActividad
                    );
                `);

        const idNuevaAsignacion =
            resultadoNuevaAsignacion.recordset[0]
                .IdAsignacion;

        await new sql.Request(transaction)
            .input(
                "IdOrden",
                sql.Int,
                asignacionActual.IdOrden
            )
            .query(`
                UPDATE dbo.OrdenesTrabajo
                SET
                    EstadoAsignacion =
                        'ASIGNADA',
                    FechaActualizacion =
                        GETDATE()
                WHERE
                    IdOrden = @IdOrden;
            `);

        await sincronizarOperacion(
            transaction,
            asignacionActual.IdOperacion
        );

        await transaction.commit();

        transactionIniciada = false;

        console.log(
            (
                `OT ${asignacionActual.CodigoOT} reasignada ` +
                `de ${asignacionActual.TecnicoActual} ` +
                `a ${tecnicoNuevo.NombreCompleto} ` +
                `por el usuario ${idUsuario}.`
            )
        );

        return {
            idAsignacionAnterior:
                idAsignacion,

            idNuevaAsignacion,

            idOrden:
                asignacionActual.IdOrden,

            codigoOT:
                asignacionActual.CodigoOT,

            tecnicoAnterior:
                asignacionActual.TecnicoActual,

            tecnicoNuevo:
                tecnicoNuevo.NombreCompleto,

            codigoTecnicoNuevo:
                tecnicoNuevo.CodigoTecnico,

            motivo,

            cargaAnterior:
                cargaTurno,

            cargaActual:
                cargaTurno + 1,

            capacidadMaxima
        };
    } catch (error) {
        if (transactionIniciada) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error(
                    "Error al revertir la reasignación:",
                    rollbackError.message
                );
            }
        }

        throw error;
    }
}

// =====================================
// CANCELAR ASIGNACIÓN
// =====================================
async function cancelarAsignacion(
    idAsignacionRecibido,
    motivoRecibido,
    idUsuarioRecibido
) {
    const idAsignacion =
        validarId(idAsignacionRecibido);

    const idUsuario =
        validarId(idUsuarioRecibido);

    if (!idAsignacion) {
        throw crearErrorNegocio(
            "La asignación seleccionada no es válida."
        );
    }

    if (!idUsuario) {
        throw crearErrorNegocio(
            "No se pudo identificar al usuario autenticado.",
            401
        );
    }

    const motivo =
        validarMotivo(motivoRecibido);

    const pool = await conectarDB();

    const transaction =
        new sql.Transaction(pool);

    let transactionIniciada = false;

    try {
        await transaction.begin(
            sql.ISOLATION_LEVEL.SERIALIZABLE
        );

        transactionIniciada = true;

        const resultadoAsignacion =
            await new sql.Request(transaction)
                .input(
                    "IdAsignacion",
                    sql.Int,
                    idAsignacion
                )
                .query(`
                    SELECT
                        A.IdAsignacion,
                        A.IdOrden,
                        A.IdTecnico,
                        A.Estado,
                        A.Observaciones,

                        OT.IdOperacion,
                        OT.CodigoOT,
                        OT.EstadoAsignacion,

                        T.CodigoTecnico,

                        T.NombreCompleto
                            AS Tecnico
                    FROM dbo.Asignaciones A
                        WITH (
                            UPDLOCK,
                            HOLDLOCK
                        )
                    INNER JOIN dbo.OrdenesTrabajo OT
                        ON OT.IdOrden = A.IdOrden
                    INNER JOIN dbo.Tecnicos T
                        ON T.IdTecnico = A.IdTecnico
                    WHERE
                        A.IdAsignacion = @IdAsignacion
                        AND A.Estado = 'ACTIVA';
                `);

        if (
            resultadoAsignacion.recordset.length === 0
        ) {
            throw crearErrorNegocio(
                "La asignación ya no se encuentra activa.",
                409
            );
        }

        const asignacion =
            resultadoAsignacion.recordset[0];

        const observaciones =
            construirObservacion(
                asignacion.Observaciones,
                (
                    `Asignación cancelada por el usuario ` +
                    `${idUsuario}. Motivo: ${motivo}`
                )
            );

        const resultadoCancelacion =
            await new sql.Request(transaction)
                .input(
                    "IdAsignacion",
                    sql.Int,
                    idAsignacion
                )
                .input(
                    "IdUsuario",
                    sql.Int,
                    idUsuario
                )
                .input(
                    "Observaciones",
                    sql.VarChar(500),
                    observaciones
                )
                .query(`
                    UPDATE dbo.Asignaciones
                    SET
                        Estado = 'CANCELADA',
                        IdUsuario = @IdUsuario,
                        Observaciones = @Observaciones
                    WHERE
                        IdAsignacion = @IdAsignacion
                        AND Estado = 'ACTIVA';
                `);

        if (
            resultadoCancelacion.rowsAffected[0] !== 1
        ) {
            throw crearErrorNegocio(
                "La asignación fue modificada por otro usuario. Actualice la pantalla.",
                409
            );
        }

        await new sql.Request(transaction)
            .input(
                "IdOrden",
                sql.Int,
                asignacion.IdOrden
            )
            .query(`
                UPDATE dbo.OrdenesTrabajo
                SET
                    EstadoAsignacion =
                        'PENDIENTE',
                    FechaActualizacion =
                        GETDATE()
                WHERE
                    IdOrden = @IdOrden;
            `);

        await sincronizarOperacion(
            transaction,
            asignacion.IdOperacion
        );

        await transaction.commit();

        transactionIniciada = false;

        console.log(
            (
                `Asignación ${idAsignacion} de la OT ` +
                `${asignacion.CodigoOT} cancelada ` +
                `por el usuario ${idUsuario}.`
            )
        );

        return {
            idAsignacion,

            idOrden:
                asignacion.IdOrden,

            codigoOT:
                asignacion.CodigoOT,

            tecnico:
                asignacion.Tecnico,

            motivo
        };
    } catch (error) {
        if (transactionIniciada) {
            try {
                await transaction.rollback();
            } catch (rollbackError) {
                console.error(
                    "Error al revertir la cancelación:",
                    rollbackError.message
                );
            }
        }

        throw error;
    }
}

// =====================================
// ASIGNACIÓN AUTOMÁTICA
// =====================================
async function asignarOrdenesAutomaticamente(
    idUsuarioRecibido
) {
    const idUsuario =
        validarId(idUsuarioRecibido);

    if (!idUsuario) {
        throw crearErrorNegocio(
            "El IdUsuario no es válido para realizar la asignación.",
            401
        );
    }

    const pool = await conectarDB();

    const resultadoOrdenes =
        await pool.request().query(`
            SELECT
                IdOrden,
                IdOperacion,
                CodigoOT,
                Distrito,
                FechaAgenda,
                Horario
            FROM dbo.OrdenesTrabajo
            WHERE
                EstadoAsignacion IN
                (
                    'PENDIENTE',
                    'SIN ASIGNAR'
                )
            ORDER BY
                FechaAgenda,
                Horario,
                IdOrden;
        `);

    let totalAsignadas = 0;
    let totalSinTecnico = 0;
    let totalSinAgenda = 0;

    const errores = [];

    for (
        const ordenPendiente
        of resultadoOrdenes.recordset
    ) {
        if (
            !ordenPendiente.FechaAgenda ||
            !ordenPendiente.Horario
        ) {
            totalSinAgenda++;
            continue;
        }

        const transaction =
            new sql.Transaction(pool);

        let transactionIniciada =
            false;

        try {
            await transaction.begin(
                sql.ISOLATION_LEVEL.SERIALIZABLE
            );

            transactionIniciada =
                true;

            const validacionOrden =
                await new sql.Request(transaction)
                    .input(
                        "IdOrden",
                        sql.Int,
                        ordenPendiente.IdOrden
                    )
                    .query(`
                        SELECT
                            IdOrden,
                            IdOperacion,
                            CodigoOT,
                            Distrito,
                            FechaAgenda,
                            Horario
                        FROM dbo.OrdenesTrabajo
                            WITH (
                                UPDLOCK,
                                HOLDLOCK
                            )
                        WHERE
                            IdOrden = @IdOrden
                            AND EstadoAsignacion IN
                            (
                                'PENDIENTE',
                                'SIN ASIGNAR'
                            );
                    `);

            if (
                validacionOrden
                    .recordset
                    .length === 0
            ) {
                await transaction.rollback();

                transactionIniciada =
                    false;

                continue;
            }

            const orden =
                validacionOrden.recordset[0];

            let tecnico =
                await buscarTecnico(
                    transaction,
                    orden,
                    true
                );

            if (!tecnico) {
                tecnico =
                    await buscarTecnico(
                        transaction,
                        orden,
                        false
                    );
            }

            if (!tecnico) {
                await transaction.rollback();

                transactionIniciada =
                    false;

                totalSinTecnico++;

                continue;
            }

            await new sql.Request(transaction)
                .input(
                    "IdOrden",
                    sql.Int,
                    orden.IdOrden
                )
                .input(
                    "IdTecnico",
                    sql.Int,
                    tecnico.IdTecnico
                )
                .input(
                    "IdUsuario",
                    sql.Int,
                    idUsuario
                )
                .query(`
                    INSERT INTO dbo.Asignaciones
                    (
                        IdOrden,
                        IdTecnico,
                        FechaAsignacion,
                        TipoAsignacion,
                        Estado,
                        IdUsuario,
                        Observaciones
                    )
                    VALUES
                    (
                        @IdOrden,
                        @IdTecnico,
                        GETDATE(),
                        'AUTOMATICA',
                        'ACTIVA',
                        @IdUsuario,
                        'Asignación automática SIGOT-FTTH'
                    );
                `);

            const resultadoActualizacion =
                await new sql.Request(transaction)
                    .input(
                        "IdOrden",
                        sql.Int,
                        orden.IdOrden
                    )
                    .query(`
                        UPDATE dbo.OrdenesTrabajo
                        SET
                            EstadoAsignacion =
                                'ASIGNADA',
                            FechaActualizacion =
                                GETDATE()
                        WHERE
                            IdOrden = @IdOrden
                            AND EstadoAsignacion IN
                            (
                                'PENDIENTE',
                                'SIN ASIGNAR'
                            );
                    `);

            if (
                resultadoActualizacion
                    .rowsAffected[0] !== 1
            ) {
                throw crearErrorNegocio(
                    "La orden fue modificada por otro usuario.",
                    409
                );
            }

            await sincronizarOperacion(
                transaction,
                orden.IdOperacion
            );

            await transaction.commit();

            transactionIniciada =
                false;

            totalAsignadas++;

            const fechaAgenda =
                orden.FechaAgenda instanceof Date
                    ? orden.FechaAgenda
                        .toISOString()
                        .slice(0, 10)
                    : orden.FechaAgenda;

            console.log(
                (
                    `OT ${orden.CodigoOT} asignada a ` +
                    `${tecnico.NombreCompleto} ` +
                    `(${fechaAgenda} - ${orden.Horario}) ` +
                    `por el usuario ${idUsuario}.`
                )
            );
        } catch (error) {
            if (transactionIniciada) {
                try {
                    await transaction.rollback();
                } catch (rollbackError) {
                    console.error(
                        "Error al revertir la transacción:",
                        rollbackError.message
                    );
                }
            }

            console.error(
                (
                    `Error asignando OT ` +
                    `${ordenPendiente.CodigoOT}:`
                ),
                error
            );

            errores.push({
                codigoOT:
                    ordenPendiente.CodigoOT,

                mensaje:
                    error.message
            });
        }
    }

    return {
        total:
            totalAsignadas,

        sinTecnico:
            totalSinTecnico,

        sinAgenda:
            totalSinAgenda,

        errores
    };
}

// =====================================
// LISTAR ASIGNACIONES
// =====================================
async function obtenerAsignaciones() {
    const pool = await conectarDB();

    const resultado =
        await pool.request().query(`
            SELECT
                A.IdAsignacion,
                A.IdOrden,
                A.IdTecnico,
                A.IdActividad,
                A.IdUsuario,
                A.FechaAsignacion,
                A.TipoAsignacion,

                A.Estado
                    AS EstadoAsignacion,

                A.Observaciones,

                OT.CodigoOT,
                OT.Cliente,
                OT.Direccion,
                OT.Distrito,
                OT.FechaAgenda,
                OT.Horario,
                OT.EstadoOT,

                OT.EstadoAsignacion
                    AS EstadoInternoOT,

                T.CodigoTecnico,

                T.NombreCompleto
                    AS Tecnico,

                T.Telefono
                    AS TelefonoTecnico,

                T.TipoTecnico,
                T.DistritoBase,
                T.Disponible,
                T.Activo,

                ACT.IdActividadOFSC,
                ACT.EstadoActividad,
                ACT.TipoCierre,
                ACT.ResultadoNoRealizado,

                U.NombreCompleto
                    AS UsuarioResponsable,

                U.Usuario
                    AS NombreUsuarioResponsable,

                R.Nombre
                    AS RolResponsable

            FROM dbo.Asignaciones A

            INNER JOIN dbo.OrdenesTrabajo OT
                ON OT.IdOrden = A.IdOrden

            INNER JOIN dbo.Tecnicos T
                ON T.IdTecnico = A.IdTecnico

            LEFT JOIN dbo.ActividadesOFSC ACT
                ON ACT.IdActividad = A.IdActividad

            LEFT JOIN dbo.Usuarios U
                ON U.IdUsuario = A.IdUsuario

            LEFT JOIN dbo.Roles R
                ON R.IdRol = U.IdRol

            ORDER BY
                A.FechaAsignacion DESC,
                A.IdAsignacion DESC;
        `);

    return resultado.recordset;
}

module.exports = {
    obtenerAsignaciones,
    obtenerOpcionesAsignacionManual,
    asignarOrdenManualmente,
    reasignarOrden,
    cancelarAsignacion,
    asignarOrdenesAutomaticamente
};