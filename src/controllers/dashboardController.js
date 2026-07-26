const { conectarDB } = require("../config/database");

async function obtenerResumen(req, res) {

    try {

        const pool = await conectarDB();

        const totalOT = await pool.request().query(`
            SELECT COUNT(*) AS Total
            FROM OrdenesTrabajo
        `);

        const asignadas = await pool.request().query(`
            SELECT COUNT(*) AS Total
            FROM OrdenesTrabajo
            WHERE EstadoAsignacion='ASIGNADA'
        `);

        const pendientes = await pool.request().query(`
            SELECT COUNT(*) AS Total
            FROM OrdenesTrabajo
            WHERE EstadoAsignacion='SIN ASIGNAR'
        `);

        const tecnicos = await pool.request().query(`
            SELECT COUNT(*) AS Total
            FROM Tecnicos
            WHERE Activo=1
        `);

        res.json({
            totalOT: totalOT.recordset[0].Total,
            asignadas: asignadas.recordset[0].Total,
            pendientes: pendientes.recordset[0].Total,
            tecnicos: tecnicos.recordset[0].Total
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error Dashboard"
        });

    }

}

module.exports = {
    obtenerResumen
};