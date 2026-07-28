// ===== HIGH-DETAIL ITEM ART =====
// Gear icons are painted at 32x32 (2x the tile grid) so blades can carry a
// proper edge, fuller, bevel and specular band instead of a 2px grey stick.
// Everything else (food, fish, seeds) keeps its 16px art, upscaled.

import type { Rarity } from './types';

export const ICON_SIZE = 32;

interface Metal {
    /** Deepest shadow on the spine */
    dark: string;
    /** Body of the blade */
    base: string;
    /** Lit face */
    light: string;
    /** Specular highlight / cutting edge */
    edge: string;
    /** Fittings: guard, pommel, bands */
    trim: string;
    trimDark: string;
    /** Aura colour for legendary pieces */
    aura: string | null;
}

/** Rarity reads as material: iron → steel → blued steel → god-metal. */
const METALS: Record<Rarity, Metal> = {
    common: { dark: '#4a5058', base: '#7d858e', light: '#a9b1b8', edge: '#d8dee3', trim: '#6b5a45', trimDark: '#43382b', aura: null },
    uncommon: { dark: '#4f5f57', base: '#8fa197', light: '#bccdc2', edge: '#e9f4ec', trim: '#3f8f5f', trimDark: '#276241', aura: null },
    rare: { dark: '#2f4560', base: '#5c7ea6', light: '#93b6d8', edge: '#dcefff', trim: '#2f6ea8', trimDark: '#1d4770', aura: null },
    epic: { dark: '#3a2258', base: '#6b4a9e', light: '#b28fe0', edge: '#f0e4ff', trim: '#8e5ec4', trimDark: '#4c2e78', aura: '#a55eea' },
    legendary: { dark: '#5a3410', base: '#a06a22', light: '#e0a94a', edge: '#fff0c0', trim: '#c9962c', trimDark: '#7a5a14', aura: '#ffb13d' },
    // Mythic: dark god-metal shot through with living red light
    mythic: { dark: '#2a0812', base: '#7a1028', light: '#ff5c78', edge: '#ffe0e6', trim: '#c41f42', trimDark: '#6b0a1e', aura: '#ff2d55' },
};

const GEMS: Record<Rarity, string> = {
    common: '#8a8f98', uncommon: '#2ecc71', rare: '#3fa9f5',
    epic: '#a55eea', legendary: '#ff4d4d', mythic: '#ff2d55',
};

function grad(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, stops: [number, string][]): CanvasGradient {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    for (const [o, c] of stops) g.addColorStop(o, c);
    return g;
}

/** Leather-wrapped grip with visible wrap seams. */
function grip(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, m: Metal): void {
    ctx.fillStyle = grad(ctx, x, y, x + w, y, [[0, '#2b1d13'], [0.35, m.trim], [1, m.trimDark]]);
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (let i = 1; i < h; i += 3) ctx.fillRect(x, y + i, w, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.fillRect(x + 1, y, 1, h);
}

function gem(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r * 0.5, cy - r * 0.15); ctx.lineTo(cx, cy);
    ctx.closePath(); ctx.fill();
}

// -------------------------------------------------------------------
// WEAPONS
// -------------------------------------------------------------------

