/*
=========================================================
SIGOT-FTTH
06_importador_ofsc_v2.sql

Instala el esquema requerido por el importador OFSC V2:
- Contadores V2 en dbo.Operaciones.
- Detalle por fila importada.
- Historial detallado de cambios OFSC.
- TSS inicial por orden programable.

Ejecutar conectado a la base de datos objetivo con
SSMS, Azure Data Studio o sqlcmd (el archivo usa GO).
El script es idempotente y no elimina datos existentes.
=========================================================
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

BEGIN TRY
    BEGIN TRANSACTION;

    /*
        Validar las tablas base antes de modificar
        el esquema.
    */
    IF OBJECT_ID('dbo.Operaciones', 'U') IS NULL
        THROW 50001, 'No existe dbo.Operaciones en la base de datos objetivo.', 1;

    IF OBJECT_ID('dbo.OrdenesTrabajo', 'U') IS NULL
        THROW 50002, 'No existe dbo.OrdenesTrabajo en la base de datos objetivo.', 1;

    IF OBJECT_ID('dbo.Usuarios', 'U') IS NULL
        THROW 50003, 'No existe dbo.Usuarios en la base de datos objetivo.', 1;

    IF OBJECT_ID('dbo.Tecnicos', 'U') IS NULL
        THROW 50004, 'No existe dbo.Tecnicos en la base de datos objetivo.', 1;

    IF OBJECT_ID('dbo.NAPs', 'U') IS NULL
        THROW 50005, 'No existe dbo.NAPs en la base de datos objetivo.', 1;

    IF OBJECT_ID('dbo.ActividadesOFSC', 'U') IS NULL
        THROW 50006, 'No existe dbo.ActividadesOFSC en la base de datos objetivo.', 1;

    IF OBJECT_ID('dbo.Asignaciones', 'U') IS NULL
        THROW 50007, 'No existe dbo.Asignaciones en la base de datos objetivo.', 1;

    IF OBJECT_ID('dbo.HistorialEstadosOT', 'U') IS NULL
        THROW 50008, 'No existe dbo.HistorialEstadosOT en la base de datos objetivo.', 1;

    IF OBJECT_ID('dbo.HistorialAsignaciones', 'U') IS NULL
        THROW 50009, 'No existe dbo.HistorialAsignaciones. Ejecute primero database/05_historial_asignaciones.sql.', 1;

    /*
    =====================================================
    ÍNDICES ÚNICOS QUE PROTEGEN EL IMPORTADOR
    =====================================================
    */
    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE
            name = 'UX_OrdenesTrabajo_CodigoOT'
            AND object_id =
                OBJECT_ID('dbo.OrdenesTrabajo')
    )
    BEGIN
        IF EXISTS (
            SELECT OT.CodigoOT
            FROM dbo.OrdenesTrabajo OT
            GROUP BY OT.CodigoOT
            HAVING COUNT(*) > 1
        )
            THROW 50010, 'No se puede crear UX_OrdenesTrabajo_CodigoOT: existen códigos OT duplicados.', 1;

        CREATE UNIQUE NONCLUSTERED INDEX
            UX_OrdenesTrabajo_CodigoOT
        ON dbo.OrdenesTrabajo
        (
            CodigoOT ASC
        );
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes I
        INNER JOIN sys.index_columns IC
            ON IC.object_id = I.object_id
            AND IC.index_id = I.index_id
            AND IC.key_ordinal = 1
        INNER JOIN sys.columns C
            ON C.object_id = IC.object_id
            AND C.column_id = IC.column_id
        WHERE
            I.object_id =
                OBJECT_ID('dbo.OrdenesTrabajo')
            AND I.name =
                'UX_OrdenesTrabajo_CodigoOT'
            AND I.is_disabled = 0
            AND I.is_unique = 1
            AND I.has_filter = 0
            AND C.name = 'CodigoOT'
            AND NOT EXISTS (
                SELECT 1
                FROM sys.index_columns OTRA
                WHERE
                    OTRA.object_id = I.object_id
                    AND OTRA.index_id = I.index_id
                    AND OTRA.key_ordinal > 1
            )
    )
        THROW 50013, 'UX_OrdenesTrabajo_CodigoOT no tiene la definición esperada.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE
            name =
                'UQ_ActividadesOFSC_IdActividadOFSC'
            AND object_id =
                OBJECT_ID('dbo.ActividadesOFSC')
    )
    BEGIN
        IF EXISTS (
            SELECT A.IdActividadOFSC
            FROM dbo.ActividadesOFSC A
            GROUP BY A.IdActividadOFSC
            HAVING COUNT(*) > 1
        )
            THROW 50011, 'No se puede crear UQ_ActividadesOFSC_IdActividadOFSC: existen IDs OFSC duplicados.', 1;

        ALTER TABLE dbo.ActividadesOFSC
        ADD CONSTRAINT
            UQ_ActividadesOFSC_IdActividadOFSC
        UNIQUE NONCLUSTERED
        (
            IdActividadOFSC ASC
        );
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.key_constraints KC
        INNER JOIN sys.indexes I
            ON I.object_id = KC.parent_object_id
            AND I.index_id = KC.unique_index_id
        INNER JOIN sys.index_columns IC
            ON IC.object_id = I.object_id
            AND IC.index_id = I.index_id
            AND IC.key_ordinal = 1
        INNER JOIN sys.columns C
            ON C.object_id = IC.object_id
            AND C.column_id = IC.column_id
        WHERE
            KC.parent_object_id =
                OBJECT_ID('dbo.ActividadesOFSC')
            AND KC.name =
                'UQ_ActividadesOFSC_IdActividadOFSC'
            AND KC.type = 'UQ'
            AND I.is_disabled = 0
            AND C.name = 'IdActividadOFSC'
            AND NOT EXISTS (
                SELECT 1
                FROM sys.index_columns OTRA
                WHERE
                    OTRA.object_id = I.object_id
                    AND OTRA.index_id = I.index_id
                    AND OTRA.key_ordinal > 1
            )
    )
        THROW 50014, 'UQ_ActividadesOFSC_IdActividadOFSC no tiene la definición esperada.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE
            name = 'UX_Asignaciones_OrdenActiva'
            AND object_id =
                OBJECT_ID('dbo.Asignaciones')
    )
    BEGIN
        IF EXISTS (
            SELECT A.IdOrden
            FROM dbo.Asignaciones A
            WHERE A.Estado = 'ACTIVA'
            GROUP BY A.IdOrden
            HAVING COUNT(*) > 1
        )
            THROW 50012, 'No se puede crear UX_Asignaciones_OrdenActiva: existen órdenes con más de una asignación activa.', 1;

        CREATE UNIQUE NONCLUSTERED INDEX
            UX_Asignaciones_OrdenActiva
        ON dbo.Asignaciones
        (
            IdOrden ASC
        )
        WHERE Estado = 'ACTIVA';
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes I
        INNER JOIN sys.index_columns IC
            ON IC.object_id = I.object_id
            AND IC.index_id = I.index_id
            AND IC.key_ordinal = 1
        INNER JOIN sys.columns C
            ON C.object_id = IC.object_id
            AND C.column_id = IC.column_id
        WHERE
            I.object_id =
                OBJECT_ID('dbo.Asignaciones')
            AND I.name =
                'UX_Asignaciones_OrdenActiva'
            AND I.is_disabled = 0
            AND I.is_unique = 1
            AND I.has_filter = 1
            AND REPLACE(
                ISNULL(I.filter_definition, ''),
                ' ',
                ''
            ) = '([Estado]=''ACTIVA'')'
            AND C.name = 'IdOrden'
            AND NOT EXISTS (
                SELECT 1
                FROM sys.index_columns OTRA
                WHERE
                    OTRA.object_id = I.object_id
                    AND OTRA.index_id = I.index_id
                    AND OTRA.key_ordinal > 1
            )
    )
        THROW 50015, 'UX_Asignaciones_OrdenActiva no tiene la definición esperada.', 1;

    /*
    =====================================================
    CONTADORES V2 EN OPERACIONES
    =====================================================
    */
    IF COL_LENGTH(
        'dbo.Operaciones',
        'CantidadNuevas'
    ) IS NULL
    BEGIN
        ALTER TABLE dbo.Operaciones
        ADD CantidadNuevas INT NOT NULL
            CONSTRAINT DF_Operaciones_CantidadNuevas
            DEFAULT ((0)) WITH VALUES;
    END;

    IF COL_LENGTH(
        'dbo.Operaciones',
        'CantidadActualizadas'
    ) IS NULL
    BEGIN
        ALTER TABLE dbo.Operaciones
        ADD CantidadActualizadas INT NOT NULL
            CONSTRAINT DF_Operaciones_CantidadActualizadas
            DEFAULT ((0)) WITH VALUES;
    END;

    IF COL_LENGTH(
        'dbo.Operaciones',
        'CantidadSinCambios'
    ) IS NULL
    BEGIN
        ALTER TABLE dbo.Operaciones
        ADD CantidadSinCambios INT NOT NULL
            CONSTRAINT DF_Operaciones_CantidadSinCambios
            DEFAULT ((0)) WITH VALUES;
    END;

    IF COL_LENGTH(
        'dbo.Operaciones',
        'CantidadErrores'
    ) IS NULL
    BEGIN
        ALTER TABLE dbo.Operaciones
        ADD CantidadErrores INT NOT NULL
            CONSTRAINT DF_Operaciones_CantidadErrores
            DEFAULT ((0)) WITH VALUES;
    END;

    /*
    =====================================================
    DETALLE DE IMPORTACION OFSC
    =====================================================
    */
    IF OBJECT_ID(
        'dbo.DetalleImportacionOFSC',
        'U'
    ) IS NULL
    BEGIN
        CREATE TABLE dbo.DetalleImportacionOFSC
        (
            IdDetalleImportacion
                INT IDENTITY(1,1) NOT NULL,

            IdOperacion
                INT NOT NULL,

            IdOrden
                INT NULL,

            CodigoOT
                VARCHAR(30) NULL,

            Resultado
                VARCHAR(20) NOT NULL,

            Mensaje
                VARCHAR(500) NULL,

            FechaRegistro
                DATETIME2(0) NOT NULL
                CONSTRAINT DF_DetalleImportacionOFSC_FechaRegistro
                DEFAULT (SYSDATETIME()),

            CONSTRAINT PK_DetalleImportacionOFSC
                PRIMARY KEY CLUSTERED (
                    IdDetalleImportacion
                )
        );
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE
            name = 'FK_DetalleImportacionOFSC_Operacion'
            AND parent_object_id =
                OBJECT_ID('dbo.DetalleImportacionOFSC')
    )
    BEGIN
        ALTER TABLE dbo.DetalleImportacionOFSC
        WITH CHECK ADD CONSTRAINT
            FK_DetalleImportacionOFSC_Operacion
        FOREIGN KEY (IdOperacion)
        REFERENCES dbo.Operaciones (IdOperacion);
    END;

    ALTER TABLE dbo.DetalleImportacionOFSC
    WITH CHECK CHECK CONSTRAINT
        FK_DetalleImportacionOFSC_Operacion;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE
            name = 'FK_DetalleImportacionOFSC_Orden'
            AND parent_object_id =
                OBJECT_ID('dbo.DetalleImportacionOFSC')
    )
    BEGIN
        ALTER TABLE dbo.DetalleImportacionOFSC
        WITH CHECK ADD CONSTRAINT
            FK_DetalleImportacionOFSC_Orden
        FOREIGN KEY (IdOrden)
        REFERENCES dbo.OrdenesTrabajo (IdOrden);
    END;

    ALTER TABLE dbo.DetalleImportacionOFSC
    WITH CHECK CHECK CONSTRAINT
        FK_DetalleImportacionOFSC_Orden;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE
            name = 'CK_DetalleImportacionOFSC_Resultado'
            AND parent_object_id =
                OBJECT_ID('dbo.DetalleImportacionOFSC')
    )
    BEGIN
        ALTER TABLE dbo.DetalleImportacionOFSC
        WITH CHECK ADD CONSTRAINT
            CK_DetalleImportacionOFSC_Resultado
        CHECK (
            Resultado IN (
                'NUEVA',
                'ACTUALIZADA',
                'SIN_CAMBIOS',
                'ERROR'
            )
        );
    END;

    ALTER TABLE dbo.DetalleImportacionOFSC
    WITH CHECK CHECK CONSTRAINT
        CK_DetalleImportacionOFSC_Resultado;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE
            name = 'IX_DetalleImportacionOFSC_IdOperacion'
            AND object_id =
                OBJECT_ID('dbo.DetalleImportacionOFSC')
    )
    BEGIN
        CREATE NONCLUSTERED INDEX
            IX_DetalleImportacionOFSC_IdOperacion
        ON dbo.DetalleImportacionOFSC
        (
            IdOperacion ASC,
            Resultado ASC
        );
    END;

    /*
    =====================================================
    HISTORIAL DE CAMBIOS OFSC
    =====================================================
    */
    IF OBJECT_ID(
        'dbo.HistorialCambiosOFSC',
        'U'
    ) IS NULL
    BEGIN
        CREATE TABLE dbo.HistorialCambiosOFSC
        (
            IdCambio
                INT IDENTITY(1,1) NOT NULL,

            IdOrden
                INT NOT NULL,

            IdOperacion
                INT NOT NULL,

            Campo
                VARCHAR(100) NOT NULL,

            ValorAnterior
                VARCHAR(1000) NULL,

            ValorNuevo
                VARCHAR(1000) NULL,

            FechaCambio
                DATETIME2(0) NOT NULL
                CONSTRAINT DF_HistorialCambiosOFSC_FechaCambio
                DEFAULT (SYSDATETIME()),

            CONSTRAINT PK_HistorialCambiosOFSC
                PRIMARY KEY CLUSTERED (
                    IdCambio
                )
        );
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE
            name = 'FK_HistorialCambiosOFSC_Orden'
            AND parent_object_id =
                OBJECT_ID('dbo.HistorialCambiosOFSC')
    )
    BEGIN
        ALTER TABLE dbo.HistorialCambiosOFSC
        WITH CHECK ADD CONSTRAINT
            FK_HistorialCambiosOFSC_Orden
        FOREIGN KEY (IdOrden)
        REFERENCES dbo.OrdenesTrabajo (IdOrden);
    END;

    ALTER TABLE dbo.HistorialCambiosOFSC
    WITH CHECK CHECK CONSTRAINT
        FK_HistorialCambiosOFSC_Orden;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE
            name = 'FK_HistorialCambiosOFSC_Operacion'
            AND parent_object_id =
                OBJECT_ID('dbo.HistorialCambiosOFSC')
    )
    BEGIN
        ALTER TABLE dbo.HistorialCambiosOFSC
        WITH CHECK ADD CONSTRAINT
            FK_HistorialCambiosOFSC_Operacion
        FOREIGN KEY (IdOperacion)
        REFERENCES dbo.Operaciones (IdOperacion);
    END;

    ALTER TABLE dbo.HistorialCambiosOFSC
    WITH CHECK CHECK CONSTRAINT
        FK_HistorialCambiosOFSC_Operacion;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE
            name = 'IX_HistorialCambiosOFSC_IdOrden'
            AND object_id =
                OBJECT_ID('dbo.HistorialCambiosOFSC')
    )
    BEGIN
        CREATE NONCLUSTERED INDEX
            IX_HistorialCambiosOFSC_IdOrden
        ON dbo.HistorialCambiosOFSC
        (
            IdOrden ASC,
            FechaCambio DESC
        );
    END;

    /*
    =====================================================
    TSS
    =====================================================
    */
    IF OBJECT_ID('dbo.TSS', 'U') IS NULL
    BEGIN
        CREATE TABLE dbo.TSS
        (
            IdTSS
                INT IDENTITY(1,1) NOT NULL,

            IdOrden
                INT NOT NULL,

            IdTecnico
                INT NULL,

            FechaAgenda
                DATE NULL,

            Turno
                VARCHAR(15) NULL,

            EstadoTSS
                VARCHAR(30) NOT NULL
                CONSTRAINT DF_TSS_EstadoTSS
                DEFAULT ('PENDIENTE_PROGRAMACION'),

            IdNAP
                INT NULL,

            PuertoNAP
                VARCHAR(30) NULL,

            CoordenadasNAP
                VARCHAR(100) NULL,

            RFS
                VARCHAR(100) NULL,

            Observaciones
                VARCHAR(1000) NULL,

            ContinuidadInstalacion
                VARCHAR(30) NULL,

            FormularioEnviado
                BIT NOT NULL
                CONSTRAINT DF_TSS_FormularioEnviado
                DEFAULT ((0)),

            FechaEnvioFormulario
                DATETIME2(0) NULL,

            IdUsuarioFormulario
                INT NULL,

            FechaCreacion
                DATETIME2(0) NOT NULL
                CONSTRAINT DF_TSS_FechaCreacion
                DEFAULT (SYSDATETIME()),

            FechaActualizacion
                DATETIME2(0) NOT NULL
                CONSTRAINT DF_TSS_FechaActualizacion
                DEFAULT (SYSDATETIME()),

            IdUsuarioRegistro
                INT NULL,

            CONSTRAINT PK_TSS
                PRIMARY KEY CLUSTERED (
                    IdTSS
                ),

            CONSTRAINT UQ_TSS_IdOrden
                UNIQUE NONCLUSTERED (
                    IdOrden
                )
        );
    END;

    /*
        Una OT solo puede tener un TSS. La guarda
        independiente también corrige instalaciones
        donde dbo.TSS ya existía sin esta restricción.
    */
    IF NOT EXISTS (
        SELECT 1
        FROM sys.key_constraints
        WHERE
            name = 'UQ_TSS_IdOrden'
            AND parent_object_id =
                OBJECT_ID('dbo.TSS')
            AND type = 'UQ'
    )
    BEGIN
        ALTER TABLE dbo.TSS
        ADD CONSTRAINT UQ_TSS_IdOrden
        UNIQUE NONCLUSTERED (IdOrden);
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE
            name = 'FK_TSS_Orden'
            AND parent_object_id =
                OBJECT_ID('dbo.TSS')
    )
    BEGIN
        ALTER TABLE dbo.TSS
        WITH CHECK ADD CONSTRAINT FK_TSS_Orden
        FOREIGN KEY (IdOrden)
        REFERENCES dbo.OrdenesTrabajo (IdOrden);
    END;

    ALTER TABLE dbo.TSS
    WITH CHECK CHECK CONSTRAINT FK_TSS_Orden;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE
            name = 'FK_TSS_Tecnico'
            AND parent_object_id =
                OBJECT_ID('dbo.TSS')
    )
    BEGIN
        ALTER TABLE dbo.TSS
        WITH CHECK ADD CONSTRAINT FK_TSS_Tecnico
        FOREIGN KEY (IdTecnico)
        REFERENCES dbo.Tecnicos (IdTecnico);
    END;

    ALTER TABLE dbo.TSS
    WITH CHECK CHECK CONSTRAINT FK_TSS_Tecnico;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE
            name = 'FK_TSS_NAP'
            AND parent_object_id =
                OBJECT_ID('dbo.TSS')
    )
    BEGIN
        ALTER TABLE dbo.TSS
        WITH CHECK ADD CONSTRAINT FK_TSS_NAP
        FOREIGN KEY (IdNAP)
        REFERENCES dbo.NAPs (IdNAP);
    END;

    ALTER TABLE dbo.TSS
    WITH CHECK CHECK CONSTRAINT FK_TSS_NAP;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE
            name = 'FK_TSS_UsuarioFormulario'
            AND parent_object_id =
                OBJECT_ID('dbo.TSS')
    )
    BEGIN
        ALTER TABLE dbo.TSS
        WITH CHECK ADD CONSTRAINT
            FK_TSS_UsuarioFormulario
        FOREIGN KEY (IdUsuarioFormulario)
        REFERENCES dbo.Usuarios (IdUsuario);
    END;

    ALTER TABLE dbo.TSS
    WITH CHECK CHECK CONSTRAINT
        FK_TSS_UsuarioFormulario;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE
            name = 'FK_TSS_UsuarioRegistro'
            AND parent_object_id =
                OBJECT_ID('dbo.TSS')
    )
    BEGIN
        ALTER TABLE dbo.TSS
        WITH CHECK ADD CONSTRAINT
            FK_TSS_UsuarioRegistro
        FOREIGN KEY (IdUsuarioRegistro)
        REFERENCES dbo.Usuarios (IdUsuario);
    END;

    ALTER TABLE dbo.TSS
    WITH CHECK CHECK CONSTRAINT
        FK_TSS_UsuarioRegistro;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE
            name = 'CK_TSS_Turno'
            AND parent_object_id =
                OBJECT_ID('dbo.TSS')
    )
    BEGIN
        ALTER TABLE dbo.TSS
        WITH CHECK ADD CONSTRAINT CK_TSS_Turno
        CHECK (
            Turno IS NULL
            OR Turno IN (
                'AM',
                'PM',
                'NOCTURNO'
            )
        );
    END;

    ALTER TABLE dbo.TSS
    WITH CHECK CHECK CONSTRAINT CK_TSS_Turno;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE
            name = 'CK_TSS_Estado'
            AND parent_object_id =
                OBJECT_ID('dbo.TSS')
    )
    BEGIN
        ALTER TABLE dbo.TSS
        WITH CHECK ADD CONSTRAINT CK_TSS_Estado
        CHECK (
            EstadoTSS IN (
                'PENDIENTE_PROGRAMACION',
                'PROGRAMADO',
                'EN_EJECUCION',
                'FACTIBLE',
                'PDT_LPU',
                'NO_CONCLUIDO',
                'FALLIDO_CAMPO',
                'FALLIDO_ESCRITORIO',
                'REPROGRAMAR'
            )
        );
    END;

    ALTER TABLE dbo.TSS
    WITH CHECK CHECK CONSTRAINT CK_TSS_Estado;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE
            name = 'CK_TSS_Continuidad'
            AND parent_object_id =
                OBJECT_ID('dbo.TSS')
    )
    BEGIN
        ALTER TABLE dbo.TSS
        WITH CHECK ADD CONSTRAINT
            CK_TSS_Continuidad
        CHECK (
            ContinuidadInstalacion IS NULL
            OR ContinuidadInstalacion IN (
                'INSTALACION_MOMENTO',
                'PENDIENTE_ENTEL',
                'POR_DEFINIR'
            )
        );
    END;

    ALTER TABLE dbo.TSS
    WITH CHECK CHECK CONSTRAINT
        CK_TSS_Continuidad;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE
            name = 'IX_TSS_FechaAgenda_Turno'
            AND object_id = OBJECT_ID('dbo.TSS')
    )
    BEGIN
        CREATE NONCLUSTERED INDEX
            IX_TSS_FechaAgenda_Turno
        ON dbo.TSS
        (
            FechaAgenda ASC,
            Turno ASC,
            IdTecnico ASC
        );
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE
            name = 'IX_TSS_Estado'
            AND object_id = OBJECT_ID('dbo.TSS')
    )
    BEGIN
        CREATE NONCLUSTERED INDEX IX_TSS_Estado
        ON dbo.TSS (EstadoTSS ASC);
    END;

    /*
    =====================================================
    ÍNDICES PARA TRAZABILIDAD Y BÚSQUEDA DE ASIGNACIONES
    =====================================================
    */
    IF OBJECT_ID(
        'dbo.HistorialAsignaciones',
        'U'
    ) IS NOT NULL
       AND NOT EXISTS (
            SELECT 1
            FROM sys.indexes
            WHERE
                name =
                    'IX_HistorialAsignaciones_IdAsignacion'
                AND object_id =
                    OBJECT_ID(
                        'dbo.HistorialAsignaciones'
                    )
       )
    BEGIN
        CREATE NONCLUSTERED INDEX
            IX_HistorialAsignaciones_IdAsignacion
        ON dbo.HistorialAsignaciones
        (
            IdAsignacion ASC
        );
    END;

    IF OBJECT_ID(
        'dbo.Asignaciones',
        'U'
    ) IS NOT NULL
       AND NOT EXISTS (
            SELECT 1
            FROM sys.indexes
            WHERE
                name =
                    'IX_Asignaciones_IdOrden_FechaAsignacion'
                AND object_id =
                    OBJECT_ID(
                        'dbo.Asignaciones'
                    )
       )
    BEGIN
        CREATE NONCLUSTERED INDEX
            IX_Asignaciones_IdOrden_FechaAsignacion
        ON dbo.Asignaciones
        (
            IdOrden ASC,
            FechaAsignacion DESC,
            IdAsignacion DESC
        )
        INCLUDE
        (
            Estado,
            IdActividad,
            IdTecnico
        );
    END;

    COMMIT TRANSACTION;

    PRINT 'Esquema del importador OFSC V2 instalado correctamente.';
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
GO
