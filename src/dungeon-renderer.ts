// ===== 2.5D DUNGEON RENDERER =====
// Biome-aware tile generation with depth effects, wall shadows, and atmospheric particles
// Keeps the cute pixel-art aesthetic with added dungeon depth

import type { DungeonFloor, PlayerState } from './types';
import { getBiome, type BiomeDef } from './biomes';

// ===== BIOME-TINTED TILE CACHE =====
const biomeTileCache: Record<string, Record<string, HTMLCanvasElement>> = {};

function createCanvas(w: number, h: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
}

function hexToRgb(hex: string): [number, number, number] {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
}

// blendColors removed (unused)

// ===== BIOME-AWARE FLOOR TILE =====
function generateBiomeFloor(biome: BiomeDef): HTMLCanvasElement {
    const c = createCanvas(16, 16);
    const ctx = c.getContext('2d')!;
    const fc = biome.floorColor;
    const [fr, fg, fb] = hexToRgb(fc);
    const darkR = Math.max(0, fr - 12);
    const darkG = Math.max(0, fg - 12);
    const darkB = Math.max(0, fb - 12);

    // Base fill
    ctx.fillStyle = `rgb(${darkR},${darkG},${darkB})`;
    ctx.fillRect(0, 0, 16, 16);

    // ===== FLOOR STYLE PATTERNS =====
    switch (biome.floorStyle) {
        case 'cobblestone': {
            // Irregular stone slabs with heavy grout
            const stones = [
                { x: 0, y: 0, w: 7, h: 7 },
                { x: 8, y: 0, w: 8, h: 8 },
                { x: 0, y: 8, w: 8, h: 8 },
                { x: 9, y: 9, w: 7, h: 7 },
            ];
            for (const s of stones) {
                const v = Math.floor(Math.random() * 18 - 10);
                ctx.fillStyle = `rgb(${clamp(darkR + v)},${clamp(darkG + v)},${clamp(darkB + v)})`;
                ctx.fillRect(s.x, s.y, s.w, s.h);
                ctx.fillStyle = 'rgba(255,255,255,0.04)';
                ctx.fillRect(s.x, s.y, s.w, 1);
                ctx.fillStyle = 'rgba(0,0,0,0.18)';
                ctx.fillRect(s.x, s.y + s.h - 1, s.w, 1);
                ctx.fillRect(s.x + s.w - 1, s.y, 1, s.h);
            }
            // Grout
            ctx.fillStyle = `rgb(${clamp(darkR - 35)},${clamp(darkG - 35)},${clamp(darkB - 35)})`;
            ctx.fillRect(0, 7, 16, 1);
            ctx.fillRect(7, 0, 1, 16);
            break;
        }
        case 'bone': {
            // Dusty cracked tiles with bone fragments
            for (let y = 0; y < 16; y += 8) {
                for (let x = 0; x < 16; x += 8) {
                    const v = Math.floor(Math.random() * 12 - 6);
                    ctx.fillStyle = `rgb(${clamp(darkR + v)},${clamp(darkG + v)},${clamp(darkB + v)})`;
                    ctx.fillRect(x, y, 8, 8);
                }
            }
            // Skull or bone fragment
            if (Math.random() > 0.6) {
                ctx.fillStyle = 'rgba(200,190,170,0.3)';
                const bx = 3 + Math.floor(Math.random() * 8);
                const by = 3 + Math.floor(Math.random() * 8);
                ctx.fillRect(bx, by, 3, 2); // bone
                ctx.fillRect(bx + 1, by - 1, 1, 1); // joint nub
            }
            // Deep cracks
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            if (Math.random() > 0.3) {
                const cx = Math.floor(Math.random() * 12) + 2;
                ctx.fillRect(cx, 2, 1, 5 + Math.floor(Math.random() * 6));
            }
            break;
        }
        case 'cave': {
            // Rough uneven cave floor — no clean lines
            for (let i = 0; i < 20; i++) {
                const rx = Math.floor(Math.random() * 14);
                const ry = Math.floor(Math.random() * 14);
                const rw = 2 + Math.floor(Math.random() * 4);
                const rh = 2 + Math.floor(Math.random() * 4);
                const v = Math.floor(Math.random() * 20 - 10);
                ctx.fillStyle = `rgb(${clamp(darkR + v)},${clamp(darkG + v)},${clamp(darkB + v)})`;
                ctx.fillRect(rx, ry, rw, rh);
            }
            // Dark pits/holes
            if (Math.random() > 0.7) {
                ctx.fillStyle = 'rgba(0,0,0,0.35)';
                const px = 4 + Math.floor(Math.random() * 8);
                const py = 4 + Math.floor(Math.random() * 8);
                ctx.fillRect(px, py, 2, 2);
            }
            break;
        }
        case 'ice': {
            // Smooth ice surface with frost cracks
            // Slightly brighter base for ice
            ctx.fillStyle = `rgb(${clamp(fr + 5)},${clamp(fg + 5)},${clamp(fb + 5)})`;
            ctx.fillRect(0, 0, 16, 16);
            // Subtle shine streaks
            ctx.fillStyle = 'rgba(255,255,255,0.08)';
            ctx.fillRect(2, 3, 12, 1);
            ctx.fillRect(4, 9, 8, 1);
            // Frost cracks (white/blue)
            if (Math.random() > 0.4) {
                ctx.fillStyle = 'rgba(116,185,255,0.3)';
                const cx = 3 + Math.floor(Math.random() * 8);
                const cy = 3 + Math.floor(Math.random() * 8);
                for (let i = 0; i < 4; i++) {
                    ctx.fillRect(cx + i, cy + Math.floor(Math.random() * 3) - 1, 1, 1);
                }
            }
            // Ice crystal patches
            if (Math.random() > 0.6) {
                ctx.fillStyle = 'rgba(200,220,255,0.2)';
                const ix = Math.floor(Math.random() * 10) + 2;
                const iy = Math.floor(Math.random() * 10) + 2;
                ctx.fillRect(ix, iy, 3, 3);
                ctx.fillStyle = 'rgba(255,255,255,0.12)';
                ctx.fillRect(ix + 1, iy, 1, 1);
            }
            break;
        }
        case 'mushroom': {
            // Earthy organic floor with fungal patches
            for (let y = 0; y < 16; y += 4) {
                for (let x = 0; x < 16; x += 4) {
                    const v = Math.floor(Math.random() * 15 - 8);
                    ctx.fillStyle = `rgb(${clamp(darkR + v)},${clamp(darkG + v)},${clamp(darkB + v)})`;
                    ctx.fillRect(x, y, 4, 4);
                }
            }
            // Glowing fungal spots
            if (Math.random() > 0.4) {
                const [pr, pg, pb] = hexToRgb(biome.particleColor);
                ctx.fillStyle = `rgba(${pr},${pg},${pb},0.25)`;
                const mx = 2 + Math.floor(Math.random() * 10);
                const my = 2 + Math.floor(Math.random() * 10);
                ctx.fillRect(mx, my, 2, 2);
                ctx.fillStyle = `rgba(${pr},${pg},${pb},0.4)`;
                ctx.fillRect(mx, my + 1, 1, 1); // brighter center
            }
            // Tiny mushroom
            if (Math.random() > 0.75) {
                ctx.fillStyle = 'rgba(0,184,148,0.3)';
                const sx = 4 + Math.floor(Math.random() * 8);
                const sy = 6 + Math.floor(Math.random() * 6);
                ctx.fillRect(sx, sy, 1, 2); // stem
                ctx.fillRect(sx - 1, sy - 1, 3, 1); // cap
            }
            break;
        }
        case 'lava': {
            // Cracked dark rock with glowing lava veins
            for (let y = 0; y < 16; y += 8) {
                for (let x = 0; x < 16; x += 8) {
                    const v = Math.floor(Math.random() * 10 - 5);
                    ctx.fillStyle = `rgb(${clamp(darkR + v)},${clamp(darkG + v)},${clamp(darkB + v)})`;
                    ctx.fillRect(x, y, 8, 8);
                }
            }
            // Glowing lava cracks
            ctx.fillStyle = 'rgba(255,100,50,0.35)';
            if (Math.random() > 0.3) {
                const cx = 1 + Math.floor(Math.random() * 12);
                const cy = 1 + Math.floor(Math.random() * 6);
                for (let i = 0; i < 5; i++) {
                    ctx.fillRect(cx + i, cy + Math.floor(Math.random() * 3), 1, 1);
                }
            }
            // Ember glow spots
            if (Math.random() > 0.6) {
                ctx.fillStyle = 'rgba(255,60,20,0.2)';
                const gx = 3 + Math.floor(Math.random() * 10);
                const gy = 3 + Math.floor(Math.random() * 10);
                ctx.fillRect(gx, gy, 2, 2);
                ctx.fillStyle = 'rgba(255,200,50,0.15)';
                ctx.fillRect(gx, gy, 1, 1);
            }
            break;
        }
        case 'crystal': {
            // Geometric glossy tiles with crystal veins
            ctx.fillStyle = `rgb(${clamp(darkR + 5)},${clamp(darkG + 5)},${clamp(darkB + 8)})`;
            ctx.fillRect(0, 0, 8, 8);
            ctx.fillRect(8, 8, 8, 8);
            ctx.fillStyle = `rgb(${clamp(darkR - 5)},${clamp(darkG - 5)},${clamp(darkB - 3)})`;
            ctx.fillRect(8, 0, 8, 8);
            ctx.fillRect(0, 8, 8, 8);
            // Crystal vein lines (glowing)
            const [pr, pg, pb] = hexToRgb(biome.particleColor);
            ctx.fillStyle = `rgba(${pr},${pg},${pb},0.25)`;
            ctx.fillRect(0, 7, 16, 1);
            ctx.fillRect(7, 0, 1, 16);
            // Sparkle points
            if (Math.random() > 0.5) {
                ctx.fillStyle = `rgba(${pr},${pg},${pb},0.5)`;
                ctx.fillRect(3 + Math.floor(Math.random() * 10), 3 + Math.floor(Math.random() * 10), 1, 1);
            }
            break;
        }
        case 'void': {
            // Nearly black with subtle corrupted edges
            ctx.fillStyle = `rgb(${clamp(darkR - 5)},${clamp(darkG - 5)},${clamp(darkB - 5)})`;
            ctx.fillRect(0, 0, 16, 16);
            // Warped patches
            for (let i = 0; i < 6; i++) {
                const v = Math.floor(Math.random() * 8);
                ctx.fillStyle = `rgb(${clamp(darkR + v)},${clamp(darkG + v)},${clamp(darkB + v)})`;
                ctx.fillRect(Math.floor(Math.random() * 12), Math.floor(Math.random() * 12), 3 + Math.floor(Math.random() * 3), 3 + Math.floor(Math.random() * 3));
            }
            // Ghostly wisps
            if (Math.random() > 0.6) {
                ctx.fillStyle = 'rgba(100,110,114,0.15)';
                const wy = Math.floor(Math.random() * 12);
                ctx.fillRect(0, wy, 16, 2);
            }
            break;
        }
        case 'gold': {
            // Ornate larger stone tiles with gold trim
            const stones = [
                { x: 0, y: 0, w: 8, h: 8 },
                { x: 8, y: 0, w: 8, h: 8 },
                { x: 0, y: 8, w: 8, h: 8 },
                { x: 8, y: 8, w: 8, h: 8 },
            ];
            for (const s of stones) {
                const v = Math.floor(Math.random() * 12 - 6);
                ctx.fillStyle = `rgb(${clamp(darkR + v)},${clamp(darkG + v)},${clamp(darkB + v)})`;
                ctx.fillRect(s.x, s.y, s.w, s.h);
            }
            // Gold-colored grout/trim
            ctx.fillStyle = 'rgba(253,203,110,0.2)';
            ctx.fillRect(0, 7, 16, 2);
            ctx.fillRect(7, 0, 2, 16);
            // Gold fleck
            if (Math.random() > 0.5) {
                ctx.fillStyle = 'rgba(253,203,110,0.4)';
                ctx.fillRect(2 + Math.floor(Math.random() * 10), 2 + Math.floor(Math.random() * 10), 1, 1);
            }
            // Coin on floor
            if (Math.random() > 0.7) {
                ctx.fillStyle = 'rgba(255,230,100,0.35)';
                const cx = 4 + Math.floor(Math.random() * 8);
                const cy = 4 + Math.floor(Math.random() * 8);
                ctx.fillRect(cx, cy, 2, 2);
                ctx.fillStyle = 'rgba(255,255,200,0.2)';
                ctx.fillRect(cx, cy, 1, 1);
            }
            break;
        }
        case 'abyss': {
            // Chaotic cracked obsidian with pulsing red
            for (let y = 0; y < 16; y += 4) {
                for (let x = 0; x < 16; x += 4) {
                    const v = Math.floor(Math.random() * 8 - 4);
                    ctx.fillStyle = `rgb(${clamp(darkR + v)},${clamp(darkG + v)},${clamp(darkB + v)})`;
                    ctx.fillRect(x, y, 4, 4);
                }
            }
            // Red cracks (many)
            ctx.fillStyle = 'rgba(231,76,60,0.3)';
            for (let i = 0; i < 3; i++) {
                const cx = Math.floor(Math.random() * 14);
                const cy = Math.floor(Math.random() * 14);
                ctx.fillRect(cx, cy, 1 + Math.floor(Math.random() * 3), 1);
                ctx.fillRect(cx, cy, 1, 1 + Math.floor(Math.random() * 3));
            }
            // Blood pool
            if (Math.random() > 0.75) {
                ctx.fillStyle = 'rgba(140,20,20,0.25)';
                const bx = 4 + Math.floor(Math.random() * 6);
                const by = 4 + Math.floor(Math.random() * 6);
                ctx.fillRect(bx, by, 3, 2);
                ctx.fillRect(bx + 1, by + 2, 2, 1);
            }
            break;
        }
    }

    // ===== BIOME-SPECIFIC DEBRIS =====
    drawDebris(ctx, biome, darkR, darkG, darkB);

    // Overall darkness pass
    ctx.fillStyle = 'rgba(0,0,0,0.06)';
    ctx.fillRect(0, 0, 16, 16);

    return c;
}

