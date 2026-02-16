// ===== ASSET GENERATOR =====
// Generates all pixel-art sprites dynamically via offscreen canvas

import type { ClassName, EnemyType, NPCType, Rarity } from './types';

const TILE = 16;

const cache: Record<string, any> = {};

function createCanvas(w: number, h: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
}

function generateFloor(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#3d3528';
    ctx.fillRect(0, 0, TILE, TILE);
    for (let i = 0; i < 8; i++) {
        const x = Math.floor(Math.random() * TILE);
        const y = Math.floor(Math.random() * TILE);
        ctx.fillStyle = `hsl(35, 10%, ${18 + Math.random() * 10}%)`;
        ctx.fillRect(x, y, 2, 2);
    }
    ctx.strokeStyle = '#2a2318';
    ctx.strokeRect(0, 0, TILE, TILE);
    return c;
}

function generateWall(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#2a2a3d';
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#222235';
    ctx.fillRect(0, 0, TILE, 1);
    ctx.fillRect(0, 7, TILE, 1);
    ctx.fillRect(0, 0, 1, 8);
    ctx.fillRect(8, 0, 1, 8);
    ctx.fillRect(4, 8, 1, 8);
    ctx.fillRect(12, 8, 1, 8);
    ctx.fillStyle = '#333348';
    ctx.fillRect(2, 2, 5, 4);
    ctx.fillRect(10, 2, 5, 4);
    ctx.fillRect(6, 10, 5, 4);
    return c;
}

function generateDoor(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#3d3528';
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(3, 1, 10, 14);
    ctx.fillStyle = '#4a2a0a';
    ctx.fillRect(4, 2, 8, 12);
    ctx.fillStyle = '#d4a030';
    ctx.fillRect(10, 7, 2, 2);
    return c;
}

function generateStairs(down: boolean): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#3d3528';
    ctx.fillRect(0, 0, TILE, TILE);
    const color = down ? '#555' : '#8a8';
    for (let i = 0; i < 5; i++) {
        ctx.fillStyle = color;
        ctx.fillRect(2 + i, 2 + i * 2, TILE - 4 - i * 2, 3);
        ctx.fillStyle = '#333';
        ctx.fillRect(2 + i, 4 + i * 2, TILE - 4 - i * 2, 1);
    }
    return c;
}

function generateChest(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#3d3528';
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#7a5a2a';
    ctx.fillRect(3, 5, 10, 8);
    ctx.fillStyle = '#9a7a3a';
    ctx.fillRect(4, 6, 8, 6);
    ctx.fillStyle = '#d4a030';
    ctx.fillRect(6, 8, 4, 2);
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(3, 9, 10, 1);
    return c;
}

function generateChestOpen(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#3d3528';
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(3, 5, 10, 8);
    ctx.fillStyle = '#4a2a0a';
    ctx.fillRect(4, 6, 8, 6);
    ctx.fillStyle = '#7a5a2a';
    ctx.fillRect(3, 2, 10, 4);
    return c;
}

function generateTrap(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#3d3528';
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#4a3020';
    ctx.fillRect(3, 3, 10, 10);
    ctx.fillStyle = '#888';
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            ctx.fillRect(4 + i * 3, 4 + j * 3, 2, 2);
        }
    }
    return c;
}

const CLASS_COLORS: Record<ClassName, { body: string; head: string; detail: string }> = {
    warrior: { body: '#c0392b', head: '#e8c170', detail: '#7f1d1d' },
    mage: { body: '#2980b9', head: '#e8c170', detail: '#1a4d70' },
    rogue: { body: '#2c3e50', head: '#e8c170', detail: '#1a252f' },
    paladin: { body: '#f39c12', head: '#e8c170', detail: '#b87400' },
    ranger: { body: '#27ae60', head: '#e8c170', detail: '#196f3d' },
    necromancer: { body: '#8e44ad', head: '#c8b0d0', detail: '#5b2c6f' },
    berserker: { body: '#d35400', head: '#e8c170', detail: '#a04000' },
    cleric: { body: '#ecf0f1', head: '#e8c170', detail: '#bdc3c7' },
    assassin: { body: '#1a1a2e', head: '#c0b0a0', detail: '#0d0d1a' },
};

