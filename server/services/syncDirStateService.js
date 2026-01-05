import { pool } from '../db/db.js';

export async function upsertDirStateBatch(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return { updated: 0 };

  const valuesSql = [];
  const params = [];
  let i = 1;

  for (const row of rows) {
    valuesSql.push(`($${i++}, $${i++})`);
    params.push(String(row.path), Number(row.lastDirMod ?? 0));
  }

  const sql = `
    INSERT INTO ftp_sync_state (path, last_dir_mod)
    VALUES ${valuesSql.join(',')}
    ON CONFLICT (path)
    DO UPDATE SET
      last_dir_mod = EXCLUDED.last_dir_mod,
      updated_at = NOW()
  `;

  await pool.query(sql, params);

  return { updated: rows.length };
}
