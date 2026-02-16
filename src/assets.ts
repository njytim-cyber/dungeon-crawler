// ===== ASSET GENERATOR =====
// Generates all pixel-art sprites dynamically via offscreen canvas

import type { ClassName, EnemyType, NPCType, Rarity } from './types';

const TILE = 16;
const CHAR_W = 16;
const CHAR_H = 32; // Taller characters (1x2 tiles)

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
    // Base soil
    ctx.fillStyle = '#4a3b2a';
    ctx.fillRect(0, 0, TILE, TILE);

    // Texture (pebbles/grass hints)
    for (let i = 0; i < 6; i++) {
        const x = Math.floor(Math.random() * TILE);
        const y = Math.floor(Math.random() * TILE);
        ctx.fillStyle = Math.random() > 0.5 ? '#5c4a35' : '#3e3226';
        ctx.fillRect(x, y, 2, 2);
    }

    // Subtle border
    ctx.strokeStyle = '#3e3226';
    ctx.globalAlpha = 0.3;
    ctx.strokeRect(0, 0, TILE, TILE);
    ctx.globalAlpha = 1.0;
    return c;
}

function generateWall(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;

    // Top face (visible because of 3/4 view perspective)
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, TILE, 4);

    // Front face
    ctx.fillStyle = '#34495e';
    ctx.fillRect(0, 4, TILE, 12);

    // Bricks
    ctx.fillStyle = '#2c3e50';
    // Row 1
    ctx.fillRect(0, 4, 1, 12); // Left edge shadow
    ctx.fillRect(15, 4, 1, 12); // Right edge highlight

    ctx.fillStyle = '#1a252f';
    ctx.fillRect(2, 6, 4, 3);
    ctx.fillRect(8, 10, 5, 3);
    ctx.fillRect(10, 4, 4, 2);

    // Cracks
    ctx.fillStyle = '#111';
    ctx.fillRect(4, 12, 1, 2);

    return c;
}

function generateDoor(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;

    // Frame
    ctx.fillStyle = '#34495e'; // Wall color
    ctx.fillRect(0, 0, TILE, TILE);

    // Wood door
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(2, 2, 12, 14);

    // Planks
    ctx.fillStyle = '#4e342e';
    ctx.fillRect(5, 2, 1, 14);
    ctx.fillRect(9, 2, 1, 14);

    // Iron banding
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(2, 4, 12, 2);
    ctx.fillRect(2, 10, 12, 2);

    // Handle
    ctx.fillStyle = '#ffca28';
    ctx.fillRect(10, 8, 2, 2);

    return c;
}

function generateStairs(down: boolean): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;

    ctx.fillStyle = '#4a3b2a'; // Floor bg
    ctx.fillRect(0, 0, TILE, TILE);

    const steps = 4;
    const stepH = TILE / steps;

    for (let i = 0; i < steps; i++) {
        const y = i * stepH;
        // Step top
        ctx.fillStyle = down ? '#7f8c8d' : '#95a5a6';
        ctx.fillRect(2, y, 12, stepH - 1);

        // Step front (shadow)
        ctx.fillStyle = down ? '#2c3e50' : '#34495e';
        ctx.fillRect(2, y + stepH - 1, 12, 1);
    }

    // Rails
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, 2, TILE);
    ctx.fillRect(14, 0, 2, TILE);

    return c;
}