function generateCharacter(className: ClassName, dir: number, frame: number): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;
    const colors = CLASS_COLORS[className];
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(4, 13, 8, 2);
    ctx.fillStyle = colors.body;
    ctx.fillRect(5, 7, 6, 6);
    ctx.fillStyle = colors.detail;
    ctx.fillRect(5, 10, 6, 3);
    ctx.fillStyle = colors.head;
    ctx.fillRect(5, 3, 6, 5);

    ctx.fillStyle = '#222';
    if (dir === 0) { ctx.fillRect(6, 5, 1, 1); ctx.fillRect(9, 5, 1, 1); }
    else if (dir === 2) { ctx.fillRect(5, 5, 1, 1); }
    else if (dir === 3) { ctx.fillRect(10, 5, 1, 1); }

    const legOffset = frame % 2 === 0 ? 0 : 1;
    ctx.fillStyle = colors.detail;
    ctx.fillRect(5 + legOffset, 13, 2, 2);
    ctx.fillRect(9 - legOffset, 13, 2, 2);
    return c;
}

const ENEMY_COLORS: Record<EnemyType, { color: string; eyeColor: string }> = {
    slime: { color: '#2ecc71', eyeColor: '#fff' },
    skeleton: { color: '#ddd', eyeColor: '#e74c3c' },
    bat: { color: '#8e44ad', eyeColor: '#ff0' },
    ghost: { color: '#aac', eyeColor: '#fff' },
    goblin: { color: '#7a9a2a', eyeColor: '#ff0' },
    spider: { color: '#5a3a2a', eyeColor: '#f00' },
    orc: { color: '#5a7a3a', eyeColor: '#ff0' },
    demon: { color: '#c0392b', eyeColor: '#ff0' },
    wraith: { color: '#557', eyeColor: '#0ff' },
    golem: { color: '#777', eyeColor: '#f80' },
    drake: { color: '#d35400', eyeColor: '#ff0' },
    lich: { color: '#336', eyeColor: '#0f0' },
};

function generateEnemy(type: EnemyType, frame: number): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;
    const info = ENEMY_COLORS[type];

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(4, 13, 8, 2);

    if (type === 'slime') {
        const bounce = frame % 2 === 0 ? 0 : -1;
        ctx.fillStyle = info.color;
        ctx.beginPath();
        ctx.ellipse(8, 10 + bounce, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = info.eyeColor;
        ctx.fillRect(6, 8 + bounce, 2, 2);
        ctx.fillRect(10, 8 + bounce, 2, 2);
        ctx.fillStyle = '#222';
        ctx.fillRect(7, 9 + bounce, 1, 1);
        ctx.fillRect(11, 9 + bounce, 1, 1);
    } else if (type === 'bat') {
        const wingY = frame % 2 === 0 ? 0 : 2;
        ctx.fillStyle = info.color;
        ctx.fillRect(6, 6, 4, 4);
        ctx.fillRect(2, 5 - wingY, 4, 3);
        ctx.fillRect(10, 5 - wingY, 4, 3);
        ctx.fillStyle = info.eyeColor;
        ctx.fillRect(7, 7, 1, 1);
        ctx.fillRect(9, 7, 1, 1);
    } else if (type === 'ghost') {
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = info.color;
        ctx.fillRect(4, 3, 8, 10);
        ctx.fillRect(4, 12, 2, 2);
        ctx.fillRect(8, 12, 2, 2);
        ctx.globalAlpha = 1;
        ctx.fillStyle = info.eyeColor;
        ctx.fillRect(6, 6, 2, 2);
        ctx.fillRect(10, 6, 2, 2);
    } else {
        ctx.fillStyle = info.color;
        ctx.fillRect(5, 3, 6, 5);
        ctx.fillRect(4, 7, 8, 6);
        const legOff = frame % 2 === 0 ? 0 : 1;
        ctx.fillRect(5 + legOff, 13, 2, 2);
        ctx.fillRect(9 - legOff, 13, 2, 2);
        ctx.fillStyle = info.eyeColor;
        ctx.fillRect(6, 5, 1, 1);
        ctx.fillRect(9, 5, 1, 1);
    }
    return c;
}

function generateBoss(floor: number, frame: number): HTMLCanvasElement {
    const c = createCanvas(TILE * 2, TILE * 2);
    const ctx = c.getContext('2d')!;
    const hue = (floor * 36) % 360;
    const color = `hsl(${hue}, 60%, 40%)`;
    const light = `hsl(${hue}, 70%, 60%)`;

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(4, 26, 24, 4);

    ctx.fillStyle = color;
    ctx.fillRect(6, 4, 20, 22);
    ctx.fillStyle = light;
    ctx.fillRect(8, 6, 16, 8);

    ctx.fillStyle = '#ff0';
    ctx.fillRect(10, 9, 3, 3);
    ctx.fillRect(19, 9, 3, 3);
    ctx.fillStyle = '#f00';
    ctx.fillRect(11, 10, 2, 2);
    ctx.fillRect(20, 10, 2, 2);

    ctx.fillStyle = light;
    ctx.fillRect(8, 2, 3, 4);
    ctx.fillRect(21, 2, 3, 4);

    const leg = frame % 2 === 0 ? 0 : 1;
    ctx.fillStyle = color;
    ctx.fillRect(8 + leg, 26, 5, 4);
    ctx.fillRect(19 - leg, 26, 5, 4);
    return c;
}

