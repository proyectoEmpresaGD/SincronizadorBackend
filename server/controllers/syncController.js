import { getStatus } from '../models/statusModel.js';
import { runSync } from '../services/syncService.js';

export async function getStatusHandler(req, res) {
    return res.json(getStatus());
}

export async function runSyncHandler(req, res) {
    const result = await runSync('manual');
    return res.json(result);
}
