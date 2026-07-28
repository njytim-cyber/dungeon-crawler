// ===== BOSS ARENAS =====
// Every boss floor ends in a purpose-built chamber: a sealed gate, themed
// flooring, pillars, braziers and a per-boss hazard set. This module owns the
// arena's data model, its tile art and the live fight state machine.

import type { DungeonFloor, PlayerState, EnemyState, Position } from './types';
import type { BossDef } from './bosses';
import { getBossDef } from './bosses';
import { addFloatingText, spawnHitParticles, spawnParticles } from './particles';
import { GameAudio } from './audio';

// ===================================================================
// DATA MODEL
// ===================================================================

export interface ArenaDecor {
    pillars: Position[];
    braziers: Position[];
}

export interface ArenaData {
    /** Interior bounds (walkable region), inclusive of x..x+w-1 */
    x: number; y: number; w: number; h: number;
    /** Tiles that form the entrance portcullis */
    gate: Position[];
    bossFloor: number;
    decor: ArenaDecor;
    sealed: boolean;
    cleared: boolean;
    /** Ramps up 0 -> 1 when the fight starts, drives the intro flourish */
    introTimer: number;
}

export type HazardKind = 'pool' | 'web' | 'ice' | 'lava' | 'spore' | 'shock' | 'impact';

export interface Hazard {
    x: number; y: number;
    kind: HazardKind;
    /** Seconds before it becomes live — draws as a telegraph ring */
    telegraph: number;
    life: number;
    maxLife: number;
    dmg: number;
    color: string;
    tick: number;
}

export interface BossProjectile {
    /** Position in TILE units (fractional) — resolution independent */
    px: number; py: number;
    /** Velocity in tiles per second */
    vx: number; vy: number;
    life: number;
    dmg: number;
    color: string;
    /** Radius as a fraction of one tile */
    size: number;
    /** 'orb' is a slower bolt, 'shard' is fast and pointed, 'flame' burns out */
    kind: 'orb' | 'shard' | 'flame';
}

export interface BossFightState {
    def: BossDef;
    phase: number;          // 1, 2 or 3
    castTimer: number;
    /** Ability index rotation so casts feel choreographed, not random */
    rotation: number;
    /** Damage-reduction window from `shield` */
    shieldTimer: number;
    /** Telegraphed charge, in tiles */
    charge: { dx: number; dy: number; timer: number; active: boolean } | null;
    splitsLeft: number;
    summonsAlive: number;
    hazards: Hazard[];
    projectiles: BossProjectile[];
    /** Shockwave rings purely for show */
    rings: { x: number; y: number; r: number; maxR: number; color: string }[];
    started: boolean;
    /** Seconds since the boss died — drives the victory flourish */
    victoryTimer: number;
}

// ===================================================================
// ARENA CARVING
// ===================================================================

/**
 * Carve a boss arena onto a freshly generated floor. The map is grown
 * downward so the chamber never collides with BSP rooms, then linked to the
 * deepest room with a corridor that ends at a portcullis.
 */
