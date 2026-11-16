
import mysql, { type Pool } from "mysql2/promise";
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

    public async query(sql: string, values?: any[]) {
        return this.connection.execute(sql, values);
    }

    public async probarConexion(): Promise<boolean> {
        try {
            const conexion = await this.connection.getConnection();
            await conexion.ping();
            conexion.release();

            console.log("Conexión exitosa");
            return true;
        } catch (error) {
            console.error("Error al conectar a MySQL:", error);
            return false;
        }
    }

    }

