import mysql, { type Pool, type PoolConnection} from "mysql2/promise";

export class Database {
    private static instance: Database;

    private pool: Pool;

    private constructor() {

        this.pool = mysql.createPool({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'hospital_utn',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    }

    // Implementación del patrón Singleton
    public static getInstance(): Database {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }

    // Ejecutar consultas SQL normales
    public async query(sql: string, values?: any[]) {
        if (values === undefined) {
            return this.pool.execute(sql);
        }
        return this.pool.execute(sql, values);
    }

    // Ejecutar operaciones dentro de una transacción
    public async ejecutarTransaccion<T>(
        operacion: (connection: PoolConnection) => Promise<T>
    ): Promise<T> {
        // Obtener una conexión exclusiva del pool
        const connection = await this.pool.getConnection();
        let transaccionIniciada = false;
        try {
            // Iniciar transacción
            await connection.beginTransaction();
            transaccionIniciada = true;

            // Ejecutar las operaciones solicitadas
            const resultado = await operacion(connection);

            // Confirmar los cambios
            await connection.commit();
            transaccionIniciada = false;

            return resultado;
        } catch (error) {
            // Si ocurre un error, revertir los cambios
            if (transaccionIniciada) {
                try {
                    await connection.rollback();
                } catch (errorRollback) {
                    console.error('Error al revertir la transacción:',errorRollback);
                }
            }

            throw error;

        } finally {

            // Devolver la conexión al pool
            connection.release();
        }
    }

    // Comprobar la conexión con MySQL
    public async probarConexion(): Promise<boolean> {
        let connection: PoolConnection | undefined;
        try {
            connection = await this.pool.getConnection();

            await connection.ping();

            console.log('Conexión exitosa');

            return true;

        } catch (error) {
            console.error('Error al conectar a MySQL:', error);

            return false;
        } finally {
            connection?.release();
        }

    }

    // Cerrar todas las conexiones del pool
    public async cerrarConexion(): Promise<void> {
        await this.pool.end();
    }
}
