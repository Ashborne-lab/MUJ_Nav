import { byId } from './utils.js';

export function initChatbot({ onNavigateToLocation }) {
    const input = byId('chatInput');
    const sendBtn = byId('chatSendBtn');

    async function handleSubmit() {
        const q = input.value.trim();
        if (!q) return;
        const locKey = await matchQueryToLocationKey(q);
        if (!locKey) {
            flash(`Sorry, I couldn't find that. Try keywords like library, admin, canteen.`);
            return;
        }
        onNavigateToLocation?.(locKey);
    }

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSubmit();
    });
    sendBtn.addEventListener('click', handleSubmit);
}

async function matchQueryToLocationKey(query) {
    const { getKeywordsMap } = await import('./locations.js');
    const map = await getKeywordsMap();
    const q = query.toLowerCase();
    // Exact key match first
    if (map[q]) return q;
    // Contains keywords
    for (const [key, keywords] of Object.entries(map)) {
        if (!Array.isArray(keywords)) continue;
        for (const k of keywords) {
            if (q.includes(k)) return key;
        }
    }
    return null;
}

function flash(msg) {
    const hint = document.createElement('div');
    hint.textContent = msg;
    hint.style.position = 'fixed';
    hint.style.bottom = '92px';
    hint.style.left = '50%';
    hint.style.transform = 'translateX(-50%)';
    hint.style.background = '#272b39';
    hint.style.color = '#e6e6e6';
    hint.style.padding = '8px 12px';
    hint.style.border = '1px solid #2b2f40';
    hint.style.borderRadius = '10px';
    hint.style.zIndex = '30';
    document.body.appendChild(hint);
    setTimeout(() => hint.remove(), 1600);
}

