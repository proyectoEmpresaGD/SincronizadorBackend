import crypto from 'node:crypto';

function getKey() {
    const raw = process.env.CONFIG_ENCRYPTION_KEY;
    if (!raw) return null;

    try {
        const buf = Buffer.from(raw, 'base64');
        if (buf.length !== 32) return null;
        return buf;
    } catch {
        return null;
    }
}

export function canEncrypt() {
    return Boolean(getKey());
}

export function encryptString(plainText) {
    const key = getKey();
    if (!key) return null;

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const ciphertext = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

export function decryptString(payloadBase64) {
    const key = getKey();
    if (!key) return null;

    const raw = Buffer.from(String(payloadBase64), 'base64');
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const ciphertext = raw.subarray(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);

    const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plain.toString('utf8');
}