function generateItemIcon(type: string, rarity: Rarity): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;

    const rarityColors: Record<Rarity, string> = { common: '#aaa', uncommon: '#2ecc71', rare: '#3498db', legendary: '#e67e22' };
    const rc = rarityColors[rarity];

    switch (type) {
        case 'sword':
            ctx.fillStyle = '#aaa'; ctx.fillRect(7, 2, 2, 10);
            ctx.fillStyle = '#8a6a2a'; ctx.fillRect(5, 11, 6, 2);
            ctx.fillStyle = rc; ctx.fillRect(7, 1, 2, 2);
            break;
        case 'axe':
            ctx.fillStyle = '#8a6a2a'; ctx.fillRect(7, 4, 2, 10);
            ctx.fillStyle = '#aaa'; ctx.fillRect(4, 2, 5, 4);
            ctx.fillStyle = rc; ctx.fillRect(4, 3, 2, 2);
            break;
        case 'staff':
            ctx.fillStyle = '#6a4a2a'; ctx.fillRect(7, 4, 2, 11);
            ctx.fillStyle = rc; ctx.fillRect(5, 1, 6, 4); ctx.fillRect(7, 0, 2, 2);
            break;
        case 'dagger':
            ctx.fillStyle = '#aaa'; ctx.fillRect(8, 3, 2, 7);
            ctx.fillStyle = '#555'; ctx.fillRect(6, 10, 5, 2);
            ctx.fillStyle = rc; ctx.fillRect(8, 2, 2, 2);
            break;
        case 'bow':
            ctx.fillStyle = '#8a6a2a'; ctx.fillRect(5, 3, 2, 10);
            ctx.fillStyle = '#aaa'; ctx.fillRect(7, 4, 4, 1); ctx.fillRect(7, 8, 4, 1); ctx.fillRect(7, 12, 4, 1);
            ctx.fillStyle = rc; ctx.fillRect(10, 5, 1, 7);
            break;
        case 'armor':
            ctx.fillStyle = rc; ctx.fillRect(4, 3, 8, 8);
            ctx.fillStyle = '#555'; ctx.fillRect(5, 4, 6, 6);
            ctx.fillStyle = rc; ctx.fillRect(6, 5, 4, 4);
            break;
        case 'shield':
            ctx.fillStyle = rc; ctx.fillRect(4, 2, 8, 10);
            ctx.fillStyle = '#555'; ctx.fillRect(5, 3, 6, 8);
            ctx.fillStyle = '#d4a030'; ctx.fillRect(7, 5, 2, 4);
            break;
        case 'ring':
            ctx.fillStyle = rc; ctx.fillRect(5, 5, 6, 6);
            ctx.fillStyle = '#0a0a0f'; ctx.fillRect(6, 6, 4, 4);
            ctx.fillStyle = '#fff'; ctx.fillRect(6, 5, 2, 1);
            break;
        case 'potion_hp':
            ctx.fillStyle = '#e74c3c'; ctx.fillRect(5, 6, 6, 7);
            ctx.fillStyle = '#c0392b'; ctx.fillRect(6, 4, 4, 3);
            ctx.fillStyle = '#aaa'; ctx.fillRect(6, 3, 4, 2);
            break;
        case 'potion_mp':
            ctx.fillStyle = '#3498db'; ctx.fillRect(5, 6, 6, 7);
            ctx.fillStyle = '#2980b9'; ctx.fillRect(6, 4, 4, 3);
            ctx.fillStyle = '#aaa'; ctx.fillRect(6, 3, 4, 2);
            break;
        case 'scroll':
            ctx.fillStyle = '#e8d8b0'; ctx.fillRect(4, 3, 8, 10);
            ctx.fillStyle = '#c8b890';
            ctx.fillRect(5, 4, 6, 1); ctx.fillRect(5, 6, 6, 1);
            ctx.fillRect(5, 8, 6, 1); ctx.fillRect(5, 10, 4, 1);
            break;
        case 'key':
            ctx.fillStyle = '#d4a030'; ctx.fillRect(5, 3, 4, 4);
            ctx.fillStyle = '#0a0a0f'; ctx.fillRect(6, 4, 2, 2);
            ctx.fillStyle = '#d4a030'; ctx.fillRect(7, 7, 2, 6);
            ctx.fillRect(8, 10, 3, 2);
            break;
        default:
            ctx.fillStyle = '#888'; ctx.fillRect(4, 4, 8, 8);
    }
    return c;
}

