
import { CalcularCostoPrestacion } from '../../use-cases/CalcularCostoPrestacion.js';
import { CoberturaPublica } from '../../domain/strategies/CoberturaPublica.js';
import { CoberturaPrepaga } from '../../domain/strategies/CoberturaPrepaga.js';
import { CoberturaParticular } from '../../domain/strategies/CoberturaParticular.js';

const valorConsulta = 15000;

const publica = new CalcularCostoPrestacion(new CoberturaPublica());
const prepaga = new CalcularCostoPrestacion(new CoberturaPrepaga(3000));
const particular = new CalcularCostoPrestacion(new CoberturaParticular());

console.log('Cobertura pública:', publica.ejecutar(valorConsulta));
console.log('Cobertura prepaga:', prepaga.ejecutar(valorConsulta));
console.log('Cobertura particular:', particular.ejecutar(valorConsulta));
