import { byId, setHidden } from './utils.js';

// Lightweight QR scanning using qr-scanner if available; fall back to manual input only
// Exposes openQrModal({ onResult(text) })

let qrScanner = null;

export function openQrModal({ onResult }) {
    const modal = byId('qrModal');
    const overlay = byId('overlay');
    const video = byId('qrVideo');
    const closeBtn = byId('qrCloseBtn');
    const manualInput = byId('manualQrInput');
    const manualSubmit = byId('manualQrSubmit');

    function cleanup() {
        try { if (qrScanner) { qrScanner.stop(); qrScanner.destroy(); } } catch (_) {}
        qrScanner = null;
        setHidden(modal, true);
        setHidden(overlay, true);
    }

    setHidden(overlay, false);
    setHidden(modal, false);

    closeBtn.onclick = cleanup;
    manualSubmit.onclick = () => {
        const text = manualInput.value.trim();
        if (text) onResult?.(text);
        cleanup();
    };

    // dynamic import only if available
    import('./libs/qr-scanner.min.js').then(({ default: QrScanner }) => {
        // QrScanner expects a video element
        qrScanner = new QrScanner(video, (res) => {
            if (res && res.data) {
                onResult?.(res.data);
                cleanup();
            }
        }, { highlightScanRegion: true, highlightCodeOutline: true });
        qrScanner.start().catch(() => {
            // ignore; user will use manual input
        });
    }).catch(() => {
        // Library not present; rely on manual input
    });
}

