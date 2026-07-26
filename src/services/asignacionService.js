const { conectarDB, sql } = require("../config/database");

async function asignarOrdenesAutomaticamente() {

    const pool = await conectarDB();

    // Obtener órdenes sin asignar
    const ordenes = await pool.request().query(`
        SELECT *
        FROM OrdenesTrabajo
        WHERE EstadoAsignacion = 'SIN ASIGNAR'
        ORDER BY FechaAgenda
    `);

    console.log("==================================");
    console.log("Órdenes encontradas:", ordenes.recordset.length);
    console.log("==================================");

    let totalAsignadas = 0;

    for (const orden of ordenes.recordset) {

        console.log("----------------------------------");
        console.log("Procesando OT:", orden.CodigoOT);
        console.log("Distrito:", orden.Distrito);

        // ==========================================
        // Buscar técnico del mismo distrito
        // ==========================================

        let tecnico = await pool.request()
            .input("Distrito", sql.VarChar, orden.Distrito)
            .query(`
                SELECT TOP 1 *
                FROM Tecnicos
                WHERE
                    Activo = 1
                    AND Disponible = 1
                    AND DistritoBase = @Distrito
                    AND CapacidadActual < CapacidadMaxima
                ORDER BY CapacidadActual ASC
            `);

        // ==========================================
        // Si no existe en el distrito,
        // buscar cualquier técnico disponible
        // ==========================================

        if (tecnico.recordset.length === 0) {

            console.log("⚠ No existe técnico en el distrito.");
            console.log("🔍 Buscando técnico con menor carga...");

            tecnico = await pool.request().query(`
                SELECT TOP 1 *
                FROM Tecnicos
                WHERE
                    Activo = 1
                    AND Disponible = 1
                    AND CapacidadActual < CapacidadMaxima
                ORDER BY
                    CapacidadActual ASC,
                    DistritoBase ASC
            `);

        }

        console.log("Técnicos encontrados:", tecnico.recordset.length);
        console.log("Resultado consulta:", tecnico.recordset);

        if (tecnico.recordset.length === 0) {

            console.log("❌ No existe ningún técnico disponible.");

            continue;

        }

        const t = tecnico.recordset[0];

        console.log("✅ Técnico seleccionado:", t.NombreCompleto);
        console.log("Distrito del técnico:", t.DistritoBase);

        // Registrar asignación
        await pool.request()
            .input("IdOrden", sql.Int, orden.IdOrden)
            .input("IdTecnico", sql.Int, t.IdTecnico)
            .query(`
                INSERT INTO Asignaciones
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
                    1,
                    'Asignación automática SIGOT-FTTH'
                )
            `);

        // Incrementar carga del técnico
        await pool.request()
            .input("IdTecnico", sql.Int, t.IdTecnico)
            .query(`
                UPDATE Tecnicos
                SET CapacidadActual = CapacidadActual + 1
                WHERE IdTecnico = @IdTecnico
            `);

        // Cambiar estado de la OT
        await pool.request()
            .input("IdOrden", sql.Int, orden.IdOrden)
            .query(`
                UPDATE OrdenesTrabajo
                SET EstadoAsignacion = 'ASIGNADA'
                WHERE IdOrden = @IdOrden
            `);

        console.log("✅ OT asignada correctamente");

        totalAsignadas++;

    }

    console.log("==================================");
    console.log("TOTAL ASIGNADAS:", totalAsignadas);
    console.log("==================================");

    return {
        total: totalAsignadas
    };

}

module.exports = {
    asignarOrdenesAutomaticamente
};