const { sql } = require("../config/database");

async function listarOrdenes(req, res) {

    try {

        const resultado = await sql.query(`
            SELECT
                IdOrden,
                CodigoOT,
                Cliente,
                Distrito,
                FechaAgenda,
                Horario,
                EstadoOT
            FROM OrdenesTrabajo
            ORDER BY IdOrden DESC
        `);

        res.json(resultado.recordset);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error al obtener las órdenes"
        });

    }

}

module.exports = {
    listarOrdenes
};