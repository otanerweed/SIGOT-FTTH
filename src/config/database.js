require("dotenv").config({ quiet: true });

const sql = require("mssql");

function leerBooleanoEntorno(
    valor,
    valorPredeterminado
) {
    if (
        valor === undefined ||
        valor === null ||
        String(valor).trim() === ""
    ) {
        return valorPredeterminado;
    }

    return [
        "1",
        "TRUE",
        "SI",
        "SÍ"
    ].includes(
        String(valor)
            .trim()
            .toUpperCase()
    );
}

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: Number(process.env.DB_PORT),

    connectionTimeout: 15000,
    requestTimeout: 60000,

    options: {
        encrypt:
            leerBooleanoEntorno(
                process.env.DB_ENCRYPT,
                false
            ),

        trustServerCertificate:
            leerBooleanoEntorno(
                process.env.DB_TRUST_SERVER_CERTIFICATE,
                true
            ),

        tdsVersion: "7_4"
    },

    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 60000
    },

    validateConnection: true
};

let pool = null;
let poolConnecting = null;

async function conectarDB() {

    /*
     * Reutilizar únicamente un pool que esté
     * realmente conectado y saludable.
     */
    if (
        pool &&
        pool.connected &&
        pool.healthy
    ) {
        return pool;
    }

    /*
     * Si ya existe una conexión en proceso,
     * todos esperan la misma promesa.
     */
    if (poolConnecting) {
        return poolConnecting;
    }

    /*
     * Si existe un pool anterior pero ya no está
     * saludable, dejamos de utilizarlo.
     */
    if (pool) {
        try {
            await pool.close();
        } catch (error) {
            console.error(
                "⚠️ No se pudo cerrar el pool anterior:",
                error.message
            );
        }

        pool = null;
    }

    /*
     * Crear un pool independiente y explícito.
     */
    const nuevoPool =
        new sql.ConnectionPool(
            dbConfig
        );

    poolConnecting =
        nuevoPool
            .connect()
            .then((conexion) => {

                pool = conexion;

                /*
                 * Capturar errores posteriores del pool
                 * sin tumbar el proceso de Node.
                 */
                pool.on(
                    "error",
                    (error) => {

                        console.error(
                            "❌ Error en el pool SQL:",
                            error.message
                        );

                        if (
                            pool === conexion
                        ) {
                            pool = null;
                        }
                    }
                );

                console.log(
                    "======================================="
                );

                console.log(
                    "✅ Conectado correctamente a SQL Server"
                );

                console.log(
                    `📁 Base de datos: ${process.env.DB_DATABASE}`
                );

                console.log(
                    "======================================="
                );

                return pool;
            })
            .catch((error) => {

                pool = null;

                console.error(
                    "❌ Error al conectar con SQL Server"
                );

                console.error(
                    error.message
                );

                throw error;
            })
            .finally(() => {

                poolConnecting = null;

            });

    return poolConnecting;
}

module.exports = {
    conectarDB,
    sql,
    dbConfig,
    leerBooleanoEntorno
};