const { sql } = require("../config/database");

async function guardarOrdenes(ordenes, idOperacion) {

    for (const orden of ordenes) {

        await sql.query`
            INSERT INTO OrdenesTrabajo
            (
                IdOperacion,
                CodigoOT,
                CodigoServicio,
                ProductoPlan,
                Cliente,
                Direccion,
                Distrito,
                LatitudCliente,
                LongitudCliente,
                FechaAgenda,
                Horario,
                EstadoOT
            )
            VALUES
            (
                ${idOperacion},
                ${orden.codigoOT},
                ${orden.codigoServicio},
                ${orden.productoPlan},
                ${orden.cliente},
                ${orden.direccion},
                ${orden.distrito},
                ${orden.latitud},
                ${orden.longitud},
                ${orden.fechaAgenda},
                ${orden.horario},
                ${orden.estadoOT}
            )
        `;
    }

    return true;
}

module.exports = {
    guardarOrdenes
};