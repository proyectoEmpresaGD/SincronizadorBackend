
import { pool } from '../db/pool.js';

function normalizeRow(r) {
  return {
    empresa: String(r.empresa ?? '001'),
    ejercicio: Number(r.ejercicio ?? 2025),
    codprodu: String(r.codprodu ?? '').trim(),
    linea: Number(r.linea ?? 1),
    descripcion: r.descripcion ?? null,
    codclaarchivo: String(r.codclaarchivo ?? '').trim(),
    ficadjunto: String(r.ficadjunto ?? '').trim(),
    tipdocasociado: r.tipdocasociado ?? null,
    fecalta: r.fecalta ? new Date(r.fecalta) : new Date(),
    fecftpmod: r.fecftpmod ? new Date(r.fecftpmod) : null,
  };
}

export async function upsertImages(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return 0;

  const normalized = rows.map(normalizeRow).filter(r => r.codprodu && r.codclaarchivo);
  if (normalized.length === 0) return 0;

  const valuesSql = [];
  const params = [];
  let i = 1;

  for (const r of normalized) {
    valuesSql.push(
      `($${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, NOW(), $${i++})`
    );
    params.push(
      r.empresa,
      r.ejercicio,
      r.codprodu,
      r.linea,
      r.descripcion,
      r.codclaarchivo,
      r.ficadjunto,
      r.tipdocasociado,
      r.fecalta,
      r.fecftpmod
    );
  }

  const sql = `
    INSERT INTO imagenesocproductos_test (
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
  return normalized.length;
}
