// ===== ASSET GENERATOR =====
// Generates all pixel-art sprites dynamically via offscreen canvas
// HD Characters: 100x200 resolution for ultra-detailed sprites

import type { ClassName, EnemyType, NPCType, Rarity } from './types';
import { BOSSES, renderBossSprite } from './bosses';
import { paintHiResIcon, ICON_SIZE } from './item-art';

const TILE = 16;
const CHAR_W = 32;
const CHAR_H = 64; // Detailed pixel-art characters (2x original)

const cache: Record<string, any> = {};

function createCanvas(w: number, h: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
}



// Helper: lighten/darken hex color
function shadeColor(hex: string, amt: number): string {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, Math.max(0, r + amt));
    g = Math.min(255, Math.max(0, g + amt));
    b = Math.min(255, Math.max(0, b + amt));
    return `rgb(${r},${g},${b})`;
}

function generateFloor(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;

    ctx.fillStyle = '#1e1e24'; // Dark cool gray/indigo base
    ctx.fillRect(0, 0, 16, 16);

    const stones = [
        { x: 1, y: 1, w: 6, h: 6, base: '#2b2b36', hi: '#3f3f4e', lo: '#15151a' },
        { x: 9, y: 1, w: 6, h: 6, base: '#292933', hi: '#3c3c4a', lo: '#141418' },
        { x: 1, y: 9, w: 6, h: 6, base: '#2d2d38', hi: '#424252', lo: '#16161c' },
        { x: 9, y: 9, w: 6, h: 6, base: '#26262f', hi: '#353542', lo: '#121216' },
    ];
    for (const s of stones) {
        ctx.fillStyle = s.base;
        ctx.fillRect(s.x, s.y, s.w, s.h);
        for (let px = 0; px < 3; px++) {
            // Little cute sparkles on the stone
            ctx.fillStyle = `rgba(${Math.random() > 0.5 ? 180 : 150},${Math.random() > 0.5 ? 200 : 160},${Math.random() > 0.5 ? 255 : 200},0.04)`;
            ctx.fillRect(s.x + 1 + Math.floor(Math.random() * (s.w - 2)), s.y + 1 + Math.floor(Math.random() * (s.h - 2)), 1, 1);
        }
        ctx.fillStyle = s.hi;
        ctx.fillRect(s.x, s.y, s.w, 1); ctx.fillRect(s.x, s.y, 1, s.h);
        // Bevel
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(s.x + 1, s.y + 1, s.w - 2, 1);
        ctx.fillStyle = s.lo;
        ctx.fillRect(s.x, s.y + s.h - 1, s.w, 1); ctx.fillRect(s.x + s.w - 1, s.y, 1, s.h);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(s.x + s.w - 1, s.y + s.h - 1, 1, 1);
    }

    // Grid lines / grout
    ctx.fillStyle = '#111115';
    ctx.fillRect(0, 7, 16, 2); ctx.fillRect(7, 0, 2, 16);
    ctx.fillStyle = 'rgba(255,255,255,0.02)';
    ctx.fillRect(0, 7, 16, 1); ctx.fillRect(7, 0, 1, 16);
    ctx.fillStyle = '#18181e';
    ctx.fillRect(0, 0, 16, 1); ctx.fillRect(0, 15, 16, 1);
    ctx.fillRect(0, 0, 1, 16); ctx.fillRect(15, 0, 1, 16);

    // Pebbles/dust
    for (let i = 0; i < 5; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#3b3b48' : '#18181e';
        ctx.fillRect(2 + Math.floor(Math.random() * 12), 2 + Math.floor(Math.random() * 12), 1, 1);
    }

    // Cute luminescent moss
    if (Math.random() > 0.55) {
        ctx.fillStyle = 'rgba(70, 200, 180, 0.3)';
        const mx = Math.floor(Math.random() * 11) + 2;
        const my = Math.floor(Math.random() * 11) + 2;
        ctx.fillRect(mx, my, 2, 1); ctx.fillRect(mx + 1, my + 1, 1, 1);
        ctx.fillStyle = 'rgba(100, 255, 200, 0.2)';
        ctx.fillRect(mx - 1, my, 1, 1);
        // Cute tiny moss particle
        ctx.fillStyle = '#64ffc8';
        ctx.fillRect(mx, my, 1, 1);
    }

    // Corners shadow
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, 0, 2, 2); ctx.fillRect(14, 0, 2, 2);
    ctx.fillRect(0, 14, 2, 2); ctx.fillRect(14, 14, 2, 2);

    return c;
}

function generateWall(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;

    // Top face with gradient sim
    ctx.fillStyle = '#15151a'; // Deep abyss color
    ctx.fillRect(0, 0, TILE, 4);
    ctx.fillStyle = '#1a1a22';
    ctx.fillRect(1, 0, 14, 1);
    ctx.fillStyle = '#22222b';
    ctx.fillRect(2, 1, 12, 1);

    // Front face
    ctx.fillStyle = '#1e1e24'; // Matches base floor
    ctx.fillRect(0, 4, TILE, 12);

    // Bricks with color variation
    const bricks = [
        { x: 1, y: 5, w: 6, h: 3 }, { x: 9, y: 5, w: 6, h: 3 },
        { x: 5, y: 9, w: 6, h: 3 }, { x: 1, y: 9, w: 3, h: 3 },
        { x: 12, y: 9, w: 3, h: 3 }, { x: 1, y: 13, w: 6, h: 2 },
        { x: 9, y: 13, w: 6, h: 2 },
    ];
    for (const b of bricks) {
        const r = Math.random() * 10;
        // Gritty steel/slate brick look
        ctx.fillStyle = r > 7 ? '#2a2b36' : r > 3 ? '#282833' : '#25262e';
        ctx.fillRect(b.x, b.y, b.w, b.h);

        // Edge highlights & shadows
        ctx.fillStyle = '#383a48'; ctx.fillRect(b.x, b.y, b.w, 1); // Top
        ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(b.x + 1, b.y, b.w - 2, 1);
        ctx.fillStyle = '#323440'; ctx.fillRect(b.x, b.y, 1, b.h); // Left
        ctx.fillStyle = '#111116'; ctx.fillRect(b.x, b.y + b.h - 1, b.w, 1); // Bottom
        ctx.fillStyle = '#14141a'; ctx.fillRect(b.x + b.w - 1, b.y, 1, b.h); // Right

        if (Math.random() > 0.5) {
            ctx.fillStyle = 'rgba(255,255,255,0.04)';
            ctx.fillRect(b.x + 1 + Math.floor(Math.random() * (b.w - 2)), b.y + 1, 1, 1);
        }
    }

    // Mortar
    ctx.fillStyle = '#0f0f12';
    ctx.fillRect(0, 4, TILE, 1); ctx.fillRect(0, 8, TILE, 1); ctx.fillRect(0, 12, TILE, 1);
    ctx.fillRect(8, 4, 1, 4); ctx.fillRect(4, 8, 1, 5); ctx.fillRect(11, 8, 1, 5);

    // Edge shadows
    ctx.fillStyle = '#0a0a0d'; ctx.fillRect(0, 4, 1, 12); ctx.fillRect(15, 4, 1, 12);

    // Cracks with branches
    if (Math.random() > 0.4) {
        ctx.fillStyle = '#050508';
        const cx = 3 + Math.floor(Math.random() * 10);
        ctx.fillRect(cx, 10, 1, 3); ctx.fillRect(cx + 1, 12, 1, 2);
        if (Math.random() > 0.5) ctx.fillRect(cx - 1, 11, 1, 1);
    }

    // Damp patches/moss on walls
    if (Math.random() > 0.65) {
        // Bio-luminescent moss tint
        ctx.fillStyle = 'rgba(100,255,200,0.08)';
        ctx.fillRect(2 + Math.floor(Math.random() * 10), 6 + Math.floor(Math.random() * 6), 3, 2);
    }

    // Top edge glow
    ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(0, 4, TILE, 1);
    // Bottom AO
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(0, 14, TILE, 2);

    return c;
}

