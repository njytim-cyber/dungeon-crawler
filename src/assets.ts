// ===== ASSET GENERATOR =====
// Generates all pixel-art sprites dynamically via offscreen canvas
// HD Characters: 100x200 resolution for ultra-detailed sprites

import type { ClassName, EnemyType, NPCType, Rarity } from './types';

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

    ctx.fillStyle = '#4a3b2a';
    ctx.fillRect(0, 0, 16, 16);

    const stones = [
        { x: 1, y: 1, w: 6, h: 6, base: '#56473a', hi: '#6b5c4c', lo: '#3e3024' },
        { x: 9, y: 1, w: 6, h: 6, base: '#52432e', hi: '#665840', lo: '#3b2c1e' },
        { x: 1, y: 9, w: 6, h: 6, base: '#584c3c', hi: '#6e6050', lo: '#423428' },
        { x: 9, y: 9, w: 6, h: 6, base: '#504234', hi: '#645844', lo: '#3a2c1c' },
    ];
    for (const s of stones) {
        ctx.fillStyle = s.base;
        ctx.fillRect(s.x, s.y, s.w, s.h);
        for (let px = 0; px < 3; px++) {
            ctx.fillStyle = `rgba(${Math.random() > 0.5 ? 200 : 50},${Math.random() > 0.5 ? 180 : 40},${Math.random() > 0.5 ? 160 : 30},0.03)`;
            ctx.fillRect(s.x + 1 + Math.floor(Math.random() * (s.w - 2)), s.y + 1 + Math.floor(Math.random() * (s.h - 2)), 1, 1);
        }
        ctx.fillStyle = s.hi;
        ctx.fillRect(s.x, s.y, s.w, 1); ctx.fillRect(s.x, s.y, 1, s.h);
        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(s.x + 1, s.y + 1, s.w - 2, 1);
        ctx.fillStyle = s.lo;
        ctx.fillRect(s.x, s.y + s.h - 1, s.w, 1); ctx.fillRect(s.x + s.w - 1, s.y, 1, s.h);
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(s.x + s.w - 1, s.y + s.h - 1, 1, 1);
    }

    ctx.fillStyle = '#1e1408';
    ctx.fillRect(0, 7, 16, 2); ctx.fillRect(7, 0, 2, 16);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fillRect(0, 7, 16, 1); ctx.fillRect(7, 0, 1, 16);
    ctx.fillStyle = '#2e2014';
    ctx.fillRect(0, 0, 16, 1); ctx.fillRect(0, 15, 16, 1);
    ctx.fillRect(0, 0, 1, 16); ctx.fillRect(15, 0, 1, 16);

    for (let i = 0; i < 5; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? '#685a48' : '#4a3c2c';
        ctx.fillRect(2 + Math.floor(Math.random() * 12), 2 + Math.floor(Math.random() * 12), 1, 1);
    }

    if (Math.random() > 0.55) {
        ctx.fillStyle = 'rgba(50, 130, 50, 0.25)';
        const mx = Math.floor(Math.random() * 11) + 2;
        const my = Math.floor(Math.random() * 11) + 2;
        ctx.fillRect(mx, my, 2, 1); ctx.fillRect(mx + 1, my + 1, 1, 1);
        ctx.fillStyle = 'rgba(70, 150, 70, 0.15)';
        ctx.fillRect(mx - 1, my, 1, 1);
    }

    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(0, 0, 2, 2); ctx.fillRect(14, 0, 2, 2);
    ctx.fillRect(0, 14, 2, 2); ctx.fillRect(14, 14, 2, 2);

    return c;
}

