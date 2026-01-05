
import { upsertImages } from '../services/syncImagesService.js';
import { upsertDirState } from '../services/dirStateService.js';

export async function upsertImagesBatch(rows) {
  const insertedOrUpdated = await upsertImages(rows);
  return { insertedOrUpdated };
}

export async function upsertDirStateBatch(rows) {
  const updated = await upsertDirState(rows);
  return { updated };
}
