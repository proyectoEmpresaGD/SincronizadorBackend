import { eventBus } from '../events/eventBus.js';

const isDebug = process.env.DEBUG === 'true';

function nowIso() {
    return new Date().toISOString();
}

function redact(value) {
    if (!value || typeof value !== 'object') return value;

    const SENSITIVE_KEYS = new Set([
        'password',
        'pass',
        'ftpPassword',
        'FTP_PASSWORD',
        'FTP_PASS',
        'ftpHost',
        'FTP_HOST',
        'host',
    ]);

    const out = Array.isArray(value) ? [] : {};
    for (const [k, v] of Object.entries(value)) {
        if (SENSITIVE_KEYS.has(k)) {
            out[k] = '[REDACTED]';
        } else if (v && typeof v === 'object') {
            out[k] = redact(v);
        } else {
            out[k] = v;
        }
    }
    return out;
}

function emit(level, msg, data) {
    eventBus.emit('log', {
        ts: Date.now(),
        iso: nowIso(),
        level,
        msg,
        data: redact(data),
    });
}

export const logger = {
    info: (msg, data) => {
        console.log(`[${nowIso()}] INFO  - ${msg}`, redact(data) ?? '');
        emit('info', msg, data);
    },
    warn: (msg, data) => {
        console.warn(`[${nowIso()}] WARN  - ${msg}`, redact(data) ?? '');
        emit('warn', msg, data);
    },
    error: (msg, data) => {
        console.error(`[${nowIso()}] ERROR - ${msg}`, redact(data) ?? '');
        emit('error', msg, data);
    },
    debug: (msg, data) => {
        if (!isDebug) return;
        console.log(`[${nowIso()}] DEBUG - ${msg}`, redact(data) ?? '');
        emit('debug', msg, data);
    },
};