function generateDoor(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;

    // Stone frame with depth matching the new walls
    ctx.fillStyle = '#15151a'; ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#111115'; ctx.fillRect(1, 0, 1, TILE); ctx.fillRect(14, 0, 1, TILE);

    // Heavy dark wood door
    ctx.fillStyle = '#4a3028'; ctx.fillRect(2, 1, 12, 15);
    // Grain
    ctx.fillStyle = '#3a241c'; ctx.fillRect(5, 1, 1, 15); ctx.fillRect(10, 1, 1, 15);
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(3, 1, 1, 15); ctx.fillRect(7, 1, 1, 15); ctx.fillRect(12, 1, 1, 15);

    // Iron bands with rivets
    ctx.fillStyle = '#454a55'; ctx.fillRect(2, 3, 12, 2); ctx.fillRect(2, 10, 12, 2);
    ctx.fillStyle = '#6b7280'; ctx.fillRect(3, 3, 1, 1); ctx.fillRect(12, 3, 1, 1);
    ctx.fillRect(3, 10, 1, 1); ctx.fillRect(12, 10, 1, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(2, 5, 12, 1); ctx.fillRect(2, 12, 12, 1);

    // Ornate handle - glowing iron
    ctx.fillStyle = '#7a7a85'; ctx.fillRect(10, 7, 2, 3);
    ctx.fillStyle = '#9ca3af'; ctx.fillRect(10, 7, 1, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(11, 9, 1, 1);

    // Arch highlight + bottom shadow
    ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(3, 1, 10, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(2, 14, 12, 2);

    return c;
}

function generateStairs(down: boolean): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;

    // Dark cavity base
    ctx.fillStyle = down ? '#08080a' : '#1e1e24';
    ctx.fillRect(0, 0, TILE, TILE);

    const steps = 5;
    const stepH = Math.floor(TILE / steps);
    for (let i = 0; i < steps; i++) {
        const y = i * stepH;
        const shade = down ? (0.3 + i * 0.1) : (0.8 - i * 0.1);
        const r = Math.floor(43 * shade), g = Math.floor(43 * shade), b = Math.floor(54 * shade);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(3, y, 10, stepH - 1);
        // Highlight
        ctx.fillStyle = `rgba(255,255,255,${0.04 + (down ? i * 0.02 : (4 - i) * 0.02)})`;
        ctx.fillRect(3, y, 10, 1);
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(3, y + stepH - 1, 10, 1);
    }

    // Side walls (matching new brick style)
    ctx.fillStyle = '#15151a'; ctx.fillRect(0, 0, 3, TILE); ctx.fillRect(13, 0, 3, TILE);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(2, 0, 1, TILE); ctx.fillRect(13, 0, 1, TILE);
    ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(0, 0, 1, TILE); ctx.fillRect(15, 0, 1, TILE);

    // Direction arrow
    ctx.fillStyle = down ? '#e74c3c' : '#2ecc71';
    if (down) {
        ctx.fillRect(7, 12, 2, 1); ctx.fillRect(6, 11, 1, 1); ctx.fillRect(9, 11, 1, 1);
    } else {
        ctx.fillRect(7, 2, 2, 1); ctx.fillRect(6, 3, 1, 1); ctx.fillRect(9, 3, 1, 1);
    }

    return c;
}

function generateChest(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(8, 14, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();

    // Body with dark worn wood
    ctx.fillStyle = '#3a2e2a'; ctx.fillRect(2, 6, 12, 8);
    ctx.fillStyle = '#2b211e'; ctx.fillRect(2, 12, 12, 2);
    ctx.fillStyle = '#4c3f3a'; ctx.fillRect(3, 7, 10, 2);

    // Lid
    ctx.fillStyle = '#4f3e37'; ctx.fillRect(2, 3, 12, 4);
    ctx.fillStyle = '#5f4b43'; ctx.fillRect(3, 3, 10, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(2, 6, 12, 1);

    // Dark iron bands
    ctx.fillStyle = '#555b6e'; ctx.fillRect(3, 3, 2, 11); ctx.fillRect(11, 3, 2, 11);
    ctx.fillStyle = '#6b7280'; ctx.fillRect(3, 3, 1, 11);
    ctx.fillStyle = '#404554'; ctx.fillRect(4, 3, 1, 11); ctx.fillRect(12, 3, 1, 11);

    // Dark Lock
    ctx.fillStyle = '#7a7a85'; ctx.fillRect(7, 7, 2, 3);
    ctx.fillStyle = '#9ca3af'; ctx.fillRect(7, 7, 1, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(8, 9, 1, 1);

    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(4, 3, 8, 1);

    return c;
}

function generateChestOpen(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(8, 14, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();

    // Dark interior
    ctx.fillStyle = '#14100d'; ctx.fillRect(2, 6, 12, 8);
    ctx.fillStyle = '#221915'; ctx.fillRect(3, 7, 10, 2);

    // Open lid
    ctx.fillStyle = '#2b211e'; ctx.fillRect(2, 0, 12, 6);
    ctx.fillStyle = '#3a2e2a'; ctx.fillRect(3, 1, 10, 4);
    ctx.fillStyle = '#221915'; ctx.fillRect(3, 4, 10, 2);

    // Bright magical loot inside (gives contrast)
    ctx.fillStyle = '#00ffff'; ctx.fillRect(4, 9, 2, 2); ctx.fillRect(7, 8, 3, 3); ctx.fillRect(11, 9, 2, 2);
    ctx.fillStyle = '#e74c3c'; ctx.fillRect(5, 10, 1, 1);
    ctx.fillStyle = '#3498db'; ctx.fillRect(9, 9, 1, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(8, 8, 1, 1);

    // Bands on lid
    ctx.fillStyle = '#555b6e'; ctx.fillRect(3, 0, 2, 6); ctx.fillRect(11, 0, 2, 6);

    return c;
}

function generateTrap(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE); const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#1e1e24'; ctx.fillRect(0, 0, TILE, TILE);
    // Pressure plate
    ctx.fillStyle = '#2b2b36'; ctx.fillRect(3, 3, 10, 10);
    ctx.fillStyle = '#15151a'; ctx.fillRect(3, 12, 10, 1); ctx.fillRect(12, 3, 1, 10);
    // Pin holes
    ctx.fillStyle = '#0a0a0d';
    ctx.beginPath(); ctx.arc(5, 5, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(11, 5, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(8, 8, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(5, 11, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(11, 11, 1.2, 0, Math.PI * 2); ctx.fill();
    // Danger tint
    ctx.fillStyle = 'rgba(180, 50, 30, 0.15)'; ctx.fillRect(3, 3, 10, 10);
    return c;
}

// ===== TOWN TILE GENERATORS =====
function generateGrass(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE); const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#3a7d44'; ctx.fillRect(0, 0, TILE, TILE);
    // Earth showing through
    ctx.fillStyle = 'rgba(90,70,40,0.08)';
    for (let i = 0; i < 4; i++) ctx.fillRect(Math.floor(Math.random() * 14) + 1, Math.floor(Math.random() * 14) + 1, 1, 1);
    // Blades with depth
    const bladeColors = ['#255e2c', '#2d6b36', '#4a9e56', '#5cb85c', '#348a40', '#2a5e2e', '#66c76e'];
    for (let i = 0; i < 16; i++) {
        const x = Math.floor(Math.random() * 14) + 1;
        const y = Math.floor(Math.random() * 12) + 2;
        ctx.fillStyle = bladeColors[Math.floor(Math.random() * bladeColors.length)];
        ctx.fillRect(x, y, 1, 1 + Math.floor(Math.random() * 3));
        if (Math.random() > 0.6) { ctx.fillStyle = 'rgba(255,255,200,0.12)'; ctx.fillRect(x, y, 1, 1); }
    }
    // Sunlight patch
    if (Math.random() > 0.5) {
        ctx.fillStyle = 'rgba(255,255,180,0.08)';
        ctx.fillRect(Math.floor(Math.random() * 8) + 3, Math.floor(Math.random() * 8) + 3, 4, 3);
    }
    ctx.fillStyle = '#2d6b36'; ctx.globalAlpha = 0.15;
    ctx.fillRect(0, 0, TILE, 1); ctx.fillRect(0, 15, TILE, 1);
    ctx.fillRect(0, 0, 1, TILE); ctx.fillRect(15, 0, 1, TILE); ctx.globalAlpha = 1;
    return c;
}

function generatePath(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE); const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#c4a97d'; ctx.fillRect(0, 0, TILE, TILE);
    const stones = [
        { x: 1, y: 1, w: 4, h: 3 }, { x: 6, y: 0, w: 5, h: 3 }, { x: 12, y: 1, w: 3, h: 2 },
        { x: 0, y: 4, w: 3, h: 4 }, { x: 4, y: 4, w: 5, h: 3 }, { x: 10, y: 3, w: 5, h: 4 },
        { x: 1, y: 8, w: 5, h: 3 }, { x: 7, y: 8, w: 4, h: 4 }, { x: 12, y: 8, w: 3, h: 3 },
        { x: 0, y: 12, w: 4, h: 3 }, { x: 5, y: 13, w: 5, h: 2 }, { x: 11, y: 12, w: 4, h: 3 },
    ];
    for (const s of stones) {
        const v = Math.random() * 0.12;
        ctx.fillStyle = `rgb(${Math.floor(186 + v * 50)},${Math.floor(158 + v * 40)},${Math.floor(108 + v * 30)})`;
        ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(s.x, s.y, s.w, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(s.x, s.y + s.h - 1, s.w, 1);
    }
    ctx.fillStyle = '#8a7350'; ctx.globalAlpha = 0.4;
    ctx.fillRect(0, 3, 16, 1); ctx.fillRect(0, 7, 16, 1); ctx.fillRect(0, 11, 16, 1);
    ctx.globalAlpha = 1;
    return c;
}
function generateWater(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE); const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#155a86'; ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#1a6fa0'; ctx.fillRect(0, 0, TILE, 12);
    ctx.fillStyle = '#2980b9'; ctx.fillRect(0, 0, TILE, 8);
    ctx.fillStyle = '#3498db';
    ctx.fillRect(1, 3, 5, 1); ctx.fillRect(9, 5, 5, 1); ctx.fillRect(3, 9, 4, 1); ctx.fillRect(10, 11, 4, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(2, 2, 3, 1); ctx.fillRect(10, 4, 4, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(4, 8, 2, 1); ctx.fillRect(11, 10, 3, 1);
    ctx.fillStyle = 'rgba(0,0,30,0.2)'; ctx.fillRect(0, 12, 16, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(5, 4, 1, 1); ctx.fillRect(12, 6, 1, 1);
    return c;
}
function generateBuilding(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE); const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#8d6e63'; ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#5d4037'; ctx.fillRect(0, 0, TILE, 4);
    ctx.fillStyle = '#4e342e'; ctx.fillRect(0, 0, TILE, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, 0, TILE, 1);
    ctx.fillStyle = '#795548'; ctx.fillRect(2, 4, 5, 5); ctx.fillRect(9, 4, 5, 5);
    ctx.fillRect(2, 10, 5, 5); ctx.fillRect(9, 10, 5, 5);
    ctx.fillStyle = '#6d4c41'; ctx.fillRect(4, 4, 1, 12); ctx.fillRect(11, 4, 1, 12);
    ctx.fillStyle = '#5d4037'; ctx.fillRect(7, 4, 2, 12);
    ctx.fillStyle = '#4e342e'; ctx.fillRect(7, 4, 1, 12); ctx.fillRect(0, 4, 1, 12); ctx.fillRect(15, 4, 1, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(2, 4, 5, 1); ctx.fillRect(9, 4, 5, 1); ctx.fillRect(2, 10, 5, 1); ctx.fillRect(9, 10, 5, 1);
    ctx.fillStyle = '#b0bec5';
    ctx.fillRect(3, 6, 1, 1); ctx.fillRect(12, 6, 1, 1); ctx.fillRect(3, 12, 1, 1); ctx.fillRect(12, 12, 1, 1);
    return c;
}
function generateFence(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE); const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#3a7d44'; ctx.fillRect(0, 0, TILE, TILE);
    for (let i = 0; i < 6; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#4a9e56' : '#2d6b36';
        ctx.fillRect(Math.floor(Math.random() * 14) + 1, Math.floor(Math.random() * 10) + 4, 1, 2);
    }
    ctx.fillStyle = '#795548'; ctx.fillRect(2, 3, 3, 11); ctx.fillRect(11, 3, 3, 11);
    ctx.fillStyle = '#8d6e63'; ctx.fillRect(2, 3, 2, 10); ctx.fillRect(11, 3, 2, 10);
    ctx.fillStyle = '#a1887f'; ctx.fillRect(2, 3, 3, 1); ctx.fillRect(11, 3, 3, 1);
    ctx.fillStyle = '#a1887f'; ctx.fillRect(1, 6, 14, 2); ctx.fillRect(1, 10, 14, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(1, 6, 14, 1); ctx.fillRect(1, 10, 14, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(1, 8, 14, 1); ctx.fillRect(1, 12, 14, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(2, 13, 3, 1); ctx.fillRect(11, 13, 3, 1);
    return c;
}
function generateTree(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE); const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#3a7d44'; ctx.fillRect(0, 0, TILE, TILE);
    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(8, 14, 5, 2, 0, 0, Math.PI * 2); ctx.fill();
    // Trunk + bark
    ctx.fillStyle = '#5d4037'; ctx.fillRect(6, 8, 4, 8);
    ctx.fillStyle = '#4e342e'; ctx.fillRect(7, 9, 1, 6);
    ctx.fillStyle = '#6d4c41'; ctx.fillRect(6, 8, 1, 7);
    // Root flares
    ctx.fillStyle = '#5d4037'; ctx.fillRect(5, 14, 1, 2); ctx.fillRect(10, 14, 1, 2);
    // Canopy layers
    ctx.fillStyle = '#1a4d2a'; ctx.beginPath(); ctx.arc(8, 5, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1e5631'; ctx.beginPath(); ctx.arc(7, 5, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2d6b36'; ctx.beginPath(); ctx.arc(6, 4, 4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#3a8a4a'; ctx.beginPath(); ctx.arc(10, 4, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4a9e56'; ctx.beginPath(); ctx.arc(8, 3, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#5cb85c'; ctx.beginPath(); ctx.arc(7, 2, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#66c76e'; ctx.beginPath(); ctx.arc(9, 2, 1.5, 0, Math.PI * 2); ctx.fill();
    // Sun highlight
    ctx.fillStyle = 'rgba(255,255,180,0.18)';
    ctx.beginPath(); ctx.arc(6, 2, 2.5, 0, Math.PI * 2); ctx.fill();
    // Dark leaf details
    ctx.fillStyle = '#255e2c';
    ctx.fillRect(4, 6, 1, 1); ctx.fillRect(11, 4, 1, 1); ctx.fillRect(5, 3, 1, 1);
    return c;
}
function generateFlower(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE); const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#3a7d44'; ctx.fillRect(0, 0, TILE, TILE);
    for (let i = 0; i < 5; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#4a9e56' : '#2d6b36';
        ctx.fillRect(Math.floor(Math.random() * 14) + 1, Math.floor(Math.random() * 10) + 4, 1, 2);
    }
    const colors = ['#e74c3c', '#f1c40f', '#9b59b6', '#e67e22', '#3498db', '#e91e63'];
    for (let i = 0; i < 3; i++) {
        const x = 2 + i * 4 + Math.floor(Math.random() * 2);
        const y = 3 + Math.floor(Math.random() * 5);
        ctx.fillStyle = '#27ae60'; ctx.fillRect(x + 1, y + 2, 1, 4);
        ctx.fillStyle = '#2ecc71'; ctx.fillRect(x + 2, y + 3, 1, 1);
        const color = colors[Math.floor(Math.random() * colors.length)];
        ctx.fillStyle = color; ctx.fillRect(x, y, 3, 2);
        ctx.fillStyle = '#f1c40f'; ctx.fillRect(x + 1, y, 1, 1);
        ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(x, y, 1, 1);
    }
    return c;
}
function generateCropTile(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE); const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#5c4a35'; ctx.fillRect(0, 0, TILE, TILE);
    for (let i = 0; i < 4; i++) {
        ctx.fillStyle = '#4a3b2a'; ctx.fillRect(0, i * 4, TILE, 1);
        ctx.fillStyle = '#6b5a48'; ctx.fillRect(0, i * 4 + 2, TILE, 1);
    }
    for (let i = 0; i < 6; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.03)';
        ctx.fillRect(Math.floor(Math.random() * 14) + 1, Math.floor(Math.random() * 14) + 1, 1, 1);
    }
    return c;
}
function generateFishSpot(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE); const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#2980b9'; ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#2471a3'; ctx.fillRect(0, 8, TILE, 8);
    ctx.fillStyle = '#3498db'; ctx.fillRect(1, 3, 5, 1); ctx.fillRect(9, 7, 4, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(2, 2, 3, 1); ctx.fillRect(10, 6, 3, 1);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(8, 8, 4, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath(); ctx.arc(8, 8, 6, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(8, 8, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(8, 7, 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath(); ctx.ellipse(6, 12, 3, 1.5, -0.3, 0, Math.PI * 2); ctx.fill();
    return c;
}

// ===== SMITHY PROPS =====
// A working coal forge: brick hearth, live coals, hood and chimney.
function generateForgeTile(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE * 2); // 2 tiles tall — hood rises above
    const ctx = c.getContext('2d')!;

    // Chimney hood
    ctx.fillStyle = '#3a3a44';
    ctx.beginPath();
    ctx.moveTo(2, 0); ctx.lineTo(14, 0); ctx.lineTo(15, 10); ctx.lineTo(1, 10);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4c4c58';
    ctx.fillRect(2, 0, 12, 2);
    ctx.fillStyle = '#25252c';
    ctx.fillRect(1, 9, 14, 2);
    // Soot
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(5, 4, 6, 5);

    // Brick hearth
    const brick = (x: number, y: number, w: number, h: number, tone: string) => {
        ctx.fillStyle = tone; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x, y, w, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(x, y + h - 1, w, 1);
    };
    for (let row = 0; row < 4; row++) {
        const y = 16 + row * 4;
        const off = row % 2 === 0 ? 0 : 3;
        for (let bx = -off; bx < 16; bx += 6) {
            brick(Math.max(0, bx), y, Math.min(6, 16 - Math.max(0, bx)) - 1, 3,
                row % 2 === 0 ? '#6b3b28' : '#5d3222');
        }
    }

    // Coal bed with live embers
    ctx.fillStyle = '#141014';
    ctx.fillRect(2, 12, 12, 5);
    const g = ctx.createRadialGradient(8, 14, 0, 8, 14, 8);
    g.addColorStop(0, '#fff0b0');
    g.addColorStop(0.35, '#ff8a1f');
    g.addColorStop(0.7, '#c8320a');
    g.addColorStop(1, 'rgba(90,10,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 8, 16, 12);
    // Individual coals
    ctx.fillStyle = '#2a1a16';
    for (const [cx, cy] of [[4, 14], [8, 13], [11, 15], [6, 16]] as number[][]) {
        ctx.fillRect(cx, cy, 2, 2);
    }
    ctx.fillStyle = '#ffd166';
    ctx.fillRect(5, 13, 1, 1); ctx.fillRect(9, 15, 1, 1); ctx.fillRect(12, 13, 1, 1);

    // Iron lip
    ctx.fillStyle = '#4a4e56';
    ctx.fillRect(1, 16, 14, 2);
    ctx.fillStyle = '#6b6f78';
    ctx.fillRect(1, 16, 14, 1);

    return c;
}

function generateAnvilTile(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;

    // Ground shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(8, 14, 6, 2, 0, 0, Math.PI * 2); ctx.fill();

    // Oak stump
    ctx.fillStyle = '#4a3222'; ctx.fillRect(4, 11, 8, 4);
    ctx.fillStyle = '#5d4130'; ctx.fillRect(4, 11, 8, 1);
    ctx.fillStyle = '#33220f'; ctx.fillRect(4, 14, 8, 1);

    // Anvil body — horn, face, waist
    ctx.fillStyle = '#53585f';
    ctx.beginPath();
    ctx.moveTo(1, 5); ctx.lineTo(13, 4); ctx.lineTo(13, 7); ctx.lineTo(10, 8);
    ctx.lineTo(10, 10); ctx.lineTo(13, 11); ctx.lineTo(3, 11); ctx.lineTo(6, 10);
    ctx.lineTo(6, 8); ctx.lineTo(3, 7);
    ctx.closePath(); ctx.fill();
    // Polished striking face
    ctx.fillStyle = '#8d949d'; ctx.fillRect(3, 4, 10, 2);
    ctx.fillStyle = '#c3cad2'; ctx.fillRect(4, 4, 8, 1);
    // Shadowed underside
    ctx.fillStyle = '#2f3339'; ctx.fillRect(3, 10, 10, 1);
    // Hot workpiece resting on the face
    ctx.fillStyle = '#ff7a1f'; ctx.fillRect(6, 3, 4, 1);
    ctx.fillStyle = '#ffe08a'; ctx.fillRect(7, 3, 2, 1);

    return c;
}

function generateBridgeTile(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;
    // Planks
    ctx.fillStyle = '#6b4a2c'; ctx.fillRect(0, 0, TILE, TILE);
    for (let i = 0; i < 4; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#7a5533' : '#634427';
        ctx.fillRect(0, i * 4, TILE, 3);
        ctx.fillStyle = 'rgba(255,255,255,0.07)';
        ctx.fillRect(0, i * 4, TILE, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(0, i * 4 + 3, TILE, 1);
    }
    // Rails
    ctx.fillStyle = '#4a3220'; ctx.fillRect(0, 0, 1, TILE); ctx.fillRect(15, 0, 1, TILE);
    // Nails
    ctx.fillStyle = '#8d949d';
    ctx.fillRect(2, 1, 1, 1); ctx.fillRect(13, 5, 1, 1); ctx.fillRect(2, 9, 1, 1); ctx.fillRect(13, 13, 1, 1);
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

// ===== ADVENTURER SPRITES =====
// Grounded, muted, ~6-heads-tall. No oversized heads, no blush, no smiles:
// these are people who go underground for a living and mostly do not come back.

interface Kit {
    cloth: string;      // tunic / robe body
    clothDark: string;
    leather: string;    // straps, belts, boots
    metal: string;      // plate, mail, buckles
    metalHi: string;
    accent: string;     // class signature colour
    skin: string;
    hair: string;
    /** 'helm' hides the face, 'hood' shadows it, 'bare' shows it */
    head: 'helm' | 'hood' | 'bare';
    weapon: 'sword' | 'staff' | 'dagger' | 'bow' | 'axe' | 'mace';
    cloak: boolean;
}

const KITS: Record<ClassName, Kit> = {
    warrior: { cloth: '#6d2b26', clothDark: '#3f1714', leather: '#4a3526', metal: '#767c85', metalHi: '#aab1b9', accent: '#a8443a', skin: '#c49a72', hair: '#3a2a1c', head: 'helm', weapon: 'sword', cloak: false },
    mage: { cloth: '#2f4a6b', clothDark: '#1a2b40', leather: '#3d3428', metal: '#6b7280', metalHi: '#9aa2ad', accent: '#6ba3d8', skin: '#c9a480', hair: '#c8c4bc', head: 'hood', weapon: 'staff', cloak: true },
    rogue: { cloth: '#2b3138', clothDark: '#171b20', leather: '#3a2c1f', metal: '#5c636b', metalHi: '#8b939c', accent: '#5c6b7a', skin: '#bf9670', hair: '#241c14', head: 'hood', weapon: 'dagger', cloak: true },
    paladin: { cloth: '#4a4034', clothDark: '#2a241c', leather: '#4a3526', metal: '#8a8271', metalHi: '#c6bda4', accent: '#c8a13c', skin: '#c49a72', hair: '#8a7040', head: 'helm', weapon: 'mace', cloak: true },
    ranger: { cloth: '#3f5138', clothDark: '#242f1f', leather: '#4d3a26', metal: '#6b7280', metalHi: '#99a1ab', accent: '#6b8f4a', skin: '#bd9169', hair: '#5a3a20', head: 'hood', weapon: 'bow', cloak: true },
    necromancer: { cloth: '#3a2c48', clothDark: '#20182a', leather: '#2e2434', metal: '#5f5a68', metalHi: '#8d8698', accent: '#8a6bb0', skin: '#b9b2ac', hair: '#1a1620', head: 'hood', weapon: 'staff', cloak: true },
    berserker: { cloth: '#5c3320', clothDark: '#331b10', leather: '#4a3526', metal: '#7a7068', metalHi: '#a99e93', accent: '#b25a2a', skin: '#c08a5e', hair: '#7a3418', head: 'bare', weapon: 'axe', cloak: false },
    cleric: { cloth: '#8a8578', clothDark: '#565248', leather: '#4a3f30', metal: '#8a8271', metalHi: '#c2b99f', accent: '#d8c88a', skin: '#c49a72', hair: '#9a8250', head: 'hood', weapon: 'mace', cloak: true },
    assassin: { cloth: '#1e2028', clothDark: '#0e1014', leather: '#2a222a', metal: '#4e535c', metalHi: '#7b828c', accent: '#7a4a8a', skin: '#b08a66', hair: '#14101a', head: 'hood', weapon: 'dagger', cloak: true },
};

function generateCharacter(className: ClassName, dir: number, frame: number, drawWeaponHint = false): HTMLCanvasElement {
    const c = createCanvas(CHAR_W, CHAR_H);   // 32 x 64
    const ctx = c.getContext('2d')!;
    const k = KITS[className] || KITS.warrior;

    const skinDark = shadeColor(k.skin, -34);
    const clothMid = shadeColor(k.cloth, 14);

    // dir: 0 down, 1 up, 2 left, 3 right
    const facingSide = dir === 2 || dir === 3;
    const back = dir === 1;
    const step = frame === 1 ? 1 : 0;
    const bob = step ? -1 : 0;

    const CX = 16;
    // ~6 heads tall: head 10px, torso 18px, legs 16px on a 64px canvas
    const headTop = 10 + bob;
    const headH = 11;
    const headBot = headTop + headH;
    const torsoTop = headBot - 1;
    const torsoH = 19;
    const torsoBot = torsoTop + torsoH;
    const legH = 15;
    const feetY = torsoBot + legH;

    // Mirror the whole rig for left-facing so we only author one profile
    if (dir === 2) {
        ctx.save();
        ctx.translate(CHAR_W, 0);
        ctx.scale(-1, 1);
    }

    // ---- Cast shadow ----
    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.beginPath();
    ctx.ellipse(CX, feetY + 1, step ? 8 : 9, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // ---- Cloak behind the body ----
    if (k.cloak) {
        const sway = step ? 1.5 : 0;
        ctx.fillStyle = k.clothDark;
        ctx.beginPath();
        ctx.moveTo(CX - 8, torsoTop + 1);
        ctx.quadraticCurveTo(CX - 11 - sway, torsoTop + 16, CX - 8 - sway, torsoBot + 9);
        ctx.lineTo(CX + 8 + sway, torsoBot + 9);
        ctx.quadraticCurveTo(CX + 11 + sway, torsoTop + 16, CX + 8, torsoTop + 1);
        ctx.closePath();
        ctx.fill();
        // Fold shading
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.fillRect(CX - 2, torsoTop + 4, 1, torsoBot + 4 - torsoTop);
        ctx.fillRect(CX + 3, torsoTop + 6, 1, torsoBot + 2 - torsoTop);
    }

    // ---- Legs ----
    // Side view swings fore/aft; front/back view swings apart
    const legLift = step ? 2 : 0;
    const drawLeg = (x: number, lift: number, shade: string) => {
        ctx.fillStyle = k.clothDark;
        ctx.fillRect(x, torsoBot - 1, 5, legH - 4 - lift);
        // Boot
        ctx.fillStyle = shade;
        ctx.fillRect(x - 1, feetY - 5 - lift, 7, 5);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(x - 1, feetY - 1 - lift, 7, 1);
    };
    if (facingSide) {
        drawLeg(CX - 5 + (step ? -2 : 0), 0, shadeColor(k.leather, -18));
        drawLeg(CX + 1 + (step ? 2 : 0), legLift, k.leather);
    } else {
        drawLeg(CX - 7, step ? legLift : 0, k.leather);
        drawLeg(CX + 2, step ? 0 : legLift, k.leather);
    }

    // ---- Torso ----
    ctx.fillStyle = k.cloth;
    ctx.beginPath();
    // Slight taper: broad shoulders, narrower waist
    ctx.moveTo(CX - 8, torsoTop);
    ctx.lineTo(CX + 8, torsoTop);
    ctx.lineTo(CX + 6, torsoBot);
    ctx.lineTo(CX - 6, torsoBot);
    ctx.closePath();
    ctx.fill();
    // Lit side / shadow side — a single light source from the upper left
    ctx.fillStyle = clothMid;
    ctx.fillRect(CX - 7, torsoTop + 1, 5, torsoH - 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(CX + 3, torsoTop + 1, 4, torsoH - 2);

    // Chest armour / robe front
    if (k.head === 'helm') {
        // Plate cuirass
        ctx.fillStyle = k.metal;
        ctx.beginPath();
        ctx.moveTo(CX - 7, torsoTop + 1);
        ctx.lineTo(CX + 7, torsoTop + 1);
        ctx.lineTo(CX + 5, torsoTop + 13);
        ctx.lineTo(CX, torsoTop + 16);
        ctx.lineTo(CX - 5, torsoTop + 13);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = k.metalHi;
        ctx.fillRect(CX - 7, torsoTop + 1, 14, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fillRect(CX - 1, torsoTop + 2, 1, 12);
    } else {
        // Layered robe with a visible collar
        ctx.fillStyle = k.clothDark;
        ctx.beginPath();
        ctx.moveTo(CX - 5, torsoTop);
        ctx.lineTo(CX, torsoTop + 8);
        ctx.lineTo(CX + 5, torsoTop);
        ctx.closePath();
        ctx.fill();
    }

    // Pauldrons
    ctx.fillStyle = k.metal;
    ctx.beginPath(); ctx.ellipse(CX - 8, torsoTop + 3, 4, 3.2, -0.25, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(CX + 8, torsoTop + 3, 4, 3.2, 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = k.metalHi;
    ctx.beginPath(); ctx.ellipse(CX - 8, torsoTop + 2, 3, 1.4, -0.25, 0, Math.PI * 2); ctx.fill();

    // Belt
    ctx.fillStyle = k.leather;
    ctx.fillRect(CX - 7, torsoBot - 6, 14, 3);
    ctx.fillStyle = k.metalHi;
    ctx.fillRect(CX - 2, torsoBot - 6, 3, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(CX - 7, torsoBot - 4, 14, 1);
    // Accent sash
    ctx.fillStyle = k.accent;
    ctx.fillRect(CX - 7, torsoBot - 9, 14, 2);

    // ---- Arms ----
    const armSwing = step ? 2 : 0;
    ctx.fillStyle = k.cloth;
    ctx.fillRect(CX - 11, torsoTop + 4 - armSwing, 4, 12);
    ctx.fillRect(CX + 7, torsoTop + 4 + armSwing, 4, 12);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(CX + 7, torsoTop + 4 + armSwing, 4, 12);
    // Bracers
    ctx.fillStyle = k.leather;
    ctx.fillRect(CX - 11, torsoTop + 12 - armSwing, 4, 4);
    ctx.fillRect(CX + 7, torsoTop + 12 + armSwing, 4, 4);
    // Hands
    ctx.fillStyle = skinDark;
    ctx.fillRect(CX - 11, torsoTop + 16 - armSwing, 4, 3);
    ctx.fillRect(CX + 7, torsoTop + 16 + armSwing, 4, 3);

    // ---- Head ----
    const hy = headTop;
    if (k.head === 'helm') {
        // Closed helm with a visor slit — no face, no expression
        ctx.fillStyle = k.metal;
        ctx.beginPath();
        ctx.moveTo(CX - 6, hy + headH);
        ctx.lineTo(CX - 6, hy + 3);
        ctx.quadraticCurveTo(CX, hy - 2, CX + 6, hy + 3);
        ctx.lineTo(CX + 6, hy + headH);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = k.metalHi;
        ctx.beginPath();
        ctx.moveTo(CX - 6, hy + 4);
        ctx.quadraticCurveTo(CX - 2, hy - 1, CX, hy - 1);
        ctx.lineTo(CX, hy + 4);
        ctx.closePath();
        ctx.fill();
        if (!back) {
            ctx.fillStyle = '#0a0a0c';
            ctx.fillRect(CX - 5, hy + 5, 10, 2.5);
            // Faint eye-shine in the slit
            ctx.fillStyle = 'rgba(220,200,150,0.55)';
            ctx.fillRect(CX - 3, hy + 5.6, 1.6, 1.2);
            ctx.fillRect(CX + 1.6, hy + 5.6, 1.6, 1.2);
            // Breath slots
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(CX - 3, hy + 9, 6, 1);
        }
        // Crest
        ctx.fillStyle = k.accent;
        ctx.fillRect(CX - 1, hy - 3, 2, 5);
    } else if (k.head === 'hood') {
        // Deep hood: the face is a shadow with two cold points of light
        ctx.fillStyle = k.clothDark;
        ctx.beginPath();
        ctx.moveTo(CX - 8, hy + headH + 1);
        ctx.quadraticCurveTo(CX - 8, hy - 3, CX, hy - 3);
        ctx.quadraticCurveTo(CX + 8, hy - 3, CX + 8, hy + headH + 1);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = k.cloth;
        ctx.beginPath();
        ctx.moveTo(CX - 8, hy + headH + 1);
        ctx.quadraticCurveTo(CX - 7, hy - 1, CX - 1, hy - 2);
        ctx.lineTo(CX - 1, hy + headH + 1);
        ctx.closePath();
        ctx.fill();
        if (!back) {
            // Face cavity
            ctx.fillStyle = '#0b0a0e';
            ctx.beginPath();
            ctx.ellipse(CX, hy + 6, 5, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            // Jaw catching a little light
            ctx.fillStyle = skinDark;
            ctx.beginPath();
            ctx.ellipse(CX, hy + 9.5, 3.4, 2.2, 0, 0, Math.PI);
            ctx.fill();
            // Eyes: narrow, no whites
            ctx.fillStyle = k.accent;
            ctx.fillRect(CX - 3.4, hy + 5.4, 2.4, 1.4);
            ctx.fillRect(CX + 1, hy + 5.4, 2.4, 1.4);
        }
    } else {
        // Bare head — scarred, hard-featured
        ctx.fillStyle = k.skin;
        ctx.beginPath();
        ctx.moveTo(CX - 5, hy + headH);
        ctx.lineTo(CX - 5, hy + 4);
        ctx.quadraticCurveTo(CX, hy - 1, CX + 5, hy + 4);
        ctx.lineTo(CX + 5, hy + headH);
        ctx.closePath();
        ctx.fill();
        // Shadow side of the face
        ctx.fillStyle = skinDark;
        ctx.fillRect(CX + 2, hy + 3, 3, headH - 3);
        // Wild hair / beard
        ctx.fillStyle = k.hair;
        ctx.beginPath();
        ctx.moveTo(CX - 6, hy + 5);
        ctx.quadraticCurveTo(CX, hy - 4, CX + 6, hy + 5);
        ctx.lineTo(CX + 6, hy + 2);
        ctx.quadraticCurveTo(CX, hy - 6, CX - 6, hy + 2);
        ctx.closePath();
        ctx.fill();
        if (!back) {
            // Brow shadow + hard eyes
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(CX - 5, hy + 5, 10, 1.6);
            ctx.fillStyle = '#1a1410';
            ctx.fillRect(CX - 3.4, hy + 6.2, 2.2, 1.4);
            ctx.fillRect(CX + 1.2, hy + 6.2, 2.2, 1.4);
            // Set mouth
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(CX - 2, hy + 9.4, 4, 1);
            // Beard
            ctx.fillStyle = shadeColor(k.hair, -14);
            ctx.fillRect(CX - 4, hy + 10.5, 8, 2.5);
        } else {
            ctx.fillStyle = k.hair;
            ctx.fillRect(CX - 5, hy + 3, 10, headH - 2);
        }
    }

    // ---- Weapon ----
    // Only drawn when the character has nothing equipped; the real weapon is
    // painted over this sprite at render time from the player's equipment
    // (see equip-art.ts), so every blade looks like itself.
    const wx = CX + 9;
    const wy = torsoTop + 4 + armSwing;
    if (!drawWeaponHint) { /* skip */ }
    else switch (k.weapon) {
        case 'sword':
            ctx.fillStyle = k.metalHi;
            ctx.fillRect(wx, wy - 12, 2, 16);
            ctx.fillStyle = k.metal;
            ctx.fillRect(wx + 1, wy - 12, 1, 16);
            ctx.fillStyle = k.accent;
            ctx.fillRect(wx - 2, wy + 4, 6, 2);
            ctx.fillStyle = k.leather;
            ctx.fillRect(wx, wy + 6, 2, 4);
            break;
        case 'axe':
            ctx.fillStyle = k.leather;
            ctx.fillRect(wx, wy - 8, 2, 20);
            ctx.fillStyle = k.metal;
            ctx.beginPath();
            ctx.moveTo(wx + 2, wy - 8);
            ctx.quadraticCurveTo(wx + 10, wy - 6, wx + 8, wy + 2);
            ctx.lineTo(wx + 2, wy - 1);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = k.metalHi;
            ctx.fillRect(wx + 7, wy - 5, 1, 6);
            break;
        case 'staff':
            ctx.fillStyle = k.leather;
            ctx.fillRect(wx, wy - 14, 2, 26);
            ctx.fillStyle = k.accent;
            ctx.beginPath(); ctx.arc(wx + 1, wy - 15, 3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.55)';
            ctx.beginPath(); ctx.arc(wx, wy - 16, 1, 0, Math.PI * 2); ctx.fill();
            break;
        case 'dagger':
            ctx.fillStyle = k.metalHi;
            ctx.beginPath();
            ctx.moveTo(wx + 1, wy - 4); ctx.lineTo(wx + 3, wy + 4); ctx.lineTo(wx, wy + 4);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = k.leather;
            ctx.fillRect(wx, wy + 4, 2, 4);
            break;
        case 'bow':
            ctx.strokeStyle = k.leather;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(wx + 1, wy - 10);
            ctx.quadraticCurveTo(wx + 7, wy + 2, wx + 1, wy + 14);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(230,230,220,0.7)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(wx + 1, wy - 10); ctx.lineTo(wx + 1, wy + 14);
            ctx.stroke();
            ctx.lineWidth = 1;
            break;
        case 'mace':
            ctx.fillStyle = k.leather;
            ctx.fillRect(wx, wy - 4, 2, 16);
            ctx.fillStyle = k.metal;
            ctx.beginPath(); ctx.arc(wx + 1, wy - 6, 3.4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = k.metalHi;
            ctx.beginPath(); ctx.arc(wx, wy - 7, 1.4, 0, Math.PI * 2); ctx.fill();
            break;
    }

    if (dir === 2) ctx.restore();

    return c;
}

const ENEMY_COLORS: Record<EnemyType, { color: string; eyeColor: string }> = {
    slime: { color: '#4a8f5a', eyeColor: '#e8e0c8' },
    skeleton: { color: '#c8c0ac', eyeColor: '#ff5252' },
    bat: { color: '#5c4a6b', eyeColor: '#e8c04a' },
    ghost: { color: '#c8d4dc', eyeColor: '#6ba3d8' },
    goblin: { color: '#5c7a3a', eyeColor: '#e8c04a' },
    spider: { color: '#2c3038', eyeColor: '#ff4d4d' },
    orc: { color: '#4a6b5a', eyeColor: '#e8a03a' },
    demon: { color: '#8c3028', eyeColor: '#ffd24a' },
    wraith: { color: '#5c4470', eyeColor: '#7fe8e0' },
    golem: { color: '#6b6b70', eyeColor: '#e07a2a' },
    drake: { color: '#a8562a', eyeColor: '#ffd24a' },
    lich: { color: '#2c3440', eyeColor: '#7aff8a' },
    // Expanded roster
    rat: { color: '#6b5644', eyeColor: '#ff5252' },
    kobold: { color: '#8c5a2b', eyeColor: '#ffd54f' },
    zombie: { color: '#5c7a4a', eyeColor: '#c8d6a0' },
    cultist: { color: '#5b2a52', eyeColor: '#ff4d6d' },
    harpy: { color: '#7a5c8a', eyeColor: '#ffe066' },
    gargoyle: { color: '#5a5f66', eyeColor: '#ff8a3d' },
    mimic: { color: '#5a3a24', eyeColor: '#ff2b2b' },
    banshee: { color: '#9fb8c8', eyeColor: '#66f0ff' },
    minotaur: { color: '#6b3a24', eyeColor: '#ff5252' },
    basilisk: { color: '#3f6b45', eyeColor: '#ffe066' },
    revenant: { color: '#3a4450', eyeColor: '#8cf0d0' },
    hellhound: { color: '#40201c', eyeColor: '#ff6a2a' },
    shade: { color: '#181820', eyeColor: '#b388ff' },
    troll: { color: '#5a6b4a', eyeColor: '#ffd54f' },
    wisp: { color: '#7fd8ff', eyeColor: '#ffffff' },
    devourer: { color: '#2a1020', eyeColor: '#ff2b55' },
};

function generateEnemy(type: EnemyType, frame: number): HTMLCanvasElement {
    const c = createCanvas(64, 64);
    const ctx = c.getContext('2d')!;
    const info = ENEMY_COLORS[type];
    const bob = frame % 2 === 0 ? 0 : 2;
    const colorHi = shadeColor(info.color, 30);
    const colorLo = shadeColor(info.color, -40);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(32, 58, 22, 5, 0, 0, Math.PI * 2); ctx.fill();

    if (type === 'slime') {
        const bounce = frame % 2 === 0 ? 0 : -6;
        const squash = frame % 2 === 0 ? 0 : 4;
        // Gel body
        ctx.fillStyle = info.color;
        ctx.beginPath(); ctx.ellipse(32, 38 + bounce, 20 + squash, 18 - squash, 0, 0, Math.PI * 2); ctx.fill();
        // Highlight
        ctx.fillStyle = colorHi;
        ctx.beginPath(); ctx.ellipse(32, 32 + bounce, 18 + squash, 10, 0, Math.PI, 0); ctx.fill();
        // Gel shine
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath(); ctx.ellipse(24, 30 + bounce, 6, 5, -0.3, 0, Math.PI * 2); ctx.fill();
        // Dark bottom
        ctx.fillStyle = colorLo;
        ctx.beginPath(); ctx.ellipse(32, 46 + bounce, 18 + squash, 8, 0, 0, Math.PI); ctx.fill();
        // Eyes
        ctx.fillStyle = info.eyeColor;
        ctx.beginPath(); ctx.ellipse(24, 34 + bounce, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(40, 34 + bounce, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
        // Pupils
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(25, 35 + bounce, 2, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(41, 35 + bounce, 2, 3, 0, 0, Math.PI * 2); ctx.fill();
        // Pupil highlights
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.ellipse(23, 33 + bounce, 1.5, 1.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(39, 33 + bounce, 1.5, 1.5, 0, 0, Math.PI * 2); ctx.fill();

    } else if (type === 'bat') {
        const y = frame % 2 === 0 ? 14 : 20;
        const wingUp = frame % 2 === 0;
        // Wings
        ctx.fillStyle = info.color;
        ctx.beginPath();
        ctx.moveTo(32, y + 12);
        ctx.quadraticCurveTo(16, wingUp ? y - 4 : y + 10, wingUp ? 2 : 8, wingUp ? y : y + 8);
        ctx.lineTo(12, y + 18);
        ctx.lineTo(32, y + 12);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(32, y + 12);
        ctx.quadraticCurveTo(48, wingUp ? y - 4 : y + 10, wingUp ? 62 : 56, wingUp ? y : y + 8);
        ctx.lineTo(52, y + 18);
        ctx.lineTo(32, y + 12);
        ctx.fill();
        // Wing membrane
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath(); ctx.ellipse(18, y + 10, 8, 5, 0, 0, Math.PI); ctx.fill();
        ctx.beginPath(); ctx.ellipse(46, y + 10, 8, 5, 0, 0, Math.PI); ctx.fill();
        // Body
        ctx.fillStyle = info.color;
        ctx.beginPath(); ctx.ellipse(32, y + 14, 10, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = colorHi;
        ctx.beginPath(); ctx.ellipse(32, y + 10, 8, 6, 0, Math.PI, 0); ctx.fill();
        // Ears
        ctx.fillStyle = info.color;
        ctx.beginPath(); ctx.moveTo(24, y + 4); ctx.lineTo(22, y - 2); ctx.lineTo(28, y + 6); ctx.fill();
        ctx.beginPath(); ctx.moveTo(40, y + 4); ctx.lineTo(42, y - 2); ctx.lineTo(36, y + 6); ctx.fill();
        // Eyes
        ctx.fillStyle = info.eyeColor;
        ctx.beginPath(); ctx.ellipse(27, y + 10, 3, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(37, y + 10, 3, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(28, y + 10, 1.5, 1.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(38, y + 10, 1.5, 1.5, 0, 0, Math.PI * 2); ctx.fill();
        // Fangs
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(28, y + 17); ctx.lineTo(29, y + 21); ctx.lineTo(30, y + 17); ctx.fill();
        ctx.beginPath(); ctx.moveTo(34, y + 17); ctx.lineTo(35, y + 21); ctx.lineTo(36, y + 17); ctx.fill();

    } else if (type === 'skeleton') {
        // Skull
        ctx.fillStyle = '#ddd';
        ctx.beginPath(); ctx.ellipse(32, 10 + bob, 12, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ccc';
        ctx.beginPath(); ctx.ellipse(32, 12 + bob, 10, 7, 0, 0, Math.PI); ctx.fill();
        // Eye sockets
        ctx.fillStyle = '#222';
        ctx.beginPath(); ctx.ellipse(26, 9 + bob, 4, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(38, 9 + bob, 4, 4, 0, 0, Math.PI * 2); ctx.fill();
        // Glowing eyes
        ctx.fillStyle = info.eyeColor;
        ctx.beginPath(); ctx.ellipse(26, 9 + bob, 2, 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(38, 9 + bob, 2, 2, 0, 0, Math.PI * 2); ctx.fill();
        // Nose hole
        ctx.fillStyle = '#333';
        ctx.beginPath(); ctx.ellipse(32, 14 + bob, 2, 1.5, 0, 0, Math.PI * 2); ctx.fill();
        // Jaw teeth
        ctx.fillStyle = '#bbb';
        for (let i = 0; i < 6; i++) { ctx.fillRect(25 + i * 2.2, 17 + bob, 1.5, 2); }
        // Ribcage
        ctx.fillStyle = '#ccc';
        ctx.fillRect(26, 22 + bob, 12, 16);
        ctx.fillStyle = '#444';
        for (let i = 0; i < 4; i++) { ctx.fillRect(28, 24 + bob + i * 4, 8, 1.5); }
        // Arms (bones)
        ctx.fillStyle = '#bbb';
        ctx.fillRect(18, 24 + bob, 8, 3);
        ctx.fillRect(38, 24 + bob, 8, 3);
        ctx.fillRect(15, 27 + bob, 3, 10);
        ctx.fillRect(46, 27 + bob, 3, 10);
        // Legs
        ctx.fillStyle = '#ccc';
        ctx.fillRect(26, 38 + bob, 5, 14);
        ctx.fillRect(33, 38 + bob, 5, 14);

    } else if (type === 'spider') {
        // Abdomen
        ctx.fillStyle = info.color;
        ctx.beginPath(); ctx.ellipse(32, 34 + bob, 14, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = colorHi;
        ctx.beginPath(); ctx.ellipse(32, 30 + bob, 10, 6, 0, Math.PI, 0); ctx.fill();
        // Hourglass marking
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath(); ctx.moveTo(32, 30 + bob); ctx.lineTo(29, 34 + bob); ctx.lineTo(32, 38 + bob); ctx.lineTo(35, 34 + bob); ctx.closePath(); ctx.fill();
        // Head
        ctx.fillStyle = info.color;
        ctx.beginPath(); ctx.ellipse(32, 20 + bob, 8, 7, 0, 0, Math.PI * 2); ctx.fill();
        // Eyes (8!)
        ctx.fillStyle = info.eyeColor;
        ctx.beginPath(); ctx.arc(27, 18 + bob, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(37, 18 + bob, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(30, 16 + bob, 1.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(34, 16 + bob, 1.5, 0, Math.PI * 2); ctx.fill();
        // Mandibles
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath(); ctx.moveTo(28, 24 + bob); ctx.lineTo(26, 28 + bob); ctx.lineTo(30, 25 + bob); ctx.fill();
        ctx.beginPath(); ctx.moveTo(36, 24 + bob); ctx.lineTo(38, 28 + bob); ctx.lineTo(34, 25 + bob); ctx.fill();
        // Legs (4 per side)
        ctx.strokeStyle = '#1a2533'; ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath(); ctx.moveTo(20, 28 + bob + i * 3); ctx.lineTo(6, 16 + bob + i * 8); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(44, 28 + bob + i * 3); ctx.lineTo(58, 16 + bob + i * 8); ctx.stroke();
        }

    } else if (type === 'ghost') {
        ctx.globalAlpha = 0.7;
        const gy = 6 + bob;
        // Ethereal body
        ctx.fillStyle = info.color;
        ctx.beginPath(); ctx.ellipse(32, gy + 16, 16, 18, 0, 0, Math.PI * 2); ctx.fill();
        // Wavy bottom
        ctx.fillStyle = info.color;
        for (let i = 0; i < 4; i++) {
            ctx.beginPath(); ctx.ellipse(18 + i * 10, gy + 34, 5, 4 + (i % 2) * 2, 0, 0, Math.PI); ctx.fill();
        }
        // Inner glow
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.beginPath(); ctx.ellipse(32, gy + 12, 12, 14, 0, 0, Math.PI * 2); ctx.fill();
        // Eyes
        ctx.fillStyle = info.eyeColor;
        ctx.beginPath(); ctx.ellipse(24, gy + 14, 5, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(40, gy + 14, 5, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(25, gy + 14, 2.5, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(41, gy + 14, 2.5, 3, 0, 0, Math.PI * 2); ctx.fill();
        // Mouth
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(32, gy + 24, 5, 4, 0, 0, Math.PI); ctx.fill();
        ctx.globalAlpha = 1;

    } else if (type === 'goblin') {
        // Head
        ctx.fillStyle = info.color;
        ctx.beginPath(); ctx.ellipse(32, 12 + bob, 12, 10, 0, 0, Math.PI * 2); ctx.fill();
        // Pointed ears
        ctx.beginPath(); ctx.moveTo(18, 10 + bob); ctx.lineTo(8, 5 + bob); ctx.lineTo(20, 14 + bob); ctx.fill();
        ctx.beginPath(); ctx.moveTo(46, 10 + bob); ctx.lineTo(56, 5 + bob); ctx.lineTo(44, 14 + bob); ctx.fill();
        // Body (leather)
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(22, 22 + bob, 20, 18);
        ctx.fillStyle = '#4e342e';
        ctx.fillRect(22, 22 + bob, 20, 3);
        // Belt
        ctx.fillStyle = '#3e2723';
        ctx.fillRect(22, 36 + bob, 20, 3);
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(30, 36 + bob, 4, 3);
        // Eyes
        ctx.fillStyle = info.eyeColor;
        ctx.beginPath(); ctx.ellipse(26, 11 + bob, 3, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(38, 11 + bob, 3, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(27, 11 + bob, 1.5, 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(39, 11 + bob, 1.5, 2, 0, 0, Math.PI * 2); ctx.fill();
        // Mouth
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(32, 18 + bob, 4, 2, 0, 0, Math.PI); ctx.fill();
        // Dagger
        ctx.fillStyle = '#aaa';
        ctx.fillRect(48, 28 + bob, 3, 14);
        ctx.fillStyle = '#ddd';
        ctx.fillRect(48, 28 + bob, 1, 14);
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(47, 42 + bob, 5, 4);
        // Legs
        ctx.fillStyle = info.color;
        ctx.fillRect(24, 40, 6, 12);
        ctx.fillRect(34, 40, 6, 12);

    } else if (type === 'orc') {
        // Head
        ctx.fillStyle = info.color;
        ctx.beginPath(); ctx.ellipse(32, 12 + bob, 14, 11, 0, 0, Math.PI * 2); ctx.fill();
        // Tusks
        ctx.fillStyle = '#f5f5dc';
        ctx.beginPath(); ctx.moveTo(22, 18 + bob); ctx.lineTo(20, 24 + bob); ctx.lineTo(24, 19 + bob); ctx.fill();
        ctx.beginPath(); ctx.moveTo(42, 18 + bob); ctx.lineTo(44, 24 + bob); ctx.lineTo(40, 19 + bob); ctx.fill();
        // Heavy armor body
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(16, 23 + bob, 32, 20);
        ctx.fillStyle = '#4e342e';
        ctx.fillRect(16, 23 + bob, 32, 3);
        // Shoulder pads
        ctx.fillStyle = '#7f8c8d';
        ctx.beginPath(); ctx.ellipse(14, 26 + bob, 6, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(50, 26 + bob, 6, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#95a5a6';
        ctx.beginPath(); ctx.ellipse(14, 24 + bob, 5, 4, 0, Math.PI, 0); ctx.fill();
        ctx.beginPath(); ctx.ellipse(50, 24 + bob, 5, 4, 0, Math.PI, 0); ctx.fill();
        // Eyes
        ctx.fillStyle = info.eyeColor;
        ctx.beginPath(); ctx.ellipse(26, 10 + bob, 3, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(38, 10 + bob, 3, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(27, 10 + bob, 1.5, 1.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(39, 10 + bob, 1.5, 1.5, 0, 0, Math.PI * 2); ctx.fill();
        // Legs
        ctx.fillStyle = '#333';
        ctx.fillRect(20, 43, 8, 12);
        ctx.fillRect(36, 43, 8, 12);

    } else if (type === 'demon') {
        // Horns
        ctx.fillStyle = '#8b0000';
        ctx.beginPath(); ctx.moveTo(20, 8 + bob); ctx.quadraticCurveTo(14, -4 + bob, 18, 2 + bob); ctx.lineTo(24, 10 + bob); ctx.fill();
        ctx.beginPath(); ctx.moveTo(44, 8 + bob); ctx.quadraticCurveTo(50, -4 + bob, 46, 2 + bob); ctx.lineTo(40, 10 + bob); ctx.fill();
        // Head
        ctx.fillStyle = info.color;
        ctx.beginPath(); ctx.ellipse(32, 14 + bob, 13, 10, 0, 0, Math.PI * 2); ctx.fill();
        // Body
        ctx.fillStyle = info.color;
        ctx.fillRect(18, 24 + bob, 28, 18);
        ctx.fillStyle = colorHi;
        ctx.fillRect(18, 24 + bob, 28, 3);
        // Wings
        ctx.fillStyle = '#8b0000';
        ctx.beginPath(); ctx.moveTo(18, 26 + bob); ctx.quadraticCurveTo(0, 16 + bob, 4, 30 + bob); ctx.lineTo(16, 38 + bob); ctx.fill();
        ctx.beginPath(); ctx.moveTo(46, 26 + bob); ctx.quadraticCurveTo(64, 16 + bob, 60, 30 + bob); ctx.lineTo(48, 38 + bob); ctx.fill();
        ctx.fillStyle = '#660000';
        ctx.beginPath(); ctx.moveTo(18, 28 + bob); ctx.quadraticCurveTo(6, 22 + bob, 8, 32 + bob); ctx.lineTo(16, 36 + bob); ctx.fill();
        ctx.beginPath(); ctx.moveTo(46, 28 + bob); ctx.quadraticCurveTo(58, 22 + bob, 56, 32 + bob); ctx.lineTo(48, 36 + bob); ctx.fill();
        // Eyes
        ctx.fillStyle = info.eyeColor;
        ctx.beginPath(); ctx.ellipse(26, 12 + bob, 4, 2.5, -0.1, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(38, 12 + bob, 4, 2.5, 0.1, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(27, 12 + bob, 1.5, 1.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(39, 12 + bob, 1.5, 1.5, 0, 0, Math.PI * 2); ctx.fill();
        // Mouth
        ctx.fillStyle = '#ff4444';
        ctx.beginPath(); ctx.ellipse(32, 20 + bob, 5, 2, 0, 0, Math.PI); ctx.fill();
        // Legs
        ctx.fillStyle = '#333';
        ctx.fillRect(22, 42, 6, 14);
        ctx.fillRect(36, 42, 6, 14);
        // Tail
        ctx.fillStyle = info.color;
        ctx.beginPath(); ctx.moveTo(18, 40 + bob); ctx.quadraticCurveTo(4, 44 + bob, 8, 50 + bob); ctx.lineWidth = 3; ctx.strokeStyle = info.color; ctx.stroke();

    } else if (type === 'wraith') {
        ctx.globalAlpha = 0.8;
        // Hood
        ctx.fillStyle = info.color;
        ctx.beginPath(); ctx.ellipse(32, 12 + bob, 14, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = colorLo;
        ctx.beginPath(); ctx.ellipse(32, 14 + bob, 10, 8, 0, 0.3, Math.PI - 0.3); ctx.fill();
        // Robe body
        ctx.fillStyle = '#6c3483';
        ctx.beginPath(); ctx.moveTo(16, 20 + bob); ctx.lineTo(12, 50 + bob); ctx.lineTo(52, 50 + bob); ctx.lineTo(48, 20 + bob); ctx.closePath(); ctx.fill();
        // Wavy bottom
        ctx.fillStyle = '#5b2c6f';
        for (let i = 0; i < 4; i++) {
            ctx.beginPath(); ctx.ellipse(16 + i * 10, 50 + bob, 6, 3 + (i % 2) * 2, 0, 0, Math.PI); ctx.fill();
        }
        // Eyes
        ctx.fillStyle = info.eyeColor;
        ctx.beginPath(); ctx.ellipse(26, 12 + bob, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(38, 12 + bob, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
        // Soul orb
        ctx.fillStyle = '#00ffff';
        ctx.globalAlpha = 0.4 + Math.sin(frame * Math.PI) * 0.3;
        ctx.beginPath(); ctx.arc(32, 34 + bob, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(30, 32 + bob, 2, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;

    } else if (type === 'golem') {
        // Heavy body
        ctx.fillStyle = info.color;
        ctx.fillRect(14, 14 + bob, 36, 30);
        ctx.fillStyle = '#95a5a6';
        ctx.beginPath(); ctx.ellipse(32, 14 + bob, 18, 6, 0, Math.PI, 0); ctx.fill();
        // Head
        ctx.fillStyle = info.color;
        ctx.beginPath(); ctx.ellipse(32, 8 + bob, 12, 9, 0, 0, Math.PI * 2); ctx.fill();
        // Cracks
        ctx.strokeStyle = '#5a6268'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(22, 20 + bob); ctx.lineTo(20, 30 + bob); ctx.lineTo(24, 36 + bob); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(42, 18 + bob); ctx.lineTo(44, 28 + bob); ctx.lineTo(40, 34 + bob); ctx.stroke();
        // Stone texture highlights
        ctx.fillStyle = '#95a5a6';
        ctx.beginPath(); ctx.ellipse(24, 22 + bob, 6, 4, 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(40, 28 + bob, 5, 3, -0.3, 0, Math.PI * 2); ctx.fill();
        // Arms (massive)
        ctx.fillStyle = '#6d7b7d';
        ctx.fillRect(4, 18 + bob, 10, 24);
        ctx.fillRect(50, 18 + bob, 10, 24);
        // Fists
        ctx.beginPath(); ctx.ellipse(9, 44 + bob, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(55, 44 + bob, 7, 6, 0, 0, Math.PI * 2); ctx.fill();
        // Legs
        ctx.fillStyle = '#6d7b7d';
        ctx.fillRect(18, 44, 10, 14);
        ctx.fillRect(36, 44, 10, 14);
        // Eyes
        ctx.fillStyle = info.eyeColor;
        ctx.beginPath(); ctx.ellipse(26, 7 + bob, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(38, 7 + bob, 3, 2, 0, 0, Math.PI * 2); ctx.fill();

    } else if (type === 'drake') {
        // Neck/head
        ctx.fillStyle = info.color;
        ctx.beginPath(); ctx.ellipse(32, 10 + bob, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
        // Snout
        ctx.beginPath(); ctx.ellipse(46, 12 + bob, 8, 5, 0.2, 0, Math.PI * 2); ctx.fill();
        // Horns
        ctx.fillStyle = '#a0522d';
        ctx.beginPath(); ctx.moveTo(24, 4 + bob); ctx.lineTo(22, -4 + bob); ctx.lineTo(28, 6 + bob); ctx.fill();
        ctx.beginPath(); ctx.moveTo(36, 4 + bob); ctx.lineTo(38, -4 + bob); ctx.lineTo(32, 6 + bob); ctx.fill();
        // Body
        ctx.fillStyle = info.color;
        ctx.beginPath(); ctx.ellipse(32, 30 + bob, 16, 14, 0, 0, Math.PI * 2); ctx.fill();
        // Belly scales
        ctx.fillStyle = '#e67e22';
        ctx.beginPath(); ctx.ellipse(32, 34 + bob, 12, 8, 0, 0, Math.PI); ctx.fill();
        // Wings
        ctx.fillStyle = '#b34700';
        ctx.beginPath(); ctx.moveTo(16, 22 + bob); ctx.quadraticCurveTo(0, 10 + bob, 4, 24 + bob); ctx.lineTo(16, 32 + bob); ctx.fill();
        ctx.beginPath(); ctx.moveTo(48, 22 + bob); ctx.quadraticCurveTo(64, 10 + bob, 60, 24 + bob); ctx.lineTo(48, 32 + bob); ctx.fill();
        // Eye
        ctx.fillStyle = info.eyeColor;
        ctx.beginPath(); ctx.ellipse(38, 9 + bob, 3, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(39, 9 + bob, 1.5, 2, 0, 0, Math.PI * 2); ctx.fill();
        // Fire breath
        ctx.fillStyle = '#f39c12';
        ctx.beginPath(); ctx.ellipse(54, 12 + bob, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath(); ctx.ellipse(58, 11 + bob, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
        // Tail
        ctx.fillStyle = info.color;
        ctx.beginPath(); ctx.moveTo(18, 38 + bob); ctx.quadraticCurveTo(6, 44 + bob, 10, 52 + bob); ctx.lineWidth = 4; ctx.strokeStyle = info.color; ctx.stroke();
        // Legs
        ctx.fillStyle = '#333';
        ctx.fillRect(24, 42, 6, 12);
        ctx.fillRect(36, 42, 6, 12);

    } else if (type === 'lich') {
        // Crown
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath(); ctx.moveTo(20, 6 + bob); ctx.lineTo(22, -2 + bob); ctx.lineTo(24, 6 + bob); ctx.fill();
        ctx.beginPath(); ctx.moveTo(29, 4 + bob); ctx.lineTo(32, -4 + bob); ctx.lineTo(35, 4 + bob); ctx.fill();
        ctx.beginPath(); ctx.moveTo(40, 6 + bob); ctx.lineTo(42, -2 + bob); ctx.lineTo(44, 6 + bob); ctx.fill();
        ctx.fillRect(18, 4 + bob, 28, 4);
        // Skull
        ctx.fillStyle = '#ddd';
        ctx.beginPath(); ctx.ellipse(32, 14 + bob, 12, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#bbb';
        ctx.beginPath(); ctx.ellipse(32, 18 + bob, 8, 4, 0, 0, Math.PI); ctx.fill();
        // Eye sockets
        ctx.fillStyle = '#111';
        ctx.beginPath(); ctx.ellipse(26, 12 + bob, 4, 3.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(38, 12 + bob, 4, 3.5, 0, 0, Math.PI * 2); ctx.fill();
        // Glowing eyes
        ctx.fillStyle = info.eyeColor;
        ctx.beginPath(); ctx.ellipse(26, 12 + bob, 2, 2, 0, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(38, 12 + bob, 2, 2, 0, 0, Math.PI * 2); ctx.fill();
        // Robes
        ctx.fillStyle = info.color;
        ctx.beginPath(); ctx.moveTo(16, 24 + bob); ctx.lineTo(12, 52 + bob); ctx.lineTo(52, 52 + bob); ctx.lineTo(48, 24 + bob); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#1a1a30';
        ctx.fillRect(16, 24 + bob, 32, 3);
        // Robe detail
        ctx.fillStyle = '#3d1f6d';
        ctx.fillRect(20, 34 + bob, 24, 2);
        // Staff
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(52, 8 + bob, 3, 44);
        ctx.fillStyle = '#8d6e63';
        ctx.fillRect(52, 8 + bob, 1, 44);
        // Staff orb
        ctx.fillStyle = '#9b59b6';
        ctx.beginPath(); ctx.arc(53, 6 + bob, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#e74cff';
        ctx.beginPath(); ctx.arc(53, 6 + bob, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(51, 4 + bob, 1.5, 0, Math.PI * 2); ctx.fill();
    } else {
        drawExtraEnemy(ctx, type, frame, info, colorHi, colorLo);
    }

    return c;
}

// ===== EXPANDED MONSTER ROSTER =====
// Each gets a distinct silhouette so you can read a room at a glance.
function drawExtraEnemy(
    ctx: CanvasRenderingContext2D,
    type: EnemyType,
    frame: number,
    info: { color: string; eyeColor: string },
    hi: string,
    lo: string,
): void {
    const bob = frame % 2 === 0 ? 0 : 2;
    const eye = (pts: [number, number][], r = 3) => {
        ctx.save();
        ctx.shadowColor = info.eyeColor;
        ctx.shadowBlur = 8;
        ctx.fillStyle = info.eyeColor;
        for (const [x, y] of pts) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
        ctx.restore();
    };
    const horn = (x: number, y: number, w: number, h: number, lean: number, fill: string) => {
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(x - w, y); ctx.lineTo(x + lean, y - h); ctx.lineTo(x + w, y);
        ctx.closePath(); ctx.fill();
    };

    switch (type) {
        case 'rat': {
            // Low, scurrying, long tail
            ctx.strokeStyle = lo; ctx.lineWidth = 3; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(44, 46); ctx.quadraticCurveTo(58, 44, 56, 30); ctx.stroke();
            ctx.lineWidth = 1;
            ctx.fillStyle = info.color;
            ctx.beginPath(); ctx.ellipse(32, 44 - bob, 17, 11, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = hi;
            ctx.beginPath(); ctx.ellipse(30, 40 - bob, 13, 6, 0, 0, Math.PI * 2); ctx.fill();
            // Head + snout
            ctx.fillStyle = info.color;
            ctx.beginPath(); ctx.ellipse(16, 42 - bob, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(8, 42 - bob); ctx.lineTo(2, 45 - bob); ctx.lineTo(9, 47 - bob); ctx.closePath(); ctx.fill();
            // Ears
            ctx.fillStyle = lo;
            ctx.beginPath(); ctx.arc(16, 33 - bob, 5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(24, 34 - bob, 4, 0, Math.PI * 2); ctx.fill();
            // Feet
            ctx.fillStyle = lo;
            ctx.fillRect(22, 52, 5, 4); ctx.fillRect(38, 52, 5, 4);
            eye([[13, 40 - bob]], 2.4);
            break;
        }

        case 'kobold': {
            // Small upright reptile with a crude spear
            ctx.fillStyle = lo; ctx.fillRect(24, 44, 6, 12); ctx.fillRect(36, 44, 6, 12);
            ctx.fillStyle = info.color;
            ctx.beginPath(); ctx.ellipse(33, 36 - bob, 13, 15, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = hi;
            ctx.beginPath(); ctx.ellipse(30, 32 - bob, 8, 9, 0, 0, Math.PI * 2); ctx.fill();
            // Snouted head
            ctx.fillStyle = info.color;
            ctx.beginPath(); ctx.ellipse(33, 18 - bob, 11, 9, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(22, 19 - bob); ctx.lineTo(12, 23 - bob); ctx.lineTo(23, 25 - bob); ctx.closePath(); ctx.fill();
            horn(28, 10 - bob, 3, 8, -2, hi); horn(38, 10 - bob, 3, 8, 2, hi);
            // Spear
            ctx.strokeStyle = '#6b4a2c'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(48, 8); ctx.lineTo(44, 56); ctx.stroke();
            ctx.lineWidth = 1;
            ctx.fillStyle = '#c3cad2';
            ctx.beginPath(); ctx.moveTo(48, 2); ctx.lineTo(44, 12); ctx.lineTo(52, 11); ctx.closePath(); ctx.fill();
            eye([[29, 17 - bob], [37, 17 - bob]], 2.2);
            break;
        }

        case 'zombie': {
            // Lopsided shamble, one arm hanging
            ctx.fillStyle = lo; ctx.fillRect(24, 46, 7, 12); ctx.fillRect(35, 44, 7, 14);
            ctx.fillStyle = info.color;
            ctx.beginPath(); ctx.ellipse(33, 34 - bob, 14, 16, 0.12, 0, Math.PI * 2); ctx.fill();
            // Exposed ribs / torn flesh
            ctx.strokeStyle = 'rgba(230,230,210,0.55)'; ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath(); ctx.moveTo(26, 28 + i * 6 - bob); ctx.lineTo(38, 30 + i * 6 - bob); ctx.stroke();
            }
            ctx.lineWidth = 1;
            ctx.fillStyle = '#7a2020';
            ctx.beginPath(); ctx.ellipse(38, 36 - bob, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
            // Dangling arms
            ctx.fillStyle = info.color;
            ctx.fillRect(14, 30 - bob, 6, 22);
            ctx.fillRect(46, 26 - bob, 6, 18);
            // Head, tilted
            ctx.beginPath(); ctx.ellipse(31, 15 - bob, 10, 11, -0.2, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = lo;
            ctx.fillRect(24, 20 - bob, 14, 3);
            eye([[27, 13 - bob], [35, 14 - bob]], 2.4);
            break;
        }

        case 'cultist': {
            // Hooded robe, no visible body
            ctx.fillStyle = info.color;
            ctx.beginPath();
            ctx.moveTo(33, 8 - bob);
            ctx.quadraticCurveTo(12, 26, 15, 56);
            ctx.lineTo(51, 56);
            ctx.quadraticCurveTo(54, 26, 33, 8 - bob);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = lo;
            ctx.beginPath();
            ctx.moveTo(33, 20 - bob); ctx.quadraticCurveTo(22, 32, 24, 56); ctx.lineTo(42, 56);
            ctx.quadraticCurveTo(44, 32, 33, 20 - bob);
            ctx.closePath(); ctx.fill();
            // Void inside the hood
            ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.ellipse(33, 18 - bob, 9, 10, 0, 0, Math.PI * 2); ctx.fill();
            // Ritual dagger
            ctx.fillStyle = '#c3cad2';
            ctx.beginPath(); ctx.moveTo(52, 24); ctx.lineTo(50, 40); ctx.lineTo(55, 40); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#7a2020'; ctx.fillRect(49, 40, 7, 3);
            eye([[29, 18 - bob], [37, 18 - bob]], 2.6);
            break;
        }

        case 'harpy': {
            // Winged, taloned, mid-flap
            const flap = frame % 2 === 0 ? 0 : 8;
            ctx.fillStyle = lo;
            ctx.beginPath();
            ctx.moveTo(26, 30); ctx.quadraticCurveTo(2, 12 - flap, 0, 34 - flap);
            ctx.quadraticCurveTo(12, 30, 26, 38); ctx.closePath(); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(40, 30); ctx.quadraticCurveTo(64, 12 - flap, 66, 34 - flap);
            ctx.quadraticCurveTo(54, 30, 40, 38); ctx.closePath(); ctx.fill();
            ctx.fillStyle = info.color;
            ctx.beginPath(); ctx.ellipse(33, 34 - bob, 11, 14, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = hi;
            ctx.beginPath(); ctx.ellipse(33, 30 - bob, 7, 8, 0, 0, Math.PI * 2); ctx.fill();
            // Head with beak
            ctx.fillStyle = info.color;
            ctx.beginPath(); ctx.ellipse(33, 15 - bob, 9, 9, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#e8b33d';
            ctx.beginPath(); ctx.moveTo(24, 16 - bob); ctx.lineTo(14, 20 - bob); ctx.lineTo(25, 21 - bob); ctx.closePath(); ctx.fill();
            // Talons
            ctx.fillStyle = '#e8b33d';
            ctx.fillRect(26, 48, 4, 8); ctx.fillRect(36, 48, 4, 8);
            eye([[30, 13 - bob], [37, 13 - bob]], 2.4);
            break;
        }

        case 'gargoyle': {
            // Squat stone brute, wings folded
            ctx.fillStyle = lo;
            ctx.beginPath(); ctx.moveTo(16, 22); ctx.lineTo(2, 12); ctx.lineTo(8, 40); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(50, 22); ctx.lineTo(64, 12); ctx.lineTo(58, 40); ctx.closePath(); ctx.fill();
            ctx.fillStyle = info.color;
            ctx.beginPath();
            ctx.moveTo(18, 24 - bob); ctx.lineTo(48, 24 - bob); ctx.lineTo(52, 46); ctx.lineTo(14, 46);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = hi;
            ctx.fillRect(18, 24 - bob, 30, 3);
            // Cracks
            ctx.strokeStyle = 'rgba(0,0,0,0.45)';
            ctx.beginPath(); ctx.moveTo(28, 26 - bob); ctx.lineTo(31, 38); ctx.lineTo(27, 44); ctx.stroke();
            // Legs + claws
            ctx.fillStyle = lo;
            ctx.fillRect(19, 46, 10, 10); ctx.fillRect(37, 46, 10, 10);
            // Blunt horned head
            ctx.fillStyle = info.color;
            ctx.beginPath(); ctx.ellipse(33, 16 - bob, 12, 10, 0, 0, Math.PI * 2); ctx.fill();
            horn(24, 8 - bob, 4, 10, -3, hi); horn(42, 8 - bob, 4, 10, 3, hi);
            ctx.fillStyle = lo; ctx.fillRect(26, 20 - bob, 14, 3);
            eye([[28, 15 - bob], [38, 15 - bob]], 3);
            break;
        }

        case 'mimic': {
            // A chest with a mouth full of teeth
            ctx.fillStyle = '#3a2a20';
            ctx.fillRect(10, 30, 44, 26);
            ctx.fillStyle = info.color;
            ctx.fillRect(10, 30, 44, 5);
            // Hinged lid, thrown back
            ctx.save();
            ctx.translate(32, 30); ctx.rotate(-0.5 - (frame % 2) * 0.12);
            ctx.fillStyle = '#4a3524';
            ctx.fillRect(-22, -16, 44, 16);
            ctx.fillStyle = '#5f4530';
            ctx.fillRect(-22, -16, 44, 4);
            ctx.restore();
            // Iron bands
            ctx.fillStyle = '#555b6e';
            ctx.fillRect(16, 30, 5, 26); ctx.fillRect(43, 30, 5, 26);
            // Maw
            ctx.fillStyle = '#12070a';
            ctx.fillRect(14, 22, 36, 14);
            ctx.fillStyle = '#f3e6d0';
            for (let i = 0; i < 7; i++) {
                ctx.beginPath();
                ctx.moveTo(15 + i * 5, 22); ctx.lineTo(18 + i * 5, 31); ctx.lineTo(21 + i * 5, 22);
                ctx.closePath(); ctx.fill();
                ctx.beginPath();
                ctx.moveTo(15 + i * 5, 36); ctx.lineTo(18 + i * 5, 28); ctx.lineTo(21 + i * 5, 36);
                ctx.closePath(); ctx.fill();
            }
            // Tongue
            ctx.fillStyle = '#8c2a3a';
            ctx.beginPath(); ctx.ellipse(32, 34, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
            eye([[22, 16], [42, 16]], 3);
            break;
        }

        case 'banshee': {
            // Screaming spirit, trailing to nothing
            ctx.globalAlpha = 0.85;
            ctx.fillStyle = info.color;
            ctx.beginPath();
            ctx.moveTo(33, 6 - bob);
            ctx.quadraticCurveTo(12, 22, 16, 44);
            ctx.quadraticCurveTo(24, 56, 33, 60);
            ctx.quadraticCurveTo(42, 56, 50, 44);
            ctx.quadraticCurveTo(54, 22, 33, 6 - bob);
            ctx.closePath(); ctx.fill();
            ctx.globalAlpha = 1;
            // Trailing hair
            ctx.strokeStyle = hi; ctx.lineWidth = 2;
            for (let i = -2; i <= 2; i++) {
                ctx.beginPath();
                ctx.moveTo(33 + i * 6, 12 - bob);
                ctx.quadraticCurveTo(33 + i * 12, 30, 33 + i * 8, 48);
                ctx.stroke();
            }
            ctx.lineWidth = 1;
            // Screaming mouth
            ctx.fillStyle = '#0a0a12';
            ctx.beginPath(); ctx.ellipse(33, 28 - bob, 5, 9, 0, 0, Math.PI * 2); ctx.fill();
            eye([[27, 17 - bob], [39, 17 - bob]], 3);
            break;
        }

        case 'minotaur': {
            // Huge bull-headed bruiser with an axe
            ctx.fillStyle = lo; ctx.fillRect(20, 44, 10, 14); ctx.fillRect(36, 44, 10, 14);
            ctx.fillStyle = '#2a1a12'; ctx.fillRect(18, 54, 14, 5); ctx.fillRect(34, 54, 14, 5);
            ctx.fillStyle = info.color;
            ctx.beginPath(); ctx.ellipse(33, 34 - bob, 19, 16, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = hi;
            ctx.beginPath(); ctx.ellipse(33, 28 - bob, 15, 8, 0, 0, Math.PI * 2); ctx.fill();
            // Arms
            ctx.fillStyle = info.color;
            ctx.fillRect(8, 26 - bob, 9, 24); ctx.fillRect(49, 26 - bob, 9, 24);
            // Bull head
            ctx.beginPath(); ctx.ellipse(33, 14 - bob, 13, 11, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = lo;
            ctx.beginPath(); ctx.ellipse(33, 20 - bob, 8, 6, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#1a1010';
            ctx.beginPath(); ctx.arc(30, 21 - bob, 1.6, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(36, 21 - bob, 1.6, 0, Math.PI * 2); ctx.fill();
            // Great curved horns
            ctx.fillStyle = '#e8dcc0';
            ctx.beginPath(); ctx.moveTo(20, 10 - bob); ctx.quadraticCurveTo(2, 4 - bob, 6, 18 - bob);
            ctx.quadraticCurveTo(10, 10 - bob, 21, 15 - bob); ctx.closePath(); ctx.fill();
            ctx.beginPath(); ctx.moveTo(46, 10 - bob); ctx.quadraticCurveTo(64, 4 - bob, 60, 18 - bob);
            ctx.quadraticCurveTo(56, 10 - bob, 45, 15 - bob); ctx.closePath(); ctx.fill();
            eye([[28, 12 - bob], [38, 12 - bob]], 2.6);
            break;
        }

        case 'basilisk': {
            // Long serpent, coiled, frilled head
            ctx.strokeStyle = info.color; ctx.lineWidth = 13; ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(56, 52); ctx.quadraticCurveTo(14, 52, 22, 38);
            ctx.quadraticCurveTo(30, 26, 40, 30);
            ctx.stroke();
            ctx.strokeStyle = hi; ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(54, 49); ctx.quadraticCurveTo(18, 49, 25, 38);
            ctx.stroke();
            ctx.lineWidth = 1;
            // Scale pattern
            ctx.fillStyle = lo;
            for (let i = 0; i < 5; i++) ctx.fillRect(28 + i * 7, 47, 4, 4);
            // Head + frill
            ctx.fillStyle = lo;
            ctx.beginPath(); ctx.ellipse(42, 24 - bob, 15, 12, -0.3, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = info.color;
            ctx.beginPath(); ctx.ellipse(42, 24 - bob, 10, 8, -0.3, 0, Math.PI * 2); ctx.fill();
            // Fangs
            ctx.fillStyle = '#f3e6d0';
            ctx.beginPath(); ctx.moveTo(34, 28 - bob); ctx.lineTo(32, 36 - bob); ctx.lineTo(38, 29 - bob); ctx.closePath(); ctx.fill();
            eye([[38, 21 - bob], [47, 22 - bob]], 2.8);
            break;
        }

        case 'revenant': {
            // Armoured corpse, half-rotted plate
            ctx.fillStyle = lo; ctx.fillRect(24, 44, 7, 14); ctx.fillRect(35, 44, 7, 14);
            ctx.fillStyle = info.color;
            ctx.beginPath();
            ctx.moveTo(19, 22 - bob); ctx.lineTo(47, 22 - bob); ctx.lineTo(50, 40);
            ctx.lineTo(40, 48); ctx.lineTo(26, 48); ctx.lineTo(16, 40);
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = hi; ctx.fillRect(19, 22 - bob, 28, 3);
            // Broken pauldron
            ctx.fillStyle = lo;
            ctx.beginPath(); ctx.ellipse(16, 24 - bob, 9, 7, -0.3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(50, 24 - bob, 9, 7, 0.3, 0, Math.PI * 2); ctx.fill();
            // Ghost-light leaking from the seams
            ctx.save();
            ctx.globalAlpha = 0.55;
            ctx.fillStyle = info.eyeColor;
            ctx.fillRect(31, 26 - bob, 3, 18);
            ctx.restore();
            // Helm
            ctx.fillStyle = info.color;
            ctx.beginPath(); ctx.ellipse(33, 13 - bob, 11, 11, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#0a0a10'; ctx.fillRect(24, 12 - bob, 18, 5);
            // Sword
            ctx.fillStyle = '#8d949d';
            ctx.beginPath(); ctx.moveTo(56, 12); ctx.lineTo(53, 46); ctx.lineTo(59, 46); ctx.closePath(); ctx.fill();
            eye([[28, 14 - bob], [38, 14 - bob]], 2.4);
            break;
        }

        case 'hellhound': {
            // Low quadruped wreathed in fire
            ctx.save();
            ctx.globalAlpha = 0.5;
            const gg = ctx.createRadialGradient(32, 38, 2, 32, 38, 26);
            gg.addColorStop(0, '#ff8a3d'); gg.addColorStop(1, 'rgba(255,80,0,0)');
            ctx.fillStyle = gg; ctx.fillRect(6, 12, 52, 52);
            ctx.restore();
            ctx.fillStyle = info.color;
            ctx.beginPath(); ctx.ellipse(34, 38 - bob, 19, 12, 0, 0, Math.PI * 2); ctx.fill();
            // Legs
            ctx.fillStyle = lo;
            ctx.fillRect(20, 46, 6, 12); ctx.fillRect(30, 48, 6, 10);
            ctx.fillRect(42, 46, 6, 12);
            // Head
            ctx.fillStyle = info.color;
            ctx.beginPath(); ctx.ellipse(16, 32 - bob, 12, 10, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(6, 34 - bob); ctx.lineTo(-2, 38 - bob); ctx.lineTo(7, 40 - bob); ctx.closePath(); ctx.fill();
            // Ears + mane of flame
            ctx.fillStyle = '#ff6a2a';
            horn(11, 24 - bob, 3, 9, -2, '#ff6a2a'); horn(21, 24 - bob, 3, 9, 2, '#ff6a2a');
            for (let i = 0; i < 4; i++) {
                horn(26 + i * 7, 28 - bob, 3, 9 + (i % 2) * 5 + (frame % 2) * 3, 0, i % 2 ? '#ff8a3d' : '#ffd166');
            }
            // Teeth
            ctx.fillStyle = '#f3e6d0';
            ctx.fillRect(5, 37 - bob, 8, 2);
            eye([[13, 30 - bob]], 2.6);
            break;
        }

        case 'shade': {
            // Almost nothing but a silhouette and two eyes
            ctx.save();
            ctx.globalAlpha = 0.9;
            ctx.fillStyle = info.color;
            ctx.beginPath();
            ctx.moveTo(33, 6 - bob);
            ctx.quadraticCurveTo(14, 24, 18, 46);
            ctx.quadraticCurveTo(24, 58, 33, 62);
            ctx.quadraticCurveTo(42, 58, 48, 46);
            ctx.quadraticCurveTo(52, 24, 33, 6 - bob);
            ctx.closePath(); ctx.fill();
            ctx.restore();
            // Smoke curling off the edges
            ctx.save();
            ctx.globalAlpha = 0.35;
            ctx.fillStyle = info.color;
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.arc(18 + i * 10, 8 + (i % 2) * 6 - bob, 5 + (frame % 2) * 2, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
            // Clawed hands
            ctx.strokeStyle = lo; ctx.lineWidth = 2;
            for (let i = -1; i <= 1; i++) {
                ctx.beginPath(); ctx.moveTo(18, 38); ctx.lineTo(8 + i * 3, 48 + i * 4); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(48, 38); ctx.lineTo(58 - i * 3, 48 + i * 4); ctx.stroke();
            }
            ctx.lineWidth = 1;
            eye([[27, 22 - bob], [39, 22 - bob]], 3.4);
            break;
        }

        case 'troll': {
            // Enormous, hunched, small head
            ctx.fillStyle = lo; ctx.fillRect(20, 46, 12, 12); ctx.fillRect(34, 46, 12, 12);
            ctx.fillStyle = info.color;
            ctx.beginPath(); ctx.ellipse(33, 32 - bob, 22, 19, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = hi;
            ctx.beginPath(); ctx.ellipse(30, 24 - bob, 14, 9, 0, 0, Math.PI * 2); ctx.fill();
            // Warty hide
            ctx.fillStyle = lo;
            for (const [wx, wy] of [[22, 34], [42, 30], [36, 42], [26, 44]] as number[][]) {
                ctx.beginPath(); ctx.arc(wx, wy - bob, 3, 0, Math.PI * 2); ctx.fill();
            }
            // Long arms dragging
            ctx.fillStyle = info.color;
            ctx.fillRect(4, 26 - bob, 11, 28); ctx.fillRect(51, 26 - bob, 11, 28);
            ctx.fillStyle = lo;
            ctx.beginPath(); ctx.arc(9, 54, 7, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(56, 54, 7, 0, Math.PI * 2); ctx.fill();
            // Small head sunk into the shoulders
            ctx.fillStyle = info.color;
            ctx.beginPath(); ctx.ellipse(33, 14 - bob, 10, 8, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#f3e6d0';
            ctx.beginPath(); ctx.moveTo(29, 18 - bob); ctx.lineTo(28, 24 - bob); ctx.lineTo(32, 18 - bob); ctx.closePath(); ctx.fill();
            eye([[29, 13 - bob], [37, 13 - bob]], 2.2);
            break;
        }

        case 'wisp': {
            // A cold light with a comet tail
            const pulse = frame % 2 === 0 ? 0 : 3;
            const g2 = ctx.createRadialGradient(32, 30, 0, 32, 30, 26 + pulse);
            g2.addColorStop(0, '#ffffff');
            g2.addColorStop(0.3, info.color);
            g2.addColorStop(1, 'rgba(80,180,255,0)');
            ctx.fillStyle = g2;
            ctx.fillRect(2, 0, 60, 60);
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(32, 30, 6 + pulse * 0.4, 0, Math.PI * 2); ctx.fill();
            // Orbiting motes
            ctx.fillStyle = info.color;
            for (let i = 0; i < 5; i++) {
                const a = i * 1.26 + frame * 0.6;
                ctx.beginPath();
                ctx.arc(32 + Math.cos(a) * 18, 30 + Math.sin(a) * 12, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        }

        case 'devourer': {
            // A mouth on legs — mostly teeth
            ctx.fillStyle = lo;
            ctx.fillRect(16, 44, 8, 14); ctx.fillRect(40, 44, 8, 14);
            ctx.fillStyle = info.color;
            ctx.beginPath(); ctx.ellipse(32, 32 - bob, 24, 21, 0, 0, Math.PI * 2); ctx.fill();
            // Vast maw
            ctx.fillStyle = '#0a0206';
            ctx.beginPath(); ctx.ellipse(32, 34 - bob, 18, 14, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#f3e6d0';
            const gape = 2 + (frame % 2) * 3;
            for (let i = 0; i < 9; i++) {
                const tx = 15 + i * 4.2;
                ctx.beginPath();
                ctx.moveTo(tx, 22 - bob + gape); ctx.lineTo(tx + 2, 34 - bob); ctx.lineTo(tx + 4, 22 - bob + gape);
                ctx.closePath(); ctx.fill();
                ctx.beginPath();
                ctx.moveTo(tx, 46 - bob - gape); ctx.lineTo(tx + 2, 34 - bob); ctx.lineTo(tx + 4, 46 - bob - gape);
                ctx.closePath(); ctx.fill();
            }
            // Gullet light
            ctx.save();
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = info.eyeColor;
            ctx.beginPath(); ctx.ellipse(32, 34 - bob, 5, 4, 0, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
            // Ring of eyes around the rim
            eye([[16, 18 - bob], [32, 12 - bob], [48, 18 - bob], [12, 34 - bob], [52, 34 - bob]], 2.6);
            break;
        }

        default: {
            // Should never happen — a legible blob beats an invisible enemy
            ctx.fillStyle = info.color;
            ctx.beginPath(); ctx.ellipse(32, 36 - bob, 16, 16, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = hi;
            ctx.beginPath(); ctx.ellipse(32, 30 - bob, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
            eye([[26, 32 - bob], [38, 32 - bob]]);
            break;
        }
    }
}

function generateItemIcon(type: string, rarity: Rarity): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;

    const rarityColors: Record<Rarity, string> = {
        common: '#bdc3c7', uncommon: '#2ecc71', rare: '#3498db',
        epic: '#a55eea', legendary: '#f39c12', mythic: '#ff2d55',
    };
    const rc = rarityColors[rarity];

    // Glow for high rarity
    if (rarity === 'legendary' || rarity === 'mythic' || rarity === 'epic') {
        ctx.shadowColor = rc;
        ctx.shadowBlur = 4;
    }

    switch (type) {
        case 'sword':
            // Blade
            ctx.fillStyle = '#d5dfe3'; ctx.fillRect(7, 1, 2, 3);
            ctx.fillStyle = '#bdc3c7'; ctx.fillRect(7, 4, 2, 4);
            ctx.fillStyle = '#aab2b8'; ctx.fillRect(7, 8, 2, 3);
            // Edge highlights
            ctx.fillStyle = '#ecf0f1'; ctx.fillRect(7, 2, 1, 5);
            ctx.fillStyle = '#95a5a6'; ctx.fillRect(8, 3, 1, 5);
            // Tip
            ctx.fillStyle = '#ecf0f1'; ctx.fillRect(7, 1, 2, 1);
            // Guard
            ctx.fillStyle = rc; ctx.fillRect(4, 11, 8, 2);
            ctx.fillStyle = '#f1c40f'; ctx.fillRect(7, 11, 2, 2);
            // Handle
            ctx.fillStyle = '#5d4037'; ctx.fillRect(7, 13, 2, 2);
            ctx.fillStyle = '#4a3728'; ctx.fillRect(7, 14, 2, 1);
            // Pommel
            ctx.fillStyle = rc; ctx.fillRect(7, 15, 2, 1);
            break;
        case 'axe':
            // Handle (diagonal feel)
            ctx.fillStyle = '#8d6e63'; ctx.fillRect(7, 5, 2, 10);
            ctx.fillStyle = '#795548'; ctx.fillRect(7, 5, 1, 10);
            // Axe head â€” curved blade
            ctx.fillStyle = '#7f8c8d'; ctx.fillRect(3, 2, 5, 2);
            ctx.fillStyle = '#95a5a6'; ctx.fillRect(2, 4, 6, 3);
            ctx.fillStyle = '#aab2b8'; ctx.fillRect(3, 7, 5, 1);
            // Blade edge
            ctx.fillStyle = '#ecf0f1'; ctx.fillRect(2, 4, 1, 3);
            // Inner detail
            ctx.fillStyle = rc; ctx.fillRect(4, 3, 2, 1);
            ctx.fillStyle = '#5d4037'; ctx.fillRect(7, 3, 1, 2); // where handle meets head
            break;
        case 'bow':
            // Bow limbs â€” curved shape
            ctx.fillStyle = '#8d6e63';
            ctx.fillRect(4, 2, 2, 1); ctx.fillRect(3, 3, 2, 1);
            ctx.fillRect(2, 4, 2, 3);
            ctx.fillRect(3, 7, 2, 1); ctx.fillRect(4, 8, 2, 1);
            ctx.fillRect(5, 9, 2, 1); ctx.fillRect(6, 10, 2, 1);
            ctx.fillRect(7, 11, 2, 1); ctx.fillRect(8, 12, 2, 1);
            ctx.fillRect(9, 13, 2, 1);
            // String
            ctx.fillStyle = '#ecf0f1';
            ctx.fillRect(5, 2, 1, 1); ctx.fillRect(6, 3, 1, 1);
            ctx.fillRect(7, 4, 1, 1); ctx.fillRect(8, 5, 1, 1);
            ctx.fillRect(9, 6, 1, 1); ctx.fillRect(9, 7, 1, 1);
            ctx.fillRect(9, 8, 1, 1); ctx.fillRect(9, 9, 1, 1);
            ctx.fillRect(10, 10, 1, 1); ctx.fillRect(10, 11, 1, 1);
            ctx.fillRect(10, 12, 1, 1); ctx.fillRect(10, 13, 1, 1);
            // Arrow nocked
            ctx.fillStyle = rc; ctx.fillRect(7, 6, 1, 3);
            ctx.fillStyle = '#bdc3c7'; ctx.fillRect(7, 5, 1, 1); // arrowhead
            break;
        case 'dagger':
            // Short blade
            ctx.fillStyle = '#d5dfe3'; ctx.fillRect(7, 4, 2, 2);
            ctx.fillStyle = '#bdc3c7'; ctx.fillRect(7, 6, 2, 3);
            ctx.fillStyle = '#ecf0f1'; ctx.fillRect(7, 4, 1, 3);
            // Guard
            ctx.fillStyle = rc; ctx.fillRect(5, 9, 6, 1);
            // Handle
            ctx.fillStyle = '#5d4037'; ctx.fillRect(7, 10, 2, 3);
            ctx.fillStyle = '#4a3728'; ctx.fillRect(7, 12, 2, 1);
            break;
        case 'staff':
            // Shaft
            ctx.fillStyle = '#6d4c41'; ctx.fillRect(7, 5, 2, 10);
            ctx.fillStyle = '#5d4037'; ctx.fillRect(7, 5, 1, 10);
            // Orb at top
            ctx.fillStyle = rc;
            ctx.beginPath(); ctx.arc(8, 4, 3, 0, Math.PI * 2); ctx.fill();
            // Orb shine
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillRect(6, 2, 2, 2);
            // Orb inner glow
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.beginPath(); ctx.arc(8, 4, 2, 0, Math.PI * 2); ctx.fill();
            break;
        case 'armor':
            // Chestplate shape
            ctx.fillStyle = rc;
            ctx.fillRect(3, 4, 10, 3); // shoulders
            ctx.fillRect(4, 7, 8, 5); // chest
            ctx.fillRect(5, 12, 6, 2); // waist
            // Collar
            ctx.fillStyle = '#7f8c8d'; ctx.fillRect(6, 3, 4, 2);
            // Detail line
            ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(8, 5, 1, 7);
            // Shine
            ctx.fillStyle = 'rgba(255,255,255,0.2)'; ctx.fillRect(4, 5, 3, 4);
            break;
        case 'potion_hp':
            // Flask bottle
            ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(6, 6, 4, 6); // glass
            ctx.fillStyle = '#c0392b'; ctx.fillRect(7, 7, 2, 4); // liquid (red)
            ctx.fillStyle = '#e74c3c'; ctx.fillRect(7, 8, 2, 2); // liquid light
            // Neck
            ctx.fillStyle = '#ecf0f1'; ctx.fillRect(7, 4, 2, 2);
            // Cork
            ctx.fillStyle = '#8d6e63'; ctx.fillRect(7, 3, 2, 1);
            break;
        case 'potion_mp':
            ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(6, 6, 4, 6);
            ctx.fillStyle = '#2980b9'; ctx.fillRect(7, 7, 2, 4);
            ctx.fillStyle = '#3498db'; ctx.fillRect(7, 8, 2, 2);
            ctx.fillStyle = '#ecf0f1'; ctx.fillRect(7, 4, 2, 2);
            ctx.fillStyle = '#8d6e63'; ctx.fillRect(7, 3, 2, 1);
            break;
        case 'key':
            ctx.fillStyle = '#f1c40f';
            // Bow (handle)
            ctx.fillRect(5, 3, 6, 4); ctx.clearRect(7, 4, 2, 2);
            // Shaft
            ctx.fillRect(7, 7, 2, 7);
            // Bits
            ctx.fillRect(9, 11, 2, 1); ctx.fillRect(9, 13, 2, 1);
            break;
        case 'ring':
            ctx.fillStyle = rc; // Band color matches rarity
            ctx.beginPath(); ctx.arc(8, 9, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#0f0f23'; ctx.beginPath(); ctx.arc(8, 9, 3, 0, Math.PI * 2); ctx.fill();
            // Gem
            ctx.fillStyle = '#9b59b6'; ctx.fillRect(6, 3, 4, 4);
            ctx.fillStyle = '#8e44ad'; ctx.fillRect(7, 4, 2, 2);
            // Shine
            ctx.fillStyle = '#fff'; ctx.fillRect(7, 3, 1, 1);
            break;
        case 'scroll':
            // Rolled paper
            ctx.fillStyle = '#f5e6ca'; ctx.fillRect(4, 3, 8, 10);
            // Shadow/roll
            ctx.fillStyle = '#e6d0a1'; ctx.fillRect(11, 3, 1, 10); ctx.fillRect(4, 3, 1, 10);
            // Seal/Ribbon
            ctx.fillStyle = '#c0392b'; ctx.fillRect(4, 7, 8, 2);
            ctx.fillStyle = '#e74c3c'; ctx.fillRect(7, 7, 2, 2); // Seal
            break;

        /* === FOOD === */
        case 'food_bread':
            ctx.fillStyle = '#d35400'; ctx.beginPath(); ctx.ellipse(8, 9, 6, 4, 0, 0, Math.PI * 2); ctx.fill(); // Crust
            ctx.fillStyle = '#e67e22'; ctx.beginPath(); ctx.ellipse(8, 8, 5, 3, 0, 0, Math.PI * 2); ctx.fill(); // Top
            ctx.fillStyle = '#f39c12'; ctx.fillRect(6, 6, 1, 2); ctx.fillRect(9, 6, 1, 2); // Slashes
            break;
        case 'food_stew':
            ctx.fillStyle = '#795548'; ctx.beginPath(); ctx.arc(8, 9, 6, 0, Math.PI, false); ctx.fill(); // Bowl
            ctx.fillStyle = '#a1887f'; ctx.fillRect(2, 8, 12, 1); // Rim
            ctx.fillStyle = '#d35400'; ctx.beginPath(); ctx.ellipse(8, 9, 5, 2, 0, 0, Math.PI * 2); ctx.fill(); // Stew
            // Chunks
            ctx.fillStyle = '#ecf0f1'; ctx.fillRect(7, 9, 2, 1); ctx.fillStyle = '#27ae60'; ctx.fillRect(9, 8, 1, 1);
            break;
        case 'food_soup':
            ctx.fillStyle = '#5d4037'; ctx.beginPath(); ctx.arc(8, 9, 6, 0, Math.PI, false); ctx.fill();
            ctx.fillStyle = '#8d6e63'; ctx.fillRect(2, 8, 12, 1);
            ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.ellipse(8, 9, 5, 2, 0, 0, Math.PI * 2); ctx.fill(); // Yellow soup
            break;
        case 'food_salad':
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(8, 10, 6, 0, Math.PI, false); ctx.fill(); // Bowl
            ctx.fillStyle = '#2ecc71'; ctx.beginPath(); ctx.arc(8, 8, 5, 0, Math.PI * 2); ctx.fill(); // Greens
            ctx.fillStyle = '#e74c3c'; ctx.fillRect(7, 6, 2, 2); // Tomato
            ctx.fillStyle = '#f1c40f'; ctx.fillRect(5, 8, 2, 2); // Corn?
            break;
        case 'food_pie':
            ctx.fillStyle = '#bdc3c7'; ctx.beginPath(); ctx.ellipse(8, 10, 6, 3, 0, 0, Math.PI * 2); ctx.fill(); // Tin
            ctx.fillStyle = '#e67e22'; ctx.beginPath(); ctx.ellipse(8, 9, 5, 2, 0, 0, Math.PI * 2); ctx.fill(); // Crust
            ctx.fillStyle = '#d35400'; ctx.fillRect(6, 8, 4, 1); ctx.fillRect(8, 7, 1, 3); // Lattice
            break;
        case 'food_feast':
            // Roast Chicken
            ctx.fillStyle = '#d35400'; ctx.beginPath(); ctx.ellipse(8, 9, 5, 3, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ecf0f1'; ctx.fillRect(12, 8, 2, 1); // Bone
            // Garnish
            ctx.fillStyle = '#2ecc71'; ctx.fillRect(4, 10, 8, 2);
            break;
        case 'food_smoothie':
            // Glass
            ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(6, 5, 4, 8);
            // Drink
            ctx.fillStyle = '#9b59b6'; ctx.fillRect(6, 7, 4, 6);
            // Straw
            ctx.fillStyle = '#f1c40f'; ctx.fillRect(9, 2, 1, 6);
            break;
        case 'food_cookie':
            ctx.fillStyle = '#d4a347'; ctx.beginPath(); ctx.arc(8, 8, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#5d4037'; ctx.fillRect(6, 6, 1, 1); ctx.fillRect(9, 7, 1, 1); ctx.fillRect(7, 10, 1, 1); // Chips
            break;
        case 'food_tea':
            ctx.fillStyle = '#fff'; ctx.fillRect(5, 6, 6, 7); // Cup
            ctx.fillStyle = '#bdc3c7'; ctx.fillRect(11, 7, 2, 3); // Handle
            ctx.fillStyle = '#27ae60'; ctx.fillRect(6, 7, 4, 1); // Tea
            // Steam
            ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(7, 3, 1, 2); ctx.fillRect(9, 2, 1, 2);
            break;
        case 'food_wheat':
            ctx.fillStyle = '#f1c40f'; ctx.fillRect(7, 2, 2, 12); // Stalk
            ctx.fillStyle = '#f39c12';
            ctx.beginPath(); ctx.ellipse(6, 4, 2, 1, 0.5, 0, 6.28); ctx.fill();
            ctx.beginPath(); ctx.ellipse(10, 5, 2, 1, -0.5, 0, 6.28); ctx.fill();
            ctx.beginPath(); ctx.ellipse(6, 7, 2, 1, 0.5, 0, 6.28); ctx.fill();
            break;
        case 'food_berry':
            ctx.fillStyle = '#9b59b6';
            ctx.beginPath(); ctx.arc(7, 9, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(10, 10, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#2ecc71'; ctx.fillRect(8, 6, 2, 2); // stem
            break;
        case 'food_golden':
            ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(8, 8, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.fillRect(6, 6, 2, 2); // Shine
            ctx.fillStyle = '#2ecc71'; ctx.fillRect(7, 3, 2, 2); // Leaf
            break;
        case 'food_dragon':
            ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(8, 9, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#e74c3c'; ctx.fillRect(5, 7, 6, 4); // Scaly texture
            ctx.fillStyle = '#f1c40f'; ctx.fillRect(7, 3, 2, 3); // Flame/Stem
            break;

        /* === FISH === */
        case 'fish_small':
            ctx.fillStyle = '#95a5a6'; ctx.beginPath(); ctx.ellipse(8, 8, 6, 3, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#7f8c8d'; ctx.beginPath(); ctx.moveTo(14, 8); ctx.lineTo(16, 5); ctx.lineTo(16, 11); ctx.fill();
            ctx.fillStyle = '#000'; ctx.fillRect(5, 7, 1, 1);
            break;
        case 'fish_med':
            ctx.fillStyle = '#3498db'; ctx.beginPath(); ctx.ellipse(8, 8, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#2980b9'; ctx.beginPath(); ctx.moveTo(15, 8); ctx.lineTo(16, 5); ctx.lineTo(16, 11); ctx.fill();
            ctx.fillStyle = '#000'; ctx.fillRect(4, 7, 1, 1);
            break;
        case 'fish_gold':
            ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.ellipse(8, 8, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#f39c12'; ctx.beginPath(); ctx.moveTo(15, 8); ctx.lineTo(16, 5); ctx.lineTo(16, 11); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.fillRect(5, 6, 2, 2); // Shine
            ctx.fillStyle = '#000'; ctx.fillRect(4, 7, 1, 1);
            break;
        case 'fish_phantom':
            ctx.fillStyle = 'rgba(155, 89, 182, 0.7)'; ctx.beginPath(); ctx.ellipse(8, 8, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(142, 68, 173, 0.7)'; ctx.beginPath(); ctx.moveTo(15, 8); ctx.lineTo(16, 5); ctx.lineTo(16, 11); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.fillRect(5, 7, 1, 1); // Ghost eye
            break;
        case 'fish_koi':
            ctx.fillStyle = '#ecf0f1'; ctx.beginPath(); ctx.ellipse(8, 8, 7, 4, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.arc(6, 8, 3, 0, Math.PI * 2); ctx.fill(); // Red spot
            ctx.fillStyle = '#e74c3c'; ctx.beginPath(); ctx.moveTo(15, 8); ctx.lineTo(16, 5); ctx.lineTo(16, 11); ctx.fill();
            ctx.fillStyle = '#000'; ctx.fillRect(4, 7, 1, 1);
            break;

        /* === SEEDS & TOOLS === */
        case 'seed':
        case 'seed_gold':
        case 'seed_dragon':
            // Packet
            ctx.fillStyle = '#d7ccc8'; ctx.fillRect(4, 4, 8, 10);
            ctx.fillStyle = '#a1887f'; ctx.strokeRect(4, 4, 8, 10);
            // Icon on packet
            ctx.fillStyle = type === 'seed_gold' ? '#f1c40f' : (type === 'seed_dragon' ? '#e74c3c' : '#8d6e63');
            ctx.beginPath(); ctx.arc(8, 9, 2, 0, Math.PI * 2); ctx.fill();
            break;

        case 'tool_rod':
            ctx.fillStyle = '#8d6e63';
            ctx.beginPath(); ctx.moveTo(3, 14); ctx.lineTo(14, 3); ctx.stroke(); // Rod
            ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = '#bdc3c7'; ctx.fillRect(4, 12, 2, 2); // Reel
            ctx.fillStyle = '#ecf0f1'; ctx.beginPath(); ctx.moveTo(14, 3); ctx.lineTo(14, 10); ctx.stroke(); // Line
            ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(14, 11, 1, 0, Math.PI * 2); ctx.fill(); // Hook
            break;

        case 'tool_can':
            ctx.fillStyle = '#95a5a6'; // Metal can
            ctx.fillRect(5, 8, 8, 5); // Body
            ctx.fillRect(11, 6, 2, 4); // Handle
            ctx.fillRect(3, 6, 2, 3); // Spout
            ctx.fillStyle = '#3498db'; ctx.fillRect(6, 9, 1, 4); // Water drop? No, label
            break;

        default:
            // Fallback for armor/shield if missed (though they have cases)
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
        blacksmith: { body: '#4a3728', head: '#d4a574', hat: '#333', hair: '#222' },
    };
    const info = colors[type];
    const skin = info.head;
    const skinDark = shadeColor(skin, -20);

    // Base mannequin
    const centerX = 16;
    const headY = 14;
    const bodyY = 29;
    const legY = 45;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(16, 58, 10, 3, 0, 0, Math.PI * 2); ctx.fill();

    // Legs
    ctx.fillStyle = shadeColor(info.body, -30); // Pants
    ctx.fillRect(centerX - 5, legY, 5, 15);
    ctx.fillRect(centerX + 1, legY, 5, 15);
    ctx.fillStyle = '#111'; // Boots
    ctx.fillRect(centerX - 5, 56, 5, 4);
    ctx.fillRect(centerX + 1, 56, 4, 4);

    // Body
    ctx.fillStyle = info.body;
    ctx.fillRect(centerX - 7, bodyY, 14, 18);
    // Detail strip
    if (type === 'healer' || type === 'sage' || type === 'cook') {
        ctx.fillStyle = shadeColor(info.body, 20);
        ctx.fillRect(centerX - 2, bodyY, 4, 18);
    }

    // Head (proportional — not oversized)
    const headSize = 16;
    const headX = centerX - headSize / 2;
    // Neck
    ctx.fillStyle = skinDark;
    ctx.fillRect(centerX - 2, headY + 14, 4, 3);
    // Face shape
    ctx.fillStyle = skin;
    ctx.fillRect(headX + 2, headY, headSize - 4, headSize);
    ctx.fillRect(headX, headY + 2, headSize, headSize - 6);

    // Hair (Back)
    ctx.fillStyle = info.hair;
    ctx.fillRect(headX - 1, headY + 4, 3, 12);
    ctx.fillRect(headX + headSize - 2, headY + 4, 3, 12);

    // Face — small dot eyes with sparkle (matches player style)
    const eyeY = headY + 8;
    ctx.fillStyle = '#111';
    ctx.fillRect(centerX - 5, eyeY, 2, 2);
    ctx.fillRect(centerX + 3, eyeY, 2, 2);
    // Tiny sparkle
    ctx.fillStyle = '#fff';
    ctx.fillRect(centerX - 5, eyeY, 1, 1);
    ctx.fillRect(centerX + 3, eyeY, 1, 1);
    // Mouth — small neutral
    ctx.fillStyle = skinDark;
    ctx.fillRect(centerX - 1, eyeY + 4, 2, 1);

    // Hair (Front)
    ctx.fillStyle = info.hair;
    ctx.fillRect(headX, headY, 4, 6);
    ctx.fillRect(headX + headSize - 4, headY, 4, 6);
    ctx.fillRect(headX, headY - 2, headSize, 4);

    // Arms
    ctx.fillStyle = info.body;
    ctx.fillRect(centerX - 10, bodyY + 2, 4, 10);
    ctx.fillRect(centerX + 6, bodyY + 2, 4, 10);
    ctx.fillStyle = skin;
    ctx.fillRect(centerX - 10, bodyY + 10, 4, 3);
    ctx.fillRect(centerX + 6, bodyY + 10, 4, 3);

    // Accessories
    if (type === 'merchant') {
        ctx.fillStyle = info.hat; // Hat
        ctx.fillRect(headX - 4, headY - 6, headSize + 8, 6);
        ctx.fillStyle = '#f1c40f'; // Gold Band
        ctx.fillRect(headX - 2, headY - 2, headSize + 4, 2);
    } else if (type === 'healer') {
        ctx.fillStyle = info.hat; // Hat
        ctx.fillRect(headX, headY - 4, headSize, 4);
        ctx.fillStyle = '#FFF'; // Cross
        ctx.fillRect(headX + 7, headY - 5, 4, 6);
        ctx.fillRect(headX + 5, headY - 3, 8, 2);
    } else if (type === 'sage') {
        ctx.fillStyle = info.hat; // Hat
        ctx.beginPath(); ctx.moveTo(centerX - 12, headY); ctx.lineTo(centerX + 12, headY); ctx.lineTo(centerX, headY - 16); ctx.fill();
        ctx.fillStyle = '#ccc'; // Beard (greyed, not white-cute)
        ctx.fillRect(centerX - 4, headY + 14, 8, 5);
    } else if (type === 'cook') {
        ctx.fillStyle = '#fff'; // Chef Hat
        ctx.fillRect(headX, headY - 8, headSize, 8);
        ctx.fillRect(headX - 2, headY - 10, headSize + 4, 4);
    } else if (type === 'blacksmith') {
        ctx.fillStyle = '#5d4037'; // Apron
        ctx.fillRect(centerX - 5, bodyY + 4, 10, 14);
        ctx.fillStyle = '#7f8c8d'; // Hammer
        ctx.fillRect(centerX + 8, 30, 4, 10);
        ctx.fillRect(centerX + 6, 30, 8, 3);
    } else if (type === 'farmer') {
        ctx.fillStyle = info.hat; // Straw Hat
        ctx.fillRect(headX - 6, headY - 4, headSize + 12, 4);
        ctx.fillRect(headX, headY - 8, headSize, 4);
    }

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
    cache.forge = generateForgeTile();
    cache.anvil = generateAnvilTile();
    cache.bridge = generateBridgeTile();

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

    // Bosses: hand-authored sprite per boss, x2 anim frames x2 rage states
    cache.bosses = {} as Record<number, HTMLCanvasElement[][]>;
    for (const def of BOSSES) {
        cache.bosses[def.floor] = [
            [renderBossSprite(def, 0, 0), renderBossSprite(def, 1, 0)],   // calm
            [renderBossSprite(def, 0, 1), renderBossSprite(def, 1, 1)],   // enraged
        ];
    }

    cache.items = {} as Record<string, Record<Rarity, HTMLCanvasElement>>;
    const itemTypes = ['sword', 'axe', 'staff', 'dagger', 'bow', 'armor', 'shield', 'ring', 'potion_hp', 'potion_mp', 'scroll', 'key',
        'food_bread', 'food_stew', 'food_soup', 'food_salad', 'food_pie', 'food_feast', 'food_smoothie', 'food_cookie', 'food_tea',
        'food_wheat', 'food_berry', 'food_golden', 'food_dragon',
        'fish_small', 'fish_med', 'fish_gold', 'fish_phantom', 'fish_koi',
        'seed', 'seed_gold', 'seed_dragon', 'tool_rod', 'tool_can'];
    // Must cover EVERY rarity — a missing entry means a blank inventory slot.
    const rarities: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'];
    itemTypes.forEach(t => {
        cache.items[t] = {} as Record<Rarity, HTMLCanvasElement>;
        rarities.forEach(r => {
            // Gear gets hand-painted 32px art; everything else is the 16px
            // sprite upscaled so all icons share one resolution.
            const hires = paintHiResIcon(t, r);
            if (hires) {
                cache.items[t][r] = hires;
            } else {
                const legacy = generateItemIcon(t, r);
                const up = createCanvas(ICON_SIZE, ICON_SIZE);
                const uctx = up.getContext('2d')!;
                uctx.imageSmoothingEnabled = false;
                uctx.drawImage(legacy, 0, 0, ICON_SIZE, ICON_SIZE);
                cache.items[t][r] = up;
            }
        });
    });

    cache.npcs = {} as Record<NPCType, HTMLCanvasElement>;
    (['merchant', 'healer', 'sage', 'cook', 'fishmonger', 'farmer', 'blacksmith'] as NPCType[]).forEach(t => {
        cache.npcs[t] = generateNPC(t);
    });
}

export const Assets = {
    TILE, CHAR_W, CHAR_H,
    get: (key: string): HTMLCanvasElement => cache[key],
    getPlayer: (cls: ClassName, dir: number, frame: number): HTMLCanvasElement => cache.player[cls]?.[dir]?.[frame],
    getEnemy: (type: EnemyType, frame: number): HTMLCanvasElement => cache.enemies[type]?.[frame],
    getBoss: (floor: number, frame: number, enraged = false): HTMLCanvasElement =>
        cache.bosses[floor]?.[enraged ? 1 : 0]?.[frame],
    getItem: (type: string, rarity: Rarity): HTMLCanvasElement => {
        const byType = cache.items[type];
        if (!byType) return cache.items['scroll']?.['common'];
        // Fall back across rarities rather than handing back undefined, which
        // renders as an empty slot.
        return byType[rarity] || byType['common'] || byType['rare'];
    },
    getNPC: (type: NPCType): HTMLCanvasElement => cache.npcs[type],
};
