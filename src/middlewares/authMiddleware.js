const jwt = require("jsonwebtoken");

// =====================================
// VERIFICAR TOKEN JWT
// =====================================
function verificarToken(req, res, next) {
    try {
        const encabezado =
            req.headers.authorization;

        if (!encabezado) {
            return res.status(401).json({
                ok: false,
                mensaje:
                    "Debe iniciar sesión para acceder."
            });
        }

        const partes = encabezado.split(" ");

        if (
            partes.length !== 2 ||
            partes[0] !== "Bearer" ||
            !partes[1]
        ) {
            return res.status(401).json({
                ok: false,
                mensaje:
                    "El token enviado no es válido."
            });
        }

        if (!process.env.JWT_SECRET) {
            return res.status(500).json({
                ok: false,
                mensaje:
                    "La seguridad del servidor no está configurada."
            });
        }

        const token = partes[1];

        const datosUsuario = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        /*
         * Los datos del usuario autenticado
         * quedan disponibles en las rutas.
         */
        req.usuario = datosUsuario;

        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                ok: false,
                mensaje:
                    "La sesión ha expirado. Inicie sesión nuevamente."
            });
        }

        return res.status(401).json({
            ok: false,
            mensaje:
                "La sesión no es válida."
        });
    }
}

module.exports = {
    verificarToken
};