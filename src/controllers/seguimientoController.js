const {
    obtenerSeguimientos,
    obtenerSeguimientoPorAsignacion
} = require(
    "../services/seguimientoService"
);

// =====================================
// LISTAR TODOS LOS SEGUIMIENTOS
// =====================================
async function listarSeguimientos(
    req,
    res
) {
    try {
        console.log(
            "========== LISTAR SEGUIMIENTOS =========="
        );

        const seguimientos =
            await obtenerSeguimientos();

        return res
            .status(200)
            .json(
                seguimientos
            );
    } catch (error) {
        console.error(
            "Error al listar seguimientos:",
            error
        );

        return res
            .status(500)
            .json({
                ok: false,

                mensaje:
                    "No se pudieron obtener los seguimientos de las órdenes.",

                detalle:
                    error.message
            });
    }
}

// =====================================
// LISTAR SEGUIMIENTO POR ASIGNACIÓN
// =====================================
async function listarSeguimientoPorAsignacion(
    req,
    res
) {
    try {
        const idAsignacion =
            Number(
                req.params.idAsignacion
            );

        if (
            !Number.isInteger(
                idAsignacion
            ) ||
            idAsignacion <= 0
        ) {
            return res
                .status(400)
                .json({
                    ok: false,

                    mensaje:
                        "La asignación seleccionada no es válida."
                });
        }

        const seguimientos =
            await obtenerSeguimientoPorAsignacion(
                idAsignacion
            );

        return res
            .status(200)
            .json(
                seguimientos
            );
    } catch (error) {
        console.error(
            "Error al obtener seguimiento por asignación:",
            error
        );

        return res
            .status(
                error.statusCode ||
                500
            )
            .json({
                ok: false,

                mensaje:
                    error.statusCode
                        ? error.message
                        : "No se pudo obtener el seguimiento de la asignación.",

                detalle:
                    error.statusCode
                        ? undefined
                        : error.message
            });
    }
}

module.exports = {
    listarSeguimientos,
    listarSeguimientoPorAsignacion
};