function paintSword(ctx: CanvasRenderingContext2D, m: Metal, rc: string): void {
    // Blade: tapered, with a fuller down the middle and a bright edge
    ctx.fillStyle = grad(ctx, 12, 0, 20, 0, [[0, m.dark], [0.4, m.base], [0.62, m.light], [1, m.dark]]);
    ctx.beginPath();
    ctx.moveTo(16, 1);          // point
    ctx.lineTo(20, 8);
    ctx.lineTo(20, 20);
    ctx.lineTo(12, 20);
    ctx.lineTo(12, 8);
    ctx.closePath();
    ctx.fill();

    // Fuller (blood groove)
    ctx.fillStyle = m.dark;
    ctx.fillRect(15, 6, 2, 13);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(15, 6, 1, 13);

    // Cutting edges
    ctx.fillStyle = m.edge;
    ctx.fillRect(12, 8, 1, 12);
    ctx.beginPath(); ctx.moveTo(16, 1); ctx.lineTo(12.6, 8); ctx.lineTo(13.6, 8); ctx.closePath(); ctx.fill();
    ctx.fillStyle = m.light;
    ctx.fillRect(19, 8, 1, 12);
    ctx.beginPath(); ctx.moveTo(16, 1); ctx.lineTo(19.4, 8); ctx.lineTo(18.4, 8); ctx.closePath(); ctx.fill();

    // Specular band
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(17, 9, 1, 8);

    // Crossguard — swept, with bevel
    ctx.fillStyle = grad(ctx, 4, 20, 28, 24, [[0, m.trimDark], [0.5, rc], [1, m.trimDark]]);
    ctx.beginPath();
    ctx.moveTo(5, 21); ctx.lineTo(27, 21); ctx.lineTo(24, 24); ctx.lineTo(8, 24);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.fillRect(6, 21, 20, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(8, 23, 16, 1);

    // Grip + pommel
    grip(ctx, 14, 24, 4, 6, m);
    ctx.fillStyle = rc;
    ctx.beginPath(); ctx.ellipse(16, 30, 3.4, 2.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.ellipse(15, 29.4, 1.2, 0.8, 0, 0, Math.PI * 2); ctx.fill();
    gem(ctx, 16, 22.4, 1.8, GEMS.legendary === rc ? '#fff2b0' : rc);
}

function paintAxe(ctx: CanvasRenderingContext2D, m: Metal, rc: string): void {
    // Haft
    ctx.fillStyle = grad(ctx, 13, 0, 19, 0, [[0, '#3b2717'], [0.4, '#6b4a2c'], [1, '#2b1c10']]);
    ctx.fillRect(14, 4, 4, 26);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(15, 5, 1, 24);
    // Grip wrap at the base
    grip(ctx, 14, 22, 4, 8, m);

    // Bearded axe head
    ctx.fillStyle = grad(ctx, 4, 4, 28, 18, [[0, m.light], [0.5, m.base], [1, m.dark]]);
    ctx.beginPath();
    ctx.moveTo(17, 4);
    ctx.quadraticCurveTo(29, 6, 27, 17);
    ctx.quadraticCurveTo(23, 15, 17, 16);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(15, 4);
    ctx.quadraticCurveTo(3, 6, 5, 17);
    ctx.quadraticCurveTo(9, 15, 15, 16);
    ctx.closePath(); ctx.fill();

    // Honed edges
    ctx.strokeStyle = m.edge;
    ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(28, 7); ctx.quadraticCurveTo(28.5, 13, 26.6, 16.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, 7); ctx.quadraticCurveTo(3.5, 13, 5.4, 16.6); ctx.stroke();
    ctx.lineWidth = 1;

    // Cheek shading + rivets
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(22, 12, 4, 3, 0.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(10, 12, 4, 3, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rc;
    ctx.fillRect(13, 3, 6, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(13, 3, 6, 1);
    ctx.fillStyle = m.trimDark;
    ctx.fillRect(20, 10, 1, 1); ctx.fillRect(11, 10, 1, 1);
}

function paintDagger(ctx: CanvasRenderingContext2D, m: Metal, rc: string): void {
    ctx.fillStyle = grad(ctx, 13, 0, 19, 0, [[0, m.dark], [0.45, m.base], [0.7, m.light], [1, m.dark]]);
    ctx.beginPath();
    ctx.moveTo(16, 2);
    ctx.lineTo(19, 10);
    ctx.lineTo(18, 19);
    ctx.lineTo(14, 19);
    ctx.lineTo(13, 10);
    ctx.closePath(); ctx.fill();

    ctx.fillStyle = m.edge;
    ctx.beginPath(); ctx.moveTo(16, 2); ctx.lineTo(13.4, 10); ctx.lineTo(14.4, 19); ctx.lineTo(14.9, 19); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(17, 8, 1, 9);
    ctx.fillStyle = m.dark;
    ctx.fillRect(15.6, 7, 1, 11);

    // Small swept guard
    ctx.fillStyle = rc;
    ctx.beginPath();
    ctx.moveTo(9, 19); ctx.lineTo(23, 19); ctx.lineTo(20, 22); ctx.lineTo(12, 22);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(10, 19, 12, 1);

    grip(ctx, 14, 22, 4, 7, m);
    ctx.fillStyle = rc;
    ctx.beginPath(); ctx.arc(16, 30, 2.4, 0, Math.PI * 2); ctx.fill();
    gem(ctx, 16, 20.4, 1.5, GEMS.rare);
}

function paintStaff(ctx: CanvasRenderingContext2D, m: Metal, rc: string): void {
    // Shaft with grain
    ctx.fillStyle = grad(ctx, 13, 0, 19, 0, [[0, '#3a2716'], [0.4, '#6d4a2b'], [1, '#241708']]);
    ctx.fillRect(14, 8, 4, 23);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(15, 9, 1, 21);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(14, 14, 4, 1); ctx.fillRect(14, 22, 4, 1);

    // Binding
    ctx.fillStyle = m.trim;
    ctx.fillRect(13, 11, 6, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(13, 11, 6, 1);

    // Curled head cradling a focus stone
    ctx.strokeStyle = grad(ctx, 8, 0, 24, 10, [[0, m.light], [1, m.dark]]);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(15, 10);
    ctx.quadraticCurveTo(6, 8, 10, 3);
    ctx.quadraticCurveTo(15, -1, 21, 3);
    ctx.quadraticCurveTo(25, 7, 18, 10);
    ctx.stroke();
    ctx.lineWidth = 1;

    // Glowing focus
    const g = ctx.createRadialGradient(16, 6, 0, 16, 6, 7);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.35, rc);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(8, -2, 16, 16);
    gem(ctx, 16, 6, 3.4, rc);
}

function paintBow(ctx: CanvasRenderingContext2D, m: Metal, rc: string): void {
    // Recurve limbs
    ctx.strokeStyle = grad(ctx, 6, 0, 22, 32, [[0, '#7a5330'], [0.5, '#4d3218'], [1, '#2c1c0c']]);
    ctx.lineWidth = 3.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(14, 2);
    ctx.quadraticCurveTo(4, 8, 9, 16);
    ctx.quadraticCurveTo(4, 24, 14, 30);
    ctx.stroke();
    // Lit edge of the limb
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(13, 3);
    ctx.quadraticCurveTo(4.5, 8.5, 9.5, 16);
    ctx.quadraticCurveTo(4.5, 23.5, 13, 29);
    ctx.stroke();

    // Nocks + tips
    ctx.fillStyle = rc;
    ctx.fillRect(12, 1, 4, 2); ctx.fillRect(12, 29, 4, 2);
    // Riser wrap
    grip(ctx, 7, 12, 4, 8, m);

    // String
    ctx.strokeStyle = 'rgba(235,235,225,0.85)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(14, 2); ctx.lineTo(14, 30);
    ctx.stroke();

    // Nocked arrow
    ctx.strokeStyle = '#8d6e4a';
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(14, 16); ctx.lineTo(27, 16); ctx.stroke();
    ctx.fillStyle = m.edge;
    ctx.beginPath(); ctx.moveTo(30, 16); ctx.lineTo(26, 13.6); ctx.lineTo(26, 18.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = rc;
    ctx.beginPath(); ctx.moveTo(15, 16); ctx.lineTo(19, 13); ctx.lineTo(19, 19); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 1;
}

// -------------------------------------------------------------------
// ARMOUR / TRINKETS
// -------------------------------------------------------------------

function paintArmor(ctx: CanvasRenderingContext2D, m: Metal, rc: string): void {
    // Cuirass silhouette
    ctx.fillStyle = grad(ctx, 6, 4, 26, 28, [[0, m.light], [0.45, m.base], [1, m.dark]]);
    ctx.beginPath();
    ctx.moveTo(9, 8);
    ctx.quadraticCurveTo(16, 4, 23, 8);
    ctx.lineTo(26, 14);
    ctx.quadraticCurveTo(24, 26, 16, 30);
    ctx.quadraticCurveTo(8, 26, 6, 14);
    ctx.closePath(); ctx.fill();

    // Pauldrons
    ctx.fillStyle = m.base;
    ctx.beginPath(); ctx.ellipse(7, 11, 5, 4, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(25, 11, 5, 4, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = m.light;
    ctx.beginPath(); ctx.ellipse(7, 10, 4, 2, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(25, 10, 4, 2, 0.4, 0, Math.PI * 2); ctx.fill();

    // Neck + centre ridge
    ctx.fillStyle = m.dark;
    ctx.fillRect(15, 7, 2, 22);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(15, 7, 1, 22);

    // Lames
    ctx.strokeStyle = 'rgba(0,0,0,0.32)';
    for (const ly of [17, 21, 25]) {
        ctx.beginPath();
        ctx.moveTo(7.5, ly); ctx.quadraticCurveTo(16, ly + 2.5, 24.5, ly);
        ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    for (const ly of [17, 21, 25]) {
        ctx.beginPath();
        ctx.moveTo(7.5, ly + 1); ctx.quadraticCurveTo(16, ly + 3.5, 24.5, ly + 1);
        ctx.stroke();
    }

    // Rarity crest
    ctx.fillStyle = rc;
    ctx.beginPath();
    ctx.moveTo(16, 10); ctx.lineTo(20, 13); ctx.lineTo(16, 17); ctx.lineTo(12, 13);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.moveTo(16, 10); ctx.lineTo(18, 12.4); ctx.lineTo(16, 13.6); ctx.closePath(); ctx.fill();
}

function paintShield(ctx: CanvasRenderingContext2D, m: Metal, rc: string): void {
    ctx.fillStyle = grad(ctx, 6, 3, 26, 29, [[0, m.light], [0.5, m.base], [1, m.dark]]);
    ctx.beginPath();
    ctx.moveTo(16, 2);
    ctx.lineTo(28, 7);
    ctx.quadraticCurveTo(28, 22, 16, 30);
    ctx.quadraticCurveTo(4, 22, 4, 7);
    ctx.closePath(); ctx.fill();

    // Rim
    ctx.strokeStyle = m.trim;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.lineWidth = 1;

    // Quarters
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath(); ctx.moveTo(16, 3); ctx.lineTo(27, 7.5); ctx.lineTo(16, 15); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(16, 15); ctx.lineTo(5, 21); ctx.quadraticCurveTo(10, 27, 16, 29); ctx.closePath(); ctx.fill();

    // Boss stud
    ctx.fillStyle = rc;
    ctx.beginPath(); ctx.arc(16, 15, 4.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(14.6, 13.6, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = m.trimDark;
    for (const [rx, ry] of [[16, 6], [24, 11], [8, 11], [16, 25]] as number[][]) {
        ctx.fillRect(rx - 1, ry - 1, 2, 2);
    }
}

function paintRing(ctx: CanvasRenderingContext2D, m: Metal, rc: string): void {
    // Band with inner shadow so it reads as a torus
    ctx.strokeStyle = grad(ctx, 8, 8, 24, 26, [[0, m.light], [0.5, m.base], [1, m.dark]]);
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(16, 19, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(16, 19, 6.2, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.arc(16, 19, 9.6, Math.PI * 0.85, Math.PI * 1.35); ctx.stroke();

    // Claw setting
    ctx.fillStyle = m.trim;
    ctx.beginPath();
    ctx.moveTo(11, 11); ctx.lineTo(21, 11); ctx.lineTo(19, 15); ctx.lineTo(13, 15);
    ctx.closePath(); ctx.fill();

    // Stone
    const g = ctx.createRadialGradient(15, 7, 0, 16, 9, 7);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.4, rc);
    g.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(16, 2); ctx.lineTo(22, 8); ctx.lineTo(16, 14); ctx.lineTo(10, 8);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.moveTo(16, 2); ctx.lineTo(16, 14); ctx.moveTo(10, 8); ctx.lineTo(22, 8); ctx.stroke();
}

function paintPotion(ctx: CanvasRenderingContext2D, liquid: string, glowColor: string): void {
    // Cork
    ctx.fillStyle = '#7a5a34';
    ctx.fillRect(13, 2, 6, 4);
    ctx.fillStyle = '#996f42';
    ctx.fillRect(13, 2, 6, 1);
    ctx.fillStyle = '#5d4126';
    ctx.fillRect(13, 5, 6, 1);

    // Neck
    ctx.fillStyle = 'rgba(210,235,240,0.35)';
    ctx.fillRect(13, 6, 6, 5);

    // Flask body
    ctx.fillStyle = 'rgba(200,230,240,0.22)';
    ctx.beginPath();
    ctx.moveTo(13, 10);
    ctx.quadraticCurveTo(5, 16, 8, 25);
    ctx.quadraticCurveTo(16, 32, 24, 25);
    ctx.quadraticCurveTo(27, 16, 19, 10);
    ctx.closePath();
    ctx.fill();

    // Liquid with meniscus
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(13, 10);
    ctx.quadraticCurveTo(5, 16, 8, 25);
    ctx.quadraticCurveTo(16, 32, 24, 25);
    ctx.quadraticCurveTo(27, 16, 19, 10);
    ctx.closePath();
    ctx.clip();
    const g = ctx.createLinearGradient(0, 15, 0, 30);
    g.addColorStop(0, glowColor);
    g.addColorStop(1, liquid);
    ctx.fillStyle = g;
    ctx.fillRect(4, 16, 24, 16);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(4, 16, 24, 1);
    // Bubbles
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.arc(12, 22, 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(19, 26, 1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(15, 27, 0.8, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Glass highlight + rim
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath(); ctx.ellipse(11, 18, 1.6, 4, 0.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.moveTo(13, 10);
    ctx.quadraticCurveTo(5, 16, 8, 25);
    ctx.quadraticCurveTo(16, 32, 24, 25);
    ctx.quadraticCurveTo(27, 16, 19, 10);
    ctx.stroke();
}

function paintScroll(ctx: CanvasRenderingContext2D, rc: string): void {
    // Rolled ends
    ctx.fillStyle = '#c9b184';
    ctx.fillRect(6, 6, 20, 20);
    ctx.fillStyle = grad(ctx, 6, 0, 26, 0, [[0, '#a08a63'], [0.3, '#e8d9b5'], [1, '#9e8760']]);
    ctx.fillRect(7, 7, 18, 18);
    // Text lines
    ctx.fillStyle = 'rgba(70,50,30,0.55)';
    for (let i = 0; i < 5; i++) ctx.fillRect(10, 10 + i * 3, 12 - (i % 2) * 3, 1);
    // Wax seal
    ctx.fillStyle = rc;
    ctx.beginPath(); ctx.arc(21, 22, 3.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.arc(20, 21, 1.2, 0, Math.PI * 2); ctx.fill();
    // Dowels
    ctx.fillStyle = '#6b5636';
    ctx.fillRect(4, 4, 24, 3); ctx.fillRect(4, 25, 24, 3);
    ctx.fillStyle = '#8e7448';
    ctx.fillRect(4, 4, 24, 1); ctx.fillRect(4, 25, 24, 1);
}

function paintKey(ctx: CanvasRenderingContext2D, m: Metal, rc: string): void {
    ctx.strokeStyle = grad(ctx, 8, 4, 24, 28, [[0, m.light], [1, m.dark]]);
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(16, 9, 6, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = grad(ctx, 14, 0, 19, 0, [[0, m.light], [1, m.dark]]);
    ctx.fillRect(14, 14, 4, 15);
    // Wards
    ctx.fillRect(18, 22, 5, 3);
    ctx.fillRect(18, 27, 4, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(14, 14, 1, 15);
    // Bow gem
    gem(ctx, 16, 9, 2.6, rc);
}

function paintRod(ctx: CanvasRenderingContext2D, rc: string): void {
    ctx.strokeStyle = grad(ctx, 4, 30, 26, 2, [[0, '#5d3f22'], [0.6, '#8a6236'], [1, '#3d2814']]);
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(6, 29);
    ctx.quadraticCurveTo(18, 22, 26, 4);
    ctx.stroke();
    ctx.lineWidth = 1;
    // Grip + reel
    ctx.fillStyle = '#2f2018';
    ctx.fillRect(4, 25, 6, 6);
    ctx.fillStyle = rc;
    ctx.beginPath(); ctx.arc(11, 24, 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.arc(10, 23, 1.1, 0, Math.PI * 2); ctx.fill();
    // Line + float
    ctx.strokeStyle = 'rgba(240,240,235,0.7)';
    ctx.beginPath(); ctx.moveTo(26, 4); ctx.quadraticCurveTo(22, 14, 20, 20); ctx.stroke();
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath(); ctx.arc(20, 22, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ecf0f1';
    ctx.beginPath(); ctx.arc(20, 21, 1, 0, Math.PI * 2); ctx.fill();
}

function paintCan(ctx: CanvasRenderingContext2D, rc: string): void {
    // Body
    ctx.fillStyle = grad(ctx, 8, 0, 24, 0, [[0, '#4d6b78'], [0.4, '#7fa3b2'], [1, '#38505a']]);
    ctx.beginPath();
    ctx.moveTo(9, 14); ctx.lineTo(23, 14); ctx.lineTo(21, 28); ctx.lineTo(11, 28);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(11, 15, 2, 12);
    // Rim
    ctx.fillStyle = '#93b8c7';
    ctx.fillRect(8, 12, 16, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(8, 14, 16, 1);
    // Handle
    ctx.strokeStyle = '#5c7d8a';
    ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(21, 14); ctx.quadraticCurveTo(28, 10, 22, 6); ctx.stroke();
    // Spout
    ctx.beginPath(); ctx.moveTo(10, 17); ctx.lineTo(3, 9); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = '#93b8c7';
    ctx.beginPath(); ctx.arc(3, 8, 2.6, 0, Math.PI * 2); ctx.fill();
    // Droplets
    ctx.fillStyle = rc === '#bdc3c7' ? '#4fc3f7' : rc;
    for (const [dx, dy] of [[2, 13], [5, 16], [1, 18]] as number[][]) {
        ctx.beginPath();
        ctx.moveTo(dx, dy - 2.4); ctx.quadraticCurveTo(dx + 1.8, dy, dx, dy + 1.6);
        ctx.quadraticCurveTo(dx - 1.8, dy, dx, dy - 2.4);
        ctx.fill();
    }
}

type Painter = (ctx: CanvasRenderingContext2D, m: Metal, rc: string) => void;

const PAINTERS: Record<string, Painter> = {
    sword: paintSword,
    axe: paintAxe,
    dagger: paintDagger,
    staff: paintStaff,
    bow: paintBow,
    armor: paintArmor,
    shield: paintShield,
    ring: paintRing,
    scroll: (ctx, _m, rc) => paintScroll(ctx, rc),
    key: paintKey,
    tool_rod: (ctx, _m, rc) => paintRod(ctx, rc),
    tool_can: (ctx, _m, rc) => paintCan(ctx, rc),
    potion_hp: (ctx) => paintPotion(ctx, '#8e1226', '#ff5c6e'),
    potion_mp: (ctx) => paintPotion(ctx, '#123a8e', '#5c9bff'),
};

export function hasHiResIcon(type: string): boolean {
    return type in PAINTERS;
}

/**
 * Paint a 32x32 gear icon. Returns null for types without a hi-res painter so
 * the caller can fall back to (and upscale) the legacy 16px art.
 */
export function paintHiResIcon(type: string, rarity: Rarity): HTMLCanvasElement | null {
    const painter = PAINTERS[type];
    if (!painter) return null;

    const c = document.createElement('canvas');
    c.width = ICON_SIZE; c.height = ICON_SIZE;
    const ctx = c.getContext('2d')!;
    const m = METALS[rarity];
    const rc = GEMS[rarity];

    // High-rarity pieces sit in their own light
    if (m.aura) {
        const halo = rarity === 'mythic' ? 'rgba(255,60,100,0.38)'
            : rarity === 'epic' ? 'rgba(165,94,234,0.30)'
                : 'rgba(255,190,90,0.30)';
        const g = ctx.createRadialGradient(16, 16, 2, 16, 16, 17);
        g.addColorStop(0, halo);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, ICON_SIZE, ICON_SIZE);
        ctx.shadowColor = m.aura;
        ctx.shadowBlur = rarity === 'mythic' ? 7 : 5;
    } else if (rarity === 'rare') {
        ctx.shadowColor = 'rgba(90,160,240,0.7)';
        ctx.shadowBlur = 3;
    }

    // Contact shadow so icons don't float in the slot
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(16, 30, 9, 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    painter(ctx, m, rc);
    ctx.shadowBlur = 0;
    return c;
}
