
import 'dotenv/config';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';

// Usar exclusivamente la base de pruebas.
process.env.DB_NAME = 'hospital_utn_pruebas';

// Importar después de seleccionar la base de pruebas.
const { Database } =
  await import('../../../../database/connectionDB.js');

const { RegistroPrestacionMySQLRepository } =
  await import('../../infraestructure/RegistroPrestacionMySQLRepository.js');

const { FacturarPrestacion } =
  await import('../../use-cases/FacturarPrestacion.js');

const database = Database.getInstance();

let idPaciente: number | null = null;
let idCuenta: number | null = null;

try {
  // Verificar que NO estamos usando la base principal.
  const [base] = await database.query(
    'SELECT DATABASE() AS nombre'
  );

  if (
    (base as RowDataPacket[])[0]?.nombre !== 'hospital_utn_pruebas'
  ) {
    throw new Error('Base de pruebas incorrecta');
  }

  // Crear paciente temporal.
  const [paciente] = await database.query(
    `INSERT INTO pacientes
      (nombre, apellido, dni, fecha_nacimiento,
       genero, telefono, email, obra_social)
     VALUES
      ('Paciente', 'Prueba', ?, '2000-01-01',
       'Otro', '0000000000', 'prueba@hospital.test', 0)`,
    [`TEST-PREST-${process.pid}-${Date.now()}`]
  );

  idPaciente = (paciente as ResultSetHeader).insertId;

  // Crear cuenta temporal.
  const [cuenta] = await database.query(
    `INSERT INTO cuentas_facturacion
      (id_paciente, fecha_apertura, estado)
     VALUES (?, NOW(), 'activa')`,
    [idPaciente]
  );

  idCuenta = (cuenta as ResultSetHeader).insertId;

  const repositorio = new RegistroPrestacionMySQLRepository();
  const facturar = new FacturarPrestacion(repositorio);

  // PROBAR UNA PREPAGA.
  const resultado = await facturar.ejecutar({
    idCuenta,
    concepto: 'Consulta Médica General',
    valorBase: 15000,
    tipoCobertura: 'prepaga',
    copago: 3000,
    entidadDestino: 'Prepaga de Prueba'
  });

  const [filas] = await database.query(
    `SELECT
       c.importe AS montoPaciente,
       r.importe AS montoCobertura
     FROM cargos_facturacion c
     INNER JOIN reclamos_cobertura r
       ON r.id_cargo = c.id
     WHERE c.id = ? AND c.id_cuenta = ?`,
    [resultado.idCargo, idCuenta]
  );

  const registro = (filas as RowDataPacket[])[0];

  if (
    !registro ||
    Number(registro.montoPaciente) !== 3000 ||
    Number(registro.montoCobertura) !== 12000
  ) {
    throw new Error('Los importes guardados son incorrectos');
  }

  console.log('OK: cargo de $3.000 registrado en MySQL.');
  console.log('OK: reclamo de $12.000 registrado en MySQL.');

  // PROBAR ROLLBACK:
  // El repositorio insertará el cargo, pero después
  // fallará al detectar que falta la entidad destino.
  let falloEsperado = false;

  try {
    await repositorio.registrar({
      idCuenta,
      concepto: 'Prueba de rollback',
      tipoCobertura: 'prepaga',
      montoPaciente: 3000,
      montoCobertura: 12000,
      entidadDestino: null
    });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        'Falta identificar la entidad responsable del pago'
    ) {
      falloEsperado = true;
    } else {
      throw error;
    }
  }

  if (!falloEsperado) {
    throw new Error('La operación debía haber fallado');
  }

  const [cargos] = await database.query(
    `SELECT COUNT(*) AS total
     FROM cargos_facturacion
     WHERE id_cuenta = ?`,
    [idCuenta]
  );

  const total = Number(
    (cargos as RowDataPacket[])[0]?.total
  );

  if (total !== 1) {
    throw new Error(
      'El rollback falló: quedó un cargo adicional'
    );
  }

  console.log('OK: ROLLBACK comprobado.');
  console.log('RESULTADO: INTEGRACIÓN APROBADA.');

} catch (error) {
  console.error('ERROR EN LA PRUEBA:', error);
  process.exitCode = 1;

} finally {
  // Eliminar únicamente los registros de esta prueba.
  try {
    if (idCuenta !== null) {
      await database.query(
        `DELETE r
         FROM reclamos_cobertura r
         INNER JOIN cargos_facturacion c
           ON r.id_cargo = c.id
         WHERE c.id_cuenta = ?`,
        [idCuenta]
      );

      await database.query(
        'DELETE FROM cargos_facturacion WHERE id_cuenta = ?',
        [idCuenta]
      );

      await database.query(
        'DELETE FROM cuentas_facturacion WHERE id = ?',
        [idCuenta]
      );
    }

    if (idPaciente !== null) {
      await database.query(
        'DELETE FROM pacientes WHERE id = ?',
        [idPaciente]
      );
    }

    console.log('Limpieza: registros de prueba eliminados.');

  } catch (error) {
    console.error('Error durante la limpieza:', error);
    process.exitCode = 1;
  } finally {
    await database.cerrar();
  }
}
