import type { Response } from 'express';

export function responderErrorClinico(res: Response, error: unknown): void {
    if (error instanceof TypeError) {
        res.status(400).json({ mensaje: error.message });
    } else if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'ER_NO_REFERENCED_ROW_2'
    ) {
        res.status(404).json({ mensaje: 'El paciente o profesional no existe.' });
    } else {
        // No devolver ni registrar SQL o datos clínicos recibidos.
        res.status(500).json({ mensaje: 'No se pudo guardar el registro clínico.' });
    }
}
