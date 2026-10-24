import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { defineServerAuth } from '@nuxtjs/better-auth/config';

const databasePath = process.env.AUTH_DATABASE_PATH || '.data/auth.sqlite';
mkdirSync(dirname(databasePath), { recursive: true });

export default defineServerAuth({
    database: new Database(databasePath),
    emailAndPassword: { enabled: true }
});
