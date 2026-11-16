
import mysql, { type Pool, type PoolConnection } from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

export class Database {
    private static instance: Database;
    private connection: Pool;

    private constructor() {
        this.connection = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
    }

    public static getInstance(): Database {
        if (!Database.instance) {
            Database.instance = new Database();
        }

        return Database.instance;
    }

    // Se conserva la firma compartida utilizada por los repositorios del grupo.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public async query(sql: string, values?: any[]) {
        return this.connection.execute(sql, values);
    }

    public async probarConexion(): Promise<boolean> {
        let conexion: PoolConnection | undefined;
        try {
            conexion = await this.connection.getConnection();
            await conexion.ping();

            console.log("Conexión exitosa");
            return true;
        } catch (error) {
            console.error("Error al conectar a MySQL:", error);
            return false;
        } finally {
            conexion?.release();
        }

    }

    public async withTransaction<T>(operacion: (conexion: PoolConnection) => Promise<T>): Promise<T> {
        const conexion = await this.connection.getConnection();
        let descartar = false;
        try {
            await conexion.beginTransaction();
            const resultado = await operacion(conexion);
            await conexion.commit();
            return resultado;
        } catch (error) {
            try {
                await conexion.rollback();
            } catch (errorRollback) {
                descartar = true;
                throw new AggregateError([error, errorRollback], "Falló la transacción y su rollback");
            }
            throw error;
        } finally {
            if (descartar) conexion.destroy();
            else conexion.release();
        }
    }

    public async ejecutarTransaccion<T>(
    operacion: (conexion: PoolConnection) => Promise<T>
    ): Promise<T> {
        return this.withTransaction(operacion);
    }

    public async cerrar(): Promise<void> {
        await this.connection.end();
    }
}

