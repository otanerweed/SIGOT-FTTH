require("dotenv").config();

const app = require("./app");
const { conectarDB } = require("./config/database");

const PORT = process.env.PORT || 3001;

async function iniciarServidor() {

    await conectarDB();

    app.listen(PORT, () => {

        console.log("=================================");
        console.log("🚀 SIGOT-FTTH API");
        console.log("=================================");
        console.log(`Servidor iniciado en el puerto ${PORT}`);
        console.log(`http://localhost:${PORT}`);
        console.log("=================================");

    });

}

iniciarServidor();