
import mysql, {type Connection } from 'mysql2/promise';

export class Database {
    private static instance: Database;
    private connection: Promise<Connection  >;

    private constructor() {

        this.connection = mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'hospital_utn',
        });
        
    }
    public static getInstance(): Database{
        if(!Database.instance){
            Database.instance = new Database();
        }
        return Database.instance;
    }
    public async query(sql: string, values?: any[]){
        const connection = await this.connection;

        return connection.execute(sql, values);
    }

    public async probarConexion(): Promise<boolean>{
        try{
            const connection = await this.connection;
            await connection.ping();

            console.log('Conexión exitosa');
            return true;
        }catch(error){
            console.error('Error al conectar a MySQL: ', error);
            return false;
        }
    }
}