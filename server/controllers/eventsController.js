import { eventBus } from '../events/eventBus.js';

export function sseHandler(req, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    res.write(`retry: 2000\n\n`);

    const onLog = (payload) => {
        res.write(`event: log\n`);
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    const onSync = (payload) => {
        res.write(`event: sync\n`);
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    eventBus.on('log', onLog);
    eventBus.on('sync', onSync);

    req.on('close', () => {
        eventBus.off('log', onLog);
        eventBus.off('sync', onSync);
        res.end();
    });
}
