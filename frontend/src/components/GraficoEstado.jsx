import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts";

function GraficoEstado({ dashboard }) {
    const data = [
        {
            name: "Asignadas",
            value: dashboard?.asignadas ?? 0
        },
        {
            name: "Pendientes",
            value: dashboard?.pendientes ?? 0
        },
        {
            name: "Finalizadas",
            value: dashboard?.finalizadas ?? 0
        },
        {
            name: "Canceladas",
            value: dashboard?.canceladas ?? 0
        }
    ];

    const colores = [
        "#0B5394",
        "#E69138",
        "#38761D",
        "#CC0000"
    ];

    const dataConValores = data.filter(
        (elemento) => elemento.value > 0
    );

    return (
        <div className="dashboardGrafico">
            <h3>Estado de las órdenes</h3>

            {dataConValores.length === 0 ? (
                <div className="dashboardSinDatos">
                    No existen órdenes para mostrar.
                </div>
            ) : (
                <ResponsiveContainer
                    width="100%"
                    height={320}
                >
                    <PieChart>
                        <Pie
                            data={dataConValores}
                            dataKey="value"
                            nameKey="name"
                            outerRadius={105}
                            label={({ name, value }) =>
                                `${name}: ${value}`
                            }
                        >
                            {dataConValores.map(
                                (elemento) => {
                                    const indiceOriginal =
                                        data.findIndex(
                                            (item) =>
                                                item.name ===
                                                elemento.name
                                        );

                                    return (
                                        <Cell
                                            key={elemento.name}
                                            fill={
                                                colores[
                                                    indiceOriginal
                                                ]
                                            }
                                        />
                                    );
                                }
                            )}
                        </Pie>

                        <Tooltip />

                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}

export default GraficoEstado;