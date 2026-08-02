const {
    conectarDB,
    sql
} = require("../config/database");

const {
    sincronizarOperacion
} = require("./operacionService");

/**
 * Busca un técnico disponible considerando
 * la carga de la misma fecha y horario de la orden.
 */
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
                        ON OT2.IdOrden =
                            A2.IdOrden

                    WHERE
                        A2.IdTecnico =
                            T.IdTecnico

                        AND A2.Estado =
                            'ACTIVA'

                        AND OT2.EstadoAsignacion =
                            'ASIGNADA'

                        AND OT2.FechaAgenda =
                            @FechaAgenda

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

/**
 * Asigna automáticamente las órdenes que
 * todavía se encuentran pendientes de asignación.
 *
 * El usuario responsable se obtiene del JWT
 * y se recibe desde el controlador.
 */
async function asignarOrdenesAutomaticamente(
    idUsuario
) {
    if (
        !Number.isInteger(idUsuario) ||
        idUsuario <= 0
    ) {
        throw new Error(
            "El IdUsuario no es válido para realizar la asignación."
        );
    }

    const pool =
        await conectarDB();

    /*
     * Buscar órdenes pendientes de asignación.
     *
     * Se aceptan ambos estados para mantener
     * compatibilidad con registros anteriores:
     * - PENDIENTE
     * - SIN ASIGNAR
     */
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
        /*
         * Una orden sin fecha o sin horario
         * no debe asignarse automáticamente.
         */
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

            /*
             * Volver a revisar y bloquear la orden.
             * Evita que dos procesos asignen la
             * misma OT al mismo tiempo.
             */
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
                            IdOrden =
                                @IdOrden

                            AND EstadoAsignacion IN
                            (
                                'PENDIENTE',
                                'SIN ASIGNAR'
                            );
                    `);

            /*
             * La orden pudo haber sido asignada
             * por otro proceso durante el ciclo.
             */
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

            /*
             * Primera prioridad:
             * técnico del mismo distrito.
             */
            let tecnico =
                await buscarTecnico(
                    transaction,
                    orden,
                    true
                );

            /*
             * Segunda prioridad:
             * cualquier técnico disponible con
             * menor carga en el mismo turno.
             */
            if (!tecnico) {
                tecnico =
                    await buscarTecnico(
                        transaction,
                        orden,
                        false
                    );
            }

            /*
             * Si no existe capacidad disponible,
             * la orden permanece pendiente.
             */
            if (!tecnico) {
                await transaction.rollback();

                transactionIniciada =
                    false;

                totalSinTecnico++;

                continue;
            }

            /*
             * Registrar la asignación utilizando
             * el usuario autenticado.
             */
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

            /*
             * Actualizar el estado de asignación
             * de la orden.
             */
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
                        IdOrden =
                            @IdOrden

                        AND EstadoAsignacion IN
                        (
                            'PENDIENTE',
                            'SIN ASIGNAR'
                        );
                `);

            /*
             * Actualizar los indicadores
             * de la operación.
             */
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
                `OT ${orden.CodigoOT} asignada a ` +
                `${tecnico.NombreCompleto} ` +
                `(${fechaAgenda} - ${orden.Horario}) ` +
                `por el usuario ${idUsuario}`
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
                `Error asignando OT ${ordenPendiente.CodigoOT}:`,
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

/**
 * Obtiene todas las asignaciones registradas.
 *
 * Incluye:
 * - Información de la asignación.
 * - Datos principales de la OT.
 * - Técnico asignado.
 * - Actividad OFSC relacionada.
 * - Usuario responsable.
 * - Rol del usuario responsable.
 */
async function obtenerAsignaciones() {
    const pool =
        await conectarDB();

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
                ON OT.IdOrden =
                    A.IdOrden

            INNER JOIN dbo.Tecnicos T
                ON T.IdTecnico =
                    A.IdTecnico

            LEFT JOIN dbo.ActividadesOFSC ACT
                ON ACT.IdActividad =
                    A.IdActividad

            LEFT JOIN dbo.Usuarios U
                ON U.IdUsuario =
                    A.IdUsuario

            LEFT JOIN dbo.Roles R
                ON R.IdRol =
                    U.IdRol

            ORDER BY
                A.FechaAsignacion DESC,
                A.IdAsignacion DESC;
        `);

    return resultado.recordset;
}

module.exports = {
    obtenerAsignaciones,
    asignarOrdenesAutomaticamente
};