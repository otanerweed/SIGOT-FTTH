const tecnicoModel = require("../models/tecnicoModel");

// ===============================
// NORMALIZAR DATOS DEL TÉCNICO
// ===============================
function normalizarDatosTecnico(
    datos = {},
    tecnicoExistente = null
) {
    return {
        CodigoTecnico: String(
            datos.CodigoTecnico || ""
        )
            .trim()
            .toUpperCase(),

        NombreCompleto: String(
            datos.NombreCompleto || ""
        ).trim(),

        Telefono: datos.Telefono
            ? String(datos.Telefono).trim()
            : null,

        TipoTecnico: String(
            datos.TipoTecnico || ""
        ).trim(),

        DistritoBase: String(
            datos.DistritoBase || ""
        ).trim(),

        CapacidadMaxima: Number(
            datos.CapacidadMaxima
        ),

        Disponible:
            typeof datos.Disponible === "boolean"
                ? datos.Disponible
                : tecnicoExistente?.Disponible ??
                  true
    };
}

// ===============================
// VALIDAR DATOS DEL TÉCNICO
// ===============================
function validarDatosTecnico(datos) {
    if (
        !datos.CodigoTecnico ||
        !datos.NombreCompleto ||
        !datos.TipoTecnico ||
        !datos.DistritoBase
    ) {
        return "Complete todos los campos obligatorios.";
    }

    if (
        !Number.isInteger(datos.CapacidadMaxima) ||
        datos.CapacidadMaxima <= 0
    ) {
        return "La capacidad máxima debe ser un número entero mayor que cero.";
    }

    if (datos.CodigoTecnico.length > 20) {
        return "El código del técnico no puede superar los 20 caracteres.";
    }

    if (datos.NombreCompleto.length > 150) {
        return "El nombre del técnico no puede superar los 150 caracteres.";
    }

    return null;
}

// ===============================
// LISTAR TÉCNICOS
// ===============================
async function listarTecnicos(req, res) {
    try {
        const tecnicos =
            await tecnicoModel.obtenerTecnicos();

        return res.status(200).json(tecnicos);
    } catch (error) {
        console.error(
            "Error al obtener técnicos:",
            error
        );

        return res.status(500).json({
            mensaje: "Error al obtener técnicos"
        });
    }
}

// ===============================
// OBTENER TÉCNICO POR ID
// ===============================
async function obtenerTecnico(req, res) {
    try {
        const { id } = req.params;

        const tecnico =
            await tecnicoModel.obtenerTecnicoPorId(id);

        if (!tecnico) {
            return res.status(404).json({
                mensaje: "Técnico no encontrado"
            });
        }

        return res.status(200).json(tecnico);
    } catch (error) {
        console.error(
            "Error al obtener el técnico:",
            error
        );

        return res.status(500).json({
            mensaje: "Error interno del servidor"
        });
    }
}

// ===============================
// CREAR TÉCNICO
// ===============================
async function crearTecnico(req, res) {
    try {
        const datos =
            normalizarDatosTecnico(req.body);

        const errorValidacion =
            validarDatosTecnico(datos);

        if (errorValidacion) {
            return res.status(400).json({
                mensaje: errorValidacion
            });
        }

        const tecnicoDuplicado =
            await tecnicoModel.obtenerTecnicoPorCodigo(
                datos.CodigoTecnico
            );

        if (tecnicoDuplicado) {
            return res.status(409).json({
                mensaje:
                    `Ya existe un técnico registrado con el código ${datos.CodigoTecnico}.`
            });
        }

        const resultado =
            await tecnicoModel.crearTecnico(datos);

        return res.status(201).json({
            mensaje:
                "Técnico registrado correctamente",
            IdTecnico: resultado.IdTecnico
        });
    } catch (error) {
        console.error(
            "Error al registrar el técnico:",
            error
        );

        return res.status(500).json({
            mensaje:
                "Error al registrar el técnico"
        });
    }
}

// ===============================
// ACTUALIZAR TÉCNICO
// ===============================
async function actualizarTecnico(req, res) {
    try {
        const { id } = req.params;

        const tecnicoExistente =
            await tecnicoModel.obtenerTecnicoPorId(id);

        if (!tecnicoExistente) {
            return res.status(404).json({
                mensaje: "Técnico no encontrado"
            });
        }

        const datos =
            normalizarDatosTecnico(
                req.body,
                tecnicoExistente
            );

        const errorValidacion =
            validarDatosTecnico(datos);

        if (errorValidacion) {
            return res.status(400).json({
                mensaje: errorValidacion
            });
        }

        const tecnicoDuplicado =
            await tecnicoModel.obtenerTecnicoPorCodigo(
                datos.CodigoTecnico,
                Number(id)
            );

        if (tecnicoDuplicado) {
            return res.status(409).json({
                mensaje:
                    `El código ${datos.CodigoTecnico} ya pertenece a otro técnico.`
            });
        }

        const resultado =
            await tecnicoModel.actualizarTecnico(
                id,
                datos
            );

        if (!resultado.FilasAfectadas) {
            return res.status(404).json({
                mensaje:
                    "No se pudo actualizar el técnico."
            });
        }

        return res.status(200).json({
            mensaje:
                "Técnico actualizado correctamente"
        });
    } catch (error) {
        console.error(
            "Error al actualizar el técnico:",
            error
        );

        return res.status(500).json({
            mensaje:
                "Error al actualizar el técnico"
        });
    }
}

