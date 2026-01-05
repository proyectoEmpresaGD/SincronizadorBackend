import fs from 'node:fs/promises';
import path from 'node:path';
import { canEncrypt, decryptString, encryptString } from '../utils/crypto.js';

const CONFIG_FILENAME = 'config.json';

const DEFAULT_BRANDS = ['ARENA', 'CJMW', 'HARBOUR', 'BASSARI', 'FLAMENCO'];

const DEFAULT_CONFIG = {
    cronExpression: '*/30 * * * *',
    brandDelayMs: 0,
    brands: DEFAULT_BRANDS.map((name) => ({ name })),
    secure: {
        ftpHostEnc: null,
    },
};

function configPath() {
    // project root (where package.json sits)
    return path.join(process.cwd(), CONFIG_FILENAME);
}

function normalizeConfig(raw) {
    const cfg = { ...DEFAULT_CONFIG, ...(raw ?? {}) };

    cfg.brandDelayMs = Number(cfg.brandDelayMs ?? 0);
    if (!Number.isFinite(cfg.brandDelayMs) || cfg.brandDelayMs < 0) cfg.brandDelayMs = 0;

    cfg.cronExpression = String(cfg.cronExpression ?? DEFAULT_CONFIG.cronExpression).trim() || DEFAULT_CONFIG.cronExpression;

    const brands = Array.isArray(cfg.brands) ? cfg.brands : DEFAULT_CONFIG.brands;
    cfg.brands = brands
        .map((b) => ({ name: String(b?.name ?? '').trim() }))
        .filter((b) => b.name.length > 0);

    if (cfg.brands.length === 0) cfg.brands = DEFAULT_CONFIG.brands;

    cfg.secure = cfg.secure && typeof cfg.secure === 'object' ? cfg.secure : { ...DEFAULT_CONFIG.secure };
    cfg.secure.ftpHostEnc = cfg.secure.ftpHostEnc ? String(cfg.secure.ftpHostEnc) : null;

    return cfg;
}

export async function getConfig() {
    try {
        const raw = await fs.readFile(configPath(), 'utf8');
        return normalizeConfig(JSON.parse(raw));
    } catch {
        return { ...DEFAULT_CONFIG };
    }
}

export async function saveConfig(partial) {
    const current = await getConfig();
    const next = normalizeConfig({ ...current, ...partial, secure: { ...current.secure, ...(partial?.secure ?? {}) } });
    await fs.writeFile(configPath(), JSON.stringify(next, null, 2), 'utf8');
    return next;
}

export function getEffectiveFtpHost(cfg) {
    const fromEnv = String(process.env.FTP_HOST ?? '').trim();
    const enc = cfg?.secure?.ftpHostEnc;

    if (enc && canEncrypt()) {
        const dec = decryptString(enc);
        if (dec && dec.trim()) return dec.trim();
    }

    // If config contains encrypted value but encryption key is missing, fail closed (do not expose it).
    // In that case, we fall back to env.
    return fromEnv;
}

export function toSafeConfig(cfg) {
    return {
        cronExpression: cfg.cronExpression,
        brandDelayMs: cfg.brandDelayMs,
        brands: cfg.brands,
        security: {
            encryptionEnabled: canEncrypt(),
            hasCustomFtpHost: Boolean(cfg?.secure?.ftpHostEnc),
        },
    };
}

export async function setFtpHost(ftpHost) {
    const host = String(ftpHost ?? '').trim();
    if (!host) {
        // clear override
        const cfg = await getConfig();
        cfg.secure.ftpHostEnc = null;
        return await saveConfig(cfg);
    }

    if (!canEncrypt()) {
        // We intentionally refuse to store secrets without encryption.
        // FTP host isn't a credential, but user requested "no se filtre".
        throw new Error('CONFIG_ENCRYPTION_KEY no configurado (se requiere para guardar FTP_HOST de forma segura)');
    }

    const encrypted = encryptString(host);
    if (!encrypted) throw new Error('No se pudo cifrar FTP_HOST');

    const cfg = await getConfig();
    cfg.secure.ftpHostEnc = encrypted;
    return await saveConfig(cfg);
}