function generateNPC(type: NPCType): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;
    const colors: Record<NPCType, { body: string; head: string; hat: string }> = {
        merchant: { body: '#d4a030', head: '#e8c170', hat: '#7a5a2a' },
        healer: { body: '#ecf0f1', head: '#e8c170', hat: '#e74c3c' },
        sage: { body: '#8e44ad', head: '#e8c170', hat: '#6c3483' },
    };
    const info = colors[type];
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(4, 13, 8, 2);
    ctx.fillStyle = info.body; ctx.fillRect(5, 7, 6, 6);
    ctx.fillStyle = info.head; ctx.fillRect(5, 3, 6, 5);
    ctx.fillStyle = info.hat; ctx.fillRect(4, 1, 8, 3);
    ctx.fillStyle = '#222'; ctx.fillRect(6, 5, 1, 1); ctx.fillRect(9, 5, 1, 1);
    ctx.fillRect(7, 7, 2, 1);
    ctx.fillStyle = '#5a3a1a'; ctx.fillRect(5, 13, 2, 2); ctx.fillRect(9, 13, 2, 2);
    return c;
}

function generateDroppedItem(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#3d3528'; ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(6, 6, 4, 4);
    ctx.fillStyle = '#fff';
    ctx.fillRect(7, 7, 2, 2);
    return c;
}

export function initAssets(): void {
    cache.floor = generateFloor();
    cache.wall = generateWall();
    cache.door = generateDoor();
    cache.stairsDown = generateStairs(true);
    cache.stairsUp = generateStairs(false);
    cache.chest = generateChest();
    cache.chestOpen = generateChestOpen();
    cache.trap = generateTrap();
    cache.droppedItem = generateDroppedItem();

    cache.player = {} as Record<ClassName, HTMLCanvasElement[][]>;
    (Object.keys(CLASS_COLORS) as ClassName[]).forEach(cls => {
        cache.player[cls] = [];
        for (let dir = 0; dir < 4; dir++) {
            cache.player[cls][dir] = [];
            for (let f = 0; f < 2; f++) {
                cache.player[cls][dir][f] = generateCharacter(cls, dir, f);
            }
        }
    });

    cache.enemies = {} as Record<EnemyType, HTMLCanvasElement[]>;
    (Object.keys(ENEMY_COLORS) as EnemyType[]).forEach(type => {
        cache.enemies[type] = [];
        for (let f = 0; f < 2; f++) {
            cache.enemies[type][f] = generateEnemy(type, f);
        }
    });

    cache.bosses = {} as Record<number, HTMLCanvasElement[]>;
    for (let i = 1; i <= 10; i++) {
        const floor = i * 10;
        cache.bosses[floor] = [];
        for (let f = 0; f < 2; f++) {
            cache.bosses[floor][f] = generateBoss(floor, f);
        }
    }

    cache.items = {} as Record<string, Record<Rarity, HTMLCanvasElement>>;
    const itemTypes = ['sword', 'axe', 'staff', 'dagger', 'bow', 'armor', 'shield', 'ring', 'potion_hp', 'potion_mp', 'scroll', 'key'];
    const rarities: Rarity[] = ['common', 'uncommon', 'rare', 'legendary'];
    itemTypes.forEach(t => {
        cache.items[t] = {} as Record<Rarity, HTMLCanvasElement>;
        rarities.forEach(r => {
            cache.items[t][r] = generateItemIcon(t, r);
        });
    });

    cache.npcs = {} as Record<NPCType, HTMLCanvasElement>;
    (['merchant', 'healer', 'sage'] as NPCType[]).forEach(t => {
        cache.npcs[t] = generateNPC(t);
    });
}

export const Assets = {
    TILE,
    get: (key: string): HTMLCanvasElement => cache[key],
    getPlayer: (cls: ClassName, dir: number, frame: number): HTMLCanvasElement => cache.player[cls]?.[dir]?.[frame],
    getEnemy: (type: EnemyType, frame: number): HTMLCanvasElement => cache.enemies[type]?.[frame],
    getBoss: (floor: number, frame: number): HTMLCanvasElement => cache.bosses[floor]?.[frame],
    getItem: (type: string, rarity: Rarity): HTMLCanvasElement => cache.items[type]?.[rarity],
    getNPC: (type: NPCType): HTMLCanvasElement => cache.npcs[type],
};