function clamp(v: number): number { return Math.min(255, Math.max(0, v)); }

function drawDebris(ctx: CanvasRenderingContext2D, biome: BiomeDef, _dr: number, _dg: number, _db: number): void {
    if (Math.random() > 0.5) return; // Not every tile has debris
    const [pr, pg, pb] = hexToRgb(biome.particleColor);
    const dx = 2 + Math.floor(Math.random() * 10);
    const dy = 2 + Math.floor(Math.random() * 10);

    switch (biome.debris) {
        case 'moss':
            // Green moss patch
            ctx.fillStyle = `rgba(${pr},${pg},${pb},0.25)`;
            ctx.fillRect(dx, dy, 2 + Math.floor(Math.random() * 2), 1);
            ctx.fillRect(dx + 1, dy + 1, 1, 1);
            break;
        case 'bones':
            // Bone white fragments
            ctx.fillStyle = 'rgba(210,200,180,0.3)';
            ctx.fillRect(dx, dy, 3, 1);
            ctx.fillRect(dx + 1, dy + 1, 1, 1);
            break;
        case 'webs':
            // Thin web strands
            ctx.fillStyle = 'rgba(200,200,220,0.2)';
            for (let i = 0; i < 4; i++) {
                ctx.fillRect(dx + i, dy + Math.floor(i * 0.7), 1, 1);
            }
            break;
        case 'ice_shards':
            // Small ice crystal
            ctx.fillStyle = 'rgba(180,220,255,0.3)';
            ctx.fillRect(dx, dy, 1, 2);
            ctx.fillRect(dx + 1, dy - 1, 1, 3);
            break;
        case 'spores':
            // Glowing spore dots
            ctx.fillStyle = `rgba(${pr},${pg},${pb},0.35)`;
            ctx.fillRect(dx, dy, 1, 1);
            ctx.fillRect(dx + 3, dy + 1, 1, 1);
            ctx.fillRect(dx + 1, dy + 3, 1, 1);
            break;
        case 'embers':
            // Glowing ember particles on floor
            ctx.fillStyle = 'rgba(255,100,30,0.3)';
            ctx.fillRect(dx, dy, 1, 1);
            ctx.fillStyle = 'rgba(255,200,50,0.2)';
            ctx.fillRect(dx + 2, dy + 1, 1, 1);
            break;
        case 'crystals':
            // Crystal shard sticking up
            ctx.fillStyle = `rgba(${pr},${pg},${pb},0.35)`;
            ctx.fillRect(dx, dy, 1, 3);
            ctx.fillRect(dx + 1, dy + 1, 1, 2);
            ctx.fillStyle = `rgba(${pr},${pg},${pb},0.5)`;
            ctx.fillRect(dx, dy, 1, 1);
            break;
        case 'smoke':
            // Wispy smoke mark
            ctx.fillStyle = 'rgba(100,110,114,0.12)';
            ctx.fillRect(dx, dy, 4, 1);
            ctx.fillRect(dx + 1, dy - 1, 2, 1);
            break;
        case 'coins':
            // Scattered gold coins
            ctx.fillStyle = 'rgba(255,230,100,0.35)';
            ctx.fillRect(dx, dy, 2, 2);
            if (Math.random() > 0.5) {
                ctx.fillRect(dx + 3, dy + 1, 2, 2);
            }
            break;
        case 'blood':
            // Blood splatters
            ctx.fillStyle = 'rgba(140,20,20,0.25)';
            ctx.fillRect(dx, dy, 2, 1);
            ctx.fillRect(dx + 1, dy + 1, 1, 2);
            ctx.fillRect(dx - 1, dy + 1, 1, 1);
            break;
    }
}

