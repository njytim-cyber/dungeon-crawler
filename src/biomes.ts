// ===== DUNGEON BIOMES =====
// Visual themes for floor ranges

export interface BiomeDef {
    name: string;
    floorColor: string;
    wallColor: string;
    wallAccent: string;
    ambientColor: string;   // overlay tint
    ambientAlpha: number;
    particleColor: string;
    icon: string;
}

const BIOMES: BiomeDef[] = [
    // Floors 1-10: Mossy Sewers
    {
        name: 'Mossy Sewers', floorColor: '#2d3436', wallColor: '#353b48', wallAccent: '#487eb0',
        ambientColor: '30,60,30', ambientAlpha: 0.08, particleColor: '#2ecc71', icon: '🌿'
    },
    // Floors 11-20: Bone Catacombs
    {
        name: 'Bone Catacombs', floorColor: '#3d3530', wallColor: '#4a403a', wallAccent: '#d4c5a9',
        ambientColor: '50,40,30', ambientAlpha: 0.06, particleColor: '#ecf0f1', icon: '💀'
    },
    // Floors 21-30: Spider Caves
    {
        name: 'Spider Caves', floorColor: '#1e272e', wallColor: '#2c3e50', wallAccent: '#6c5ce7',
        ambientColor: '40,20,60', ambientAlpha: 0.1, particleColor: '#a29bfe', icon: '🕷️'
    },
    // Floors 31-40: Frozen Caverns
    {
        name: 'Frozen Caverns', floorColor: '#dfe6e9', wallColor: '#b2bec3', wallAccent: '#74b9ff',
        ambientColor: '100,150,255', ambientAlpha: 0.08, particleColor: '#74b9ff', icon: '❄️'
    },
    // Floors 41-50: Mushroom Grotto
    {
        name: 'Mushroom Grotto', floorColor: '#2d3436', wallColor: '#3d4f3d', wallAccent: '#00b894',
        ambientColor: '0,100,80', ambientAlpha: 0.06, particleColor: '#55efc4', icon: '🍄'
    },
    // Floors 51-60: Volcanic Core
    {
        name: 'Volcanic Core', floorColor: '#2d1f1f', wallColor: '#4a2020', wallAccent: '#e17055',
        ambientColor: '150,40,0', ambientAlpha: 0.1, particleColor: '#ff7675', icon: '🌋'
    },
    // Floors 61-70: Crystal Depths
    {
        name: 'Crystal Depths', floorColor: '#0c0c2e', wallColor: '#1a1a4e', wallAccent: '#a29bfe',
        ambientColor: '80,60,200', ambientAlpha: 0.08, particleColor: '#6c5ce7', icon: '💎'
    },
    // Floors 71-80: Shadow Realm
    {
        name: 'Shadow Realm', floorColor: '#0a0a0a', wallColor: '#1a1a1a', wallAccent: '#636e72',
        ambientColor: '0,0,0', ambientAlpha: 0.12, particleColor: '#636e72', icon: '🌑'
    },
    // Floors 81-90: Dragon's Lair
    {
        name: "Dragon's Lair", floorColor: '#3d1f00', wallColor: '#5a2d0a', wallAccent: '#fdcb6e',
        ambientColor: '150,80,0', ambientAlpha: 0.08, particleColor: '#ffeaa7', icon: '🐉'
    },
    // Floors 91-100: The Abyss
    {
        name: 'The Abyss', floorColor: '#050510', wallColor: '#0a0a20', wallAccent: '#e74c3c',
        ambientColor: '80,0,20', ambientAlpha: 0.12, particleColor: '#e74c3c', icon: '🔥'
    },
];

export function getBiome(floor: number): BiomeDef {
    if (floor <= 0) return BIOMES[0];
    const idx = Math.min(Math.floor((floor - 1) / 10), BIOMES.length - 1);
    return BIOMES[idx];
}

export function getBiomeName(floor: number): string {
    return getBiome(floor).name;
}
