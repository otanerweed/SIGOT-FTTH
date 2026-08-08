/*
=========================================================
SIGOT-FTTH
05_historial_asignaciones.sql

Crea la tabla dbo.HistorialAsignaciones para registrar
eventos de asignación, reasignación y cancelación.

El script puede ejecutarse más de una vez sin intentar
crear nuevamente la tabla.
=========================================================
*/

IF OBJECT_ID(
    'dbo.HistorialAsignaciones',
    'U'
) IS NULL
BEGIN

    CREATE TABLE dbo.HistorialAsignaciones
    (
        IdHistorialAsignacion
            INT IDENTITY(1,1) NOT NULL,

        IdAsignacion
            INT NOT NULL,

        IdOrden
            INT NOT NULL,

        IdTecnicoAnterior
            INT NULL,

        IdTecnicoNuevo
            INT NULL,

        Evento
            VARCHAR(30) NOT NULL,

        EstadoAnterior
            VARCHAR(20) NULL,

        EstadoNuevo
            VARCHAR(20) NOT NULL,

        Motivo
            VARCHAR(500) NULL,

        Fuente
            VARCHAR(20) NOT NULL
            CONSTRAINT DF_HistorialAsignaciones_Fuente
            DEFAULT ('SIGOT'),

        FechaEvento
            DATETIME2 NOT NULL
            CONSTRAINT DF_HistorialAsignaciones_FechaEvento
            DEFAULT (SYSDATETIME()),

        IdUsuario
            INT NOT NULL,

        IdActividad
            INT NULL,

        CONSTRAINT PK_HistorialAsignaciones
            PRIMARY KEY (
                IdHistorialAsignacion
            ),

        CONSTRAINT FK_HistorialAsignaciones_Asignacion
            FOREIGN KEY (
                IdAsignacion
            )
            REFERENCES dbo.Asignaciones(
                IdAsignacion
            ),

        CONSTRAINT FK_HistorialAsignaciones_Orden
            FOREIGN KEY (
                IdOrden
            )
            REFERENCES dbo.OrdenesTrabajo(
                IdOrden
            ),

        CONSTRAINT FK_HistorialAsignaciones_TecnicoAnterior
            FOREIGN KEY (
                IdTecnicoAnterior
            )
            REFERENCES dbo.Tecnicos(
                IdTecnico
            ),

        CONSTRAINT FK_HistorialAsignaciones_TecnicoNuevo
            FOREIGN KEY (
                IdTecnicoNuevo
            )
            REFERENCES dbo.Tecnicos(
                IdTecnico
            ),

        CONSTRAINT FK_HistorialAsignaciones_Usuario
            FOREIGN KEY (
                IdUsuario
            )
            REFERENCES dbo.Usuarios(
                IdUsuario
            ),

        CONSTRAINT FK_HistorialAsignaciones_Actividad
            FOREIGN KEY (
                IdActividad
            )
            REFERENCES dbo.ActividadesOFSC(
                IdActividad
            )
    );

    PRINT 'Tabla dbo.HistorialAsignaciones creada correctamente.';

END
ELSE
BEGIN

    PRINT 'La tabla dbo.HistorialAsignaciones ya existe. No se realizaron cambios.';

END;