// ===============================
// ACTIVAR O DESACTIVAR TÉCNICO
// ===============================
async function actualizarEstadoTecnico(req, res) {
    try {
        const { id } = req.params;
        const { Activo } = req.body;

        if (typeof Activo !== "boolean") {
            return res.status(400).json({
                mensaje:
                    "El campo Activo debe ser verdadero o falso."
            });
        }

        const tecnicoExistente =
            await tecnicoModel.obtenerTecnicoPorId(id);

        if (!tecnicoExistente) {
            return res.status(404).json({
                mensaje: "Técnico no encontrado"
            });
        }

        const resultado =
            await tecnicoModel.actualizarEstadoTecnico(
                id,
                Activo
            );

        if (!resultado.FilasAfectadas) {
            return res.status(404).json({
                mensaje:
                    "No se pudo actualizar el estado del técnico."
            });
        }

        return res.status(200).json({
            mensaje: Activo
                ? "Técnico activado correctamente"
                : "Técnico desactivado correctamente"
        });
    } catch (error) {
        console.error(
            "Error al actualizar el estado del técnico:",
            error
        );

        return res.status(500).json({
            mensaje:
                "Error al actualizar el estado del técnico"
        });
    }
}
function obtenerIdUsuarioAutenticado(req) {
    const idUsuario = Number(
        req.usuario?.idUsuario
    );

    return (
        Number.isInteger(idUsuario) &&
        idUsuario > 0
    )
        ? idUsuario
        : null;
}

// ===============================
// OBTENER DISPONIBILIDAD
// ===============================
async function obtenerDisponibilidad(req, res) {
    try {
        const { id } = req.params;

        const tecnico =
            await tecnicoModel.obtenerTecnicoPorId(id);

        if (!tecnico) {
            return res.status(404).json({
                mensaje: "Técnico no encontrado"
            });
        }

        const disponibilidad =
            await tecnicoModel
                .obtenerDisponibilidadTecnico(id);

        return res.status(200).json({
            tecnico: {
                IdTecnico: tecnico.IdTecnico,
                CodigoTecnico:
                    tecnico.CodigoTecnico,
                NombreCompleto:
                    tecnico.NombreCompleto
            },
            disponibilidad
        });
    } catch (error) {
        console.error(
            "Error al obtener disponibilidad del técnico:",
            error
        );

        return res.status(500).json({
            mensaje:
                "No se pudo obtener la disponibilidad del técnico."
        });
    }
}

// ===============================
// GUARDAR DISPONIBILIDAD
// ===============================
async function guardarDisponibilidad(req, res) {
    try {
        const { id } = req.params;

        const idUsuario =
            obtenerIdUsuarioAutenticado(req);

        if (!idUsuario) {
            return res.status(401).json({
                mensaje:
                    "No se pudo identificar al usuario autenticado."
            });
        }

        const tecnico =
            await tecnicoModel.obtenerTecnicoPorId(id);

        if (!tecnico) {
            return res.status(404).json({
                mensaje: "Técnico no encontrado"
            });
        }

        if (!tecnico.Activo) {
            return res.status(409).json({
                mensaje:
                    "No se puede registrar disponibilidad para un técnico inactivo."
            });
        }

        const {
            FechaVigencia,
            DisponibleAM,
            DisponiblePM,
            NocturnoConfirmado,
            Motivo,
            Observaciones
        } = req.body;

        if (
            !FechaVigencia ||
            !/^\d{4}-\d{2}-\d{2}$/.test(
                String(FechaVigencia)
            )
        ) {
            return res.status(400).json({
                mensaje:
                    "Debe indicar una fecha válida en formato AAAA-MM-DD."
            });
        }

        if (
            typeof DisponibleAM !== "boolean" ||
            typeof DisponiblePM !== "boolean" ||
            typeof NocturnoConfirmado !== "boolean"
        ) {
            return res.status(400).json({
                mensaje:
                    "Los campos de disponibilidad deben ser verdadero o falso."
            });
        }

        const motivo = String(
            Motivo || ""
        ).trim();

        const observaciones = String(
            Observaciones || ""
        ).trim();

        if (motivo.length > 250) {
            return res.status(400).json({
                mensaje:
                    "El motivo no puede superar 250 caracteres."
            });
        }

        if (observaciones.length > 500) {
            return res.status(400).json({
                mensaje:
                    "Las observaciones no pueden superar 500 caracteres."
            });
        }

        const resultado =
            await tecnicoModel
                .guardarDisponibilidadTecnico(
                    id,
                    {
                        FechaVigencia,
                        DisponibleAM,
                        DisponiblePM,
                        NocturnoConfirmado,
                        Motivo: motivo,
                        Observaciones:
                            observaciones
                    },
                    idUsuario
                );

        return res.status(200).json({
            mensaje: resultado?.Creado
                ? "Disponibilidad registrada correctamente."
                : "Disponibilidad actualizada correctamente.",
            disponibilidad: resultado
        });
    } catch (error) {
        console.error(
            "Error al guardar disponibilidad del técnico:",
            error
        );

        return res.status(500).json({
            mensaje:
                "No se pudo guardar la disponibilidad del técnico."
        });
    }
}
// ===============================
// EXPORTAR FUNCIONES
// ===============================
module.exports = {
    listarTecnicos,
    obtenerTecnico,
    crearTecnico,
    actualizarTecnico,
    actualizarEstadoTecnico,
    obtenerDisponibilidad,
    guardarDisponibilidad
};