// ===== BIOME-AWARE WALL TILE (3D DEPTH) =====
function generateBiomeWall(biome: BiomeDef): HTMLCanvasElement {
    const c = createCanvas(16, 24); // Taller! Top 8px = top face, bottom 16px = front face
    const ctx = c.getContext('2d')!;
    const wc = biome.wallColor;
    const ac = biome.wallAccent;
    const [wr, wg, wb] = hexToRgb(wc);

    // Darken wall base
    const dwr = Math.max(0, wr - 8);
    const dwg = Math.max(0, wg - 8);
    const dwb = Math.max(0, wb - 8);

    // ===== TOP FACE (just slightly lighter than front) =====
    const topH = 8;
    ctx.fillStyle = `rgb(${Math.min(255, dwr + 20)},${Math.min(255, dwg + 20)},${Math.min(255, dwb + 20)})`;
    ctx.fillRect(0, 0, 16, topH);
    // Gradient darken towards front edge
    ctx.fillStyle = `rgb(${Math.min(255, dwr + 10)},${Math.min(255, dwg + 10)},${Math.min(255, dwb + 10)})`;
    ctx.fillRect(0, topH - 3, 16, 3);
    ctx.fillStyle = `rgb(${dwr},${dwg},${dwb})`;
    ctx.fillRect(0, topH - 1, 16, 1);
    // Top surface texture
    ctx.fillStyle = `rgba(0,0,0,0.12)`;
    ctx.fillRect(7, 0, 1, topH);
    ctx.fillRect(0, 3, 16, 1);
    // Subtle highlight at very top
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(1, 0, 14, 1);

    // ===== FRONT FACE =====
    ctx.fillStyle = `rgb(${dwr},${dwg},${dwb})`;
    ctx.fillRect(0, topH, 16, 16);

    // Brick pattern
    const bricks = [
        { x: 0, y: topH, w: 7, h: 4 },
        { x: 8, y: topH, w: 8, h: 4 },
        { x: 4, y: topH + 4, w: 7, h: 4 },
        { x: 0, y: topH + 4, w: 3, h: 4 },
        { x: 12, y: topH + 4, w: 4, h: 4 },
        { x: 0, y: topH + 8, w: 7, h: 4 },
        { x: 8, y: topH + 8, w: 8, h: 4 },
        { x: 4, y: topH + 12, w: 7, h: 4 },
        { x: 0, y: topH + 12, w: 3, h: 4 },
        { x: 12, y: topH + 12, w: 4, h: 4 },
    ];
    for (const b of bricks) {
        const v = Math.floor(Math.random() * 14 - 7);
        ctx.fillStyle = `rgb(${Math.min(255, Math.max(0, dwr + v))},${Math.min(255, Math.max(0, dwg + v))},${Math.min(255, Math.max(0, dwb + v))})`;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        // Very subtle top highlight
        ctx.fillStyle = `rgba(255,255,255,0.03)`;
        ctx.fillRect(b.x, b.y, b.w, 1);
        // Darker bottom/right
        ctx.fillStyle = `rgba(0,0,0,0.15)`;
        ctx.fillRect(b.x, b.y + b.h - 1, b.w, 1);
        ctx.fillRect(b.x + b.w - 1, b.y, 1, b.h);
    }

    // Deep mortar lines
    ctx.fillStyle = `rgba(0,0,0,0.3)`;
    ctx.fillRect(0, topH, 16, 1);
    ctx.fillRect(0, topH + 4, 16, 1);
    ctx.fillRect(0, topH + 8, 16, 1);
    ctx.fillRect(0, topH + 12, 16, 1);
    ctx.fillRect(7, topH, 1, 4);
    ctx.fillRect(4, topH + 4, 1, 4);
    ctx.fillRect(11, topH + 4, 1, 4);
    ctx.fillRect(7, topH + 8, 1, 4);
    ctx.fillRect(4, topH + 12, 1, 4);
    ctx.fillRect(11, topH + 12, 1, 4);

    // Edge shadows (heavy)
    ctx.fillStyle = `rgba(0,0,0,0.25)`;
    ctx.fillRect(0, topH, 1, 16);
    ctx.fillRect(15, topH, 1, 16);

    // Cracks (frequent)
    if (Math.random() > 0.3) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        const cx = 2 + Math.floor(Math.random() * 10);
        const cy = topH + 2 + Math.floor(Math.random() * 10);
        ctx.fillRect(cx, cy, 1, 2);
        ctx.fillRect(cx + 1, cy + 1, 1, 3);
        ctx.fillRect(cx + 2, cy + 3, 1, 2);
    }

    // Water stains / dripping (dark streak down wall)
    if (Math.random() > 0.65) {
        const sx = 3 + Math.floor(Math.random() * 10);
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(sx, topH + 2, 2, 12);
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(sx - 1, topH + 6, 1, 8);
    }

    // Biome accent (moss, bone, crystal embedded in wall)
    if (Math.random() > 0.5) {
        const [ar, ag, ab] = hexToRgb(ac);
        ctx.fillStyle = `rgba(${ar},${ag},${ab},0.18)`;
        const dx = 1 + Math.floor(Math.random() * 12);
        const dy = topH + 2 + Math.floor(Math.random() * 10);
        ctx.fillRect(dx, dy, 3, 2);
        ctx.fillRect(dx + 1, dy + 2, 2, 1);
    }

    // Bottom AO (heavy shadow where wall meets floor)
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, topH + 13, 16, 3);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0, topH + 11, 16, 2);

    return c;
}