function generateWall(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;

    // Top face with gradient sim
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, TILE, 4);
    ctx.fillStyle = '#354d63';
    ctx.fillRect(1, 0, 14, 1);
    ctx.fillStyle = '#3a5570';
    ctx.fillRect(2, 1, 12, 1);

    // Front face
    ctx.fillStyle = '#34495e';
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
        ctx.fillStyle = r > 7 ? '#3f5872' : r > 3 ? '#3d566e' : '#3b5268';
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.fillStyle = '#4a6580'; ctx.fillRect(b.x, b.y, b.w, 1);
        ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(b.x + 1, b.y, b.w - 2, 1);
        ctx.fillStyle = '#456078'; ctx.fillRect(b.x, b.y, 1, b.h);
        ctx.fillStyle = '#1a252f'; ctx.fillRect(b.x, b.y + b.h - 1, b.w, 1);
        ctx.fillStyle = '#1e2d3d'; ctx.fillRect(b.x + b.w - 1, b.y, 1, b.h);
        if (Math.random() > 0.5) {
            ctx.fillStyle = 'rgba(255,255,255,0.03)';
            ctx.fillRect(b.x + 1 + Math.floor(Math.random() * (b.w - 2)), b.y + 1, 1, 1);
        }
    }

    // Mortar
    ctx.fillStyle = '#1a252f';
    ctx.fillRect(0, 4, TILE, 1); ctx.fillRect(0, 8, TILE, 1); ctx.fillRect(0, 12, TILE, 1);
    ctx.fillRect(8, 4, 1, 4); ctx.fillRect(4, 8, 1, 5); ctx.fillRect(11, 8, 1, 5);

    // Edge shadows
    ctx.fillStyle = '#0d1620'; ctx.fillRect(0, 4, 1, 12); ctx.fillRect(15, 4, 1, 12);

    // Cracks with branches
    if (Math.random() > 0.4) {
        ctx.fillStyle = '#0a1018';
        const cx = 3 + Math.floor(Math.random() * 10);
        ctx.fillRect(cx, 10, 1, 3); ctx.fillRect(cx + 1, 12, 1, 2);
        if (Math.random() > 0.5) ctx.fillRect(cx - 1, 11, 1, 1);
    }

    // Damp patches
    if (Math.random() > 0.65) {
        ctx.fillStyle = 'rgba(100,140,180,0.07)';
        ctx.fillRect(2 + Math.floor(Math.random() * 10), 6 + Math.floor(Math.random() * 6), 3, 2);
    }

    // Top edge glow
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(0, 4, TILE, 1);
    // Bottom AO
    ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.fillRect(0, 14, TILE, 2);

    return c;
}

