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
    ctx.fillStyle = '#4a3b2a';
    ctx.fillRect(0, 0, TILE, TILE);
    // Stone tile pattern
    ctx.fillStyle = '#56473a'; ctx.fillRect(1, 1, 6, 6);
    ctx.fillStyle = '#4e3f30'; ctx.fillRect(9, 1, 6, 6);
    ctx.fillStyle = '#52432e'; ctx.fillRect(1, 9, 6, 6);
    ctx.fillStyle = '#584c3c'; ctx.fillRect(9, 9, 6, 6);
    // Grout lines
    ctx.fillStyle = '#3a2e20'; ctx.fillRect(0, 7, 16, 1); ctx.fillRect(0, 0, 16, 1); ctx.fillRect(0, 15, 16, 1);
    ctx.fillRect(7, 0, 1, 16); ctx.fillRect(0, 0, 1, 16); ctx.fillRect(15, 0, 1, 16);
    // Pebble detail
    for (let i = 0; i < 3; i++) { const x = 2 + Math.floor(Math.random() * 12); const y = 2 + Math.floor(Math.random() * 12); ctx.fillStyle = '#5c4a35'; ctx.fillRect(x, y, 1, 1); }
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
    const c = createCanvas(TILE, TILE); const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#4a3b2a'; ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#5d4037';
    ctx.beginPath(); ctx.arc(8, 8, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(4, 4, 1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(12, 12, 1, 0, Math.PI * 2); ctx.fill();
    return c;
}

// ===== TOWN TILE GENERATORS =====
function generateGrass(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE); const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#3a7d44'; ctx.fillRect(0, 0, TILE, TILE);
    for (let i = 0; i < 8; i++) { const x = Math.floor(Math.random() * 14) + 1; const y = Math.floor(Math.random() * 14) + 1; ctx.fillStyle = ['#2d6b36', '#4a9e56', '#5cb85c', '#348a40'][Math.floor(Math.random() * 4)]; ctx.fillRect(x, y, 1, 2); }
    ctx.fillStyle = '#2d6b36'; ctx.globalAlpha = 0.2; ctx.strokeRect(0, 0, TILE, TILE); ctx.globalAlpha = 1;
    return c;
}
function generatePath(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE); const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#c4a97d'; ctx.fillRect(0, 0, TILE, TILE);
    for (let i = 0; i < 5; i++) { const x = Math.floor(Math.random() * 14) + 1; const y = Math.floor(Math.random() * 14) + 1; ctx.fillStyle = Math.random() > 0.5 ? '#b89b6a' : '#d4b98e'; ctx.fillRect(x, y, 2, 1); }
    ctx.fillStyle = '#a88f64'; ctx.globalAlpha = 0.3; ctx.fillRect(0, 0, 16, 1); ctx.fillRect(0, 15, 16, 1); ctx.globalAlpha = 1;
    return c;
}
function generateWater(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE); const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#2980b9'; ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#3498db'; ctx.fillRect(2, 3, 4, 1); ctx.fillRect(9, 8, 5, 1); ctx.fillRect(4, 12, 3, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(3, 4, 3, 1); ctx.fillRect(10, 9, 3, 1);
    return c;
}
function generateBuilding(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE); const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#8d6e63'; ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#6d4c41'; ctx.fillRect(0, 0, TILE, 3); // roof edge
    ctx.fillStyle = '#795548'; ctx.fillRect(2, 3, 5, 4); ctx.fillRect(9, 3, 5, 4); // planks
    ctx.fillStyle = '#5d4037'; ctx.fillRect(7, 3, 2, TILE - 3); // center beam
    ctx.fillStyle = '#4e342e'; ctx.fillRect(0, 0, 1, TILE); ctx.fillRect(15, 0, 1, TILE);
    return c;
}
function generateFence(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE); const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#3a7d44'; ctx.fillRect(0, 0, TILE, TILE); // grass bg
    ctx.fillStyle = '#8d6e63'; ctx.fillRect(2, 4, 2, 10); ctx.fillRect(12, 4, 2, 10); // posts
    ctx.fillStyle = '#a1887f'; ctx.fillRect(1, 6, 14, 2); ctx.fillRect(1, 10, 14, 2); // rails
    return c;
}
function generateTree(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE); const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#3a7d44'; ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#5d4037'; ctx.fillRect(6, 9, 4, 7); // trunk
    ctx.fillStyle = '#2d6b36'; ctx.beginPath(); ctx.arc(8, 6, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a9e56'; ctx.beginPath(); ctx.arc(6, 5, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(10, 4, 3, 0, Math.PI * 2); ctx.fill();
    return c;
}
function generateFlower(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE); const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#3a7d44'; ctx.fillRect(0, 0, TILE, TILE);
    const colors = ['#e74c3c', '#f1c40f', '#9b59b6', '#e67e22', '#3498db'];
    for (let i = 0; i < 3; i++) { const x = 3 + i * 4; const y = 4 + Math.floor(Math.random() * 6); ctx.fillStyle = '#2d6b36'; ctx.fillRect(x + 1, y + 2, 1, 4); ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)]; ctx.fillRect(x, y, 3, 2); ctx.fillStyle = '#f1c40f'; ctx.fillRect(x + 1, y, 1, 1); }
    return c;
}
function generateCropTile(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE); const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#5c4a35'; ctx.fillRect(0, 0, TILE, TILE); // tilled soil
    ctx.fillStyle = '#4a3b2a'; for (let i = 0; i < 4; i++) ctx.fillRect(0, i * 4, TILE, 1);
    return c;
}
function generateFishSpot(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE); const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#2980b9'; ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#3498db'; ctx.fillRect(2, 3, 4, 1); ctx.fillRect(9, 8, 5, 1);
    // Bobber/ripple
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(8, 8, 3, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(8, 8, 1.5, 0, Math.PI * 2); ctx.fill();
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
        // Food items
        case 'food_bread': ctx.fillStyle = '#d4a347'; ctx.fillRect(4, 6, 8, 6); ctx.fillStyle = '#c4933a'; ctx.beginPath(); ctx.arc(8, 6, 4, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#e8c170'; ctx.fillRect(5, 8, 2, 1); break;
        case 'food_stew': ctx.fillStyle = '#8d6e63'; ctx.fillRect(3, 7, 10, 6); ctx.fillStyle = '#a1887f'; ctx.fillRect(3, 6, 10, 2); ctx.fillStyle = '#c0392b'; ctx.fillRect(5, 8, 6, 3); ctx.fillStyle = '#e67e22'; ctx.fillRect(6, 9, 2, 1); break;
        case 'food_soup': ctx.fillStyle = '#795548'; ctx.fillRect(3, 7, 10, 6); ctx.fillStyle = '#8d6e63'; ctx.fillRect(3, 6, 10, 2); ctx.fillStyle = '#2ecc71'; ctx.fillRect(5, 8, 6, 3); break;
        case 'food_salad': ctx.fillStyle = '#27ae60'; ctx.beginPath(); ctx.arc(8, 9, 4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#2ecc71'; ctx.fillRect(5, 7, 2, 1); ctx.fillStyle = '#e74c3c'; ctx.fillRect(9, 8, 2, 1); ctx.fillStyle = '#f1c40f'; ctx.fillRect(7, 10, 2, 1); break;
        case 'food_pie': ctx.fillStyle = '#d4a347'; ctx.beginPath(); ctx.arc(8, 9, 5, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#c4933a'; ctx.beginPath(); ctx.moveTo(8, 4); ctx.lineTo(13, 9); ctx.lineTo(8, 9); ctx.fill(); ctx.fillStyle = '#e8c170'; ctx.fillRect(6, 8, 4, 1); break;
        case 'food_feast': ctx.fillStyle = '#8d6e63'; ctx.fillRect(2, 8, 12, 5); ctx.fillStyle = '#c0392b'; ctx.fillRect(4, 5, 8, 5); ctx.fillStyle = '#e67e22'; ctx.fillRect(5, 3, 6, 3); ctx.fillStyle = '#f1c40f'; ctx.fillRect(7, 2, 2, 2); break;
        case 'food_smoothie': ctx.fillStyle = '#8e44ad'; ctx.beginPath(); ctx.arc(8, 9, 3, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(7, 5, 2, 4); ctx.fillStyle = '#9b59b6'; ctx.fillRect(6, 5, 4, 1); ctx.fillStyle = '#ecf0f1'; ctx.fillRect(7, 4, 2, 1); break;
        case 'food_cookie': ctx.fillStyle = '#d4a347'; ctx.beginPath(); ctx.arc(8, 8, 4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#5d4037'; ctx.fillRect(6, 7, 1, 1); ctx.fillRect(9, 9, 1, 1); ctx.fillRect(7, 10, 1, 1); break;
        case 'food_tea': ctx.fillStyle = '#ecf0f1'; ctx.fillRect(5, 6, 6, 7); ctx.fillStyle = '#27ae60'; ctx.fillRect(6, 7, 4, 4); ctx.fillStyle = '#bdc3c7'; ctx.fillRect(11, 8, 2, 2); ctx.fillRect(5, 5, 6, 1); break;
        case 'food_wheat': ctx.fillStyle = '#d4a347'; ctx.fillRect(7, 3, 2, 10); ctx.fillStyle = '#e8c170'; ctx.fillRect(6, 2, 4, 3); ctx.fillRect(5, 4, 2, 2); ctx.fillRect(9, 4, 2, 2); break;
        case 'food_berry': ctx.fillStyle = '#8e44ad'; ctx.beginPath(); ctx.arc(6, 9, 2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(10, 8, 2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(8, 11, 2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#2ecc71'; ctx.fillRect(7, 5, 2, 3); break;
        case 'food_golden': ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(8, 9, 4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#f39c12'; ctx.beginPath(); ctx.arc(7, 8, 2, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#2ecc71'; ctx.fillRect(7, 4, 2, 3); break;
        case 'food_dragon': ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(8, 9, 4, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#c0392b'; ctx.fillRect(5, 7, 6, 4); ctx.fillStyle = '#f39c12'; ctx.fillRect(7, 6, 2, 1); ctx.fillStyle = '#2ecc71'; ctx.fillRect(6, 4, 4, 2); break;
        // Fish
        case 'fish_small': ctx.fillStyle = '#7f8c8d'; ctx.beginPath(); ctx.ellipse(8, 8, 4, 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#222'; ctx.fillRect(5, 7, 1, 1); ctx.fillStyle = '#95a5a6'; ctx.beginPath(); ctx.moveTo(12, 8); ctx.lineTo(15, 6); ctx.lineTo(15, 10); ctx.fill(); break;
        case 'fish_med': ctx.fillStyle = '#3498db'; ctx.beginPath(); ctx.ellipse(7, 8, 5, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#222'; ctx.fillRect(4, 7, 1, 1); ctx.fillStyle = '#2980b9'; ctx.beginPath(); ctx.moveTo(12, 8); ctx.lineTo(15, 5); ctx.lineTo(15, 11); ctx.fill(); break;
        case 'fish_gold': ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.ellipse(7, 8, 5, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#e67e22'; ctx.fillRect(4, 6, 2, 4); ctx.fillStyle = '#222'; ctx.fillRect(4, 7, 1, 1); ctx.fillStyle = '#f39c12'; ctx.beginPath(); ctx.moveTo(12, 8); ctx.lineTo(15, 5); ctx.lineTo(15, 11); ctx.fill(); break;
        case 'fish_phantom': ctx.fillStyle = 'rgba(155,89,182,0.7)'; ctx.beginPath(); ctx.ellipse(7, 8, 5, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#00ffff'; ctx.fillRect(4, 7, 1, 1); ctx.fillStyle = 'rgba(142,68,173,0.5)'; ctx.beginPath(); ctx.moveTo(12, 8); ctx.lineTo(15, 5); ctx.lineTo(15, 11); ctx.fill(); break;
        case 'fish_koi': ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.ellipse(7, 8, 5, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ecf0f1'; ctx.fillRect(5, 6, 3, 4); ctx.fillStyle = '#f1c40f'; ctx.fillRect(4, 7, 1, 1); ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.moveTo(12, 8); ctx.lineTo(15, 5); ctx.lineTo(15, 11); ctx.fill(); break;
        // Seeds
        case 'seed': ctx.fillStyle = '#795548'; ctx.beginPath(); ctx.ellipse(8, 9, 2, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#4caf50'; ctx.fillRect(7, 5, 2, 3); break;
        case 'seed_gold': ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.ellipse(8, 9, 2, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#4caf50'; ctx.fillRect(7, 5, 2, 3); break;
        case 'seed_dragon': ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.ellipse(8, 9, 2, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#4caf50'; ctx.fillRect(7, 5, 2, 3); ctx.fillStyle = '#f39c12'; ctx.fillRect(8, 4, 1, 1); break;
        // Tools
        case 'tool_rod': ctx.fillStyle = '#8d6e63'; ctx.fillRect(3, 2, 2, 12); ctx.fillStyle = '#bdc3c7'; ctx.fillRect(3, 2, 2, 1); ctx.fillStyle = '#ecf0f1'; ctx.fillRect(5, 2, 6, 1); ctx.fillRect(11, 2, 1, 3); break;
        case 'tool_can': ctx.fillStyle = '#3498db'; ctx.fillRect(4, 6, 8, 7); ctx.fillStyle = '#2980b9'; ctx.fillRect(4, 5, 8, 2); ctx.fillStyle = '#bdc3c7'; ctx.fillRect(12, 4, 3, 2); ctx.fillRect(13, 6, 1, 3); break;
        default: // Armor, shield etc
            ctx.fillStyle = rc; ctx.fillRect(4, 4, 8, 8); ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(4, 4, 8, 1);
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
        cook: { body: '#ecf0f1', head: '#f0ceab', hat: '#ecf0f1', hair: '#5d4037' },
        fishmonger: { body: '#2980b9', head: '#f0ceab', hat: '#1a5276', hair: '#d35400' },
        farmer: { body: '#27ae60', head: '#f0ceab', hat: '#d4a347', hair: '#795548' },
    };
    const info = colors[type];
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(8, 30, 6, 2, 0, 0, Math.PI * 2); ctx.fill();
    const y = 10;
    ctx.fillStyle = info.body; ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(4, y + 14); ctx.lineTo(12, y + 14); ctx.fill();
    ctx.fillStyle = info.head; ctx.fillRect(5, y - 8, 6, 7);
    if (type === 'sage') {
        ctx.fillStyle = info.hat; ctx.beginPath(); ctx.moveTo(5, y - 9); ctx.lineTo(8, y - 14); ctx.lineTo(11, y - 9); ctx.lineTo(11, y - 4); ctx.lineTo(5, y - 4); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillRect(5, y - 2, 6, 4);
    } else if (type === 'merchant') {
        ctx.fillStyle = info.hat; ctx.fillRect(4, y - 9, 8, 3);
        ctx.fillStyle = '#222'; ctx.fillRect(5, y + 2, 1, 8);
    } else if (type === 'cook') {
        // Chef hat
        ctx.fillStyle = '#ecf0f1'; ctx.fillRect(4, y - 12, 8, 5);
        ctx.fillStyle = '#bdc3c7'; ctx.fillRect(4, y - 7, 8, 1);
        // Fork in hand
        ctx.fillStyle = '#bdc3c7'; ctx.fillRect(13, y + 2, 1, 6);
    } else if (type === 'fishmonger') {
        // Rain hat
        ctx.fillStyle = info.hat; ctx.fillRect(3, y - 9, 10, 2);
        ctx.fillRect(5, y - 11, 6, 2);
        // Fishing line
        ctx.fillStyle = '#ecf0f1'; ctx.fillRect(13, y - 2, 1, 10);
    } else if (type === 'farmer') {
        // Straw hat
        ctx.fillStyle = info.hat; ctx.fillRect(3, y - 9, 10, 2);
        ctx.fillRect(5, y - 11, 6, 2);
        // Pitchfork
        ctx.fillStyle = '#8d6e63'; ctx.fillRect(13, y, 1, 10);
        ctx.fillStyle = '#bdc3c7'; ctx.fillRect(12, y - 1, 3, 1);
    } else {
        ctx.fillStyle = info.hat; ctx.fillRect(4, y - 7, 8, 2);
    }
    ctx.fillStyle = '#222'; ctx.fillRect(6, y - 5, 1, 1); ctx.fillRect(9, y - 5, 1, 1);
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
    // Town tiles
    cache.grass = generateGrass();
    cache.path = generatePath();
    cache.water = generateWater();
    cache.building = generateBuilding();
    cache.fence = generateFence();
    cache.tree = generateTree();
    cache.flower = generateFlower();
    cache.crop = generateCropTile();
    cache.fishSpot = generateFishSpot();

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
    const itemTypes = ['sword', 'axe', 'staff', 'dagger', 'bow', 'armor', 'shield', 'ring', 'potion_hp', 'potion_mp', 'scroll', 'key',
        'food_bread', 'food_stew', 'food_soup', 'food_salad', 'food_pie', 'food_feast', 'food_smoothie', 'food_cookie', 'food_tea',
        'food_wheat', 'food_berry', 'food_golden', 'food_dragon',
        'fish_small', 'fish_med', 'fish_gold', 'fish_phantom', 'fish_koi',
        'seed', 'seed_gold', 'seed_dragon', 'tool_rod', 'tool_can'];
    const rarities: Rarity[] = ['common', 'uncommon', 'rare', 'legendary'];
    itemTypes.forEach(t => {
        cache.items[t] = {} as Record<Rarity, HTMLCanvasElement>;
        rarities.forEach(r => { cache.items[t][r] = generateItemIcon(t, r); });
    });

    cache.npcs = {} as Record<NPCType, HTMLCanvasElement>;
    (['merchant', 'healer', 'sage', 'cook', 'fishmonger', 'farmer'] as NPCType[]).forEach(t => {
        cache.npcs[t] = generateNPC(t);
    });
}

export const Assets = {
    TILE, CHAR_W, CHAR_H,
    get: (key: string): HTMLCanvasElement => cache[key],
    getPlayer: (cls: ClassName, dir: number, frame: number): HTMLCanvasElement => cache.player[cls]?.[dir]?.[frame],
    getEnemy: (type: EnemyType, frame: number): HTMLCanvasElement => cache.enemies[type]?.[frame],
    getBoss: (floor: number, frame: number): HTMLCanvasElement => cache.bosses[floor]?.[frame],
    getItem: (type: string, rarity: Rarity): HTMLCanvasElement => cache.items[type]?.[rarity],
    getNPC: (type: NPCType): HTMLCanvasElement => cache.npcs[type],
};
