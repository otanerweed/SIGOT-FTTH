/*
=========================================================
SIGOT-FTTH
07_tss_operativo.sql

Instala el esquema operativo complementario de TSS:
- Historial de estados.
- Catálogo y registro de evidencias.
- Documentos preliminares y finales.
- Validaciones TCE/NAP.
- Disponibilidad y agenda de técnicos.

Requiere database/06_importador_ofsc_v2.sql.
Ejecutar conectado a la base de datos objetivo con
SSMS, Azure Data Studio o sqlcmd (el archivo usa GO).
El script es idempotente, transaccional y no elimina
datos existentes.
=========================================================
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;
GO

BEGIN TRY
    BEGIN TRANSACTION;

    /*
    =====================================================
    PRERREQUISITOS
    =====================================================
    */
    IF OBJECT_ID('dbo.TSS', 'U') IS NULL
        THROW 50701, 'No existe dbo.TSS. Ejecute primero database/06_importador_ofsc_v2.sql.', 1;

    IF OBJECT_ID('dbo.Usuarios', 'U') IS NULL
        THROW 50702, 'No existe dbo.Usuarios en la base de datos objetivo.', 1;

    IF OBJECT_ID('dbo.Tecnicos', 'U') IS NULL
        THROW 50703, 'No existe dbo.Tecnicos en la base de datos objetivo.', 1;

    IF OBJECT_ID('dbo.NAPs', 'U') IS NULL
        THROW 50704, 'No existe dbo.NAPs en la base de datos objetivo.', 1;

    IF OBJECT_ID('dbo.ActividadesOFSC', 'U') IS NULL
        THROW 50705, 'No existe dbo.ActividadesOFSC en la base de datos objetivo.', 1;

    /*
    =====================================================
    CATÁLOGO DE TIPOS DE EVIDENCIA
    =====================================================
    */
    IF OBJECT_ID('dbo.TiposEvidenciaTSS', 'U') IS NULL
    BEGIN
        CREATE TABLE dbo.TiposEvidenciaTSS
        (
            IdTipoEvidencia
                INT IDENTITY(1,1) NOT NULL,

            Nombre
                VARCHAR(150) NOT NULL,

            Descripcion
                VARCHAR(300) NULL,

            EsBase
                BIT NOT NULL
                CONSTRAINT DF_TiposEvidenciaTSS_EsBase
                DEFAULT ((1)),

            Obligatoria
                BIT NOT NULL
                CONSTRAINT DF_TiposEvidenciaTSS_Obligatoria
                DEFAULT ((1)),

            Activo
                BIT NOT NULL
                CONSTRAINT DF_TiposEvidenciaTSS_Activo
                DEFAULT ((1)),

            OrdenVisual
                INT NULL,

            CONSTRAINT PK_TiposEvidenciaTSS
                PRIMARY KEY CLUSTERED
                (
                    IdTipoEvidencia ASC
                )
        );
    END;

    /*
    =====================================================
    HISTORIAL DE ESTADOS TSS
    =====================================================
    */
    IF OBJECT_ID('dbo.HistorialEstadosTSS', 'U') IS NULL
    BEGIN
        CREATE TABLE dbo.HistorialEstadosTSS
        (
            IdHistorialTSS
                INT IDENTITY(1,1) NOT NULL,

            IdTSS
                INT NOT NULL,

            EstadoAnterior
                VARCHAR(30) NULL,

            EstadoNuevo
                VARCHAR(30) NOT NULL,

            Motivo
                VARCHAR(500) NULL,

            Observacion
                VARCHAR(1000) NULL,

            FechaEvento
                DATETIME2(0) NOT NULL
                CONSTRAINT DF_HistorialEstadosTSS_FechaEvento
                DEFAULT (SYSDATETIME()),

            IdUsuario
                INT NULL,

            CONSTRAINT PK_HistorialEstadosTSS
                PRIMARY KEY CLUSTERED
                (
                    IdHistorialTSS ASC
                )
        );
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE
            name = 'FK_HistorialEstadosTSS_TSS'
            AND parent_object_id =
                OBJECT_ID('dbo.HistorialEstadosTSS')
    )
    BEGIN
        ALTER TABLE dbo.HistorialEstadosTSS
        WITH CHECK ADD CONSTRAINT
            FK_HistorialEstadosTSS_TSS
        FOREIGN KEY (IdTSS)
        REFERENCES dbo.TSS (IdTSS);
    END;

    ALTER TABLE dbo.HistorialEstadosTSS
    WITH CHECK CHECK CONSTRAINT
        FK_HistorialEstadosTSS_TSS;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE
            name = 'FK_HistorialEstadosTSS_Usuario'
            AND parent_object_id =
                OBJECT_ID('dbo.HistorialEstadosTSS')
    )
    BEGIN
        ALTER TABLE dbo.HistorialEstadosTSS
        WITH CHECK ADD CONSTRAINT
            FK_HistorialEstadosTSS_Usuario
        FOREIGN KEY (IdUsuario)
        REFERENCES dbo.Usuarios (IdUsuario);
    END;

    ALTER TABLE dbo.HistorialEstadosTSS
    WITH CHECK CHECK CONSTRAINT
        FK_HistorialEstadosTSS_Usuario;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE
            name = 'IX_HistorialEstadosTSS_IdTSS'
            AND object_id =
                OBJECT_ID('dbo.HistorialEstadosTSS')
    )
    BEGIN
        CREATE NONCLUSTERED INDEX
            IX_HistorialEstadosTSS_IdTSS
        ON dbo.HistorialEstadosTSS
        (
            IdTSS ASC,
            FechaEvento DESC
        );
    END;

    /*
    =====================================================
    EVIDENCIAS TSS
    =====================================================
    */
    IF OBJECT_ID('dbo.EvidenciasTSS', 'U') IS NULL
    BEGIN
        CREATE TABLE dbo.EvidenciasTSS
        (
            IdEvidenciaTSS
                INT IDENTITY(1,1) NOT NULL,

            IdTSS
                INT NOT NULL,

            IdTipoEvidencia
                INT NULL,

            NombreEvidencia
                VARCHAR(150) NULL,

            EstadoEvidencia
                VARCHAR(20) NOT NULL
                CONSTRAINT DF_EvidenciasTSS_Estado
                DEFAULT ('PENDIENTE'),

            MotivoNoAplica
                VARCHAR(500) NULL,

            NombreArchivo
                VARCHAR(255) NULL,

            RutaArchivo
                VARCHAR(500) NULL,

            Extension
                VARCHAR(10) NULL,

            PesoKB
                DECIMAL(12,2) NULL,

            Observacion
                VARCHAR(500) NULL,

            FechaRegistro
                DATETIME2(0) NOT NULL
                CONSTRAINT DF_EvidenciasTSS_FechaRegistro
                DEFAULT (SYSDATETIME()),

            IdUsuarioRegistro
                INT NULL,

            CONSTRAINT PK_EvidenciasTSS
                PRIMARY KEY CLUSTERED
                (
                    IdEvidenciaTSS ASC
                )
        );
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE
            name = 'FK_EvidenciasTSS_TSS'
            AND parent_object_id =
                OBJECT_ID('dbo.EvidenciasTSS')
    )
    BEGIN
        ALTER TABLE dbo.EvidenciasTSS
        WITH CHECK ADD CONSTRAINT
            FK_EvidenciasTSS_TSS
        FOREIGN KEY (IdTSS)
        REFERENCES dbo.TSS (IdTSS);
    END;

    ALTER TABLE dbo.EvidenciasTSS
    WITH CHECK CHECK CONSTRAINT
        FK_EvidenciasTSS_TSS;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE
            name = 'FK_EvidenciasTSS_Tipo'
            AND parent_object_id =
                OBJECT_ID('dbo.EvidenciasTSS')
    )
    BEGIN
        ALTER TABLE dbo.EvidenciasTSS
        WITH CHECK ADD CONSTRAINT
            FK_EvidenciasTSS_Tipo
        FOREIGN KEY (IdTipoEvidencia)
        REFERENCES dbo.TiposEvidenciaTSS
            (IdTipoEvidencia);
    END;

    ALTER TABLE dbo.EvidenciasTSS
    WITH CHECK CHECK CONSTRAINT
        FK_EvidenciasTSS_Tipo;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE
            name = 'FK_EvidenciasTSS_Usuario'
            AND parent_object_id =
                OBJECT_ID('dbo.EvidenciasTSS')
    )
    BEGIN
        ALTER TABLE dbo.EvidenciasTSS
        WITH CHECK ADD CONSTRAINT
            FK_EvidenciasTSS_Usuario
        FOREIGN KEY (IdUsuarioRegistro)
        REFERENCES dbo.Usuarios (IdUsuario);
    END;

    ALTER TABLE dbo.EvidenciasTSS
    WITH CHECK CHECK CONSTRAINT
        FK_EvidenciasTSS_Usuario;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE
            name = 'CK_EvidenciasTSS_Estado'
            AND parent_object_id =
                OBJECT_ID('dbo.EvidenciasTSS')
    )
    BEGIN
        ALTER TABLE dbo.EvidenciasTSS
        WITH CHECK ADD CONSTRAINT
            CK_EvidenciasTSS_Estado
        CHECK (
            EstadoEvidencia IN (
                'PENDIENTE',
                'COMPLETA',
                'NO_APLICA'
            )
        );
    END;

    ALTER TABLE dbo.EvidenciasTSS
    WITH CHECK CHECK CONSTRAINT
        CK_EvidenciasTSS_Estado;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE
            name = 'CK_EvidenciasTSS_NoAplica'
            AND parent_object_id =
                OBJECT_ID('dbo.EvidenciasTSS')
    )
    BEGIN
        ALTER TABLE dbo.EvidenciasTSS
        WITH CHECK ADD CONSTRAINT
            CK_EvidenciasTSS_NoAplica
        CHECK (
            EstadoEvidencia <> 'NO_APLICA'
            OR (
                MotivoNoAplica IS NOT NULL
                AND LEN(
                    LTRIM(RTRIM(MotivoNoAplica))
                ) > 0
            )
        );
    END;

    ALTER TABLE dbo.EvidenciasTSS
    WITH CHECK CHECK CONSTRAINT
        CK_EvidenciasTSS_NoAplica;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE
            name = 'IX_EvidenciasTSS_IdTSS'
            AND object_id =
                OBJECT_ID('dbo.EvidenciasTSS')
    )
    BEGIN
        CREATE NONCLUSTERED INDEX
            IX_EvidenciasTSS_IdTSS
        ON dbo.EvidenciasTSS
        (
            IdTSS ASC,
            EstadoEvidencia ASC
        );
    END;

    /*
    =====================================================
    DOCUMENTOS TSS
    =====================================================
    */
    IF OBJECT_ID('dbo.DocumentosTSS', 'U') IS NULL
    BEGIN
        CREATE TABLE dbo.DocumentosTSS
        (
            IdDocumentoTSS
                INT IDENTITY(1,1) NOT NULL,

            IdTSS
                INT NOT NULL,

            TipoDocumento
                VARCHAR(20) NOT NULL,

            NombreArchivo
                VARCHAR(255) NOT NULL,

            RutaArchivo
                VARCHAR(500) NOT NULL,

            FechaGeneracion
                DATETIME2(0) NOT NULL
                CONSTRAINT DF_DocumentosTSS_Fecha
                DEFAULT (SYSDATETIME()),

            IdUsuarioGeneracion
                INT NULL,

            Vigente
                BIT NOT NULL
                CONSTRAINT DF_DocumentosTSS_Vigente
                DEFAULT ((1)),

            CONSTRAINT PK_DocumentosTSS
                PRIMARY KEY CLUSTERED
                (
                    IdDocumentoTSS ASC
                )
        );
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE
            name = 'FK_DocumentosTSS_TSS'
            AND parent_object_id =
                OBJECT_ID('dbo.DocumentosTSS')
    )
    BEGIN
        ALTER TABLE dbo.DocumentosTSS
        WITH CHECK ADD CONSTRAINT
            FK_DocumentosTSS_TSS
        FOREIGN KEY (IdTSS)
        REFERENCES dbo.TSS (IdTSS);
    END;

    ALTER TABLE dbo.DocumentosTSS
    WITH CHECK CHECK CONSTRAINT
        FK_DocumentosTSS_TSS;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE
            name = 'FK_DocumentosTSS_Usuario'
            AND parent_object_id =
                OBJECT_ID('dbo.DocumentosTSS')
    )
    BEGIN
        ALTER TABLE dbo.DocumentosTSS
        WITH CHECK ADD CONSTRAINT
            FK_DocumentosTSS_Usuario
        FOREIGN KEY (IdUsuarioGeneracion)
        REFERENCES dbo.Usuarios (IdUsuario);
    END;

    ALTER TABLE dbo.DocumentosTSS
    WITH CHECK CHECK CONSTRAINT
        FK_DocumentosTSS_Usuario;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE
            name = 'CK_DocumentosTSS_Tipo'
            AND parent_object_id =
                OBJECT_ID('dbo.DocumentosTSS')
    )
    BEGIN
        ALTER TABLE dbo.DocumentosTSS
        WITH CHECK ADD CONSTRAINT
            CK_DocumentosTSS_Tipo
        CHECK (
            TipoDocumento IN (
                'PRELIMINAR',
                'FINAL'
            )
        );
    END;

    ALTER TABLE dbo.DocumentosTSS
    WITH CHECK CHECK CONSTRAINT
        CK_DocumentosTSS_Tipo;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE
            name = 'IX_DocumentosTSS_IdTSS'
            AND object_id =
                OBJECT_ID('dbo.DocumentosTSS')
    )
    BEGIN
        CREATE NONCLUSTERED INDEX
            IX_DocumentosTSS_IdTSS
        ON dbo.DocumentosTSS
        (
            IdTSS ASC,
            TipoDocumento ASC,
            Vigente ASC
        );
    END;

    /*
    =====================================================
    VALIDACIONES TCE
    =====================================================
    */
    IF OBJECT_ID('dbo.ValidacionesTCE', 'U') IS NULL
    BEGIN
        CREATE TABLE dbo.ValidacionesTCE
        (
            IdValidacionTCE
                INT IDENTITY(1,1) NOT NULL,

            IdTSS
                INT NOT NULL,

            IdNAP
                INT NULL,

            CodigoNAPValidado
                VARCHAR(100) NULL,

            PuertoConfirmado
                VARCHAR(30) NULL,

            Resultado
                VARCHAR(30) NOT NULL
                CONSTRAINT DF_ValidacionesTCE_Resultado
                DEFAULT ('PENDIENTE'),

            Observaciones
                VARCHAR(1000) NULL,

            FechaSolicitud
                DATETIME2(0) NOT NULL
                CONSTRAINT DF_ValidacionesTCE_FechaSolicitud
                DEFAULT (SYSDATETIME()),

            FechaRespuesta
                DATETIME2(0) NULL,

            ValidadoPor
                VARCHAR(150) NULL,

            IdUsuarioRegistro
                INT NULL,

            CONSTRAINT PK_ValidacionesTCE
                PRIMARY KEY CLUSTERED
                (
                    IdValidacionTCE ASC
                )
        );
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE
            name = 'FK_ValidacionesTCE_TSS'
            AND parent_object_id =
                OBJECT_ID('dbo.ValidacionesTCE')
    )
    BEGIN
        ALTER TABLE dbo.ValidacionesTCE
        WITH CHECK ADD CONSTRAINT
            FK_ValidacionesTCE_TSS
        FOREIGN KEY (IdTSS)
        REFERENCES dbo.TSS (IdTSS);
    END;

    ALTER TABLE dbo.ValidacionesTCE
    WITH CHECK CHECK CONSTRAINT
        FK_ValidacionesTCE_TSS;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE
            name = 'FK_ValidacionesTCE_NAP'
            AND parent_object_id =
                OBJECT_ID('dbo.ValidacionesTCE')
    )
    BEGIN
        ALTER TABLE dbo.ValidacionesTCE
        WITH CHECK ADD CONSTRAINT
            FK_ValidacionesTCE_NAP
        FOREIGN KEY (IdNAP)
        REFERENCES dbo.NAPs (IdNAP);
    END;

    ALTER TABLE dbo.ValidacionesTCE
    WITH CHECK CHECK CONSTRAINT
        FK_ValidacionesTCE_NAP;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE
            name = 'FK_ValidacionesTCE_Usuario'
            AND parent_object_id =
                OBJECT_ID('dbo.ValidacionesTCE')
    )
    BEGIN
        ALTER TABLE dbo.ValidacionesTCE
        WITH CHECK ADD CONSTRAINT
            FK_ValidacionesTCE_Usuario
        FOREIGN KEY (IdUsuarioRegistro)
        REFERENCES dbo.Usuarios (IdUsuario);
    END;

    ALTER TABLE dbo.ValidacionesTCE
    WITH CHECK CHECK CONSTRAINT
        FK_ValidacionesTCE_Usuario;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE
            name = 'CK_ValidacionesTCE_Resultado'
            AND parent_object_id =
                OBJECT_ID('dbo.ValidacionesTCE')
    )
    BEGIN
        ALTER TABLE dbo.ValidacionesTCE
        WITH CHECK ADD CONSTRAINT
            CK_ValidacionesTCE_Resultado
        CHECK (
            Resultado IN (
                'PENDIENTE',
                'CONFIRMADA',
                'NO_DISPONIBLE',
                'OBSERVADA'
            )
        );
    END;

    ALTER TABLE dbo.ValidacionesTCE
    WITH CHECK CHECK CONSTRAINT
        CK_ValidacionesTCE_Resultado;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE
            name = 'IX_ValidacionesTCE_IdTSS'
            AND object_id =
                OBJECT_ID('dbo.ValidacionesTCE')
    )
    BEGIN
        CREATE NONCLUSTERED INDEX
            IX_ValidacionesTCE_IdTSS
        ON dbo.ValidacionesTCE
        (
            IdTSS ASC,
            FechaSolicitud DESC
        );
    END;

    /*
    =====================================================
    DISPONIBILIDAD DE TÉCNICOS
    =====================================================
    */
    IF OBJECT_ID(
        'dbo.DisponibilidadTecnicos',
        'U'
    ) IS NULL
    BEGIN
        CREATE TABLE dbo.DisponibilidadTecnicos
        (
            IdDisponibilidad
                INT IDENTITY(1,1) NOT NULL,

            IdTecnico
                INT NOT NULL,

            FechaVigencia
                DATE NOT NULL,

            DisponibleAM
                BIT NOT NULL
                CONSTRAINT DF_DisponibilidadTecnicos_AM
                DEFAULT ((1)),

            DisponiblePM
                BIT NOT NULL
                CONSTRAINT DF_DisponibilidadTecnicos_PM
                DEFAULT ((1)),

            NocturnoConfirmado
                BIT NOT NULL
                CONSTRAINT DF_DisponibilidadTecnicos_Nocturno
                DEFAULT ((0)),

            Motivo
                VARCHAR(300) NULL,

            Observaciones
                VARCHAR(500) NULL,

            FechaRegistro
                DATETIME2(0) NOT NULL
                CONSTRAINT DF_DisponibilidadTecnicos_FechaRegistro
                DEFAULT (SYSDATETIME()),

            IdUsuarioRegistro
                INT NULL,

            CONSTRAINT PK_DisponibilidadTecnicos
                PRIMARY KEY CLUSTERED
                (
                    IdDisponibilidad ASC
                )
        );
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.key_constraints
        WHERE
            name =
                'UQ_DisponibilidadTecnicos_TecnicoFecha'
            AND parent_object_id =
                OBJECT_ID('dbo.DisponibilidadTecnicos')
            AND type = 'UQ'
    )
    BEGIN
        IF EXISTS (
            SELECT
                IdTecnico,
                FechaVigencia
            FROM dbo.DisponibilidadTecnicos
            GROUP BY
                IdTecnico,
                FechaVigencia
            HAVING COUNT(*) > 1
        )
            THROW 50710, 'No se puede crear UQ_DisponibilidadTecnicos_TecnicoFecha: existen registros duplicados.', 1;

        ALTER TABLE dbo.DisponibilidadTecnicos
        ADD CONSTRAINT
            UQ_DisponibilidadTecnicos_TecnicoFecha
        UNIQUE NONCLUSTERED
        (
            IdTecnico ASC,
            FechaVigencia ASC
        );
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes I
        WHERE
            I.object_id =
                OBJECT_ID('dbo.DisponibilidadTecnicos')
            AND I.name =
                'UQ_DisponibilidadTecnicos_TecnicoFecha'
            AND I.is_unique = 1
            AND I.is_disabled = 0
            AND I.has_filter = 0
            AND (
                SELECT STRING_AGG(
                    C.name,
                    ','
                ) WITHIN GROUP (
                    ORDER BY IC.key_ordinal
                )
                FROM sys.index_columns IC
                INNER JOIN sys.columns C
                    ON C.object_id = IC.object_id
                    AND C.column_id = IC.column_id
                WHERE
                    IC.object_id = I.object_id
                    AND IC.index_id = I.index_id
                    AND IC.key_ordinal > 0
            ) = 'IdTecnico,FechaVigencia'
            AND EXISTS (
                SELECT 1
                FROM sys.key_constraints KC
                WHERE
                    KC.parent_object_id = I.object_id
                    AND KC.unique_index_id = I.index_id
                    AND KC.name = I.name
                    AND KC.type = 'UQ'
            )
    )
        THROW 50714, 'UQ_DisponibilidadTecnicos_TecnicoFecha existe con una definición incompatible.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE
            name = 'FK_DisponibilidadTecnicos_Tecnico'
            AND parent_object_id =
                OBJECT_ID('dbo.DisponibilidadTecnicos')
    )
    BEGIN
        ALTER TABLE dbo.DisponibilidadTecnicos
        WITH CHECK ADD CONSTRAINT
            FK_DisponibilidadTecnicos_Tecnico
        FOREIGN KEY (IdTecnico)
        REFERENCES dbo.Tecnicos (IdTecnico);
    END;

    ALTER TABLE dbo.DisponibilidadTecnicos
    WITH CHECK CHECK CONSTRAINT
        FK_DisponibilidadTecnicos_Tecnico;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE
            name = 'FK_DisponibilidadTecnicos_Usuario'
            AND parent_object_id =
                OBJECT_ID('dbo.DisponibilidadTecnicos')
    )
    BEGIN
        ALTER TABLE dbo.DisponibilidadTecnicos
        WITH CHECK ADD CONSTRAINT
            FK_DisponibilidadTecnicos_Usuario
        FOREIGN KEY (IdUsuarioRegistro)
        REFERENCES dbo.Usuarios (IdUsuario);
    END;

    ALTER TABLE dbo.DisponibilidadTecnicos
    WITH CHECK CHECK CONSTRAINT
        FK_DisponibilidadTecnicos_Usuario;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE
            name = 'IX_DisponibilidadTecnicos_Fecha'
            AND object_id =
                OBJECT_ID('dbo.DisponibilidadTecnicos')
    )
    BEGIN
        CREATE NONCLUSTERED INDEX
            IX_DisponibilidadTecnicos_Fecha
        ON dbo.DisponibilidadTecnicos
        (
            IdTecnico ASC,
            FechaVigencia DESC
        );
    END;

    /*
    =====================================================
    AGENDA DE TÉCNICOS
    =====================================================
    */
    IF OBJECT_ID('dbo.AgendaTecnicos', 'U') IS NULL
    BEGIN
        CREATE TABLE dbo.AgendaTecnicos
        (
            IdAgenda
                INT IDENTITY(1,1) NOT NULL,

            IdTecnico
                INT NOT NULL,

            FechaAgenda
                DATE NOT NULL,

            Turno
                VARCHAR(15) NOT NULL,

            TipoActividad
                VARCHAR(20) NOT NULL,

            IdTSS
                INT NULL,

            IdActividad
                INT NULL,

            EstadoAgenda
                VARCHAR(20) NOT NULL
                CONSTRAINT DF_AgendaTecnicos_Estado
                DEFAULT ('ACTIVA'),

            OcupaTurno
                BIT NOT NULL
                CONSTRAINT DF_AgendaTecnicos_OcupaTurno
                DEFAULT ((1)),

            Observaciones
                VARCHAR(500) NULL,

            FechaRegistro
                DATETIME2(0) NOT NULL
                CONSTRAINT DF_AgendaTecnicos_FechaRegistro
                DEFAULT (SYSDATETIME()),

            FechaActualizacion
                DATETIME2(0) NOT NULL
                CONSTRAINT DF_AgendaTecnicos_FechaActualizacion
                DEFAULT (SYSDATETIME()),

            IdUsuarioRegistro
                INT NULL,

            CONSTRAINT PK_AgendaTecnicos
                PRIMARY KEY CLUSTERED
                (
                    IdAgenda ASC
                )
        );
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE
            name = 'FK_AgendaTecnicos_Tecnico'
            AND parent_object_id =
                OBJECT_ID('dbo.AgendaTecnicos')
    )
    BEGIN
        ALTER TABLE dbo.AgendaTecnicos
        WITH CHECK ADD CONSTRAINT
            FK_AgendaTecnicos_Tecnico
        FOREIGN KEY (IdTecnico)
        REFERENCES dbo.Tecnicos (IdTecnico);
    END;

    ALTER TABLE dbo.AgendaTecnicos
    WITH CHECK CHECK CONSTRAINT
        FK_AgendaTecnicos_Tecnico;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE
            name = 'FK_AgendaTecnicos_TSS'
            AND parent_object_id =
                OBJECT_ID('dbo.AgendaTecnicos')
    )
    BEGIN
        ALTER TABLE dbo.AgendaTecnicos
        WITH CHECK ADD CONSTRAINT
            FK_AgendaTecnicos_TSS
        FOREIGN KEY (IdTSS)
        REFERENCES dbo.TSS (IdTSS);
    END;

    ALTER TABLE dbo.AgendaTecnicos
    WITH CHECK CHECK CONSTRAINT
        FK_AgendaTecnicos_TSS;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE
            name = 'FK_AgendaTecnicos_Actividad'
            AND parent_object_id =
                OBJECT_ID('dbo.AgendaTecnicos')
    )
    BEGIN
        ALTER TABLE dbo.AgendaTecnicos
        WITH CHECK ADD CONSTRAINT
            FK_AgendaTecnicos_Actividad
        FOREIGN KEY (IdActividad)
        REFERENCES dbo.ActividadesOFSC (IdActividad);
    END;

    ALTER TABLE dbo.AgendaTecnicos
    WITH CHECK CHECK CONSTRAINT
        FK_AgendaTecnicos_Actividad;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.foreign_keys
        WHERE
            name = 'FK_AgendaTecnicos_Usuario'
            AND parent_object_id =
                OBJECT_ID('dbo.AgendaTecnicos')
    )
    BEGIN
        ALTER TABLE dbo.AgendaTecnicos
        WITH CHECK ADD CONSTRAINT
            FK_AgendaTecnicos_Usuario
        FOREIGN KEY (IdUsuarioRegistro)
        REFERENCES dbo.Usuarios (IdUsuario);
    END;

    ALTER TABLE dbo.AgendaTecnicos
    WITH CHECK CHECK CONSTRAINT
        FK_AgendaTecnicos_Usuario;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE
            name = 'CK_AgendaTecnicos_Turno'
            AND parent_object_id =
                OBJECT_ID('dbo.AgendaTecnicos')
    )
    BEGIN
        ALTER TABLE dbo.AgendaTecnicos
        WITH CHECK ADD CONSTRAINT
            CK_AgendaTecnicos_Turno
        CHECK (
            Turno IN (
                'AM',
                'PM',
                'NOCTURNO'
            )
        );
    END;

    ALTER TABLE dbo.AgendaTecnicos
    WITH CHECK CHECK CONSTRAINT
        CK_AgendaTecnicos_Turno;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE
            name = 'CK_AgendaTecnicos_TipoActividad'
            AND parent_object_id =
                OBJECT_ID('dbo.AgendaTecnicos')
    )
    BEGIN
        ALTER TABLE dbo.AgendaTecnicos
        WITH CHECK ADD CONSTRAINT
            CK_AgendaTecnicos_TipoActividad
        CHECK (
            TipoActividad IN (
                'TSS',
                'INSTALACION'
            )
        );
    END;

    ALTER TABLE dbo.AgendaTecnicos
    WITH CHECK CHECK CONSTRAINT
        CK_AgendaTecnicos_TipoActividad;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE
            name = 'CK_AgendaTecnicos_Estado'
            AND parent_object_id =
                OBJECT_ID('dbo.AgendaTecnicos')
    )
    BEGIN
        ALTER TABLE dbo.AgendaTecnicos
        WITH CHECK ADD CONSTRAINT
            CK_AgendaTecnicos_Estado
        CHECK (
            EstadoAgenda IN (
                'ACTIVA',
                'COMPLETADA',
                'CANCELADA',
                'REPROGRAMADA'
            )
        );
    END;

    ALTER TABLE dbo.AgendaTecnicos
    WITH CHECK CHECK CONSTRAINT
        CK_AgendaTecnicos_Estado;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE
            name = 'CK_AgendaTecnicos_Referencia'
            AND parent_object_id =
                OBJECT_ID('dbo.AgendaTecnicos')
    )
    BEGIN
        ALTER TABLE dbo.AgendaTecnicos
        WITH CHECK ADD CONSTRAINT
            CK_AgendaTecnicos_Referencia
        CHECK (
            (
                TipoActividad = 'TSS'
                AND IdTSS IS NOT NULL
                AND IdActividad IS NULL
            )
            OR (
                TipoActividad = 'INSTALACION'
                AND IdActividad IS NOT NULL
                AND IdTSS IS NULL
            )
        );
    END;

    ALTER TABLE dbo.AgendaTecnicos
    WITH CHECK CHECK CONSTRAINT
        CK_AgendaTecnicos_Referencia;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE
            name = 'CK_AgendaTecnicos_Ocupacion'
            AND parent_object_id =
                OBJECT_ID('dbo.AgendaTecnicos')
    )
    BEGIN
        ALTER TABLE dbo.AgendaTecnicos
        WITH CHECK ADD CONSTRAINT
            CK_AgendaTecnicos_Ocupacion
        CHECK (
            (
                EstadoAgenda IN (
                    'ACTIVA',
                    'COMPLETADA'
                )
                AND OcupaTurno = 1
            )
            OR (
                EstadoAgenda IN (
                    'CANCELADA',
                    'REPROGRAMADA'
                )
                AND OcupaTurno = 0
            )
        );
    END;

    ALTER TABLE dbo.AgendaTecnicos
    WITH CHECK CHECK CONSTRAINT
        CK_AgendaTecnicos_Ocupacion;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE
            name = 'UX_AgendaTecnicos_TurnoOcupado'
            AND object_id =
                OBJECT_ID('dbo.AgendaTecnicos')
    )
    BEGIN
        IF EXISTS (
            SELECT
                IdTecnico,
                FechaAgenda,
                Turno
            FROM dbo.AgendaTecnicos
            WHERE OcupaTurno = 1
            GROUP BY
                IdTecnico,
                FechaAgenda,
                Turno
            HAVING COUNT(*) > 1
        )
            THROW 50711, 'No se puede crear UX_AgendaTecnicos_TurnoOcupado: existen turnos ocupados duplicados.', 1;

        CREATE UNIQUE NONCLUSTERED INDEX
            UX_AgendaTecnicos_TurnoOcupado
        ON dbo.AgendaTecnicos
        (
            IdTecnico ASC,
            FechaAgenda ASC,
            Turno ASC
        )
        WHERE OcupaTurno = 1;
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes I
        WHERE
            I.object_id =
                OBJECT_ID('dbo.AgendaTecnicos')
            AND I.name =
                'UX_AgendaTecnicos_TurnoOcupado'
            AND I.is_unique = 1
            AND I.is_disabled = 0
            AND I.has_filter = 1
            AND (
                SELECT STRING_AGG(
                    C.name,
                    ','
                ) WITHIN GROUP (
                    ORDER BY IC.key_ordinal
                )
                FROM sys.index_columns IC
                INNER JOIN sys.columns C
                    ON C.object_id = IC.object_id
                    AND C.column_id = IC.column_id
                WHERE
                    IC.object_id = I.object_id
                    AND IC.index_id = I.index_id
                    AND IC.key_ordinal > 0
            ) = 'IdTecnico,FechaAgenda,Turno'
            AND UPPER(
                REPLACE(REPLACE(REPLACE(
                    REPLACE(REPLACE(
                        ISNULL(I.filter_definition, ''),
                        ' ',
                        ''
                    ), '[', ''), ']', ''),
                    '(', ''), ')', '')
            ) = 'OCUPATURNO=1'
    )
        THROW 50715, 'UX_AgendaTecnicos_TurnoOcupado existe con una definición incompatible.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE
            name = 'UX_AgendaTecnicos_TSS_Ocupado'
            AND object_id =
                OBJECT_ID('dbo.AgendaTecnicos')
    )
    BEGIN
        IF EXISTS (
            SELECT IdTSS
            FROM dbo.AgendaTecnicos
            WHERE
                IdTSS IS NOT NULL
                AND OcupaTurno = 1
            GROUP BY IdTSS
            HAVING COUNT(*) > 1
        )
            THROW 50712, 'No se puede crear UX_AgendaTecnicos_TSS_Ocupado: existen TSS ocupados duplicados.', 1;

        CREATE UNIQUE NONCLUSTERED INDEX
            UX_AgendaTecnicos_TSS_Ocupado
        ON dbo.AgendaTecnicos
        (
            IdTSS ASC
        )
        WHERE
            IdTSS IS NOT NULL
            AND OcupaTurno = 1;
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes I
        WHERE
            I.object_id =
                OBJECT_ID('dbo.AgendaTecnicos')
            AND I.name =
                'UX_AgendaTecnicos_TSS_Ocupado'
            AND I.is_unique = 1
            AND I.is_disabled = 0
            AND I.has_filter = 1
            AND (
                SELECT STRING_AGG(
                    C.name,
                    ','
                ) WITHIN GROUP (
                    ORDER BY IC.key_ordinal
                )
                FROM sys.index_columns IC
                INNER JOIN sys.columns C
                    ON C.object_id = IC.object_id
                    AND C.column_id = IC.column_id
                WHERE
                    IC.object_id = I.object_id
                    AND IC.index_id = I.index_id
                    AND IC.key_ordinal > 0
            ) = 'IdTSS'
            AND UPPER(
                REPLACE(REPLACE(REPLACE(
                    REPLACE(REPLACE(
                        ISNULL(I.filter_definition, ''),
                        ' ',
                        ''
                    ), '[', ''), ']', ''),
                    '(', ''), ')', '')
            ) =
                'IDTSSISNOTNULLANDOCUPATURNO=1'
    )
        THROW 50716, 'UX_AgendaTecnicos_TSS_Ocupado existe con una definición incompatible.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE
            name =
                'UX_AgendaTecnicos_Actividad_Ocupada'
            AND object_id =
                OBJECT_ID('dbo.AgendaTecnicos')
    )
    BEGIN
        IF EXISTS (
            SELECT IdActividad
            FROM dbo.AgendaTecnicos
            WHERE
                IdActividad IS NOT NULL
                AND OcupaTurno = 1
            GROUP BY IdActividad
            HAVING COUNT(*) > 1
        )
            THROW 50713, 'No se puede crear UX_AgendaTecnicos_Actividad_Ocupada: existen actividades ocupadas duplicadas.', 1;

        CREATE UNIQUE NONCLUSTERED INDEX
            UX_AgendaTecnicos_Actividad_Ocupada
        ON dbo.AgendaTecnicos
        (
            IdActividad ASC
        )
        WHERE
            IdActividad IS NOT NULL
            AND OcupaTurno = 1;
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes I
        WHERE
            I.object_id =
                OBJECT_ID('dbo.AgendaTecnicos')
            AND I.name =
                'UX_AgendaTecnicos_Actividad_Ocupada'
            AND I.is_unique = 1
            AND I.is_disabled = 0
            AND I.has_filter = 1
            AND (
                SELECT STRING_AGG(
                    C.name,
                    ','
                ) WITHIN GROUP (
                    ORDER BY IC.key_ordinal
                )
                FROM sys.index_columns IC
                INNER JOIN sys.columns C
                    ON C.object_id = IC.object_id
                    AND C.column_id = IC.column_id
                WHERE
                    IC.object_id = I.object_id
                    AND IC.index_id = I.index_id
                    AND IC.key_ordinal > 0
            ) = 'IdActividad'
            AND UPPER(
                REPLACE(REPLACE(REPLACE(
                    REPLACE(REPLACE(
                        ISNULL(I.filter_definition, ''),
                        ' ',
                        ''
                    ), '[', ''), ']', ''),
                    '(', ''), ')', '')
            ) =
                'IDACTIVIDADISNOTNULLANDOCUPATURNO=1'
    )
        THROW 50717, 'UX_AgendaTecnicos_Actividad_Ocupada existe con una definición incompatible.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE
            name = 'IX_AgendaTecnicos_Fecha'
            AND object_id =
                OBJECT_ID('dbo.AgendaTecnicos')
    )
    BEGIN
        CREATE NONCLUSTERED INDEX
            IX_AgendaTecnicos_Fecha
        ON dbo.AgendaTecnicos
        (
            FechaAgenda ASC,
            Turno ASC,
            EstadoAgenda ASC
        );
    END;

    /*
        Índice de lectura del detalle TSS. Incluye todas
        las agendas históricas del TSS, también las que ya
        no ocupan turno.
    */
    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE
            name = 'IX_AgendaTecnicos_IdTSS_Fecha'
            AND object_id =
                OBJECT_ID('dbo.AgendaTecnicos')
    )
    BEGIN
        CREATE NONCLUSTERED INDEX
            IX_AgendaTecnicos_IdTSS_Fecha
        ON dbo.AgendaTecnicos
        (
            IdTSS ASC,
            FechaAgenda DESC,
            FechaActualizacion DESC,
            IdAgenda DESC
        )
        INCLUDE
        (
            IdTecnico,
            Turno,
            TipoActividad,
            EstadoAgenda,
            OcupaTurno,
            FechaRegistro,
            IdUsuarioRegistro
        )
        WHERE IdTSS IS NOT NULL;
    END;

    COMMIT TRANSACTION;

    PRINT 'Esquema operativo TSS instalado correctamente.';
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;

    THROW;
END CATCH;
GO
