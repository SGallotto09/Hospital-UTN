
import express from 'express';
import signoVitalRoutes from './infraestructure/api/signo_vital_routes.js';

const app = express();
const PORT = 3001;

// Permite recibir datos en formato JSON.
app.use(express.json());

// Conecta las rutas de signos vitales.
app.use('/api/signos-vitales', signoVitalRoutes);

// Inicia el servidor.
app.listen(PORT, () => {
    console.log(`Servidor de Atención y Enfermería funcionando en http://localhost:${PORT}`);
});
