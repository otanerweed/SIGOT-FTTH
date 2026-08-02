USE SIGOT_FTTH;
GO

/*
    Normaliza los códigos registrados.
*/
UPDATE dbo.Tecnicos
SET CodigoTecnico =
    UPPER(LTRIM(RTRIM(CodigoTecnico)))
WHERE CodigoTecnico <>
      UPPER(LTRIM(RTRIM(CodigoTecnico)));
GO

/*
    Crea un índice único para impedir
    códigos de técnico duplicados.
*/
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_Tecnicos_CodigoTecnico'
      AND object_id = OBJECT_ID('dbo.Tecnicos')
)
BEGIN
    CREATE UNIQUE INDEX UX_Tecnicos_CodigoTecnico
    ON dbo.Tecnicos (CodigoTecnico);

    PRINT 'Índice único creado correctamente.';
END
ELSEgit status
BEGIN
    PRINT 'El índice único ya existe.';
END;
GO