import { eventBus } from '../events/eventBus.js';
import { getConfig } from '../models/configModel.js';
import { setBrandProgress, setFinished, setRunning } from '../models/statusModel.js';
import { logger } from '../utils/logger.js';
import { sincronizarFTP } from '../ftp/ftpSync.js';

let currentRunPromise = null;

export async function runSync(source = 'manual') {
    if (currentRunPromise) return currentRunPromise;

    currentRunPromise = (async () => {
        setRunning({ source });
        eventBus.emit('sync', { type: 'syncStart', ts: Date.now(), source });

        try {
            const cfg = await getConfig();
            const brands = cfg.brands.map((b) => b.name);

            const stats = await sincronizarFTP({
                brands,
                brandDelayMs: cfg.brandDelayMs,
                onProgress: (evt) => {
                    eventBus.emit('sync', evt);

                    if (evt.type === 'brandStart') {
                        setBrandProgress({ brand: evt.brand, index: evt.index, total: evt.total });
                    }
                },
            });

            setFinished({ ok: true, stats });
            eventBus.emit('sync', { type: 'syncEnd', ts: Date.now(), ok: true, stats });
            return { ok: true, stats };
        } catch (err) {
            const message = err?.message ?? String(err);
            logger.error('Error en sincronización', { message });

            setFinished({ ok: false, errorMessage: message });
            eventBus.emit('sync', { type: 'syncEnd', ts: Date.now(), ok: false, error: message });
            return { ok: false, error: message };
        } finally {
            currentRunPromise = null;
        }
    })();

    return currentRunPromise;
}
