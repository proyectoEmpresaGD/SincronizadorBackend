
import { pool } from '../db/pool.js';

function normalizeRow(r) {
  return {
    path: String(r.path ?? '').trim(),
    last_dir_mod: Number(r.last_dir_mod ?? r.lastDirMod ?? 0),
  };
}

export async function upsertDirState(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return 0;

  const normalized = rows.map(normalizeRow).filter(r => r.path && Number.isFinite(r.last_dir_mod));
  if (normalized.length === 0) return 0;

  const valuesSql = [];
  const params = [];
  let i = 1;

  for (const row of normalized) {
    valuesSql.push(`($${i++}, $${i++})`);
    params.push(row.path, row.last_dir_mod);
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
  return normalized.length;
}
