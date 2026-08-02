USE SIGOT_FTTH;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE
        name = 'UX_Usuarios_Usuario'
        AND object_id = OBJECT_ID('dbo.Usuarios')
)
BEGIN
    CREATE UNIQUE INDEX UX_Usuarios_Usuario
    ON dbo.Usuarios (Usuario);

    PRINT 'Índice único de usuarios creado correctamente.';
END
ELSE
BEGIN
    PRINT 'El índice único de usuarios ya existe.';
END;
GO
