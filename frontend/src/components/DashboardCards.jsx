import "./Dashboard.css";

function DashboardCards({ dashboard }) {
    const cards = [
        {
            titulo: "Total de OTs",
            valor: dashboard?.totalOT ?? 0,
            icono: "📋"
        },
        {
            titulo: "Asignadas",
            valor: dashboard?.asignadas ?? 0,
            icono: "✅"
        },
        {
            titulo: "Pendientes",
            valor: dashboard?.pendientes ?? 0,
            icono: "⏳"
        },
        {
            titulo: "Finalizadas",
            valor: dashboard?.finalizadas ?? 0,
            icono: "🏁"
        },
        {
            titulo: "Canceladas",
            valor: dashboard?.canceladas ?? 0,
            icono: "❌"
        },
        {
            titulo: "Técnicos activos",
            valor: dashboard?.tecnicos ?? 0,
            icono: "👷"
        },
        {
            titulo: "Técnicos disponibles",
            valor: dashboard?.tecnicosDisponibles ?? 0,
            icono: "🟢"
        },
        {
            titulo: "Operaciones",
            valor: dashboard?.totalOperaciones ?? 0,
            icono: "📁",
            detalle:
                `${dashboard?.operacionesAbiertas ?? 0} abiertas`
        }
    ];

    return (
        <div className="dashboardCards">
            {cards.map((card) => (
                <div
                    className="dashboardCard"
                    key={card.titulo}
                >
                    <div className="icono">
                        {card.icono}
                    </div>

                    <h2>{card.valor}</h2>

                    <p>{card.titulo}</p>

                    {card.detalle && (
                        <span className="dashboardCardDetalle">
                            {card.detalle}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
}

export default DashboardCards;