export function carveBossArena(
    floor: DungeonFloor,
    bossFloorNum: number,
    rng: () => number,
): ArenaData | null {
    const def = getBossDef(bossFloorNum);
    if (!def) return null;

    const aw = def.arenaW;
    const ah = def.arenaH;
    const corridorLen = 4;
    // Grow the map: 1 wall row + corridor + 1 wall row + arena + 2 wall rows
    const extraH = corridorLen + ah + 4;
    const oldH = floor.height;
    const newH = oldH + extraH;

    // Widen if the arena does not fit
    const newW = Math.max(floor.width, aw + 6);
    const growX = newW - floor.width;

    // Pad every existing row to the new width
    for (let y = 0; y < oldH; y++) {
        for (let i = 0; i < growX; i++) {
            floor.tiles[y].push('WALL');
            floor.explored[y].push(false);
            floor.visible[y].push(false);
        }
    }
    // Append the new rows
    for (let y = oldH; y < newH; y++) {
        floor.tiles[y] = Array(newW).fill('WALL');
        floor.explored[y] = Array(newW).fill(false);
        floor.visible[y] = Array(newW).fill(false);
    }
    floor.width = newW;
    floor.height = newH;

    // --- Arena bounds ---
    const ax = Math.floor((newW - aw) / 2);
    const ay = oldH + corridorLen + 1;

    for (let y = ay; y < ay + ah; y++) {
        for (let x = ax; x < ax + aw; x++) {
            floor.tiles[y][x] = 'ARENA_FLOOR';
        }
    }

    // --- Corridor from the deepest room down into the arena ---
    // Anchor at the previous stairs-down position so the path is always reachable.
    const anchor = floor.stairsDown;
    const gateX = ax + Math.floor(aw / 2);
    const joinY = oldH - 1;

    // Drop from the deepest room to the old map's last row
    for (let y = anchor.y; y <= joinY; y++) {
        if (floor.tiles[y][anchor.x] === 'WALL') floor.tiles[y][anchor.x] = 'FLOOR';
    }
    // Run across that row to sit above the gate
    const fromX = Math.min(anchor.x, gateX);
    const toX = Math.max(anchor.x, gateX);
    for (let x = fromX; x <= toX; x++) {
        if (floor.tiles[joinY][x] === 'WALL') floor.tiles[joinY][x] = 'FLOOR';
    }
    // Descend into the arena mouth
    for (let y = joinY; y < ay; y++) {
        floor.tiles[y][gateX] = 'FLOOR';
        floor.tiles[y][gateX - 1] = 'FLOOR';
    }

    // --- Portcullis: a 3-wide gate at the arena's north wall ---
    const gate: Position[] = [];
    for (let gx = gateX - 1; gx <= gateX + 1; gx++) {
        if (gx <= ax || gx >= ax + aw - 1) continue;
        floor.tiles[ay - 1][gx] = 'BOSS_GATE';
        gate.push({ x: gx, y: ay - 1 });
        // Make sure the approach tile is open
        floor.tiles[ay - 2][gx] = 'FLOOR';
    }

    // --- Décor: pillars in a symmetric ring, braziers on the walls ---
    const pillars: Position[] = [];
    const braziers: Position[] = [];
    const insetX = 3, insetY = 3;
    const pxs = [ax + insetX, ax + aw - 1 - insetX];
    const pys = [ay + insetY, ay + ah - 1 - insetY];
    for (const px of pxs) {
        for (const py of pys) {
            floor.tiles[py][px] = 'PILLAR';
            pillars.push({ x: px, y: py });
        }
    }
    // Larger arenas get a second pair on the mid-line
    if (aw >= 21) {
        for (const py of pys) {
            const mx = ax + Math.floor(aw / 2);
            floor.tiles[py][mx] = 'PILLAR';
            pillars.push({ x: mx, y: py });
        }
    }
    // Braziers hug the side walls, framing the chamber
    for (const bx of [ax + 1, ax + aw - 2]) {
        for (const by of [ay + 1, ay + Math.floor(ah / 2), ay + ah - 2]) {
            braziers.push({ x: bx, y: by });
        }
    }

    // --- Stairs down move to the arena's far wall, behind the boss ---
    const oldStairs = floor.stairsDown;
    if (floor.tiles[oldStairs.y]?.[oldStairs.x] === 'STAIRS_DOWN') {
        floor.tiles[oldStairs.y][oldStairs.x] = 'FLOOR';
    }
    const sx = ax + Math.floor(aw / 2);
    const sy = ay + ah - 2;
    floor.tiles[sy][sx] = 'STAIRS_DOWN';
    floor.stairsDown = { x: sx, y: sy };

    // --- Reposition the boss to the arena centre ---
    const bcx = ax + Math.floor(aw / 2);
    const bcy = ay + Math.floor(ah / 2) - 1;
    const boss = floor.enemies.find(e => e.isBoss);
    if (boss) {
        boss.x = bcx; boss.y = bcy;
        boss.px = bcx * 16; boss.py = bcy * 16;
        boss.aggroRange = Math.max(aw, ah);
    }
    // Clear any wandering mobs out of the arena so the fight starts clean
    floor.enemies = floor.enemies.filter(e =>
        e.isBoss || !(e.x >= ax && e.x < ax + aw && e.y >= ay && e.y < ay + ah)
    );

    // Nudge décor off the boss / stairs
    for (const p of pillars) {
        if (p.x === bcx && p.y === bcy) floor.tiles[p.y][p.x] = 'ARENA_FLOOR';
    }

    // A reward chest tucked in each far corner
    for (const cx of [ax + 2, ax + aw - 3]) {
        const cy = ay + ah - 3;
        if (floor.tiles[cy][cx] === 'ARENA_FLOOR') {
            floor.tiles[cy][cx] = 'CHEST';
            floor.chests.push({ x: cx, y: cy, opened: false });
        }
    }
    void rng;

    return {
        x: ax, y: ay, w: aw, h: ah,
        gate, bossFloor: bossFloorNum,
        decor: { pillars, braziers },
        sealed: false, cleared: false, introTimer: 0,
    };
}

export function isInsideArena(arena: ArenaData, x: number, y: number): boolean {
    return x >= arena.x && x < arena.x + arena.w && y >= arena.y && y < arena.y + arena.h;
}

// ===================================================================
// TILE ART (cached per boss)
// ===================================================================

const tileCache: Record<string, Record<string, HTMLCanvasElement>> = {};

function mk(w = 16, h = w): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return [c, c.getContext('2d')!];
}

function shade(hex: string, amt: number): string {
    const r = Math.min(255, Math.max(0, parseInt(hex.slice(1, 3), 16) + amt));
    const g = Math.min(255, Math.max(0, parseInt(hex.slice(3, 5), 16) + amt));
    const b = Math.min(255, Math.max(0, parseInt(hex.slice(5, 7), 16) + amt));
    return `rgb(${r},${g},${b})`;
}

