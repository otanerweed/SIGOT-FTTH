require("dotenv").config();
const sql = require("mssql");
console.log("SERVER:", process.env.DB_SERVER);
console.log("DATABASE:", process.env.DB_DATABASE);
console.log("USER:", process.env.DB_USER);


const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: Number(process.env.DB_PORT),

    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function conectarDB() {
    try {
        const pool = await sql.connect(dbConfig);

        console.log("=======================================");
        console.log("✅ Conectado correctamente a SQL Server");
        console.log(`📁 Base de datos: ${process.env.DB_DATABASE}`);
        console.log("=======================================");

        return pool;

    } catch (error) {
        console.error("❌ Error al conectar con SQL Server");
        console.error(error);

        process.exit(1);
    }
}

module.exports = {
    conectarDB,
    sql
};