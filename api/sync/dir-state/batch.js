import { requireSyncToken } from '../../../server/middleware/auth.js';
import { upsertDirStateBatch } from '../../../server/services/syncDirStateService.js';

export default async function handler(req, res) {
  try {
    requireSyncToken(req);

    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method Not Allowed' });

    const body = req.body ?? {};
    const rows = Array.isArray(body.rows) ? body.rows : [];

    const result = await upsertDirStateBatch(rows);
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    const status = err?.statusCode || 500;
    return res.status(status).json({ ok: false, error: err?.message ?? String(err) });
  }
}
