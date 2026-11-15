
import express from 'express';
import signoVitalRoutes from './infraestructure/api/signos-vitales/signo_vital_routes.js';
import pacienteInternadoRoutes from './infraestructure/api/pacientes-internados/paciente_internado_routes.js';
import administracionMedicacionRoutes from './infraestructure/api/administracion-medicacion/administracion_medicacion_routes.js';

const app = express();
const PORT = 3001;

app.use(express.json());

// Conecta las rutas de signos vitales.
app.use('/api/signos-vitales', signoVitalRoutes);

// Conecta las rutas de pacientes internados
app.use('/api/pacientes-internados', pacienteInternadoRoutes);

//Conecta las ruats de administracioin medicacion
app.use('/api/administracion-medicacion', administracionMedicacionRoutes);

// Inicia el servidor.
app.listen(PORT, () => {
    console.log(`Servidor de Atención y Enfermería funcionando en http://localhost:${PORT}`);
});
