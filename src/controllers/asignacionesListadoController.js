const { conectarDB } = require("../config/database");

async function listarAsignaciones(req, res) {

    try {

        const pool = await conectarDB();

        const resultado = await pool.request().query(`
            SELECT

                A.IdAsignacion,

                O.CodigoOT,

                O.Cliente,

                T.NombreCompleto,

                O.Distrito,

                A.FechaAsignacion,

                A.TipoAsignacion,

                A.Estado

            FROM Asignaciones A

            INNER JOIN OrdenesTrabajo O

                ON A.IdOrden = O.IdOrden

            INNER JOIN Tecnicos T

                ON A.IdTecnico = T.IdTecnico

            ORDER BY A.FechaAsignacion DESC
        `);

        res.json(resultado.recordset);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            mensaje: "Error al listar asignaciones"
        });

    }

}

module.exports = {
    listarAsignaciones
};