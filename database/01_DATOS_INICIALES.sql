USE SIGOT_FTTH_ENTREGA;
GO

SET NOCOUNT ON;
GO

/* ============================================================
   SIGOT-FTTH
   DATOS INICIALES PARA EJECUTAR EL SISTEMA
   ============================================================ */


/* ============================================================
   1. ROLES
   ============================================================ */

IF NOT EXISTS (
    SELECT 1
    FROM dbo.Roles
    WHERE Nombre = 'Administrador'
)
BEGIN
    INSERT INTO dbo.Roles (Nombre, Descripcion)
    VALUES ('Administrador', 'Control total del sistema');
END;
GO


IF NOT EXISTS (
    SELECT 1
    FROM dbo.Roles
    WHERE Nombre = 'Coordinador'
)
BEGIN
    INSERT INTO dbo.Roles (Nombre, Descripcion)
    VALUES ('Coordinador', 'Gestiona la operación diaria');
END;
GO


IF NOT EXISTS (
    SELECT 1
    FROM dbo.Roles
    WHERE Nombre = 'Supervisor'
)
BEGIN
    INSERT INTO dbo.Roles (Nombre, Descripcion)
    VALUES ('Supervisor', 'Monitorea indicadores');
END;
GO


IF NOT EXISTS (
    SELECT 1
    FROM dbo.Roles
    WHERE Nombre = 'Consulta'
)
BEGIN
    INSERT INTO dbo.Roles (Nombre, Descripcion)
    VALUES ('Consulta', 'Solo lectura');
END;
GO


/* ============================================================
   2. USUARIO ADMINISTRADOR DE DEMOSTRACIÓN
   ============================================================ */

DECLARE @IdRolAdministrador INT;

SELECT @IdRolAdministrador = IdRol
FROM dbo.Roles
WHERE Nombre = 'Administrador';


IF NOT EXISTS (
    SELECT 1
    FROM dbo.Usuarios
    WHERE Usuario = 'admin_demo'
)
BEGIN
    INSERT INTO dbo.Usuarios
    (
        IdRol,
        NombreCompleto,
        Usuario,
        PasswordHash,
        Correo,
        Estado,
        FechaRegistro
    )
    VALUES
    (
        @IdRolAdministrador,
        'Administrador Demo',
        'admin_demo',

        -- Contraseña: Sigot2026!
        '$2b$10$YtifhxUhOMZbSIaTzatZ1.uuzFCLRM9gzJgqFD4ZqcpE3CrvOwtga',

        'admin@sigot.local',
        1,
        GETDATE()
    );

    PRINT 'Usuario Administrador de demostración creado correctamente.';
END
ELSE
BEGIN
    PRINT 'El usuario admin_demo ya existe.';
END;
GO


/* ============================================================
   3. VALIDACIÓN
   ============================================================ */

SELECT
    R.IdRol,
    R.Nombre,
    R.Descripcion
FROM dbo.Roles R
ORDER BY R.IdRol;


SELECT
    U.IdUsuario,
    U.NombreCompleto,
    U.Usuario,
    U.Correo,
    R.Nombre AS Rol,
    U.Estado
FROM dbo.Usuarios U
INNER JOIN dbo.Roles R
    ON R.IdRol = U.IdRol
WHERE U.Usuario = 'admin_demo';
GO