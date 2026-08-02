function TablaAsignaciones({ asignaciones }) {

    return (

        <>

            <h2>Asignaciones Realizadas</h2>

            <table border="1" width="100%">

                <thead>

                    <tr>

                        <th>OT</th>

                        <th>Cliente</th>

                        <th>Técnico</th>

                        <th>Distrito</th>

                        <th>Fecha</th>

                        <th>Tipo</th>

                        <th>Estado</th>

                    </tr>

                </thead>

                <tbody>

                    {

                        asignaciones.map((a) => (

                            <tr key={a.IdAsignacion}>

                                <td>{a.CodigoOT}</td>

                                <td>{a.Cliente}</td>

                                <td>{a.NombreCompleto}</td>

                                <td>{a.Distrito}</td>

                                <td>{a.FechaAsignacion?.substring(0,10)}</td>

                                <td>{a.TipoAsignacion}</td>

                                <td>{a.Estado}</td>

                            </tr>

                        ))

                    }

                </tbody>

            </table>

        </>

    );

}

export default TablaAsignaciones;