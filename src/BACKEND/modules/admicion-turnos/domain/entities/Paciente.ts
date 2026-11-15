
export interface PacienteProps {
    id: number | null;
    nombre: string;
    apellido: string;
    dni: string;
    fechaNacimiento: string;
    genero: string;
    telefono: string;
    email: string;
    obraSocial: number;
}

export type NuevoPacienteProps = Omit<PacienteProps, "id"> & {
    id?: number | null;
};

export class Paciente {

    public readonly id: number | null;
    public readonly nombre: string;
    public readonly apellido: string;
    public readonly dni: string;
    public readonly genero: string;
    public readonly telefono: string;
    public readonly email: string;
    public readonly obraSocial: number;

    private readonly _fechaNacimiento: string;

    private constructor(props: PacienteProps) {

        this.validarId(props.id);

        this.id = props.id;
        this.nombre = this.validarTexto(props.nombre, "nombre");
        this.apellido = this.validarTexto(props.apellido, "apellido");
        this.dni = this.validarTexto(props.dni, "dni");
        this.genero = this.validarTexto(props.genero, "genero");
        this.telefono = this.validarTexto(props.telefono, "telefono");
        this.email = this.validarTexto(props.email, "email");

        this.validarEmail(this.email);
        this.validarFechaNacimiento(props.fechaNacimiento);

        if (!Number.isSafeInteger(props.obraSocial) || props.obraSocial <= 0) {
            throw new Error("El identificador de obra social no es válido.");
        }

        this.obraSocial = props.obraSocial;
        this._fechaNacimiento = props.fechaNacimiento;
    }

    static crear(props: NuevoPacienteProps): Paciente {

        return new Paciente({
            ...props,
            id: props.id ?? null
        });
    }

    static reconstituir(props: PacienteProps): Paciente {
        return new Paciente(props);
    }

    get fechaNacimiento(): string {
        return this._fechaNacimiento;
    }

    get edad(): number {

        const hoy = new Date();

        const partes = this._fechaNacimiento.split("-");

        const anio = Number(partes[0]);
        const mes = Number(partes[1]);
        const dia = Number(partes[2]);

        let edad = hoy.getFullYear() - anio;

        const aunNoCumplio =
            hoy.getMonth() + 1 < mes ||
            (
                hoy.getMonth() + 1 === mes &&
                hoy.getDate() < dia
            );

        if (aunNoCumplio) {
            edad--;
        }

        return edad;
    }

    private validarId(id: number | null): void {

        if (
            id !== null &&
            (!Number.isSafeInteger(id) || id <= 0)
        ) {
            throw new Error("El identificador del paciente no es válido.");
        }
    }

    private validarTexto(valor: string, campo: string): string {

        const texto = valor.trim();

        if (!texto || texto.length > 45) {
            throw new Error(
                `El campo ${campo} es obligatorio y admite hasta 45 caracteres.`
            );
        }

        return texto;
    }

    private validarEmail(email: string): void {

        const formatoEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!formatoEmail.test(email)) {
            throw new Error("El correo electrónico no es válido.");
        }
    }

    private validarFechaNacimiento(fecha: string): void {

        const formatoFecha = /^\d{4}-\d{2}-\d{2}$/;

        if (!formatoFecha.test(fecha)) {
            throw new Error(
                "La fecha de nacimiento debe tener el formato YYYY-MM-DD."
            );
        }

        const partes = fecha.split("-");

        const anio = Number(partes[0]);
        const mes = Number(partes[1]);
        const dia = Number(partes[2]);

        const fechaValidada = new Date(anio, mes - 1, dia);

        if (
            !Number.isInteger(anio) ||
            !Number.isInteger(mes) ||
            !Number.isInteger(dia) ||
            fechaValidada.getFullYear() !== anio ||
            fechaValidada.getMonth() !== mes - 1 ||
            fechaValidada.getDate() !== dia
        ) {
            throw new Error("La fecha de nacimiento no es válida.");
        }

        const hoy = new Date();

        const fechaHoy = [
            hoy.getFullYear(),
            String(hoy.getMonth() + 1).padStart(2, "0"),
            String(hoy.getDate()).padStart(2, "0")
        ].join("-");

        if (fecha > fechaHoy) {
            throw new Error("La fecha de nacimiento no puede ser futura.");
        }
    }
}
