import {
    useMemo
} from "react";

import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts";

function GraficoEstado({
    kpis
}) {

    const datosKPI =
        kpis?.kpis || {};

    const data = useMemo(
        () => [
            {
                name: "Finalizadas",
                value:
                    Number(
                        datosKPI.finalizadas
                    ) || 0
            },
            {
                name: "No realizadas",
                value:
                    Number(
                        datosKPI.noRealizados
                    ) || 0
            }
        ],
        [
            datosKPI.finalizadas,
            datosKPI.noRealizados
        ]
    );

    const colores = [
        "#38761D",
        "#CC0000"
    ];

    const dataConValores =
        data.filter(
            (elemento) =>
                elemento.value > 0
        );

    return (
        <div className="dashboardGrafico">

            <div className="dashboardGraficoEncabezado">

                <div>
                    <h3>
                        Resultado de actividades
                    </h3>

                    <p>
                        Finalizadas y no realizadas según los filtros aplicados.
                    </p>
                </div>

            </div>

            <div className="dashboardGraficoProyectoActivo">

                Mostrando:{" "}

                <strong>
                    RED WINET
                </strong>

            </div>

            {dataConValores.length === 0 ? (

                <div className="dashboardSinDatos">
                    No existen actividades RED WINET para los filtros seleccionados.
                </div>

            ) : (

                <ResponsiveContainer
                    width="100%"
                    height={320}
                >
                    <PieChart>

                        <Pie
                            data={
                                dataConValores
                            }
                            dataKey="value"
                            nameKey="name"
                            outerRadius={105}
                            label={
                                ({
                                    name,
                                    value
                                }) =>
                                    `${name}: ${value}`
                            }
                        >

                            {dataConValores.map(
                                (
                                    elemento
                                ) => {

                                    const indiceOriginal =
                                        data.findIndex(
                                            (
                                                item
                                            ) =>
                                                item.name ===
                                                elemento.name
                                        );

                                    return (
                                        <Cell
                                            key={
                                                elemento.name
                                            }
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