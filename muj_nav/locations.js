import { loadJson } from './utils.js';

let cachedKeywords = null;

export async function getAllLocations() {
    const keywords = await getKeywordsJson();
    const locations = [];
    for (const [key, value] of Object.entries(keywords.locations)) {
        locations.push({ key, name: value.name, nodeId: String(value.nodeId) });
    }
    // stable sort by name
    locations.sort((a, b) => a.name.localeCompare(b.name));
    return locations;
}

export async function getLocationByNameOrKey(nameOrKey) {
    const nameLc = String(nameOrKey).toLowerCase();
    const keywords = await getKeywordsJson();
    for (const [key, value] of Object.entries(keywords.locations)) {
        if (key.toLowerCase() === nameLc) return { key, name: value.name, nodeId: String(value.nodeId) };
        if (value.name.toLowerCase() === nameLc) return { key, name: value.name, nodeId: String(value.nodeId) };
    }
    return null;
}

export async function getKeywordsMap() {
    const keywords = await getKeywordsJson();
    return keywords.keywords; // { key: [aliases...] }
}

async function getKeywordsJson() {
    if (!cachedKeywords) {
        try {
            cachedKeywords = await loadJson('./data/keywords.json');
        } catch (err) {
            // Fallback inline defaults if file missing
            cachedKeywords = getDefaultKeywords();
        }
    }
    return cachedKeywords;
}

function getDefaultKeywords() {
    return {
        locations: {
            library: { name: 'Central Library', nodeId: 'N3' },
            admin: { name: 'Administration Office', nodeId: 'N7' },
            canteen: { name: 'Main Canteen', nodeId: 'N5' },
            hostel: { name: 'Hostel Block', nodeId: 'N9' }
        },
        keywords: {
            library: ['library', 'books', 'reading'],
            admin: ['admin', 'fees', 'admission', 'accounts', 'office'],
            canteen: ['canteen', 'cafeteria', 'food', 'eat'],
            hostel: ['hostel', 'dorm', 'residence']
        }
    };
}

