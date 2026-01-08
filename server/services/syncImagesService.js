import { pool } from '../db/db.js';

function toMs(dateOrMs) {
  if (!dateOrMs) return null;
  if (dateOrMs instanceof Date) return dateOrMs;
  const n = Number(dateOrMs);
  return Number.isFinite(n) ? new Date(n) : null;
}

function dedupeByKey(rows) {
  const map = new Map();
  for (const r of rows) {
    const key = `${r.codprodu}|${r.codclaarchivo}`;
    const prev = map.get(key);
    const rMs = r?.fecftpmod ? new Date(r.fecftpmod).getTime() : 0;
    const pMs = prev?.fecftpmod ? new Date(prev.fecftpmod).getTime() : 0;
    if (!prev || rMs >= pMs) map.set(key, r);
  }
  return Array.from(map.values());
}

export async function upsertImagesBatch(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return { insertedOrUpdated: 0 };

  const uniqueRows = dedupeByKey(rows);

  const valuesSql = [];
  const params = [];
  let i = 1;

  for (const r of uniqueRows) {
    valuesSql.push(
      `($${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, NOW(), $${i++})`
    );

    params.push(
      r.empresa ?? '001',
      Number(r.ejercicio ?? 2025),
      String(r.codprodu),
      Number(r.linea ?? 1),
      r.descripcion ?? null,
      String(r.codclaarchivo),
      String(r.ficadjunto),
      r.tipdocasociado ?? null,
      toMs(r.fecalta) ?? new Date(),
      toMs(r.fecftpmod) ?? null
    );
  }

  const sql = `
    INSERT INTO imagenesftpproductos (
      empresa, ejercicio, codprodu, linea, descripcion, codclaarchivo,
      ficadjunto, tipdocasociado, fecalta, fecultmod, fecftpmod
    )
    VALUES ${valuesSql.join(',')}
    ON CONFLICT (codprodu, codclaarchivo)
    DO UPDATE SET
      ficadjunto = EXCLUDED.ficadjunto,
      fecultmod = NOW(),
      fecftpmod = EXCLUDED.fecftpmod
  `;

  await pool.query(sql, params);

  return { insertedOrUpdated: uniqueRows.length };
}
