
export class CalcularDosis {

    ejecutar(
        fecha: string,
        horaInicio: string,
        frecuenciaHoras: number
    ): Date | null {

        const fechaInicio = new Date(`${fecha}T${horaInicio}`);

        if (Number.isNaN(fechaInicio.getTime()) || !Number.isInteger(frecuenciaHoras) || frecuenciaHoras <= 0) {
            throw new Error('Los datos de la indicación no son válidos');
        }

        const ahora = new Date();

        const intervalo = frecuenciaHoras * 60 * 60 * 1000;
        const diferencia = ahora.getTime() - fechaInicio.getTime();

        if (diferencia < -30 * 60 * 1000) {
            return null;
        }

        const numeroDosis = Math.max(0, Math.floor(diferencia / intervalo));

        const horarioProgramado = new Date(fechaInicio.getTime() + numeroDosis * intervalo);

        const diferenciaHorario = Math.abs(ahora.getTime() - horarioProgramado.getTime());

        if (diferenciaHorario > 30 * 60 * 1000) {
            return null;
        }

        return horarioProgramado;
    }
}
