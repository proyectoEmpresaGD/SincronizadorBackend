import '../config/env.js';

import pg from 'pg';

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
    throw new Error('Falta variable de entorno: DATABASE_URL');
}

// Neon normalmente requiere SSL. Si alguna vez lo necesitas desactivar, pon DB_SSL=false.
const sslEnabled = (process.env.DB_SSL ?? 'true').trim().toLowerCase() !== 'false';

export const pool = new Pool({
    connectionString: databaseUrl,
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
});
