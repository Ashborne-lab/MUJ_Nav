export function loadJson(url) {
    return fetch(url, { cache: 'no-cache' }).then((r) => {
        if (!r.ok) throw new Error(`Failed to load ${url}: ${r.status}`);
        return r.json();
    });
}

export function euclideanDistance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function byId(id) {
    return document.getElementById(id);
}

export function setHidden(el, hidden) {
    if (!el) return;
    el.classList.toggle('hidden', hidden);
}

export function makeOverlayMessage(message, type = 'info') {
    const el = byId('overlay');
    if (!el) return;
    el.innerHTML = `<div class="overlay-msg ${type}">${message}</div>`;
}

export function clearOverlayMessage() {
    const el = byId('overlay');
    if (!el) return;
    el.innerHTML = '';
}

