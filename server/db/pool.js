
import pg from 'pg';
const { Pool } = pg;

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Missing env var: DATABASE_URL');
  return url;
}

export const pool = new Pool({
  connectionString: getDatabaseUrl(),
  ssl: process.env.PGSSLMODE === 'disable' ? false : undefined,
});
