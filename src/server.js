require("dotenv").config({ quiet: true });

const app = require("./app");
const { conectarDB } = require("./config/database");
const {
    validarEsquema
} = require("./config/validarEsquema");

const PORT = process.env.PORT || 3001;

async function iniciarServidor() {

    const pool = await conectarDB();

    try {
        await validarEsquema(pool);
    } catch (error) {

        console.error(
            "❌ No se pudo validar el esquema de la base de datos."
        );

        console.error(
            error.message
        );

        throw error;
    }

    console.log(
        "✅ Esquema de base de datos verificado"
    );

    app.listen(PORT, () => {

        console.log("=================================");
        console.log("🚀 SIGOT-FTTH API");
        console.log("=================================");
        console.log(
            `Servidor iniciado en el puerto ${PORT}`
        );
        console.log(
            `http://localhost:${PORT}`
        );
        console.log("=================================");

    });

}

iniciarServidor().catch((error) => {

    console.error(
        "❌ No fue posible iniciar SIGOT-FTTH"
    );

    console.error(
        error.message
    );

    process.exitCode = 1;

});