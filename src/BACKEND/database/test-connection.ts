import { Database } from "./connectionDB.js";

async function main() {
    const db = Database.getInstance();
    await db.probarConexion();
}
main();