function paintArenaFloor(def: BossDef): HTMLCanvasElement {
    const [c, ctx] = mk();
    const a = def.arena;
    // Polished slab base
    ctx.fillStyle = a.floor;
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = shade(a.floor, 10);
    ctx.fillRect(1, 1, 14, 14);
    ctx.fillStyle = shade(a.floor, -14);
    ctx.fillRect(1, 13, 14, 2);
    ctx.fillRect(13, 1, 2, 13);
    ctx.fillStyle = a.inlay;
    ctx.fillRect(0, 0, 16, 1); ctx.fillRect(0, 0, 1, 16);

    switch (a.pattern) {
        case 'sigil':
            ctx.strokeStyle = a.glow; ctx.globalAlpha = 0.22;
            ctx.beginPath(); ctx.arc(8, 8, 5, 0, Math.PI * 2); ctx.stroke();
            break;
        case 'ossuary':
            ctx.fillStyle = shade(a.floor, 26);
            ctx.fillRect(3, 6, 8, 2); ctx.fillRect(2, 5, 2, 4); ctx.fillRect(10, 5, 2, 4);
            break;
        case 'web':
            ctx.strokeStyle = 'rgba(230,220,255,0.16)';
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(16, 16); ctx.moveTo(16, 0); ctx.lineTo(0, 16); ctx.stroke();
            ctx.beginPath(); ctx.arc(8, 8, 5, 0, Math.PI * 2); ctx.stroke();
            break;
        case 'glacier':
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath(); ctx.moveTo(2, 12); ctx.lineTo(7, 4); ctx.lineTo(13, 10); ctx.stroke();
            ctx.fillStyle = 'rgba(120,200,255,0.18)'; ctx.fillRect(2, 2, 6, 5);
            break;
        case 'grove':
            ctx.fillStyle = a.glow; ctx.globalAlpha = 0.2;
            ctx.beginPath(); ctx.arc(5, 11, 2.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(12, 5, 1.8, 0, Math.PI * 2); ctx.fill();
            break;
        case 'forge':
            ctx.fillStyle = a.glow; ctx.globalAlpha = 0.3;
            ctx.fillRect(0, 7, 16, 1); ctx.fillRect(7, 0, 1, 16);
            ctx.globalAlpha = 0.14; ctx.fillRect(6, 6, 4, 4);
            break;
        case 'prism':
            ctx.strokeStyle = a.glow; ctx.globalAlpha = 0.3;
            ctx.beginPath(); ctx.moveTo(8, 2); ctx.lineTo(14, 8); ctx.lineTo(8, 14); ctx.lineTo(2, 8); ctx.closePath(); ctx.stroke();
            break;
        case 'void':
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.beginPath(); ctx.arc(8, 8, 6, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = a.glow; ctx.globalAlpha = 0.2;
            ctx.beginPath(); ctx.arc(8, 8, 6, 0, Math.PI * 2); ctx.stroke();
            break;
        case 'hoard':
            ctx.fillStyle = '#e8b33d'; ctx.globalAlpha = 0.35;
            ctx.fillRect(3, 11, 3, 2); ctx.fillRect(9, 4, 3, 2); ctx.fillRect(11, 12, 2, 2);
            break;
        case 'abyss':
            ctx.strokeStyle = a.glow; ctx.globalAlpha = 0.25;
            ctx.beginPath(); ctx.moveTo(1, 8); ctx.lineTo(8, 1); ctx.lineTo(15, 8); ctx.lineTo(8, 15); ctx.closePath(); ctx.stroke();
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#000'; ctx.fillRect(7, 7, 2, 2);
            break;
    }
    ctx.globalAlpha = 1;
    return c;
}

/** A 2-tile-tall column; the upper half floats above the tile like the 3D walls. */
function paintPillar(def: BossDef): HTMLCanvasElement {
    const [c, ctx] = mk(16, 32);
    const a = def.arena;
    const p = def.palette;
    const base = a.pillar;

    const col = (y: number, h: number, fill: string) => { ctx.fillStyle = fill; ctx.fillRect(3, y, 10, h); };

    switch (base) {
        case 'bone':
            col(4, 28, '#cdc2a4');
            ctx.fillStyle = '#9d9376'; ctx.fillRect(3, 4, 3, 28);
            ctx.fillStyle = '#efe7cf'; ctx.fillRect(11, 4, 2, 28);
            for (let i = 0; i < 5; i++) { ctx.fillStyle = '#8c8268'; ctx.fillRect(3, 7 + i * 5, 10, 1); }
            ctx.fillStyle = '#e8dcc0'; ctx.fillRect(1, 0, 14, 5);
            break;
        case 'ice':
            col(2, 30, '#9ed3ee');
            ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(5, 2, 3, 30);
            ctx.fillStyle = 'rgba(60,120,170,0.5)'; ctx.fillRect(11, 2, 2, 30);
            ctx.fillStyle = '#dff2ff';
            ctx.beginPath(); ctx.moveTo(3, 4); ctx.lineTo(8, -4); ctx.lineTo(13, 4); ctx.closePath(); ctx.fill();
            break;
        case 'silk':
            ctx.fillStyle = '#3c2f52'; ctx.fillRect(4, 4, 8, 28);
            ctx.strokeStyle = 'rgba(230,220,255,0.5)';
            for (let i = 0; i < 7; i++) {
                ctx.beginPath(); ctx.moveTo(1, 4 + i * 4); ctx.quadraticCurveTo(8, 8 + i * 4, 15, 4 + i * 4); ctx.stroke();
            }
            break;
        case 'fungal':
            col(10, 22, '#d8cfae');
            ctx.fillStyle = '#b8ae8c'; ctx.fillRect(3, 10, 3, 22);
            ctx.fillStyle = p.primary;
            ctx.beginPath(); ctx.ellipse(8, 10, 9, 7, 0, Math.PI, 0); ctx.fill();
            ctx.fillStyle = p.light;
            ctx.beginPath(); ctx.arc(5, 6, 2, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(11, 7, 1.5, 0, Math.PI * 2); ctx.fill();
            break;
        case 'basalt':
            col(2, 30, '#2f2321');
            ctx.fillStyle = '#452e28'; ctx.fillRect(3, 2, 4, 30);
            ctx.fillStyle = a.glow; ctx.globalAlpha = 0.7;
            ctx.fillRect(8, 6, 1, 24); ctx.fillRect(6, 12, 1, 10);
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#1c1210'; ctx.fillRect(1, 0, 14, 4);
            break;
        case 'crystal':
            ctx.fillStyle = p.secondary;
            ctx.beginPath(); ctx.moveTo(8, -2); ctx.lineTo(14, 12); ctx.lineTo(11, 32); ctx.lineTo(5, 32); ctx.lineTo(2, 12); ctx.closePath(); ctx.fill();
            ctx.fillStyle = p.light; ctx.globalAlpha = 0.6;
            ctx.beginPath(); ctx.moveTo(8, -2); ctx.lineTo(11, 12); ctx.lineTo(8, 32); ctx.closePath(); ctx.fill();
            ctx.globalAlpha = 1;
            break;
        case 'obelisk':
            ctx.fillStyle = '#12121c';
            ctx.beginPath(); ctx.moveTo(8, -2); ctx.lineTo(13, 8); ctx.lineTo(13, 32); ctx.lineTo(3, 32); ctx.lineTo(3, 8); ctx.closePath(); ctx.fill();
            ctx.fillStyle = a.glow; ctx.globalAlpha = 0.65;
            ctx.fillRect(7, 10, 2, 18);
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#26263a'; ctx.fillRect(3, 8, 2, 24);
            break;
        case 'gilded':
            col(2, 30, '#6b5230');
            ctx.fillStyle = '#e8b33d'; ctx.fillRect(3, 2, 3, 30);
            ctx.fillStyle = '#8a6a3c'; ctx.fillRect(11, 2, 2, 30);
            ctx.fillStyle = '#ffd166'; ctx.fillRect(1, 0, 14, 4); ctx.fillRect(2, 28, 12, 4);
            break;
        case 'chain':
            col(2, 30, '#221018');
            ctx.strokeStyle = '#6b6f78'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(4, 0); ctx.quadraticCurveTo(1, 16, 5, 32); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(12, 0); ctx.quadraticCurveTo(15, 16, 11, 32); ctx.stroke();
            ctx.lineWidth = 1;
            ctx.fillStyle = a.glow; ctx.globalAlpha = 0.5; ctx.fillRect(7, 4, 2, 26); ctx.globalAlpha = 1;
            break;
        default: // stone
            col(2, 30, '#4a4a56');
            ctx.fillStyle = '#5e5e6e'; ctx.fillRect(3, 2, 3, 30);
            ctx.fillStyle = '#2e2e38'; ctx.fillRect(11, 2, 2, 30);
            ctx.fillStyle = '#6b6b7d'; ctx.fillRect(1, 0, 14, 4); ctx.fillRect(2, 28, 12, 4);
            break;
    }
    return c;
}

function paintGate(def: BossDef, sealed: boolean): HTMLCanvasElement {
    const [c, ctx] = mk();
    const a = def.arena;
    // Stone jamb
    ctx.fillStyle = shade(a.floor, -18);
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = a.inlay;
    ctx.fillRect(0, 0, 2, 16); ctx.fillRect(14, 0, 2, 16);

    if (sealed) {
        // Lowered portcullis
        ctx.fillStyle = '#6b6f78';
        for (let i = 0; i < 4; i++) ctx.fillRect(3 + i * 3, 0, 2, 16);
        ctx.fillStyle = '#8a8f99';
        for (let i = 0; i < 4; i++) ctx.fillRect(3 + i * 3, 0, 1, 16);
        ctx.fillStyle = '#4a4e56';
        ctx.fillRect(2, 4, 12, 2); ctx.fillRect(2, 11, 12, 2);
        // Rune lock
        ctx.fillStyle = a.glow;
        ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.arc(8, 8, 3, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
    } else {
        // Raised portcullis — teeth tucked into the lintel
        ctx.fillStyle = '#0a0a0e';
        ctx.fillRect(2, 3, 12, 13);
        ctx.fillStyle = '#6b6f78';
        for (let i = 0; i < 4; i++) ctx.fillRect(3 + i * 3, 0, 2, 4);
        ctx.fillStyle = '#4a4e56';
        ctx.fillRect(1, 0, 14, 3);
        ctx.fillStyle = a.glow;
        ctx.globalAlpha = 0.35;
        ctx.fillRect(2, 3, 12, 1);
        ctx.globalAlpha = 1;
    }
    return c;
}

export function getArenaTiles(def: BossDef): Record<string, HTMLCanvasElement> {
    if (tileCache[def.id]) return tileCache[def.id];
    const t: Record<string, HTMLCanvasElement> = {
        floor: paintArenaFloor(def),
        pillar: paintPillar(def),
        gateOpen: paintGate(def, false),
        gateSealed: paintGate(def, true),
    };
    tileCache[def.id] = t;
    return t;
}

// ===================================================================
// FIGHT STATE MACHINE
// ===================================================================

export function createBossFight(def: BossDef): BossFightState {
    return {
        def, phase: 1, castTimer: 2.5, rotation: 0, shieldTimer: 0,
        charge: null, splitsLeft: 2, summonsAlive: 0,
        hazards: [], projectiles: [], rings: [],
        started: false, victoryTimer: 0,
    };
}

const TILE = 16;

function addHazard(fs: BossFightState, x: number, y: number, kind: HazardKind, life: number, dmg: number, telegraph = 0.7): void {
    if (fs.hazards.length > 90) return;
    fs.hazards.push({ x, y, kind, telegraph, life, maxLife: life, dmg, color: fs.def.hazardColor, tick: 0 });
}

/** `tx`/`ty` are tile coordinates (fractional); `speed` is tiles per second. */
function addProjectile(fs: BossFightState, tx: number, ty: number, angle: number, speed: number, dmg: number, kind: BossProjectile['kind'] = 'orb'): void {
    if (fs.projectiles.length > 120) return;
    fs.projectiles.push({
        px: tx, py: ty,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 3.4, dmg, color: fs.def.hazardColor,
        size: kind === 'shard' ? 0.2 : 0.28, kind,
    });
}

function ring(fs: BossFightState, x: number, y: number, maxR: number): void {
    fs.rings.push({ x, y, r: 0, maxR, color: fs.def.arena.glow });
}

export interface FightHooks {
    addMsg: (msg: string, cls?: string) => void;
    /** Spawn a minion of `type` near (x,y); returns the created enemy or null */
    spawnMinion: (type: string, x: number, y: number, hpScale: number) => EnemyState | null;
    damagePlayer: (amount: number, source: string) => void;
    isWalkable: (x: number, y: number) => boolean;
}

/** Damage multiplier applied to incoming player hits (shield windows). */
export function getBossDamageTaken(fs: BossFightState | null): number {
    if (!fs) return 1;
    return fs.shieldTimer > 0 ? 0.35 : 1;
}

export function updateBossFight(
    fs: BossFightState,
    arena: ArenaData,
    boss: EnemyState | undefined,
    player: PlayerState,
    dt: number,
    hooks: FightHooks,
): void {
    const def = fs.def;

    // ---- Hazards ----
    for (let i = fs.hazards.length - 1; i >= 0; i--) {
        const h = fs.hazards[i];
        if (h.telegraph > 0) {
            h.telegraph -= dt;
            if (h.telegraph <= 0 && (h.kind === 'impact' || h.kind === 'shock')) {
                spawnParticles(h.x * TILE + 8, h.y * TILE + 8, 6, h.color, 2, 0.05, 2);
            }
            continue;
        }
        h.life -= dt;
        h.tick -= dt;
        if (h.tick <= 0 && player.x === h.x && player.y === h.y && player.invincibleTimer <= 0) {
            h.tick = 0.6;
            hooks.damagePlayer(h.dmg, h.kind);
        }
        if (h.life <= 0) fs.hazards.splice(i, 1);
    }

    // ---- Projectiles (tile space) ----
    for (let i = fs.projectiles.length - 1; i >= 0; i--) {
        const pr = fs.projectiles[i];
        pr.px += pr.vx * dt;
        pr.py += pr.vy * dt;
        pr.life -= dt;
        const tx = Math.floor(pr.px);
        const ty = Math.floor(pr.py);

        // Hit the player?
        const pdx = pr.px - (player.x + 0.5);
        const pdy = pr.py - (player.y + 0.5);
        if (pdx * pdx + pdy * pdy < 0.36 && player.invincibleTimer <= 0) {
            hooks.damagePlayer(pr.dmg, 'projectile');
            spawnHitParticles(player.px + 8, player.py + 8);
            fs.projectiles.splice(i, 1);
            continue;
        }
        if (pr.life <= 0 || !hooks.isWalkable(tx, ty)) {
            spawnParticles(tx * TILE + 8, ty * TILE + 8, 4, pr.color, 1.5, 0.05, 2);
            fs.projectiles.splice(i, 1);
        }
    }

    // ---- Rings (visual) ----
    for (let i = fs.rings.length - 1; i >= 0; i--) {
        const r = fs.rings[i];
        r.r += dt * 180;
        if (r.r > r.maxR) fs.rings.splice(i, 1);
    }

    if (fs.shieldTimer > 0) fs.shieldTimer -= dt;
    if (arena.introTimer > 0) arena.introTimer = Math.max(0, arena.introTimer - dt);

    if (!boss || !boss.alive) {
        fs.victoryTimer += dt;
        return;
    }

    // ---- Phase transitions ----
    const hpPct = boss.hp / boss.maxHp;
    const wantPhase = hpPct <= 0.33 ? 3 : hpPct <= 0.66 ? 2 : 1;
    if (wantPhase > fs.phase) {
        fs.phase = wantPhase;
        fs.castTimer = 0.8;
        boss.spd = Math.min(2.2, boss.spd * 1.25);
        ring(fs, boss.x, boss.y, 140);
        GameAudio.bossAppear();
        hooks.addMsg(
            fs.phase === 3
                ? `☠️ ${def.name} is ENRAGED!`
                : `⚡ ${def.name} shifts stance — phase ${fs.phase}!`,
            'msg-damage',
        );
        addFloatingText(boss.px + 8, boss.py - 20, fs.phase === 3 ? 'ENRAGED!' : 'PHASE ' + fs.phase, '#ff5252');
    }

    // ---- Telegraphed charge ----
    if (fs.charge) {
        fs.charge.timer -= dt;
        if (fs.charge.timer <= 0) {
            if (!fs.charge.active) {
                fs.charge.active = true;
                fs.charge.timer = 0.9;
                // Dash up to 6 tiles along the telegraph
                for (let step = 0; step < 6; step++) {
                    const nx = boss.x + fs.charge.dx;
                    const ny = boss.y + fs.charge.dy;
                    if (!hooks.isWalkable(nx, ny)) break;
                    boss.x = nx; boss.y = ny;
                    addHazard(fs, nx, ny, 'shock', 1.2, Math.floor(boss.atk * 0.5), 0);
                    if (nx === player.x && ny === player.y && player.invincibleTimer <= 0) {
                        hooks.damagePlayer(Math.floor(boss.atk * 1.3), 'charge');
                    }
                }
                ring(fs, boss.x, boss.y, 90);
                GameAudio.trapActivate();
            } else {
                fs.charge = null;
            }
        }
    }

    // ---- Ability rotation ----
    fs.castTimer -= dt * (fs.phase === 3 ? 1.5 : fs.phase === 2 ? 1.2 : 1);
    if (fs.castTimer <= 0 && fs.charge === null) {
        fs.castTimer = def.castInterval;
        const ability = def.abilities[fs.rotation % def.abilities.length];
        fs.rotation++;
        castAbility(fs, ability, arena, boss, player, hooks);
    }
}

function castAbility(
    fs: BossFightState,
    ability: string,
    arena: ArenaData,
    boss: EnemyState,
    player: PlayerState,
    hooks: FightHooks,
): void {
    const def = fs.def;
    const dmg = Math.max(3, Math.floor(boss.atk * 0.6));
    // Muzzle point in tile space; screen-space anchor for floating text
    const bx = boss.x + 0.5, by = boss.y + 0.5;
    const sx = boss.px + 8, sy = boss.py + 8;

    switch (ability) {
        case 'slam': {
            ring(fs, boss.x, boss.y, 150);
            GameAudio.trapActivate();
            hooks.addMsg(`${def.name} slams the ground!`, 'msg-damage');
            const radius = fs.phase >= 3 ? 3 : 2;
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    if (Math.abs(dx) + Math.abs(dy) > radius) continue;
                    if (dx === 0 && dy === 0) continue;
                    const hx = boss.x + dx, hy = boss.y + dy;
                    if (hooks.isWalkable(hx, hy)) addHazard(fs, hx, hy, 'shock', 0.9, dmg, 0.6);
                }
            }
            break;
        }
        case 'volley': {
            const count = 8 + fs.phase * 4;
            const spin = fs.rotation * 0.35;
            for (let i = 0; i < count; i++) {
                addProjectile(fs, bx, by, (i / count) * Math.PI * 2 + spin, 4.6, dmg, 'shard');
            }
            GameAudio.swordSlash();
            hooks.addMsg(`${def.name} unleashes a volley!`, 'msg-damage');
            break;
        }
        case 'breath': {
            const base = Math.atan2(player.y - boss.y, player.x - boss.x);
            for (let i = -4; i <= 4; i++) {
                addProjectile(fs, bx, by, base + i * 0.11, 5.4, dmg, 'flame');
            }
            hooks.addMsg(`🔥 ${def.name} breathes!`, 'msg-damage');
            GameAudio.bossAppear();
            break;
        }
        case 'summon': {
            const n = 1 + fs.phase;
            let spawned = 0;
            for (let i = 0; i < n * 3 && spawned < n; i++) {
                const sx = arena.x + 1 + Math.floor(Math.random() * (arena.w - 2));
                const sy = arena.y + 1 + Math.floor(Math.random() * (arena.h - 2));
                if (!hooks.isWalkable(sx, sy)) continue;
                if (Math.abs(sx - player.x) + Math.abs(sy - player.y) < 3) continue;
                if (hooks.spawnMinion(def.minion, sx, sy, 0.5)) {
                    spawnParticles(sx * TILE + 8, sy * TILE + 8, 10, def.palette.glow, 2, -0.02, 2);
                    spawned++;
                }
            }
            if (spawned) {
                hooks.addMsg(`${def.name} calls ${spawned} servant${spawned > 1 ? 's' : ''}!`, 'msg-damage');
            } else {
                // Summons unavailable (e.g. co-op) — don't waste the turn
                castAbility(fs, 'volley', arena, boss, player, hooks);
            }
            break;
        }
        case 'split': {
            if (fs.splitsLeft <= 0) { fs.castTimer = 1.2; break; }
            fs.splitsLeft--;
            let spawned = 0;
            for (let i = 0; i < 8 && spawned < 3; i++) {
                const sx = boss.x + (Math.floor(Math.random() * 5) - 2);
                const sy = boss.y + (Math.floor(Math.random() * 5) - 2);
                if (!hooks.isWalkable(sx, sy)) continue;
                if (hooks.spawnMinion(def.minion, sx, sy, 0.4)) {
                    spawnParticles(sx * TILE + 8, sy * TILE + 8, 12, def.palette.primary, 2.5, 0.1, 3);
                    spawned++;
                }
            }
            if (spawned) {
                hooks.addMsg(`${def.name} splits apart!`, 'msg-damage');
            } else {
                fs.splitsLeft++;   // refund — nothing actually split
                castAbility(fs, 'slam', arena, boss, player, hooks);
            }
            break;
        }
        case 'charge': {
            const dx = player.x - boss.x, dy = player.y - boss.y;
            const step = Math.abs(dx) > Math.abs(dy)
                ? { dx: Math.sign(dx), dy: 0 }
                : { dx: 0, dy: Math.sign(dy) };
            fs.charge = { dx: step.dx, dy: step.dy, timer: 0.85, active: false };
            hooks.addMsg(`⚠️ ${def.name} winds up a charge!`, 'msg-damage');
            addFloatingText(sx, sy - 24, '⚠️ CHARGE', '#ffb300');
            break;
        }
        case 'pools': {
            const n = 3 + fs.phase * 2;
            const kind: HazardKind =
                def.id === 'aranyx' ? 'web'
                    : def.id === 'hrimthar' ? 'ice'
                        : def.id === 'ignivarr' ? 'lava'
                            : def.id === 'vhalk' ? 'spore' : 'pool';
            for (let i = 0; i < n; i++) {
                const a = Math.random() * Math.PI * 2;
                const d = 1 + Math.random() * 4;
                const hx = Math.round(player.x + Math.cos(a) * d);
                const hy = Math.round(player.y + Math.sin(a) * d);
                if (hooks.isWalkable(hx, hy)) addHazard(fs, hx, hy, kind, 7, Math.max(2, Math.floor(dmg * 0.4)), 0.5);
            }
            hooks.addMsg(`${def.name} floods the ground!`, 'msg-damage');
            break;
        }
        case 'meteor': {
            const n = 4 + fs.phase * 2;
            for (let i = 0; i < n; i++) {
                const hx = player.x + Math.floor(Math.random() * 7) - 3;
                const hy = player.y + Math.floor(Math.random() * 7) - 3;
                if (hooks.isWalkable(hx, hy)) addHazard(fs, hx, hy, 'impact', 0.5, Math.floor(dmg * 1.2), 1.1);
            }
            hooks.addMsg(`☄️ Impacts incoming — move!`, 'msg-damage');
            break;
        }
        case 'blink': {
            for (let i = 0; i < 12; i++) {
                const a = Math.random() * Math.PI * 2;
                const tx = player.x + Math.round(Math.cos(a) * 2);
                const ty = player.y + Math.round(Math.sin(a) * 2);
                if (hooks.isWalkable(tx, ty) && !(tx === player.x && ty === player.y)) {
                    spawnParticles(boss.px + 8, boss.py + 8, 14, def.palette.glow, 3, 0, 2);
                    boss.x = tx; boss.y = ty;
                    boss.px = tx * TILE; boss.py = ty * TILE;
                    spawnParticles(tx * TILE + 8, ty * TILE + 8, 14, def.palette.glow, 3, 0, 2);
                    break;
                }
            }
            break;
        }
        case 'shield': {
            fs.shieldTimer = 4.5;
            ring(fs, boss.x, boss.y, 70);
            hooks.addMsg(`🛡️ ${def.name} raises a ward!`, 'msg-uncommon');
            addFloatingText(sx, sy - 24, '🛡️ WARDED', '#4fc3f7');
            break;
        }
    }
}

// ===================================================================
// RENDERING
// ===================================================================

export function renderArenaGround(
    ctx: CanvasRenderingContext2D,
    arena: ArenaData,
    def: BossDef,
    camX: number, camY: number, tileSize: number,
    time: number,
): void {
    const cx = (arena.x + arena.w / 2) * tileSize - camX;
    const cy = (arena.y + arena.h / 2) * tileSize - camY;
    const rad = Math.min(arena.w, arena.h) * tileSize * 0.44;

    // Great sigil burned into the middle of the floor
    ctx.save();
    const pulse = 0.16 + Math.sin(time * 0.0015) * 0.05;
    ctx.globalAlpha = arena.cleared ? pulse * 0.4 : pulse;
    ctx.strokeStyle = def.arena.glow;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, rad * 0.72, 0, Math.PI * 2); ctx.stroke();
    // Rune spokes
    const spokes = 8;
    for (let i = 0; i < spokes; i++) {
        const a = (i / spokes) * Math.PI * 2 + time * 0.00012;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * rad * 0.72, cy + Math.sin(a) * rad * 0.72);
        ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
        ctx.stroke();
    }
    // Inner mark
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4 - time * 0.0002;
        const px = cx + Math.cos(a) * rad * 0.42;
        const py = cy + Math.sin(a) * rad * 0.42;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.stroke();
    ctx.restore();
    ctx.lineWidth = 1;
}

