import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'socflow.db');

async function setupDatabase() {
    console.log(`Creating database at ${DB_PATH}...`);

    const SQL = await initSqlJs();
    const db = new SQL.Database();

    try {
        const sqlPath = path.join(__dirname, 'schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Executing schema and seed...');
        db.run('PRAGMA journal_mode = WAL');
        db.run('PRAGMA foreign_keys = ON');
        db.exec(sql);

        const data = db.export();
        fs.writeFileSync(DB_PATH, Buffer.from(data));
        console.log('Database setup complete.');
    } catch (err) {
        console.error('Database setup failed:', err.message);
        process.exit(1);
    } finally {
        db.close();
    }
}

setupDatabase();
