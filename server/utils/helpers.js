export function normalizarNombre(nombre = '') {
    return String(nombre)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toUpperCase();
}

export function esArchivoIgnorable(nombre = '') {
    const n = String(nombre).trim();
    return (
        n.startsWith('._') ||
        n.startsWith('.') ||
        n === '.DS_Store' ||
        n.toLowerCase() === 'thumbs.db'
    );
}

export function esCarpetaExcluida(nombreCarpeta = '') {
    const n = normalizarNombre(nombreCarpeta);
    return (
        n.includes('ALTA') ||
        n.includes('BRUTOS') ||
        n.includes('PRJ') ||
        n.includes('ORIGINAL')
    );
}

export function esImagen(nombre = '') {
    const n = String(nombre).toLowerCase();
    return (
        n.endsWith('.jpg') ||
        n.endsWith('.jpeg') ||
        n.endsWith('.png') ||
        n.endsWith('.webp') ||
        n.endsWith('.tif') ||
        n.endsWith('.tiff')
    );
}

export function extraerCodigoProducto(nombre = '') {
    const s = String(nombre);
    const idx = s.indexOf(' ');
    return (idx === -1 ? s : s.slice(0, idx)).trim();
}

/* === Contexto CODCLA === */

function detectarCategoria(nombreCarpeta = '') {
    const n = normalizarNombre(nombreCarpeta);
    if (n.includes('ART')) return 'ARTISTICA';
    if (n.includes('AMBIENTE') || n.includes('AMBIENT') || n === 'AMB') return 'AMBIENTE';
    if (n.includes('PROD')) return 'PRODUCTO';
    return null;
}

function detectarCalidad(nombreCarpeta = '') {
    const n = normalizarNombre(nombreCarpeta);
    if (n.includes('BUENA') || n.includes('ALTA')) return 'BUENA';
    if (n.includes('BAJA')) return 'BAJA';
    return null;
}

export function actualizarContextoCodCla(nombreCarpeta = '', contextoPadre = null) {
    const categoriaDetectada = detectarCategoria(nombreCarpeta);
    const calidadDetectada = detectarCalidad(nombreCarpeta);

    const base = contextoPadre ?? { categoria: null, calidad: null };
    let next = { ...base };

    if (categoriaDetectada) {
        next = { categoria: categoriaDetectada, calidad: null };
    }

    if (calidadDetectada) {
        const categoriaFinal = next.categoria ?? 'PRODUCTO';
        next = { categoria: categoriaFinal, calidad: calidadDetectada };
    }

    return next;
}

export function construirCodClaArchivo(contexto = null) {
    if (!contexto?.categoria || !contexto?.calidad) return null;
    return `${contexto.categoria}_${contexto.calidad}`;
}