export function renderArenaDecor(
    ctx: CanvasRenderingContext2D,
    arena: ArenaData,
    def: BossDef,
    camX: number, camY: number, tileSize: number,
    time: number,
): void {
    const tiles = getArenaTiles(def);

    // Pillars — 2 tiles tall, drawn after floor entities for depth
    for (const p of arena.decor.pillars) {
        const sx = p.x * tileSize - camX;
        const sy = p.y * tileSize - camY;
        ctx.drawImage(tiles.pillar, sx, sy - tileSize, tileSize, tileSize * 2);
    }

    // Braziers with flickering flame + pooled light
    for (const b of arena.decor.braziers) {
        const sx = b.x * tileSize - camX + tileSize / 2;
        const sy = b.y * tileSize - camY + tileSize * 0.6;
        const flick = 0.75 + Math.sin(time * 0.006 + b.x * 3.1 + b.y * 1.7) * 0.25;

        // Bowl
        ctx.fillStyle = '#3a3a44';
        ctx.beginPath();
        ctx.moveTo(sx - 7, sy); ctx.lineTo(sx + 7, sy); ctx.lineTo(sx + 4, sy + 8); ctx.lineTo(sx - 4, sy + 8);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#20202a';
        ctx.fillRect(sx - 3, sy + 8, 6, 6);

        // Flame
        const fh = 10 * flick;
        ctx.save();
        ctx.shadowColor = def.arena.brazier;
        ctx.shadowBlur = 12;
        ctx.fillStyle = def.arena.brazier;
        ctx.beginPath();
        ctx.moveTo(sx - 4, sy); ctx.quadraticCurveTo(sx, sy - fh * 1.8, sx + 4, sy);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,230,0.85)';
        ctx.beginPath();
        ctx.moveTo(sx - 1.6, sy); ctx.quadraticCurveTo(sx, sy - fh, sx + 1.6, sy);
        ctx.closePath(); ctx.fill();
        ctx.restore();

        // Pooled light
        const r = tileSize * 2.6 * flick;
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
        g.addColorStop(0, `rgba(255,220,170,0.10)`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
    }
}

