import { getConfig, saveConfig, setFtpHost, toSafeConfig } from '../models/configModel.js';
import { reschedule, getCurrentCronExpression } from '../scheduler.js';

export async function getConfigHandler(req, res) {
    const cfg = await getConfig();
    return res.json({ ...toSafeConfig(cfg), runtime: { cronExpression: getCurrentCronExpression() } });
}

export async function updateConfigHandler(req, res) {
    const body = req.body ?? {};

    const nextPartial = {};
    if (body.cronExpression !== undefined) nextPartial.cronExpression = body.cronExpression;
    if (body.brandDelayMs !== undefined) nextPartial.brandDelayMs = body.brandDelayMs;
    if (body.brands !== undefined) nextPartial.brands = body.brands;

    let cfg = await saveConfig(nextPartial);

    if (body.ftpHost !== undefined) {
        try {
            cfg = await setFtpHost(body.ftpHost);
        } catch (err) {
            return res.status(400).json({ error: err?.message ?? String(err) });
        }
    }

    await reschedule();

    return res.json({ ...toSafeConfig(cfg), runtime: { cronExpression: getCurrentCronExpression() } });
}
