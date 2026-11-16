
import type { Request, Response } from "express";

import { RegistrarPaciente } from "../../application/use-cases/admision/RegistrarPaciente.js";
import type { RegistrarPacienteDTO } from "../../application/use-cases/admision/RegistrarPaciente.js";

import { ListarPacientes } from "../../application/use-cases/pacientes/ListarPacientes.js";
import type { Paciente } from "../../domain/entities/Paciente.js";


export class PacienteController {

    constructor(
        private readonly registrarPaciente: RegistrarPaciente,
        private readonly listarPacientes: ListarPacientes
    ) {}


    // GET: Obtener todos los pacientes
    async listar(_req: Request, res: Response): Promise<void> {

        try {

            const pacientes = await this.listarPacientes.ejecutar();

            res.status(200).json({
                pacientes: pacientes.map((paciente) => this.serializarPaciente(paciente))
            });

        } catch (error) {

            console.error("Error al listar pacientes:", error);

            res.status(500).json({
                mensaje: "No se pudieron obtener los pacientes."
            });

        }

    }


    // POST: Registrar un nuevo paciente
    async registrar(req: Request, res: Response): Promise<void> {

        try {

            const cuerpo: unknown = req.body;

            if (
                !cuerpo ||
                typeof cuerpo !== "object" ||
                Array.isArray(cuerpo)
            ) {
                res.status(400).json({
                    mensaje: "Los datos enviados no son válidos."
                });
                return;
            }

            const datos = cuerpo as Record<string, unknown>;

            const camposTexto = [
                "nombre",
                "apellido",
                "dni",
                "fechaNacimiento",
                "genero",
                "telefono",
                "email"
            ];

            for (const campo of camposTexto) {

                if (
                    typeof datos[campo] !== "string" ||
                    !(datos[campo] as string).trim()
                ) {

                    res.status(400).json({
                        mensaje: `El campo ${campo} es obligatorio.`
                    });

                    return;
                }

            }

            if (
                typeof datos.obraSocial !== "number" ||
                !Number.isInteger(datos.obraSocial) ||
                datos.obraSocial <= 0
            ) {

                res.status(400).json({
                    mensaje: "La obra social debe ser un identificador numérico válido."
                });

                return;
            }

            const pacienteDTO: RegistrarPacienteDTO = {
                nombre: (datos.nombre as string).trim(),
                apellido: (datos.apellido as string).trim(),
                dni: (datos.dni as string).trim(),
                fechaNacimiento: (datos.fechaNacimiento as string).trim(),
                genero: (datos.genero as string).trim(),
                telefono: (datos.telefono as string).trim(),
                email: (datos.email as string).trim(),
                obraSocial: datos.obraSocial
            };

            const paciente = await this.registrarPaciente.ejecutar(pacienteDTO);

            res.status(201).json({
                mensaje: "Paciente registrado correctamente.",
                paciente: this.serializarPaciente(paciente)
            });

        } catch (error) {

            const mensaje = error instanceof Error
                ? error.message
                : "No se pudo registrar el paciente.";

            if (mensaje === "Ya existe un paciente registrado con ese DNI.") {

                res.status(409).json({ mensaje });
                return;

            }

            // Los errores provenientes de MySQL deben tratarse como errores internos.
            if (
                error &&
                typeof error === "object" &&
                "code" in error
            ) {

                console.error("Error de base de datos al registrar paciente:", error);

                res.status(500).json({
                    mensaje: "Ocurrió un error al guardar el paciente."
                });

                return;
            }

            res.status(400).json({ mensaje });

        }

    }


    // Convertir la entidad en un objeto JSON
    private serializarPaciente(paciente: Paciente) {

        return {
            id: paciente.id,
            nombre: paciente.nombre,
            apellido: paciente.apellido,
            dni: paciente.dni,
            fechaNacimiento: paciente.fechaNacimiento,
            genero: paciente.genero,
            telefono: paciente.telefono,
            email: paciente.email,
            obraSocial: paciente.obraSocial
        };

    }

}
