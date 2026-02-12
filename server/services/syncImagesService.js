import { pool } from '../db/db.js';

function toDate(dateOrMs) {
  if (dateOrMs === null || dateOrMs === undefined) return null;
  if (dateOrMs instanceof Date) return dateOrMs;

  const n = Number(dateOrMs);
  if (Number.isFinite(n)) return new Date(n);

  const d = new Date(String(dateOrMs));
  return Number.isFinite(d.getTime()) ? d : null;
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
 * Regla NUEVA (según tu naming):
 *   codprodu (1ª) + tipdocasociado (2ª) + tipoambiente (3ª) + resto
 *
 * separadores: espacio, _ o -
 * Ej: "123 AMB SALON 01.jpg" => "SALON"
 */
function extraerTipoAmbienteDesdeNombre(nombreArchivo = '') {
  const base = String(nombreArchivo || '')
    .replace(/\.[^.]+$/, '')
    .trim();

  const parts = base.split(/[\s_-]+/).filter(Boolean);

  // 3ª “palabra” del nombre
  return parts[2] ? normalizarTexto(parts[2]) : null;
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
 * - AMBIENTE: codprodu|codclaarchivo|nombre
 */
function buildKey(row) {
  if (isAmbiente(row.codclaarchivo)) {
    const nombre = normalizarTexto(row.nombre || '');
    return `${row.codprodu}|${row.codclaarchivo}|${nombre || ''}`;
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
 * AMBIENTE: asegura tipoambiente siempre que sea posible (si no viene, lo derivamos)
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
      `($${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, NOW(), $${i++})`
    );

    params.push(
      r.empresa ?? '001',
      Number(r.ejercicio ?? 2025),
      String(r.codprodu),
      Number(r.linea ?? 1),
      r.descripcion ?? null,
      String(r.codclaarchivo),
      null, // nombre (NO AMBIENTE)
      null, // tipoambiente (NO AMBIENTE)
      String(r.ficadjunto),
      r.tipdocasociado ?? null,
      toDate(r.fecalta) ?? new Date(),
      toDate(r.fecftpmod) ?? null
    );
  }

  const sql = `
    INSERT INTO imagenesproductoswebp (
      empresa, ejercicio, codprodu, linea, descripcion, codclaarchivo,
      nombre, tipoambiente, ficadjunto, tipdocasociado, fecalta, fecultmod, fecftpmod
    )
    VALUES ${valuesSql.join(',')}
 ON CONFLICT (codprodu, codclaarchivo)
WHERE ((codclaarchivo)::text !~~ 'AMBIENTE_%'::text)
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
      `($${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, $${i++}, NOW(), $${i++})`
    );

    params.push(
      r.empresa ?? '001',
      Number(r.ejercicio ?? 2025),
      String(r.codprodu),
      Number(r.linea ?? 1),
      r.descripcion ?? null,
      String(r.codclaarchivo),
      r.nombre ?? null, // AMBIENTE usa nombre secuencial (AMBIENTE1, AMBIENTE2...)
      r.tipoambiente ?? null, // compatibilidad
      String(r.ficadjunto),
      r.tipdocasociado ?? null,
      toDate(r.fecalta) ?? new Date(),
      toDate(r.fecftpmod) ?? null
    );
  }

  const sql = `
    INSERT INTO imagenesproductoswebp (
      empresa, ejercicio, codprodu, linea, descripcion, codclaarchivo,
      nombre, tipoambiente, ficadjunto, tipdocasociado, fecalta, fecultmod, fecftpmod
    )
    VALUES ${valuesSql.join(',')}
ON CONFLICT (codprodu, codclaarchivo)
WHERE ((codclaarchivo)::text ~~ 'AMBIENTE_%'::text)
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

  const { ambiente, noAmbiente } = splitRows(rows);

  const ambienteEnriched = enrichTipoAmbienteAmbiente(ambiente);

  const uniqueNoAmbiente = dedupeLatestByKey(noAmbiente);
  const uniqueAmbiente = dedupeLatestByKey(ambienteEnriched);

  const insertedNoAmbiente = await upsertNoAmbiente(uniqueNoAmbiente);

  let insertedAmbiente = 0;
  try {
    insertedAmbiente = await upsertAmbiente(uniqueAmbiente);
  } catch (err) {
    // No bloqueamos el batch si falla AMBIENTE
    // Dejamos log para arreglarlo luego
    console.error('upsertAmbiente falló, se continúa con NO AMBIENTE:', err?.message ?? String(err));
  }

  return { insertedOrUpdated: insertedNoAmbiente + insertedAmbiente };
}
