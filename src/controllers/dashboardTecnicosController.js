const { conectarDB } = require("../config/database");

async function obtenerCargaTecnicos(req, res) {

    try {

        const pool = await conectarDB();

        const resultado = await pool.request().query(`

            SELECT

                NombreCompleto,

                CapacidadActual,

                CapacidadMaxima

            FROM Tecnicos

            ORDER BY NombreCompleto

        `);

        res.json(resultado.recordset);

    }

    catch (error) {

        console.error(error);

        res.status(500).json({

            mensaje: "Error obteniendo técnicos"

        });

    }

}

module.exports = {

    obtenerCargaTecnicos

};