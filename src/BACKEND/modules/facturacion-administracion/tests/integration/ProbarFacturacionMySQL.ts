/**
 * Prueba de integración manual para Facturación.
 * Guardar dentro de:
 * src/BACKEND/modules/facturacion-administracion/tests/integration/
 * Ejecutar desde la raíz del proyecto:
 * pnpm exec tsx src/BACKEND/modules/facturacion-administracion/tests/integration/ProbarFacturacionMySQL.ts
 *
 * Se conecta SOLAMENTE a hospital_utn_pruebas; crea y elimina sus registros de prueba.
 */
import 'dotenv/config';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { Database } from '../../../../database/connectionDB.js';
import { Cargo } from '../../domain/entities/Cargo.js';
import { CuentaFacturacionMySQLRepository } from '../../infraestructure/CuentaFacturacionMySQLRepository.js';
import { CargoFacturacionMySQLRepository } from '../../infraestructure/CargoFacturacionMySQLRepository.js';
import { CrearCuentaFacturacion } from '../../use-cases/CrearCuentaFacturacion.js';
import { RegistrarCargoFacturacion } from '../../use-cases/RegistrarCargoFacturacion.js';

// Anula el nombre de la base definido en .env SOLO para este proceso.
// Nunca ejecutamos esta prueba de escritura sobre la base principal.
process.env.DB_NAME = 'hospital_utn_pruebas';

async function main(): Promise<void> {
  const db = Database.getInstance();
  let idPaciente: number | null = null;
  try {
    const [base] = await db.query('SELECT DATABASE() AS nombre');
    if ((base as RowDataPacket[])[0]?.nombre !== 'hospital_utn_pruebas') {
      throw new Error('Se canceló la prueba: la conexión no apunta a hospital_utn_pruebas');
    }

    const [insertPaciente] = await db.query(
      `INSERT INTO pacientes
       (nombre, apellido, dni, fecha_nacimiento, genero, telefono, email, obra_social)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ['Paciente', 'Prueba', `PRUEBA-${Date.now()}`, '2000-01-01', 'Otro', '0000000000', 'prueba@hospital.test', 0]
    );
    idPaciente = (insertPaciente as ResultSetHeader).insertId;

    const repoCuentas = new CuentaFacturacionMySQLRepository();
    const crearCuenta = new CrearCuentaFacturacion(repoCuentas);
    const cuenta = await crearCuenta.ejecutar(idPaciente);
    const encontrada = await repoCuentas.buscarActivaPorPaciente(idPaciente);
    if (encontrada?.id !== cuenta.id) {
      throw new Error('No se pudo recuperar la cuenta creada');
    }
    console.log('OK: cuenta creada y recuperada desde MySQL.');

    let rechazoDuplicado = false;
    try {
      await crearCuenta.ejecutar(idPaciente);
    } catch (e) {
      if (e instanceof Error && e.message === 'El paciente ya tiene una cuenta activa') {
        rechazoDuplicado = true;
      } else {
        throw e;
      }
    }
    if (!rechazoDuplicado) throw new Error('Se permitió crear otra cuenta activa');
    console.log('OK: se rechazó una segunda cuenta activa.');

    const registrarCargo = new RegistrarCargoFacturacion(new CargoFacturacionMySQLRepository());
    const cargo = await registrarCargo.ejecutar(
      new Cargo(0, cuenta.id, 'Consulta médica de prueba', 15000, null)
    );
    const [datos] = await db.query(
      'SELECT importe, concepto FROM cargos_facturacion WHERE id = ? AND id_cuenta = ?',
      [cargo.id, cuenta.id]
    );
    const filas = datos as RowDataPacket[];
    if (filas.length !== 1 || Number(filas[0]?.importe) !== 15000) {
      throw new Error('El cargo no se guardó correctamente en MySQL');
    }
    console.log('OK: cargo de $15.000 guardado y leído desde MySQL.');
    console.log('RESULTADO: PRUEBA DE INTEGRACION APROBADA.');
  } finally {
    try {
      if (idPaciente !== null) {
        // Se eliminan SOLO los registros creados para este paciente de prueba.
        await db.query(
          `DELETE cf FROM cargos_facturacion cf
           INNER JOIN cuentas_facturacion c ON cf.id_cuenta = c.id
           WHERE c.id_paciente = ?`,
          [idPaciente]
        );
        await db.query('DELETE FROM cuentas_facturacion WHERE id_paciente = ?', [idPaciente]);
        await db.query('DELETE FROM pacientes WHERE id = ?', [idPaciente]);
        console.log('Limpieza: datos de prueba eliminados.');
      }
    } finally {
      await db.cerrar();
    }
  }
}

main().catch((error: unknown) => {
  console.error('FALLO LA PRUEBA:', error);
  process.exitCode = 1;
});