function generateChest(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(8, 13, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chest Body
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(2, 5, 12, 9);

    // Lid (Top)
    ctx.fillStyle = '#a1887f';
    ctx.fillRect(2, 3, 12, 3);

    // Bands
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(3, 3, 2, 11);
    ctx.fillRect(11, 3, 2, 11);

    // Lock
    ctx.fillStyle = '#ff6f00';
    ctx.fillRect(7, 7, 2, 3);

    return c;
}

function generateChestOpen(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(8, 13, 6, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Chest Body (Dark interior)
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(2, 5, 12, 9);

    // Lid (Open / Back)
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(2, 0, 12, 5);

    // Gold glint inside
    ctx.fillStyle = '#ffca28';
    ctx.fillRect(4, 9, 2, 2);
    ctx.fillRect(7, 10, 2, 2);
    ctx.fillRect(10, 8, 2, 2);

    return c;
}

function generateTrap(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;

    ctx.fillStyle = '#4a3b2a'; // Floor matched
    ctx.fillRect(0, 0, TILE, TILE);

    // Spikes (Hidden/Subtle)
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.arc(8, 8, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(4, 4, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(12, 12, 1, 0, Math.PI * 2);
    ctx.fill();

    return c;
}

const CLASS_COLORS: Record<ClassName, { body: string; head: string; hair: string, detail: string }> = {
    warrior: { body: '#c0392b', head: '#f0ceab', hair: '#5d4037', detail: '#7f1d1d' }, // Red armor
    mage: { body: '#2980b9', head: '#f0ceab', hair: '#ecf0f1', detail: '#1a4d70' }, // Blue robes, white hair
    rogue: { body: '#2c3e50', head: '#f0ceab', hair: '#222', detail: '#1a252f' }, // Dark leather
    paladin: { body: '#f39c12', head: '#f0ceab', hair: '#f1c40f', detail: '#b87400' }, // Gold armor
    ranger: { body: '#27ae60', head: '#f0ceab', hair: '#d35400', detail: '#196f3d' }, // Green tunic
    necromancer: { body: '#8e44ad', head: '#e0e0e0', hair: '#222', detail: '#5b2c6f' }, // Purple robes, pale skin
    berserker: { body: '#d35400', head: '#f0ceab', hair: '#c0392b', detail: '#a04000' }, // Orange/Red wild
    cleric: { body: '#ecf0f1', head: '#f0ceab', hair: '#f39c12', detail: '#bdc3c7' }, // White robes
    assassin: { body: '#1a1a2e', head: '#f0ceab', hair: '#8e44ad', detail: '#0d0d1a' }, // Black/Purple
};

function generateCharacter(className: ClassName, dir: number, frame: number): HTMLCanvasElement {
    const c = createCanvas(CHAR_W, CHAR_H);
    const ctx = c.getContext('2d')!;
    const colors = CLASS_COLORS[className];

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(8, 30, 6, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body varies by frame (bobbing)
    const bob = frame % 2 === 0 ? 0 : 1;
    const y = 9 + bob;

    // Legs
    const legColor = '#333';
    const shoeColor = '#111';

    // Scissor animation for side view
    if (dir === 2 || dir === 3) {
        // Side view (2=Left, 3=Right)
        // Frame 0: Left leg fwd, Right leg back
        // Frame 1: Right leg fwd, Left leg back

        const offset = frame === 0 ? 3 : -3;

        // Back Leg (Darker)
        ctx.fillStyle = '#222';
        ctx.fillRect(7 - offset, y + 10, 3, 9); // Leg
        ctx.fillStyle = shoeColor;
        ctx.fillRect(7 - offset + (dir === 3 ? 1 : -1), y + 19, 3, 2); // Shoe

        // Front Leg
        ctx.fillStyle = legColor;
        ctx.fillRect(7 + offset, y + 10, 3, 9); // Leg
        ctx.fillStyle = shoeColor;
        ctx.fillRect(7 + offset + (dir === 3 ? 1 : -1), y + 19, 3, 2); // Shoe

    } else {
        // Front/Back view
        // Frame 0: Neutral / Wide
        // Frame 1: Stepping / Narrow

        if (frame === 0) {
            // Standing wide
            ctx.fillStyle = legColor;
            ctx.fillRect(4, y + 10, 3, 9); // L
            ctx.fillRect(9, y + 10, 3, 9); // R
            ctx.fillStyle = shoeColor;
            ctx.fillRect(4, y + 19, 3, 2); // L Shoe
            ctx.fillRect(9, y + 19, 3, 2); // R Shoe
        } else {
            // Mid-step (one leg lifted/centered slightly)
            ctx.fillStyle = legColor;
            ctx.fillRect(5, y + 10, 3, 8); // L (lifted)
            ctx.fillRect(9, y + 10, 3, 9); // R (planted)
            ctx.fillStyle = shoeColor;
            ctx.fillRect(5, y + 18, 3, 2); // L Shoe
            ctx.fillRect(9, y + 19, 3, 2); // R Shoe
        }
    }

    // Torso (Armor/Clothing)
    ctx.fillStyle = colors.body;
    ctx.fillRect(4, y, 9, 11);

    // Detail (belt/emblem)
    ctx.fillStyle = colors.detail;
    ctx.fillRect(4, y + 8, 9, 2);

    // Head
    const headY = y - 8;
    ctx.fillStyle = colors.head; // Skin
    ctx.fillRect(4, headY, 9, 8);

    // Hair
    ctx.fillStyle = colors.hair;
    ctx.fillRect(4, headY - 2, 9, 3); // Top
    ctx.fillRect(3, headY, 1, 5); // Side L
    ctx.fillRect(13, headY, 1, 5); // Side R
    if (dir === 0) { // Front
        ctx.fillRect(4, headY, 3, 2); // Bangs
        ctx.fillRect(10, headY, 3, 2);
    }

    // Face
    if (dir === 0 || dir === 2 || dir === 3) {
        ctx.fillStyle = '#222'; // Eyes
        if (dir === 0) {
            ctx.fillRect(6, headY + 3, 1, 1);
            ctx.fillRect(10, headY + 3, 1, 1);
        } else if (dir === 3) { // Right
            ctx.fillRect(10, headY + 3, 1, 1);
        } else if (dir === 2) { // Left
            ctx.fillRect(6, headY + 3, 1, 1);
        }
    }

    // Arms
    ctx.fillStyle = colors.body;
    if (dir === 2) {
        // Left arm only visible
        ctx.fillRect(6, y + 2, 3, 6);
    } else if (dir === 3) {
        // Right arm
        ctx.fillRect(8, y + 2, 3, 6);
    } else {
        ctx.fillRect(2, y + 1, 3, 7); // L
        ctx.fillRect(12, y + 1, 3, 7); // R
    }

    return c;
}

const ENEMY_COLORS: Record<EnemyType, { color: string; eyeColor: string }> = {
    slime: { color: '#2ecc71', eyeColor: '#fff' },
    skeleton: { color: '#bdc3c7', eyeColor: '#e74c3c' },
    bat: { color: '#8e44ad', eyeColor: '#f1c40f' },
    ghost: { color: '#ecf0f1', eyeColor: '#3498db' },
    goblin: { color: '#27ae60', eyeColor: '#f1c40f' },
    spider: { color: '#2c3e50', eyeColor: '#e74c3c' },
    orc: { color: '#16a085', eyeColor: '#f39c12' },
    demon: { color: '#c0392b', eyeColor: '#f1c40f' },
    wraith: { color: '#8e44ad', eyeColor: '#00ffff' },
    golem: { color: '#7f8c8d', eyeColor: '#e67e22' },
    drake: { color: '#d35400', eyeColor: '#f1c40f' },
    lich: { color: '#2c3e50', eyeColor: '#00ff00' },
};

function generateEnemy(type: EnemyType, frame: number): HTMLCanvasElement {
    // Enemies also 32px tall? Let's make small ones 16x16, big ones 16x24?
    // For simplicity, let's keep basic enemies 16x16 but centered in 16x32 canvas for sorting? 
    // Or just 16x16 tile size. 
    // ACTUALLY: Let's make them 16x16 mostly, but bosses bigger.

    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;
    const info = ENEMY_COLORS[type];

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(8, 14, 5, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    if (type === 'slime') {
        const bounce = frame % 2 === 0 ? 0 : -1;
        ctx.fillStyle = info.color;
        ctx.beginPath();
        ctx.arc(8, 10 + bounce, 5, Math.PI, 0); // Top half
        ctx.rect(3, 10 + bounce, 10, 4); // Bottom rect
        ctx.fill();

        ctx.fillStyle = info.eyeColor;
        ctx.fillRect(5, 8 + bounce, 2, 2);
        ctx.fillRect(9, 8 + bounce, 2, 2);
    } else if (type === 'bat') {
        const y = frame % 2 === 0 ? 4 : 6;
        ctx.fillStyle = info.color;
        // Wings
        ctx.beginPath();
        ctx.moveTo(8, y + 4);
        ctx.lineTo(1, y);
        ctx.lineTo(4, y + 6);
        ctx.lineTo(8, y + 4);
        ctx.lineTo(12, y + 6);
        ctx.lineTo(15, y);
        ctx.closePath();
        ctx.fill();
        // Body
        ctx.fillRect(6, y + 2, 4, 4);
        // Eyes
        ctx.fillStyle = info.eyeColor;
        ctx.fillRect(7, y + 3, 1, 1);
        ctx.fillRect(9, y + 3, 1, 1);
    } else {
        // Generic humanoid/monster shape
        const bob = frame % 2 === 0 ? 0 : 1;
        ctx.fillStyle = info.color;

        // Body
        ctx.fillRect(4, 5 + bob, 8, 8);

        // Head/Top
        ctx.fillRect(5, 2 + bob, 6, 4);

        // Legs
        ctx.fillStyle = '#222';
        ctx.fillRect(5, 13, 2, 2);
        ctx.fillRect(9, 13, 2, 2);

        // Eyes
        ctx.fillStyle = info.eyeColor;
        ctx.fillRect(6, 4 + bob, 1, 1);
        ctx.fillRect(9, 4 + bob, 1, 1);
    }
    return c;
}

function generateBoss(floor: number, frame: number): HTMLCanvasElement {
    const c = createCanvas(TILE * 2, TILE * 2);
    const ctx = c.getContext('2d')!;
    const hue = (floor * 36) % 360;
    const color = `hsl(${hue}, 60%, 40%)`;
    const light = `hsl(${hue}, 70%, 60%)`;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(16, 28, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    const bob = frame % 2 === 0 ? 0 : 1;

    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    // Big monster shape
    ctx.arc(16, 16 + bob, 10, Math.PI, 0); // Shoulders
    ctx.rect(6, 16 + bob, 20, 10); // Torso
    ctx.fill();

    // Spikes/Armor
    ctx.fillStyle = light;
    ctx.moveTo(6, 16 + bob); ctx.lineTo(2, 10 + bob); ctx.lineTo(10, 14 + bob); ctx.fill();
    ctx.moveTo(26, 16 + bob); ctx.lineTo(30, 10 + bob); ctx.lineTo(22, 14 + bob); ctx.fill();

    // Face
    ctx.fillStyle = '#111';
    ctx.fillRect(10, 12 + bob, 12, 6);

    // Eyes (Glowing)
    ctx.fillStyle = '#ff0000';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 5;
    ctx.fillRect(12, 14 + bob, 2, 2);
    ctx.fillRect(18, 14 + bob, 2, 2);
    ctx.shadowBlur = 0;

    return c;
}

function generateItemIcon(type: string, rarity: Rarity): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;

    const rarityColors: Record<Rarity, string> = { common: '#bdc3c7', uncommon: '#2ecc71', rare: '#3498db', legendary: '#f39c12' };
    const rc = rarityColors[rarity];

    // Glow for high rarity
    if (rarity === 'legendary') {
        ctx.shadowColor = rc;
        ctx.shadowBlur = 4;
    }

    switch (type) {
        case 'sword':
            ctx.fillStyle = '#95a5a6'; ctx.fillRect(7, 2, 2, 10);
            ctx.fillStyle = '#7f8c8d'; ctx.fillRect(7, 2, 1, 10); // shading
            ctx.fillStyle = rc; ctx.fillRect(5, 11, 6, 2); // hilt guard
            ctx.fillStyle = '#5d4037'; ctx.fillRect(7, 13, 2, 2); // handle
            break;
        case 'potion_hp':
            ctx.fillStyle = 'rgba(231, 76, 60, 0.8)'; // Red liquid transparentish
            ctx.beginPath(); ctx.arc(8, 9, 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillRect(7, 5, 2, 4); // neck
            ctx.fillStyle = '#ecf0f1'; ctx.fillRect(7, 4, 2, 1); // cork
            ctx.strokeStyle = '#ecf0f1'; ctx.lineWidth = 1; ctx.stroke();
            break;
        case 'potion_mp':
            ctx.fillStyle = 'rgba(52, 152, 219, 0.8)';
            ctx.beginPath(); ctx.arc(8, 9, 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillRect(7, 5, 2, 4);
            ctx.fillStyle = '#ecf0f1'; ctx.fillRect(7, 4, 2, 1);
            break;
        case 'key':
            ctx.fillStyle = '#f1c40f';
            ctx.beginPath(); ctx.arc(6, 6, 3, 0, Math.PI * 2); ctx.stroke();
            ctx.fillRect(6, 6, 2, 8);
            ctx.fillRect(8, 10, 2, 2);
            ctx.fillRect(8, 12, 2, 2);
            break;
        case 'ring':
            ctx.strokeStyle = rc;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(8, 8, 4, 0, Math.PI * 2); ctx.stroke();
            ctx.fillStyle = '#f1c40f'; // Gem
            ctx.beginPath(); ctx.arc(8, 4, 1.5, 0, Math.PI * 2); ctx.fill();
            break;
        case 'scroll':
            ctx.fillStyle = '#f3e5ab';
            ctx.fillRect(4, 3, 8, 10);
            ctx.strokeStyle = '#d6cba1';
            ctx.lineWidth = 1;
            ctx.strokeRect(4, 3, 8, 10);
            // runes
            ctx.fillStyle = rc;
            ctx.fillRect(5, 5, 2, 1);
            ctx.fillRect(8, 7, 2, 1);
            ctx.fillRect(6, 9, 3, 1);
            break;
        default: // Armor, shield etc simplified
            ctx.fillStyle = rc;
            ctx.fillRect(4, 4, 8, 8);
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.fillRect(4, 4, 8, 1); // Highlight
    }
    ctx.shadowBlur = 0;
    return c;
}

function generateNPC(type: NPCType): HTMLCanvasElement {
    const c = createCanvas(CHAR_W, CHAR_H);
    const ctx = c.getContext('2d')!;
    const colors: Record<NPCType, { body: string; head: string; hat: string; hair: string }> = {
        merchant: { body: '#d35400', head: '#f0ceab', hat: '#f1c40f', hair: '#5d4037' },
        healer: { body: '#ecf0f1', head: '#f0ceab', hat: '#e74c3c', hair: '#f1c40f' },
        sage: { body: '#8e44ad', head: '#f0ceab', hat: '#8e44ad', hair: '#fff' },
    };
    const info = colors[type];

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(8, 30, 6, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body (Robe style)
    const y = 10;
    ctx.fillStyle = info.body;
    ctx.beginPath();
    ctx.moveTo(8, y);
    ctx.lineTo(4, y + 14);
    ctx.lineTo(12, y + 14);
    ctx.fill();

    // Head
    ctx.fillStyle = info.head;
    ctx.fillRect(5, y - 8, 6, 7);

    // Hat / Hair
    if (type === 'sage') {
        // Hood
        ctx.fillStyle = info.hat;
        ctx.beginPath();
        ctx.moveTo(5, y - 9);
        ctx.lineTo(8, y - 14); // Pointy
        ctx.lineTo(11, y - 9);
        ctx.lineTo(11, y - 4);
        ctx.lineTo(5, y - 4);
        ctx.fill();
        // Beard
        ctx.fillStyle = '#fff';
        ctx.fillRect(5, y - 2, 6, 4);
    } else if (type === 'merchant') {
        // Turban-ish
        ctx.fillStyle = info.hat;
        ctx.fillRect(4, y - 9, 8, 3);
        ctx.fillStyle = '#222'; // Backpack strap
        ctx.fillRect(5, y + 2, 1, 8);
    } else {
        // Healer flower/band
        ctx.fillStyle = info.hat;
        ctx.fillRect(4, y - 7, 8, 2);
    }

    // Eyes
    ctx.fillStyle = '#222';
    ctx.fillRect(6, y - 5, 1, 1);
    ctx.fillRect(9, y - 5, 1, 1);

    return c;
}

function generateDroppedItem(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;

    // Sparkle base
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.moveTo(8, 2);
    ctx.lineTo(9, 6);
    ctx.lineTo(13, 8);
    ctx.lineTo(9, 10);
    ctx.lineTo(8, 14);
    ctx.lineTo(7, 10);
    ctx.lineTo(3, 8);
    ctx.lineTo(7, 6);
    ctx.closePath();
    ctx.fill();

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
    CHAR_W,
    CHAR_H,
    get: (key: string): HTMLCanvasElement => cache[key],
    getPlayer: (cls: ClassName, dir: number, frame: number): HTMLCanvasElement => cache.player[cls]?.[dir]?.[frame],
    getEnemy: (type: EnemyType, frame: number): HTMLCanvasElement => cache.enemies[type]?.[frame],
    getBoss: (floor: number, frame: number): HTMLCanvasElement => cache.bosses[floor]?.[frame],
    getItem: (type: string, rarity: Rarity): HTMLCanvasElement => cache.items[type]?.[rarity],
    getNPC: (type: NPCType): HTMLCanvasElement => cache.npcs[type],
};
