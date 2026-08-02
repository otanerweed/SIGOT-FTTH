import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid
} from "recharts";

function GraficoTecnicos({ tecnicos }) {

    return (

        <div
            style={{
                background: "#fff",
                padding: 20,
                borderRadius: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,.12)"
            }}
        >

            <h3>Carga de Técnicos</h3>

            <ResponsiveContainer width="100%" height={300}>

                <BarChart data={tecnicos}>

                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis dataKey="NombreCompleto" />

                    <YAxis />

                    <Tooltip />

                    <Bar
                        dataKey="CapacidadActual"
                        fill="#0B5394"
                    />

                </BarChart>

            </ResponsiveContainer>

        </div>

    );

}

export default GraficoTecnicos;