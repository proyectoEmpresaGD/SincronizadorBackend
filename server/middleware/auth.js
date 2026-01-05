
export function requireSyncToken(req) {
  const expected = process.env.SYNC_API_TOKEN;
  if (!expected) throw new Error('Missing env var: SYNC_API_TOKEN');

  const received = req.headers['x-sync-token'];
  if (!received || received !== expected) {
    const err = new Error('Unauthorized');
    err.statusCode = 401;
    throw err;
  }
}