function generateDoor(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;

    // Stone frame with depth
    ctx.fillStyle = '#2c3e50'; ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = '#243342'; ctx.fillRect(1, 0, 1, TILE); ctx.fillRect(14, 0, 1, TILE);

    // Wood door
    ctx.fillStyle = '#6d4c41'; ctx.fillRect(2, 1, 12, 15);
    // Grain
    ctx.fillStyle = '#5d4037'; ctx.fillRect(5, 1, 1, 15); ctx.fillRect(10, 1, 1, 15);
    ctx.fillStyle = 'rgba(0,0,0,0.08)'; ctx.fillRect(3, 1, 1, 15); ctx.fillRect(7, 1, 1, 15); ctx.fillRect(12, 1, 1, 15);

    // Iron bands with rivets
    ctx.fillStyle = '#78909c'; ctx.fillRect(2, 3, 12, 2); ctx.fillRect(2, 10, 12, 2);
    ctx.fillStyle = '#b0bec5'; ctx.fillRect(3, 3, 1, 1); ctx.fillRect(12, 3, 1, 1);
    ctx.fillRect(3, 10, 1, 1); ctx.fillRect(12, 10, 1, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(2, 5, 12, 1); ctx.fillRect(2, 12, 12, 1);

    // Ornate handle
    ctx.fillStyle = '#ffd54f'; ctx.fillRect(10, 7, 2, 3);
    ctx.fillStyle = '#ffca28'; ctx.fillRect(10, 7, 1, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(11, 9, 1, 1);

    // Arch highlight + bottom shadow
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(3, 1, 10, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(2, 14, 12, 2);

    return c;
}

function generateStairs(down: boolean): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;

    // Dark cavity
    ctx.fillStyle = down ? '#1a1208' : '#4a3b2a';
    ctx.fillRect(0, 0, TILE, TILE);

    const steps = 5;
    const stepH = Math.floor(TILE / steps);
    for (let i = 0; i < steps; i++) {
        const y = i * stepH;
        const shade = down ? (0.5 + i * 0.12) : (1.0 - i * 0.12);
        const r = Math.floor(127 * shade), g = Math.floor(140 * shade), b = Math.floor(141 * shade);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(3, y, 10, stepH - 1);
        ctx.fillStyle = `rgba(255,255,255,${0.06 + (down ? i * 0.02 : (4 - i) * 0.02)})`;
        ctx.fillRect(3, y, 10, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(3, y + stepH - 1, 10, 1);
    }

    // Side walls
    ctx.fillStyle = '#2c3e50'; ctx.fillRect(0, 0, 3, TILE); ctx.fillRect(13, 0, 3, TILE);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(2, 0, 1, TILE); ctx.fillRect(13, 0, 1, TILE);
    ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(0, 0, 1, TILE); ctx.fillRect(15, 0, 1, TILE);

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
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(8, 14, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();

    // Body with shading
    ctx.fillStyle = '#7b5b3a'; ctx.fillRect(2, 6, 12, 8);
    ctx.fillStyle = '#6d4c2e'; ctx.fillRect(2, 12, 12, 2);
    ctx.fillStyle = '#8a6844'; ctx.fillRect(3, 7, 10, 2);

    // Lid
    ctx.fillStyle = '#9c7c5a'; ctx.fillRect(2, 3, 12, 4);
    ctx.fillStyle = '#a88b66'; ctx.fillRect(3, 3, 10, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.15)'; ctx.fillRect(2, 6, 12, 1);

    // Metal bands
    ctx.fillStyle = '#ffc107'; ctx.fillRect(3, 3, 2, 11); ctx.fillRect(11, 3, 2, 11);
    ctx.fillStyle = '#ffe082'; ctx.fillRect(3, 3, 1, 11);
    ctx.fillStyle = '#e6a800'; ctx.fillRect(4, 3, 1, 11); ctx.fillRect(12, 3, 1, 11);

    // Lock
    ctx.fillStyle = '#ff8f00'; ctx.fillRect(7, 7, 2, 3);
    ctx.fillStyle = '#ffd54f'; ctx.fillRect(7, 7, 1, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(8, 9, 1, 1);

    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(4, 3, 8, 1);

    return c;
}

function generateChestOpen(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE);
    const ctx = c.getContext('2d')!;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(8, 14, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();

    // Dark interior
    ctx.fillStyle = '#2a1a0e'; ctx.fillRect(2, 6, 12, 8);
    ctx.fillStyle = '#3e2518'; ctx.fillRect(3, 7, 10, 2);

    // Open lid
    ctx.fillStyle = '#6d4c2e'; ctx.fillRect(2, 0, 12, 6);
    ctx.fillStyle = '#7b5b3a'; ctx.fillRect(3, 1, 10, 4);
    ctx.fillStyle = '#5d3c22'; ctx.fillRect(3, 4, 10, 2);

    // Gold + gems inside
    ctx.fillStyle = '#ffd54f'; ctx.fillRect(4, 9, 2, 2); ctx.fillRect(7, 8, 3, 3); ctx.fillRect(11, 9, 2, 2);
    ctx.fillStyle = '#e74c3c'; ctx.fillRect(5, 10, 1, 1);
    ctx.fillStyle = '#3498db'; ctx.fillRect(9, 9, 1, 1);
    ctx.fillStyle = 'rgba(255,255,200,0.5)'; ctx.fillRect(8, 8, 1, 1);

    // Bands on lid
    ctx.fillStyle = '#ffc107'; ctx.fillRect(3, 0, 2, 6); ctx.fillRect(11, 0, 2, 6);

    return c;
}

function generateTrap(): HTMLCanvasElement {
    const c = createCanvas(TILE, TILE); const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#4a3b2a'; ctx.fillRect(0, 0, TILE, TILE);
    // Pressure plate
    ctx.fillStyle = '#56473a'; ctx.fillRect(3, 3, 10, 10);
    ctx.fillStyle = '#3e3024'; ctx.fillRect(3, 12, 10, 1); ctx.fillRect(12, 3, 1, 10);
    // Pin holes
    ctx.fillStyle = '#2a1e14';
    ctx.beginPath(); ctx.arc(5, 5, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(11, 5, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(8, 8, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(5, 11, 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(11, 11, 1.2, 0, Math.PI * 2); ctx.fill();
    // Danger tint
    ctx.fillStyle = 'rgba(180, 50, 30, 0.08)'; ctx.fillRect(3, 3, 10, 10);
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
    const colors = CLASS_COLORS[className] || CLASS_COLORS['warrior'];

    // Palette
    const skin = colors.head;
    const skinDark = shadeColor(skin, -20);
    const hair = colors.hair;
    const hairLight = shadeColor(hair, 30);
    const hairDark = shadeColor(hair, -30);
    const body = colors.body;
    const bodyLight = shadeColor(body, 25);
    const bodyDark = shadeColor(body, -25);
    const detail = colors.detail;

    const bob = frame % 2 === 0 ? 0 : 1;

    // --- SHADOW ---
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(16, 58, 10, 3, 0, 0, Math.PI * 2); ctx.fill();

    // --- BASE MANNEQUIN COORDINATES ---
    // Keeping it 32x64, but focusing details.
    // Head: 16x16 roughly, centered at x=16, y=14
    // Body: 14x16, y=30
    // Legs: y=46 to 60

    const centerX = 16;
    const headY = 13 + bob;
    const bodyY = 28 + bob;
    const legY = 44 + bob;

    // --- LEGS ---
    const legH = 16;
    let leftLegY = legY;
    let rightLegY = legY;

    // Walk animation
    if (dir === 2 || dir === 3) {
        if (frame === 1) {
            // Walking
            if (dir === 2) { leftLegY -= 2; rightLegY += 2; } // Side view walk
            else { leftLegY += 2; rightLegY -= 2; }
        }
    }

    // Draw Legs
    const pantsColor = '#222'; // Default darker legs/boots
    ctx.fillStyle = pantsColor;

    if (dir === 2 || dir === 3) {
        // Side view legs — mirror depending on direction
        const facing = dir === 2 ? -1 : 1; // -1 = left, 1 = right
        const frontLegX = centerX + facing * -3;
        const backLegX = centerX + facing * 1;
        // Draw back leg first (darker, further)
        ctx.fillStyle = shadeColor(pantsColor, -20);
        ctx.fillRect(backLegX, legY, 5, legH - 2);
        ctx.fillStyle = '#111';
        ctx.fillRect(backLegX, legY + legH - 4, 5, 4);

        // Front leg (closer, brighter)
        ctx.fillStyle = pantsColor;
        const frontBob = frame === 1 ? -2 : 0;
        ctx.fillRect(frontLegX, legY + frontBob, 5, legH - 2 - frontBob);
        ctx.fillStyle = '#222';
        ctx.fillRect(frontLegX, legY + legH - 4, 5, 4);

    } else {
        // Front/Back view legs
        ctx.fillStyle = pantsColor;
        ctx.fillRect(centerX - 5, leftLegY, 5, legH); // Left
        ctx.fillRect(centerX + 1, rightLegY, 5, legH); // Right

        // Boots
        ctx.fillStyle = '#111';
        ctx.fillRect(centerX - 5, leftLegY + legH - 4, 5, 4);
        ctx.fillRect(centerX + 1, rightLegY + legH - 4, 5, 4);
    }

    // --- ARM BEHIND (for side view) ---
    if (dir === 3) { // Facing Right
        ctx.fillStyle = bodyDark;
        ctx.fillRect(centerX + 4, bodyY + 4, 4, 10);
    } else if (dir === 2) { // Facing Left
        ctx.fillStyle = bodyDark;
        ctx.fillRect(centerX - 8, bodyY + 4, 4, 10);
    }


    // --- BODY ---
    const bodyW = 14;
    const bodyH = 18;
    // Shift body slightly toward facing direction for profile
    const bodyShift = (dir === 2) ? -1 : (dir === 3) ? 1 : 0;
    const bodyX = centerX - bodyW / 2 + bodyShift;

    ctx.fillStyle = body;
    ctx.fillRect(bodyX, bodyY, bodyW, bodyH);

    // Side shading on body for profile views
    if (dir === 2 || dir === 3) {
        ctx.fillStyle = bodyDark;
        if (dir === 2) {
            ctx.fillRect(bodyX + bodyW - 2, bodyY, 2, bodyH); // Right edge darker
        } else {
            ctx.fillRect(bodyX, bodyY, 2, bodyH); // Left edge darker
        }
    }

    // Detail/Armor logic
    if (className === 'warrior' || className === 'paladin' || className === 'berserker') {
        // Plate Armor
        ctx.fillStyle = bodyLight;
        ctx.fillRect(bodyX + 2, bodyY + 2, bodyW - 4, bodyH - 6); // Chestplate
        ctx.fillStyle = detail;
        ctx.fillRect(bodyX + 4, bodyY + 6, bodyW - 8, 4); // Band
    } else if (className === 'mage' || className === 'necromancer' || className === 'cleric') {
        // Robes - go down over legs a bit
        ctx.fillStyle = body;
        ctx.fillRect(bodyX - 1, bodyY + 10, bodyW + 2, 14); // Skirt part
        ctx.fillStyle = detail;
        ctx.fillRect(bodyX + 4, bodyY, 6, bodyH + 10); // Center strip
        // Gold trim
        ctx.fillStyle = '#F1C40F';
        ctx.fillRect(bodyX + 2, bodyY + bodyH + 8, bodyW - 4, 2);
    } else {
        // Tunic/Vest (Rogue, Ranger, etc)
        ctx.fillStyle = detail;
        ctx.fillRect(bodyX + 2, bodyY + 2, 4, bodyH - 4); // Vest straps?
        ctx.fillRect(bodyX + bodyW - 6, bodyY + 2, 4, bodyH - 4);
        // Belt
        ctx.fillStyle = '#5d4037';
        ctx.fillRect(bodyX - 1, bodyY + bodyH - 4, bodyW + 2, 3);
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(centerX - 2, bodyY + bodyH - 4, 4, 3); // Buckle
    }


    // --- HEAD ---
    const headSize = 16; // Proportional head for dungeon adventurer
    const headX = centerX - headSize / 2;
    // Neck
    ctx.fillStyle = skinDark;
    ctx.fillRect(centerX - 2, headY + 14, 4, 3);

    // Face shape — shift for profile views
    ctx.fillStyle = skin;
    const faceShift = (dir === 2) ? -2 : (dir === 3) ? 2 : 0;
    ctx.fillRect(headX + 2 + faceShift, headY, headSize - 4, headSize);
    ctx.fillRect(headX + faceShift, headY + 2, headSize, headSize - 6);

    // --- HAIR BACK ---
    if (dir === 1) { // Back view
        ctx.fillStyle = hair;
        ctx.fillRect(headX - 1, headY - 1, headSize + 2, headSize + 4);
        ctx.fillStyle = hairDark;
        ctx.fillRect(headX + 2, headY + headSize, headSize - 4, 4);
    } else if (dir === 2) {
        // Left profile — hair visible on right side (back of head)
        ctx.fillStyle = hairDark;
        ctx.fillRect(headX + headSize - 3 + faceShift, headY + 2, 4, 14);
    } else if (dir === 3) {
        // Right profile — hair visible on left side (back of head)
        ctx.fillStyle = hairDark;
        ctx.fillRect(headX - 1 + faceShift, headY + 2, 4, 14);
    } else {
        // Front — hair behind both sides
        ctx.fillStyle = hairDark;
        ctx.fillRect(headX - 1, headY + 4, 3, 12);
        ctx.fillRect(headX + headSize - 2, headY + 4, 3, 12);
    }


    // --- FACE ---
    if (dir === 0 || dir === 2 || dir === 3) {
        if (dir === 0) { // Front
            // Eyes — small dot eyes with a sparkle (the 'bit of cute')
            const eyeY = headY + 8;
            ctx.fillStyle = '#111';
            ctx.fillRect(centerX - 5, eyeY, 2, 2); // Left eye
            ctx.fillRect(centerX + 3, eyeY, 2, 2); // Right eye
            // Tiny white sparkle — gives life without being anime
            ctx.fillStyle = '#fff';
            ctx.fillRect(centerX - 5, eyeY, 1, 1);
            ctx.fillRect(centerX + 3, eyeY, 1, 1);

            // Mouth — small neutral line
            ctx.fillStyle = skinDark;
            ctx.fillRect(centerX - 1, eyeY + 4, 2, 1);

        } else if (dir === 2) { // Left Profile
            const eyeX = headX + faceShift + 1;
            const eyeY = headY + 8;

            // Eye
            ctx.fillStyle = '#111';
            ctx.fillRect(eyeX, eyeY, 2, 2);
            ctx.fillStyle = '#fff';
            ctx.fillRect(eyeX, eyeY, 1, 1);

            // Nose
            ctx.fillStyle = skinDark;
            ctx.fillRect(eyeX - 1, eyeY + 2, 1, 1);

            // Mouth
            ctx.fillStyle = skinDark;
            ctx.fillRect(eyeX, eyeY + 4, 2, 1);

        } else if (dir === 3) { // Right Profile
            const faceRight = headX + faceShift + headSize;
            const eyeX = faceRight - 3;
            const eyeY = headY + 8;

            // Eye
            ctx.fillStyle = '#111';
            ctx.fillRect(eyeX, eyeY, 2, 2);
            ctx.fillStyle = '#fff';
            ctx.fillRect(eyeX + 1, eyeY, 1, 1);

            // Nose
            ctx.fillStyle = skinDark;
            ctx.fillRect(faceRight - 1, eyeY + 2, 1, 1);

            // Mouth
            ctx.fillStyle = skinDark;
            ctx.fillRect(eyeX, eyeY + 4, 2, 1);
        }
    }

    // --- HAIR FRONT ---
    if (dir !== 1) { // Not back view
        ctx.fillStyle = hair;
        // Top cap
        ctx.fillRect(headX + faceShift, headY - 3, headSize, 6);
        ctx.fillStyle = hairLight; // Highlight
        ctx.fillRect(headX + 4 + faceShift, headY - 2, headSize - 8, 2);

        ctx.fillStyle = hair;
        if (dir === 0) {
            // Bangs
            ctx.fillRect(headX, headY, 4, 8);
            ctx.fillRect(headX + headSize - 4, headY, 4, 8);
            ctx.fillRect(centerX - 2, headY, 4, 5); // Center bang
        } else if (dir === 2) {
            // Left view — hair sweeps left, short sideburn above eye level
            ctx.fillRect(headX + faceShift, headY - 1, headSize, 5);
            ctx.fillRect(headX - 2 + faceShift, headY + 2, 5, 4); // Sideburn stops above eyes
        } else if (dir === 3) {
            // Right view — hair sweeps right, short sideburn above eye level
            ctx.fillRect(headX + faceShift, headY - 1, headSize, 5);
            ctx.fillRect(headX + headSize - 3 + faceShift, headY + 2, 5, 4); // Sideburn stops above eyes
        }
    }

    // --- ARMS & WEAPONS ---
    // Sturdy adventurer arms
    const armY = bodyY + 4;

    if (dir === 0) { // Front
        ctx.fillStyle = body; // Sleeves
        ctx.fillRect(centerX - bodyW / 2 - 3, armY, 4, 8);
        ctx.fillRect(centerX + bodyW / 2 - 1, armY, 4, 8);
        ctx.fillStyle = skin; // Hands
        ctx.fillRect(centerX - bodyW / 2 - 3, armY + 8, 4, 3);
        ctx.fillRect(centerX + bodyW / 2 - 1, armY + 8, 4, 3);

        // Weapon Holding
        const weaponY = armY + 6 + bob;
        // Warrior/Paladin: Sword
        if (['warrior', 'paladin', 'berserker'].includes(className)) {
            // Draw sword in right hand (viewer's right)
            const hx = centerX + bodyW / 2 + 1;
            ctx.fillStyle = '#888'; // Blade
            ctx.fillRect(hx, weaponY - 12, 4, 16);
            ctx.fillStyle = '#EEE'; // Shine
            ctx.fillRect(hx + 1, weaponY - 12, 1, 14);
            ctx.fillStyle = '#D4AF37'; // Hilt
            ctx.fillRect(hx - 2, weaponY + 2, 8, 2);
            ctx.fillRect(hx + 1, weaponY + 4, 2, 3); // Handle
        }
        // Mage/Necro/Cleric: Staff
        else if (['mage', 'necromancer', 'cleric'].includes(className)) {
            const hx = centerX + bodyW / 2 + 2;
            ctx.fillStyle = '#5d4037'; // Stick
            ctx.fillRect(hx, weaponY - 14, 2, 24);
            // Orb
            ctx.fillStyle = className === 'necromancer' ? '#800080' : (className === 'cleric' ? '#F1C40F' : '#3498DB');
            ctx.beginPath(); ctx.arc(hx + 1, weaponY - 14, 4, 0, Math.PI * 2); ctx.fill();
        }
        // Rogue/Assassin: Daggers
        else if (['rogue', 'assassin'].includes(className)) {
            const hx = centerX + bodyW / 2 + 1;
            const hx2 = centerX - bodyW / 2 - 1;
            ctx.fillStyle = '#AAA';
            ctx.fillRect(hx, weaponY + 2, 2, 6); // R Dagger
            ctx.fillRect(hx2, weaponY + 2, 2, 6); // L Dagger
            // Reverse grip?
        }
        // Ranger: Bow
        else if (className === 'ranger') {
            const hx = centerX - bodyW / 2 - 4;
            ctx.strokeStyle = '#5d4037';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(hx, weaponY + 4, 8, -Math.PI / 2, Math.PI / 2);
            ctx.stroke();
            ctx.strokeStyle = '#EEE';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(hx, weaponY - 4); ctx.lineTo(hx, weaponY + 12); ctx.stroke();
        }

    } else if (dir === 2) { // Left
        // Front arm on left side (facing direction)
        ctx.fillStyle = body;
        ctx.fillRect(centerX - 6, armY + 2, 4, 8);
        ctx.fillStyle = skin;
        ctx.fillRect(centerX - 6, armY + 10, 4, 3);
        // Weapon/shield in front
        if (['warrior', 'paladin'].includes(className)) {
            ctx.fillStyle = '#888';
            ctx.fillRect(centerX - 10, armY - 2, 4, 14); // Sword blade
            ctx.fillStyle = '#D4AF37';
            ctx.fillRect(centerX - 11, armY + 6, 6, 2); // Hilt
        } else if (['mage', 'necromancer', 'cleric'].includes(className)) {
            ctx.fillStyle = '#5d4037';
            ctx.fillRect(centerX - 7, armY - 10, 2, 22); // Staff
            ctx.fillStyle = className === 'necromancer' ? '#800080' : (className === 'cleric' ? '#F1C40F' : '#3498DB');
            ctx.beginPath(); ctx.arc(centerX - 6, armY - 10, 3, 0, Math.PI * 2); ctx.fill();
        }

    } else if (dir === 3) { // Right
        // Front arm on right side (facing direction)
        ctx.fillStyle = body;
        ctx.fillRect(centerX + 2, armY + 2, 4, 8);
        ctx.fillStyle = skin;
        ctx.fillRect(centerX + 2, armY + 10, 4, 3);
        // Weapon in front
        if (['warrior', 'paladin', 'berserker'].includes(className)) {
            ctx.fillStyle = '#888';
            ctx.fillRect(centerX + 6, armY - 2, 4, 14); // Sword blade
            ctx.fillStyle = '#D4AF37';
            ctx.fillRect(centerX + 5, armY + 6, 6, 2); // Hilt
        } else if (['mage', 'necromancer', 'cleric'].includes(className)) {
            ctx.fillStyle = '#5d4037';
            ctx.fillRect(centerX + 5, armY - 10, 2, 22); // Staff
            ctx.fillStyle = className === 'necromancer' ? '#800080' : (className === 'cleric' ? '#F1C40F' : '#3498DB');
            ctx.beginPath(); ctx.arc(centerX + 6, armY - 10, 3, 0, Math.PI * 2); ctx.fill();
        }
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
    }

    return c;
}

function generateBoss(floor: number, frame: number): HTMLCanvasElement {
    const c = createCanvas(128, 128);
    const ctx = c.getContext('2d')!;
    const hue = (floor * 36) % 360;
    const color = `hsl(${hue}, 60%, 40%)`;
    const light = `hsl(${hue}, 70%, 60%)`;
    const dark = `hsl(${hue}, 50%, 25%)`;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(64, 118, 50, 10, 0, 0, Math.PI * 2); ctx.fill();

    const bob = frame % 2 === 0 ? 0 : 3;

    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(64, 60 + bob, 40, 35, 0, 0, Math.PI * 2); ctx.fill();
    // Shoulders
    ctx.beginPath(); ctx.ellipse(64, 40 + bob, 44, 20, 0, Math.PI, 0); ctx.fill();
    // Dark underside
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.ellipse(64, 75 + bob, 36, 15, 0, 0, Math.PI); ctx.fill();

    // Armor plates
    ctx.fillStyle = light;
    ctx.beginPath(); ctx.ellipse(64, 50 + bob, 30, 20, 0, Math.PI, 0); ctx.fill();

    // Spikes
    ctx.fillStyle = light;
    ctx.beginPath(); ctx.moveTo(20, 45 + bob); ctx.lineTo(4, 20 + bob); ctx.lineTo(30, 38 + bob); ctx.fill();
    ctx.beginPath(); ctx.moveTo(108, 45 + bob); ctx.lineTo(124, 20 + bob); ctx.lineTo(98, 38 + bob); ctx.fill();
    // Smaller spikes
    ctx.beginPath(); ctx.moveTo(32, 35 + bob); ctx.lineTo(24, 16 + bob); ctx.lineTo(40, 32 + bob); ctx.fill();
    ctx.beginPath(); ctx.moveTo(96, 35 + bob); ctx.lineTo(104, 16 + bob); ctx.lineTo(88, 32 + bob); ctx.fill();

    // Face plate
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.ellipse(64, 48 + bob, 22, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.ellipse(64, 46 + bob, 18, 12, 0, Math.PI, 0); ctx.fill();

    // Eyes (Glowing)
    ctx.fillStyle = '#ff0000';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.ellipse(52, 46 + bob, 6, 4, -0.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(76, 46 + bob, 6, 4, 0.1, 0, Math.PI * 2); ctx.fill();
    // Pupil glow
    ctx.fillStyle = '#ff6666';
    ctx.beginPath(); ctx.ellipse(52, 46 + bob, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(76, 46 + bob, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;

    // Mouth
    ctx.fillStyle = '#ff0000';
    ctx.beginPath(); ctx.ellipse(64, 56 + bob, 8, 4, 0, 0, Math.PI); ctx.fill();
    // Fangs
    ctx.fillStyle = '#ddd';
    ctx.beginPath(); ctx.moveTo(58, 56 + bob); ctx.lineTo(60, 62 + bob); ctx.lineTo(62, 56 + bob); ctx.fill();
    ctx.beginPath(); ctx.moveTo(66, 56 + bob); ctx.lineTo(68, 62 + bob); ctx.lineTo(70, 56 + bob); ctx.fill();

    // Arms
    ctx.fillStyle = color;
    ctx.fillRect(10, 50 + bob, 14, 40);
    ctx.fillRect(104, 50 + bob, 14, 40);
    // Fists
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.ellipse(17, 92 + bob, 9, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(111, 92 + bob, 9, 8, 0, 0, Math.PI * 2); ctx.fill();

    // Legs
    ctx.fillStyle = dark;
    ctx.fillRect(38, 88, 16, 24);
    ctx.fillRect(74, 88, 16, 24);
    // Boots
    ctx.fillStyle = '#222';
    ctx.fillRect(34, 108, 24, 8);
    ctx.fillRect(70, 108, 24, 8);

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
    (['merchant', 'healer', 'sage', 'cook', 'fishmonger', 'farmer', 'blacksmith'] as NPCType[]).forEach(t => {
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
