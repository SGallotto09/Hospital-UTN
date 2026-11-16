import { SignoVitalRepositoryMySQL } from '../../infraestructure/repositories/signo_vital_repository_mysql.js';

async function main() {
    const repositorio = new SignoVitalRepositoryMySQL();

    try{
        const signos = await repositorio.obtenerPorPaciente(1);
        console.log('Signos vitales del paciente 1: ');

        console.log(signos);
    }catch(error){
        console.error('Error al obtener los signos vitales: ', error);
    }
}
main();
