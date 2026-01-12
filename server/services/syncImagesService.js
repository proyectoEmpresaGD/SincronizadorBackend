import { pool } from '../db/db.js';

function toMs(dateOrMs) {
  if (!dateOrMs) return null;
  if (dateOrMs instanceof Date) return dateOrMs;

  const n = Number(dateOrMs);
  return Number.isFinite(n) ? new Date(n) : null;
}

function normalizarTexto(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase();
}

function isAmbiente(codclaarchivo = '') {
  return normalizarTexto(codclaarchivo).startsWith('AMBIENTE_');
}

/**
 * Devuelve el nombre de archivo a partir de una URL o ruta.
 * Ej:
 *  - "https://x/y/123%20SALON%2001.jpg" => "123 SALON 01.jpg"
 *  - "/a/b/123 SALON 01.jpg" => "123 SALON 01.jpg"
 */
function extraerNombreArchivoDesdeFicAdjunto(ficadjunto = '') {
  const s = String(ficadjunto || '').trim();
  if (!s) return '';

  const last = s.split('/').pop() || s;

  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

/**
 * Regla: segunda "palabra" del nombre (sin extensión),
 * separadores: espacio, _ o -
 * Ej: "123 SALON 01.jpg" => "SALON"
 */
function extraerTipoAmbienteDesdeNombre(nombreArchivo = '') {
  const base = String(nombreArchivo || '')
    .replace(/\.[^.]+$/, '')
    .trim();

  const parts = base.split(/[\s_-]+/).filter(Boolean);
  return parts[1] ? normalizarTexto(parts[1]) : null;
}

function getTipoAmbienteFromRow(row) {
  const tipoDirecto = normalizarTexto(row.tipoambiente || '');
  if (tipoDirecto) return tipoDirecto;

  const nombre = extraerNombreArchivoDesdeFicAdjunto(row.ficadjunto);
  const tipoFromName = extraerTipoAmbienteDesdeNombre(nombre);

  return tipoFromName || null;
}

/**
 * Key:
 * - NO AMBIENTE: codprodu|codclaarchivo
 * - AMBIENTE: codprodu|codclaarchivo|tipoAmbiente
 */
function buildKey(row) {
  if (isAmbiente(row.codclaarchivo)) {
    const tipo = getTipoAmbienteFromRow(row);
    return `${row.codprodu}|${row.codclaarchivo}|${tipo || ''}`;
  }
  return `${row.codprodu}|${row.codclaarchivo}`;
}

/**
 * Dedupe por key quedándose con el más nuevo por fecftpmod
 */
function dedupeLatestByKey(rows) {
  const map = new Map();

  for (const r of rows) {
    const key = buildKey(r);
    const prev = map.get(key);

    const rMs = r?.fecftpmod ? new Date(r.fecftpmod).getTime() : 0;
    const pMs = prev?.fecftpmod ? new Date(prev.fecftpmod).getTime() : 0;

    if (!prev || rMs >= pMs) map.set(key, r);
  }

  return Array.from(map.values());
}

function splitRows(rows) {
  const ambiente = [];
  const noAmbiente = [];

  for (const r of rows) {
    if (isAmbiente(r.codclaarchivo)) ambiente.push(r);
    else noAmbiente.push(r);
  }

  return { ambiente, noAmbiente };
}

/**
 * AMBIENTE: asegura tipoAmbiente siempre que sea posible (si no viene, lo derivamos)
 * NO AMBIENTE: se mantiene null
 */
function enrichTipoAmbienteAmbiente(rows) {
  return rows.map((r) => {
    const tipo = getTipoAmbienteFromRow(r);
    return { ...r, tipoambiente: tipo || null };
  });
}

async function upsertNoAmbiente(rows) {
  if (rows.length === 0) return 0;

  const valuesSql = [];
  const params = [];
  let i = 1;

  for (const r of rows) {
    valuesSql.push(
      `($${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, NOW(), $${i++})`
    );

    params.push(
      r.empresa ?? '001',
      Number(r.ejercicio ?? 2025),
      String(r.codprodu),
      Number(r.linea ?? 1),
      r.descripcion ?? null,
      String(r.codclaarchivo),
      null, // tipoambiente (NO AMBIENTE)
      String(r.ficadjunto),
      r.tipdocasociado ?? null,
      toMs(r.fecalta) ?? new Date(),
      toMs(r.fecftpmod) ?? null
    );
  }

  const sql = `
    INSERT INTO imagenesftpproductos (
      empresa, ejercicio, codprodu, linea, descripcion, codclaarchivo,
      tipoambiente, ficadjunto, tipdocasociado, fecalta, fecultmod, fecftpmod
    )
    VALUES ${valuesSql.join(',')}
    ON CONFLICT (codprodu, codclaarchivo)
    DO UPDATE SET
      ficadjunto = EXCLUDED.ficadjunto,
      fecultmod = NOW(),
      fecftpmod = EXCLUDED.fecftpmod
  `;

  await pool.query(sql, params);
  return rows.length;
}

async function upsertAmbiente(rows) {
  if (rows.length === 0) return 0;

  const valuesSql = [];
  const params = [];
  let i = 1;

  for (const r of rows) {
    valuesSql.push(
      `($${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, NOW(), $${i++})`
    );

    params.push(
      r.empresa ?? '001',
      Number(r.ejercicio ?? 2025),
      String(r.codprodu),
      Number(r.linea ?? 1),
      r.descripcion ?? null,
      String(r.codclaarchivo),
      r.tipoambiente ?? null, // AMBIENTE usa tipoAmbiente
      String(r.ficadjunto),
      r.tipdocasociado ?? null,
      toMs(r.fecalta) ?? new Date(),
      toMs(r.fecftpmod) ?? null
    );
  }

  const sql = `
    INSERT INTO imagenesftpproductos (
      empresa, ejercicio, codprodu, linea, descripcion, codclaarchivo,
      tipoambiente, ficadjunto, tipdocasociado, fecalta, fecultmod, fecftpmod
    )
    VALUES ${valuesSql.join(',')}
    ON CONFLICT (codprodu, tipoambiente, codclaarchivo)
    DO UPDATE SET
      ficadjunto = EXCLUDED.ficadjunto,
      fecultmod = NOW(),
      fecftpmod = EXCLUDED.fecftpmod
  `;

  await pool.query(sql, params);
  return rows.length;
}

export async function upsertImagesBatch(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { insertedOrUpdated: 0 };
  }

  // 1) Separamos AMBIENTE / NO AMBIENTE
  const { ambiente, noAmbiente } = splitRows(rows);

  // 2) AMBIENTE: aseguramos tipoAmbiente (si no viene, lo derivamos)
  const ambienteEnriched = enrichTipoAmbienteAmbiente(ambiente);

  // 3) Dedupe:
  //    - NO AMBIENTE por codprodu+codclaarchivo
  //    - AMBIENTE por codprodu+codclaarchivo+tipoAmbiente
  const uniqueNoAmbiente = dedupeLatestByKey(noAmbiente);
  const uniqueAmbiente = dedupeLatestByKey(ambienteEnriched);

  // 4) Upserts separados (mantiene comportamiento actual en todo lo que no es AMBIENTE)
  const insertedNoAmbiente = await upsertNoAmbiente(uniqueNoAmbiente);
  const insertedAmbiente = await upsertAmbiente(uniqueAmbiente);

  return { insertedOrUpdated: insertedNoAmbiente + insertedAmbiente };
}
