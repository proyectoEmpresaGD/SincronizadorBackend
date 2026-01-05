export function requireSyncToken(req) {
  const token = req.headers['x-sync-token'];
  const expected = process.env.SYNC_API_TOKEN;

  if (!expected) {
    const err = new Error('SYNC_API_TOKEN no configurado en el servidor');
    err.statusCode = 500;
    throw err;
  }

  if (!token || token !== expected) {
    const err = new Error('Unauthorized');
    err.statusCode = 401;
    throw err;
  }
}