export function renderFightEffects(
    ctx: CanvasRenderingContext2D,
    fs: BossFightState,
    camX: number, camY: number, tileSize: number,
    time: number,
): void {
    const scale = tileSize / TILE;

    // --- Hazards ---
    for (const h of fs.hazards) {
        const sx = h.x * tileSize - camX;
        const sy = h.y * tileSize - camY;

        if (h.telegraph > 0) {
            // Telegraph: shrinking warning ring
            const t = 1 - Math.min(1, h.telegraph / 1.1);
            ctx.save();
            ctx.globalAlpha = 0.35 + t * 0.35;
            ctx.strokeStyle = h.kind === 'impact' ? '#ff5252' : h.color;
            ctx.lineWidth = 2;
            ctx.strokeRect(sx + 2, sy + 2, tileSize - 4, tileSize - 4);
            ctx.beginPath();
            ctx.arc(sx + tileSize / 2, sy + tileSize / 2, (tileSize / 2 - 2) * (1 - t * 0.6), 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            ctx.lineWidth = 1;
            continue;
        }

        const fade = Math.min(1, h.life / (h.maxLife * 0.4));
        ctx.save();
        ctx.globalAlpha = 0.55 * fade;
        switch (h.kind) {
            case 'lava': {
                const grad = ctx.createRadialGradient(sx + tileSize / 2, sy + tileSize / 2, 1, sx + tileSize / 2, sy + tileSize / 2, tileSize / 2);
                grad.addColorStop(0, '#ffd166');
                grad.addColorStop(0.5, '#ff6a2a');
                grad.addColorStop(1, 'rgba(120,20,0,0)');
                ctx.fillStyle = grad;
                ctx.fillRect(sx, sy, tileSize, tileSize);
                break;
            }
            case 'ice':
                ctx.fillStyle = h.color;
                ctx.beginPath();
                ctx.moveTo(sx + tileSize / 2, sy + 2); ctx.lineTo(sx + tileSize - 2, sy + tileSize / 2);
                ctx.lineTo(sx + tileSize / 2, sy + tileSize - 2); ctx.lineTo(sx + 2, sy + tileSize / 2);
                ctx.closePath(); ctx.fill();
                break;
            case 'web':
                ctx.strokeStyle = h.color;
                ctx.beginPath();
                ctx.moveTo(sx, sy); ctx.lineTo(sx + tileSize, sy + tileSize);
                ctx.moveTo(sx + tileSize, sy); ctx.lineTo(sx, sy + tileSize);
                ctx.moveTo(sx + tileSize / 2, sy); ctx.lineTo(sx + tileSize / 2, sy + tileSize);
                ctx.stroke();
                ctx.beginPath(); ctx.arc(sx + tileSize / 2, sy + tileSize / 2, tileSize * 0.3, 0, Math.PI * 2); ctx.stroke();
                break;
            case 'spore': {
                const bob = Math.sin(time * 0.004 + h.x + h.y) * 2;
                ctx.fillStyle = h.color;
                for (let i = 0; i < 4; i++) {
                    const a = i * 1.57 + time * 0.001;
                    ctx.beginPath();
                    ctx.arc(sx + tileSize / 2 + Math.cos(a) * 7, sy + tileSize / 2 + Math.sin(a) * 6 + bob, 3.5 * scale, 0, Math.PI * 2);
                    ctx.fill();
                }
                break;
            }
            case 'shock':
                ctx.strokeStyle = h.color;
                ctx.lineWidth = 2;
                ctx.strokeRect(sx + 3, sy + 3, tileSize - 6, tileSize - 6);
                ctx.lineWidth = 1;
                break;
            default:
                ctx.fillStyle = h.color;
                ctx.beginPath();
                ctx.ellipse(sx + tileSize / 2, sy + tileSize / 2, tileSize * 0.42, tileSize * 0.34, 0, 0, Math.PI * 2);
                ctx.fill();
                break;
        }
        ctx.restore();
    }

    // --- Shockwave rings ---
    for (const r of fs.rings) {
        const sx = r.x * tileSize - camX + tileSize / 2;
        const sy = r.y * tileSize - camY + tileSize / 2;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - r.r / r.maxR) * 0.7;
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(sx, sy, r.r, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
        ctx.lineWidth = 1;
    }

    // --- Projectiles (tile space -> screen) ---
    for (const pr of fs.projectiles) {
        const sx = pr.px * tileSize - camX;
        const sy = pr.py * tileSize - camY;
        const r = pr.size * tileSize;
        ctx.save();
        ctx.shadowColor = pr.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = pr.color;
        if (pr.kind === 'shard') {
            const a = Math.atan2(pr.vy, pr.vx);
            ctx.translate(sx, sy); ctx.rotate(a);
            ctx.beginPath();
            ctx.moveTo(r * 1.6, 0); ctx.lineTo(-r, -r * 0.7); ctx.lineTo(-r * 0.35, 0); ctx.lineTo(-r, r * 0.7);
            ctx.closePath(); ctx.fill();
        } else if (pr.kind === 'flame') {
            ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffe9a8';
            ctx.beginPath(); ctx.arc(sx, sy, r * 0.5, 0, Math.PI * 2); ctx.fill();
        } else {
            ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.beginPath(); ctx.arc(sx - r * 0.3, sy - r * 0.3, r * 0.35, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
}

/** Arena-wide coloured fog + a vignette that frames the chamber. */
export function renderArenaAtmosphere(
    ctx: CanvasRenderingContext2D,
    def: BossDef,
    canvasW: number, canvasH: number,
    intensity: number,
): void {
    const a = def.arena;
    ctx.fillStyle = `rgba(${a.fog},${(a.fogAlpha * intensity).toFixed(3)})`;
    ctx.fillRect(0, 0, canvasW, canvasH);
}