// ===== WALL SHADOW / AMBIENT OCCLUSION OVERLAY =====
// Pre-render shadow overlays for floor tiles adjacent to walls
const wallShadowCache: Record<string, HTMLCanvasElement> = {};

function getWallShadow(dir: 'top' | 'left' | 'right' | 'bottom' | 'top-left' | 'top-right'): HTMLCanvasElement {
    if (wallShadowCache[dir]) return wallShadowCache[dir];

    const c = createCanvas(16, 16);
    const ctx = c.getContext('2d')!;

    switch (dir) {
        case 'top': {
            // Wall is above — cast heavy shadow downward
            const grad = ctx.createLinearGradient(0, 0, 0, 12);
            grad.addColorStop(0, 'rgba(0,0,0,0.5)');
            grad.addColorStop(0.4, 'rgba(0,0,0,0.2)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 16, 10);
            break;
        }
        case 'left': {
            const grad = ctx.createLinearGradient(0, 0, 10, 0);
            grad.addColorStop(0, 'rgba(0,0,0,0.35)');
            grad.addColorStop(0.5, 'rgba(0,0,0,0.12)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 8, 16);
            break;
        }
        case 'right': {
            const grad = ctx.createLinearGradient(16, 0, 6, 0);
            grad.addColorStop(0, 'rgba(0,0,0,0.35)');
            grad.addColorStop(0.5, 'rgba(0,0,0,0.12)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(8, 0, 8, 16);
            break;
        }
        case 'bottom': {
            const grad = ctx.createLinearGradient(0, 16, 0, 10);
            grad.addColorStop(0, 'rgba(0,0,0,0.15)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 10, 16, 6);
            break;
        }
        case 'top-left': {
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(0, 0, 5, 5);
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(0, 0, 8, 8);
            break;
        }
        case 'top-right': {
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(11, 0, 5, 5);
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(8, 0, 8, 8);
            break;
        }
    }

    wallShadowCache[dir] = c;
    return c;
}

// ===== BIOME TILE GETTER =====
export function getBiomeTiles(biome: BiomeDef): Record<string, HTMLCanvasElement> {
    if (biomeTileCache[biome.name]) return biomeTileCache[biome.name];

    const tiles: Record<string, HTMLCanvasElement> = {};
    tiles.floor = generateBiomeFloor(biome);
    tiles.wall = generateBiomeWall(biome);
    tiles.door = generateBiomeDoor(biome);
    tiles.stairsDown = generateBiomeStairs(biome, true);
    tiles.stairsUp = generateBiomeStairs(biome, false);

    biomeTileCache[biome.name] = tiles;
    return tiles;
}

// ===== BIOME DOOR =====
function generateBiomeDoor(biome: BiomeDef): HTMLCanvasElement {
    const c = createCanvas(16, 16);
    const ctx = c.getContext('2d')!;
    const wc = biome.wallColor;
    const ac = biome.wallAccent;

    // Stone frame
    ctx.fillStyle = wc;
    ctx.fillRect(0, 0, 16, 16);
    // Door opening (dark)
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(2, 1, 12, 14);
    // Wooden door
    const [ar, ag, ab] = hexToRgb(ac);
    ctx.fillStyle = `rgb(${Math.floor(ar * 0.6 + 60)},${Math.floor(ag * 0.4 + 40)},${Math.floor(ab * 0.2 + 20)})`;
    ctx.fillRect(3, 2, 10, 12);
    // Wood grain
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.fillRect(5, 2, 1, 12);
    ctx.fillRect(10, 2, 1, 12);
    // Iron bands
    ctx.fillStyle = '#78909c';
    ctx.fillRect(3, 4, 10, 2);
    ctx.fillRect(3, 9, 10, 2);
    // Rivets
    ctx.fillStyle = '#b0bec5';
    ctx.fillRect(4, 4, 1, 1);
    ctx.fillRect(11, 4, 1, 1);
    ctx.fillRect(4, 9, 1, 1);
    ctx.fillRect(11, 9, 1, 1);
    // Handle
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(10, 6, 2, 2);
    // Arch top highlight
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(3, 1, 10, 1);
    // Bottom shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(3, 13, 10, 1);

    return c;
}

// ===== BIOME STAIRS =====
function generateBiomeStairs(biome: BiomeDef, down: boolean): HTMLCanvasElement {
    const c = createCanvas(16, 16);
    const ctx = c.getContext('2d')!;
    const wc = biome.wallColor;
    const fc = biome.floorColor;
    const [wr, wg, wb] = hexToRgb(wc);

    // Dark cavity
    ctx.fillStyle = down ? '#0a0808' : fc;
    ctx.fillRect(0, 0, 16, 16);

    const steps = 5;
    const stepH = Math.floor(16 / steps);
    for (let i = 0; i < steps; i++) {
        const y = i * stepH;
        const shade = down ? (0.4 + i * 0.14) : (1.0 - i * 0.14);
        const r = Math.floor(wr * shade);
        const g = Math.floor(wg * shade);
        const b = Math.floor(wb * shade);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(3, y, 10, stepH - 1);
        ctx.fillStyle = `rgba(255,255,255,${0.04 + (down ? i * 0.02 : (4 - i) * 0.02)})`;
        ctx.fillRect(3, y, 10, 1);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(3, y + stepH - 1, 10, 1);
    }

    // Side walls
    ctx.fillStyle = wc;
    ctx.fillRect(0, 0, 3, 16);
    ctx.fillRect(13, 0, 3, 16);
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(2, 0, 1, 16);
    ctx.fillRect(13, 0, 1, 16);

    // Direction arrow
    ctx.fillStyle = down ? '#e74c3c' : '#2ecc71';
    if (down) {
        ctx.fillRect(7, 12, 2, 1);
        ctx.fillRect(6, 11, 1, 1);
        ctx.fillRect(9, 11, 1, 1);
        // Glow
        ctx.fillStyle = down ? 'rgba(231,76,60,0.3)' : 'rgba(46,204,113,0.3)';
        ctx.fillRect(5, 10, 6, 4);
    } else {
        ctx.fillRect(7, 2, 2, 1);
        ctx.fillRect(6, 3, 1, 1);
        ctx.fillRect(9, 3, 1, 1);
        ctx.fillStyle = 'rgba(46,204,113,0.3)';
        ctx.fillRect(5, 1, 6, 4);
    }

    return c;
}

// ===== ATMOSPHERIC PARTICLES =====
interface DungeonParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    alpha: number;
    life: number;
    maxLife: number;
    color: string;
    type: 'dust' | 'fog' | 'ember' | 'crystal';
}

let dungeonParticles: DungeonParticle[] = [];
const MAX_DUNGEON_PARTICLES = 60;

export function updateDungeonParticles(dt: number, player: PlayerState, floor: DungeonFloor): void {
    if (floor.isTown) return; // Skip in town

    const biome = getBiome(player.floor);

    // Spawn new particles occasionally
    if (dungeonParticles.length < MAX_DUNGEON_PARTICLES && Math.random() < 0.15) {
        const type = getParticleType(biome);
        const px = player.px + (Math.random() - 0.5) * 320;
        const py = player.py + (Math.random() - 0.5) * 240;

        dungeonParticles.push({
            x: px,
            y: py,
            vx: (Math.random() - 0.5) * (type === 'fog' ? 8 : 3),
            vy: type === 'ember' ? -Math.random() * 15 - 5 :
                type === 'dust' ? (Math.random() - 0.5) * 4 :
                    (Math.random() - 0.5) * 6,
            size: type === 'fog' ? 4 + Math.random() * 6 :
                type === 'crystal' ? 1 + Math.random() * 2 :
                    1 + Math.random() * 2,
            alpha: type === 'fog' ? 0.04 + Math.random() * 0.06 :
                type === 'crystal' ? 0.3 + Math.random() * 0.5 :
                    0.1 + Math.random() * 0.2,
            life: 1,
            maxLife: type === 'fog' ? 4 + Math.random() * 4 :
                type === 'crystal' ? 2 + Math.random() * 3 :
                    2 + Math.random() * 3,
            color: biome.particleColor,
            type,
        });
    }

    // Update existing particles
    for (let i = dungeonParticles.length - 1; i >= 0; i--) {
        const p = dungeonParticles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt / p.maxLife;

        if (p.type === 'ember') {
            p.vx += (Math.random() - 0.5) * 2 * dt;
            p.alpha = Math.max(0, p.life * 0.5);
        }

        if (p.life <= 0) {
            dungeonParticles[i] = dungeonParticles[dungeonParticles.length - 1];
            dungeonParticles.pop();
        }
    }
}

function getParticleType(biome: BiomeDef): 'dust' | 'fog' | 'ember' | 'crystal' {
    const name = biome.name.toLowerCase();
    if (name.includes('volcanic') || name.includes('dragon') || name.includes('abyss')) return 'ember';
    if (name.includes('crystal')) return 'crystal';
    if (name.includes('shadow') || name.includes('spider')) return 'fog';
    return Math.random() > 0.3 ? 'dust' : 'fog';
}

export function renderDungeonParticles(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    for (const p of dungeonParticles) {
        const sx = p.x - camX;
        const sy = p.y - camY;
        const alpha = Math.max(0, p.alpha * p.life);

        ctx.globalAlpha = alpha;

        if (p.type === 'crystal') {
            // Sparkle effect
            const [r, g, b] = hexToRgb(p.color);
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            const sparkle = Math.sin(performance.now() * 0.01 + p.x * 0.1) * 0.5 + 0.5;
            ctx.globalAlpha = alpha * sparkle;
            ctx.fillRect(sx - 1, sy, 3, 1);
            ctx.fillRect(sx, sy - 1, 1, 3);
        } else if (p.type === 'fog') {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
            ctx.fill();
        } else if (p.type === 'ember') {
            ctx.fillStyle = p.color;
            ctx.fillRect(sx, sy, p.size, p.size);
            // Glow
            ctx.fillStyle = p.color;
            ctx.globalAlpha = alpha * 0.3;
            ctx.fillRect(sx - 1, sy - 1, p.size + 2, p.size + 2);
        } else {
            ctx.fillStyle = p.color;
            ctx.fillRect(sx, sy, p.size, p.size);
        }
    }
    ctx.globalAlpha = 1;
}

// ===== TORCH LIGHT SOURCES =====
// Detect wall positions that could have torches (walls adjacent to floor)
export function findTorchPositions(floor: DungeonFloor): { x: number; y: number }[] {
    const torches: { x: number; y: number }[] = [];
    const { tiles, width, height } = floor;

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            if (tiles[y][x] !== 'WALL') continue;
            // Wall with floor below it — potential torch spot
            if (tiles[y + 1]?.[x] === 'FLOOR' || tiles[y + 1]?.[x] === 'DOOR') {
                // Sparse placement
                if ((x + y * 7) % 5 === 0) {
                    torches.push({ x, y });
                }
            }
        }
    }
    return torches;
}

// ===== RENDER WALL SHADOWS ON FLOOR =====
export function renderWallShadows(
    ctx: CanvasRenderingContext2D,
    floor: DungeonFloor,
    camX: number,
    camY: number,
    tileSize: number,
    startX: number,
    startY: number,
    endX: number,
    endY: number
): void {
    const { tiles, explored, width } = floor;

    for (let y = startY; y < endY; y++) {
        if (!explored[y]) continue;
        for (let x = startX; x < endX; x++) {
            if (!explored[y][x]) continue;
            const tile = tiles[y][x];
            // Only add shadows to walkable tiles
            if (tile === 'WALL' || tile === 'TREE' || tile === 'BUILDING') continue;

            const sx = x * tileSize - camX;
            const sy = y * tileSize - camY;

            // Check adjacent walls and draw edge shadow
            if (y > 0 && tiles[y - 1][x] === 'WALL') {
                ctx.drawImage(getWallShadow('top'), sx, sy, tileSize, tileSize);
            }
            if (x > 0 && tiles[y][x - 1] === 'WALL') {
                ctx.drawImage(getWallShadow('left'), sx, sy, tileSize, tileSize);
            }
            if (x < width - 1 && tiles[y][x + 1] === 'WALL') {
                ctx.drawImage(getWallShadow('right'), sx, sy, tileSize, tileSize);
            }
            // Corner shadows
            if (y > 0 && x > 0 && tiles[y - 1][x] === 'WALL' && tiles[y][x - 1] === 'WALL') {
                ctx.drawImage(getWallShadow('top-left'), sx, sy, tileSize, tileSize);
            }
            if (y > 0 && x < width - 1 && tiles[y - 1][x] === 'WALL' && tiles[y][x + 1] === 'WALL') {
                ctx.drawImage(getWallShadow('top-right'), sx, sy, tileSize, tileSize);
            }
        }
    }
}

// ===== RENDER 3D WALLS (Upper portion) =====
// Walls are rendered taller than one tile — the "top face" extends above
export function renderWallTops(
    ctx: CanvasRenderingContext2D,
    floor: DungeonFloor,
    biome: BiomeDef,
    camX: number,
    camY: number,
    tileSize: number,
    startX: number,
    startY: number,
    endX: number,
    endY: number
): void {
    const { tiles, explored, height } = floor;
    const biomeTiles = getBiomeTiles(biome);
    const wallSprite = biomeTiles.wall; // 16x24 sprite

    for (let y = startY; y < endY; y++) {
        if (!explored[y]) continue;
        for (let x = startX; x < endX; x++) {
            if (!explored[y][x]) continue;
            if (tiles[y][x] !== 'WALL' && tiles[y][x] !== 'SECRET_WALL') continue;

            const sx = x * tileSize - camX;
            const sy = y * tileSize - camY;

            // Check if the tile below is visible floor (so we show the front face)
            const hasFrontFace = y + 1 < height &&
                tiles[y + 1]?.[x] !== 'WALL' &&
                tiles[y + 1]?.[x] !== 'SECRET_WALL' &&
                explored[y + 1]?.[x];

            if (hasFrontFace) {
                // Draw the full 3D wall: top face extends above, front face at normal position
                // The wall sprite is 16x24 — top 8px is "top face", bottom 16px is "front face"
                // We position the front face at the tile's location
                // The top face extends 8px (scaled) above
                const wallHeight = tileSize * 1.5; // 24/16 * tileSize
                const topOffset = tileSize * 0.5; // 8/16 * tileSize
                ctx.drawImage(wallSprite, sx, sy - topOffset, tileSize, wallHeight);
            } else {
                // Interior wall — just show the top face portion
                ctx.drawImage(wallSprite, 0, 0, 16, 8, sx, sy, tileSize, tileSize);
            }
        }
    }
}

// ===== RENDER TORCH GLOW =====
export function renderTorchGlows(
    ctx: CanvasRenderingContext2D,
    torches: { x: number; y: number }[],
    biome: BiomeDef,
    camX: number,
    camY: number,
    tileSize: number,
    canvasW: number,
    canvasH: number
): void {
    const frameTime = performance.now();
    const [pr, pg, pb] = hexToRgb(biome.particleColor);

    // Mix torch color with particle color for biome flavor
    const tr = Math.floor(255 * 0.6 + pr * 0.4);
    const tg = Math.floor(180 * 0.6 + pg * 0.4);
    const tb = Math.floor(80 * 0.4 + pb * 0.6);

    for (const torch of torches) {
        const sx = torch.x * tileSize - camX + tileSize / 2;
        const sy = torch.y * tileSize - camY + tileSize;

        // Skip offscreen
        if (sx < -60 || sx > canvasW + 60 || sy < -60 || sy > canvasH + 60) continue;

        const flicker = 0.7 + Math.sin(frameTime * 0.005 + torch.x * 3 + torch.y * 7) * 0.15
            + Math.sin(frameTime * 0.013 + torch.x * 11) * 0.1;
        const radius = tileSize * 2.5 * flicker;

        const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius);
        gradient.addColorStop(0, `rgba(${tr},${tg},${tb},0.12)`);
        gradient.addColorStop(0.4, `rgba(${tr},${tg},${tb},0.05)`);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(sx - radius, sy - radius, radius * 2, radius * 2);

        // Tiny flame sprite on the wall
        const flameH = 3 + Math.sin(frameTime * 0.01 + torch.x) * 1;
        ctx.fillStyle = `rgba(${tr},${tg},${Math.min(255, tb + 80)},0.8)`;
        ctx.fillRect(sx - 1, sy - flameH - 2, 3, flameH);
        ctx.fillStyle = `rgba(255,255,200,0.9)`;
        ctx.fillRect(sx, sy - flameH - 1, 1, flameH - 1);
    }
}

// ===== BIOME AMBIENT OVERLAY =====
export function renderBiomeAmbient(
    ctx: CanvasRenderingContext2D,
    biome: BiomeDef,
    width: number,
    height: number
): void {
    if (biome.ambientAlpha <= 0) return;
    // Double-strength ambient for moodier dungeon feel
    const alpha = Math.min(0.25, biome.ambientAlpha * 1.8);
    ctx.fillStyle = `rgba(${biome.ambientColor},${alpha})`;
    ctx.fillRect(0, 0, width, height);
    // Additional overall darkness
    ctx.fillStyle = 'rgba(0,0,0,0.04)';
    ctx.fillRect(0, 0, width, height);
}

// ===== CLEAR DUNGEON PARTICLES ON FLOOR CHANGE =====
export function clearDungeonParticles(): void {
    dungeonParticles = [];
}
