const status = {
    running: false,
    source: null,
    startedAt: null,
    finishedAt: null,
    lastSuccessAt: null,
    lastErrorAt: null,
    lastErrorMessage: null,
    lastStats: null,
    currentBrand: null,
    brandIndex: null,
    brandTotal: null,
};

export function getStatus() {
    return { ...status };
}

export function setRunning(payload) {
    status.running = true;
    status.source = payload.source ?? null;
    status.startedAt = Date.now();
    status.finishedAt = null;
    status.lastErrorMessage = null;
    status.currentBrand = null;
    status.brandIndex = null;
    status.brandTotal = null;
}

export function setBrandProgress({ brand, index, total }) {
    status.currentBrand = brand ?? null;
    status.brandIndex = Number.isFinite(index) ? index : null;
    status.brandTotal = Number.isFinite(total) ? total : null;
}

export function setFinished({ ok, stats, errorMessage }) {
    status.running = false;
    status.finishedAt = Date.now();
    status.lastStats = stats ?? null;

    if (ok) {
        status.lastSuccessAt = Date.now();
    } else {
        status.lastErrorAt = Date.now();
        status.lastErrorMessage = errorMessage ?? 'Error desconocido';
    }
}
