// ===== BOSS BESTIARY =====
// Every boss is hand-authored: unique silhouette, palette, arena and move-set.
// Sprites are painted into a 160x160 offscreen canvas (see assets.ts) so each
// boss can be far more detailed than the 16px dungeon mobs.

import type { EnemyType } from './types';

export type BossAbility =
    | 'slam'      // shockwave ring centred on the boss
    | 'volley'    // radial burst of projectiles
    | 'summon'    // calls minions into the arena
    | 'charge'    // dashes along a telegraphed line
    | 'breath'    // cone of projectiles in the facing direction
    | 'blink'     // teleports next to the player
    | 'pools'     // drops lingering ground hazards
    | 'meteor'    // telegraphed impacts around the player
    | 'split'     // spawns smaller copies of itself
    | 'shield';   // temporary damage reduction + reflect

export type ArenaPattern = 'sigil' | 'ossuary' | 'web' | 'glacier' | 'grove' | 'forge' | 'prism' | 'void' | 'hoard' | 'abyss';
export type PillarStyle = 'stone' | 'bone' | 'silk' | 'ice' | 'fungal' | 'basalt' | 'crystal' | 'obelisk' | 'gilded' | 'chain';

export interface ArenaStyle {
    /** Base slab colour of the arena floor */
    floor: string;
    /** Inlay / mortar colour */
    inlay: string;
    /** Glowing accent (sigils, veins, rune lines) */
    glow: string;
    /** Colour of the braziers ringing the arena */
    brazier: string;
    pattern: ArenaPattern;
    pillar: PillarStyle;
    /** Additive fog tint pushed over the arena, 'r,g,b' */
    fog: string;
    fogAlpha: number;
}

export interface BossPalette {
    primary: string;
    secondary: string;
    dark: string;
    light: string;
    glow: string;
    eye: string;
    accent: string;
}

export interface BossDef {
    id: string;
    floor: number;
    /** Short name, e.g. "Gloopus" */
    name: string;
    /** Regal title, e.g. "the Slime King" */
    title: string;
    /** Flavour line shown when the gate seals */
    intro: string;
    /** Which 16px mob this boss counts as for the bestiary / loot tables */
    baseType: EnemyType;
    /** Sprite footprint in tiles */
    size: number;
    palette: BossPalette;
    arena: ArenaStyle;
    /** Arena interior size in tiles (odd numbers keep the sigil centred) */
    arenaW: number;
    arenaH: number;
    abilities: BossAbility[];
    /** Which minion type `summon` / `split` calls in */
    minion: EnemyType;
    /** Stat scaling on top of the generic boss multiplier */
    hpMult: number;
    atkMult: number;
    /** Seconds between ability casts at full health */
    castInterval: number;
    /** Hazard / projectile tint */
    hazardColor: string;
}

export const BOSSES: BossDef[] = [
    {
        id: 'gloopus', floor: 10, name: 'Gloopus', title: 'the Slime King',
        intro: 'The sewer swells. Something enormous unfolds itself from the drain.',
        baseType: 'slime', size: 3, minion: 'slime',
        palette: { primary: '#3fa96b', secondary: '#2b7a4c', dark: '#164028', light: '#8ef0b4', glow: '#a6ffcf', eye: '#ffe97a', accent: '#f4c542' },
        arena: { floor: '#26332c', inlay: '#1a241f', glow: '#4be08c', brazier: '#63f0a8', pattern: 'sigil', pillar: 'stone', fog: '40,120,70', fogAlpha: 0.1 },
        arenaW: 17, arenaH: 13,
        abilities: ['slam', 'split', 'pools'], hpMult: 1.0, atkMult: 0.9, castInterval: 4.2, hazardColor: '#5ddb8c',
    },
    {
        id: 'ossaric', floor: 20, name: 'Ossaric', title: 'the Bone Tyrant',
        intro: 'A thousand skulls turn at once. The Tyrant rises from his ossuary throne.',
        baseType: 'skeleton', size: 3, minion: 'skeleton',
        palette: { primary: '#ddd2b4', secondary: '#b3a684', dark: '#5c5340', light: '#f7f0dc', glow: '#7ef0c8', eye: '#5ff5d0', accent: '#8a97a8' },
        arena: { floor: '#3a332b', inlay: '#241f19', glow: '#7ef0c8', brazier: '#7ef0c8', pattern: 'ossuary', pillar: 'bone', fog: '90,110,100', fogAlpha: 0.09 },
        arenaW: 19, arenaH: 13,
        abilities: ['summon', 'volley', 'slam'], hpMult: 1.05, atkMult: 1.0, castInterval: 4.0, hazardColor: '#cfe8dd',
    },
    {
        id: 'aranyx', floor: 30, name: 'Aranyx', title: 'the Broodmother',
        intro: 'Silk shivers overhead. Eight eyes open in the dark, and none of them blink.',
        baseType: 'spider', size: 3, minion: 'spider',
        palette: { primary: '#5b3f7a', secondary: '#3d2a54', dark: '#20142f', light: '#a58ad0', glow: '#c9a4ff', eye: '#ff4d6d', accent: '#e8dcf7' },
        arena: { floor: '#2a2436', inlay: '#191426', glow: '#b98cff', brazier: '#c9a4ff', pattern: 'web', pillar: 'silk', fog: '80,50,120', fogAlpha: 0.12 },
        arenaW: 19, arenaH: 15,
        abilities: ['summon', 'charge', 'pools'], hpMult: 0.95, atkMult: 1.1, castInterval: 3.6, hazardColor: '#d8c8f0',
    },
    {
        id: 'hrimthar', floor: 40, name: 'Hrimthar', title: 'the Frost Warden',
        intro: 'The cavern cracks. A glacier stands up and remembers how to hate.',
        baseType: 'golem', size: 3, minion: 'golem',
        palette: { primary: '#8fc4e8', secondary: '#5d94c4', dark: '#264a66', light: '#dff2ff', glow: '#6fe3ff', eye: '#eaffff', accent: '#b6e3f7' },
        arena: { floor: '#c8dae6', inlay: '#93aec2', glow: '#6fe3ff', brazier: '#8ff0ff', pattern: 'glacier', pillar: 'ice', fog: '120,180,235', fogAlpha: 0.11 },
        arenaW: 19, arenaH: 15,
        abilities: ['slam', 'meteor', 'pools'],
        hpMult: 1.3, atkMult: 0.95, castInterval: 4.4, hazardColor: '#a8e4ff',
    },
    {
        id: 'vhalk', floor: 50, name: 'Vhalk', title: 'the Sporelord',
        intro: 'The grotto exhales. Every cap in the cavern turns to face you.',
        baseType: 'ghost', size: 3, minion: 'slime',
        palette: { primary: '#2f8f74', secondary: '#1e6352', dark: '#12352c', light: '#7ff0c6', glow: '#9dff7a', eye: '#f9ff8a', accent: '#d46a9a' },
        arena: { floor: '#26362f', inlay: '#182420', glow: '#9dff7a', brazier: '#b6ff8a', pattern: 'grove', pillar: 'fungal', fog: '60,150,100', fogAlpha: 0.13 },
        arenaW: 19, arenaH: 15,
        abilities: ['pools', 'summon', 'shield'], hpMult: 1.25, atkMult: 1.0, castInterval: 3.8, hazardColor: '#a8f07a',
    },
    {
        id: 'ignivarr', floor: 60, name: 'Ignivarr', title: 'the Magma Colossus',
        intro: 'The magma parts. Something forged before fire had a name pulls itself free.',
        baseType: 'demon', size: 4, minion: 'demon',
        palette: { primary: '#3a2020', secondary: '#22120f', dark: '#120909', light: '#ff8a3d', glow: '#ff5722', eye: '#ffd23d', accent: '#ff3d00' },
        arena: { floor: '#301c18', inlay: '#1b0f0d', glow: '#ff6a2a', brazier: '#ff8a3d', pattern: 'forge', pillar: 'basalt', fog: '190,70,20', fogAlpha: 0.14 },
        arenaW: 21, arenaH: 15,
        abilities: ['slam', 'pools', 'meteor', 'charge'], hpMult: 1.4, atkMult: 1.05, castInterval: 3.6, hazardColor: '#ff7a33',
    },
    {
        id: 'prisma', floor: 70, name: 'Prisma', title: 'the Crystal Archon',
        intro: 'Your reflection steps out of the wall — and it is not obeying you.',
        baseType: 'wraith', size: 3, minion: 'golem',
        palette: { primary: '#7f6bff', secondary: '#4b3bc4', dark: '#251b5c', light: '#d6ccff', glow: '#8ce9ff', eye: '#ffffff', accent: '#ff8ae0' },
        arena: { floor: '#1b1a3c', inlay: '#12112b', glow: '#8ce9ff', brazier: '#b3a4ff', pattern: 'prism', pillar: 'crystal', fog: '90,80,220', fogAlpha: 0.12 },
        arenaW: 19, arenaH: 15,
        abilities: ['blink', 'volley', 'shield', 'meteor'], hpMult: 1.2, atkMult: 1.1, castInterval: 3.2, hazardColor: '#9ee6ff',
    },
    {
        id: 'nyxaroth', floor: 80, name: 'Nyxaroth', title: 'the Shadow Monarch',
        intro: 'The torches keep burning. They simply stop giving light.',
        baseType: 'wraith', size: 3, minion: 'wraith',
        palette: { primary: '#1a1a24', secondary: '#0d0d14', dark: '#050508', light: '#4a4a63', glow: '#8c5cff', eye: '#ffffff', accent: '#b388ff' },
        arena: { floor: '#131320', inlay: '#0a0a12', glow: '#8c5cff', brazier: '#9b6bff', pattern: 'void', pillar: 'obelisk', fog: '20,10,45', fogAlpha: 0.18 },
        arenaW: 21, arenaH: 15,
        abilities: ['blink', 'summon', 'volley', 'charge'], hpMult: 1.2, atkMult: 1.2, castInterval: 3.0, hazardColor: '#a97bff',
    },
    {
        id: 'verdrakar', floor: 90, name: 'Verdrakar', title: 'the Elder Drake',
        intro: 'The hoard shifts. What you took for gold was scale all along.',
        baseType: 'drake', size: 4, minion: 'drake',
        palette: { primary: '#8c2f1f', secondary: '#5c1c12', dark: '#2c0d08', light: '#e8a33d', glow: '#ffb13d', eye: '#ffe066', accent: '#f5d76e' },
        arena: { floor: '#3d2a13', inlay: '#241809', glow: '#ffb13d', brazier: '#ffd166', pattern: 'hoard', pillar: 'gilded', fog: '180,120,30', fogAlpha: 0.12 },
        arenaW: 23, arenaH: 17,
        abilities: ['breath', 'slam', 'meteor', 'charge'], hpMult: 1.5, atkMult: 1.15, castInterval: 3.2, hazardColor: '#ff9a3d',
    },
    {
        id: 'abaddon', floor: 100, name: 'Abaddon', title: 'the Abyssal Lord',
        intro: 'There is no floor beneath this room. There is only Him, and He has been waiting.',
        baseType: 'lich', size: 4, minion: 'demon',
        palette: { primary: '#4a0d1a', secondary: '#2b0710', dark: '#120206', light: '#ff4d5e', glow: '#ff2d55', eye: '#ffdd57', accent: '#7a0f22' },
        arena: { floor: '#170a10', inlay: '#0b0508', glow: '#ff2d55', brazier: '#ff4d5e', pattern: 'abyss', pillar: 'chain', fog: '90,0,30', fogAlpha: 0.2 },
        arenaW: 23, arenaH: 17,
        abilities: ['summon', 'volley', 'meteor', 'slam', 'blink', 'breath'], hpMult: 1.8, atkMult: 1.25, castInterval: 2.8, hazardColor: '#ff4d5e',
    },

    // ===================================================================
    // DUNGEON 2 — THE UNDERWORLD (floors 101-150, shown as Underworld 1-50)
    // Everything down here hits harder and casts faster.
    // ===================================================================
    {
        id: 'thalassor', floor: 110, name: 'Thalassor', title: 'the Drowned Choir',
        intro: 'The water does not ripple. It listens. Then it opens a hundred mouths.',
        baseType: 'banshee', size: 4, minion: 'banshee',
        palette: { primary: '#1d5a6b', secondary: '#0e3340', dark: '#061a22', light: '#7fe0f0', glow: '#4fd8e8', eye: '#eafcff', accent: '#2e8b9e' },
        arena: { floor: '#12303c', inlay: '#0a1c24', glow: '#4fd8e8', brazier: '#7fe0f0', pattern: 'sigil', pillar: 'crystal', fog: '20,110,140', fogAlpha: 0.2 },
        arenaW: 21, arenaH: 15,
        abilities: ['volley', 'summon', 'pools', 'slam'], hpMult: 1.7, atkMult: 1.3, castInterval: 3.0, hazardColor: '#4fd8e8',
    },
    {
        id: 'cinderach', floor: 120, name: 'Cinderach', title: 'the Ashen Wanderer',
        intro: 'A shape walks out of the ashfall. It has been walking a very long time.',
        baseType: 'revenant', size: 4, minion: 'revenant',
        palette: { primary: '#4a3f36', secondary: '#2a231c', dark: '#14100c', light: '#c8b39a', glow: '#e8c88a', eye: '#ffd88a', accent: '#8a6f5c' },
        arena: { floor: '#332b26', inlay: '#1c1712', glow: '#e8c88a', brazier: '#ffd88a', pattern: 'void', pillar: 'obelisk', fog: '120,95,70', fogAlpha: 0.2 },
        arenaW: 21, arenaH: 15,
        abilities: ['charge', 'meteor', 'blink', 'slam'], hpMult: 1.75, atkMult: 1.35, castInterval: 2.9, hazardColor: '#d8b47a',
    },
    {
        id: 'ossuarch', floor: 130, name: 'Ossuarch', title: 'the Cathedral Saint',
        intro: 'Every bone in the cathedral belongs to it. It has simply not gathered them all yet.',
        baseType: 'lich', size: 4, minion: 'skeleton',
        palette: { primary: '#ddd2b4', secondary: '#a8987a', dark: '#4a4232', light: '#fbf6e6', glow: '#ffe9a8', eye: '#fff4c8', accent: '#c9a227' },
        arena: { floor: '#3d3728', inlay: '#241f16', glow: '#ffe9a8', brazier: '#ffd166', pattern: 'ossuary', pillar: 'bone', fog: '150,130,90', fogAlpha: 0.18 },
        arenaW: 23, arenaH: 17,
        abilities: ['summon', 'volley', 'shield', 'meteor', 'slam'], hpMult: 1.85, atkMult: 1.35, castInterval: 2.8, hazardColor: '#f0e0a8',
    },
    {
        id: 'slagmaw', floor: 140, name: 'Slagmaw', title: 'the Rivers Made Flesh',
        intro: 'The slag river stops flowing downhill. It flows toward you instead.',
        baseType: 'devourer', size: 4, minion: 'hellhound',
        palette: { primary: '#5c1f10', secondary: '#331008', dark: '#180804', light: '#ff9a4a', glow: '#ff6a2a', eye: '#ffe08a', accent: '#ff3d00' },
        arena: { floor: '#3d1a12', inlay: '#200c08', glow: '#ff6a2a', brazier: '#ff9a4a', pattern: 'forge', pillar: 'basalt', fog: '210,80,15', fogAlpha: 0.22 },
        arenaW: 23, arenaH: 17,
        abilities: ['pools', 'breath', 'charge', 'meteor', 'slam'], hpMult: 1.9, atkMult: 1.4, castInterval: 2.7, hazardColor: '#ff7a33',
    },
    {
        id: 'the_hollow', floor: 150, name: 'The Hollow', title: 'That Which Waits Below',
        intro: 'There is nothing here. That is the problem. Something has to be doing the nothing.',
        baseType: 'devourer', size: 4, minion: 'shade',
        palette: { primary: '#12060f', secondary: '#08030a', dark: '#030105', light: '#ff5c78', glow: '#ff2d55', eye: '#ffffff', accent: '#7a0a24' },
        arena: { floor: '#120818', inlay: '#07030b', glow: '#ff2d55', brazier: '#ff5c78', pattern: 'abyss', pillar: 'chain', fog: '80,0,30', fogAlpha: 0.28 },
        arenaW: 23, arenaH: 17,
        abilities: ['blink', 'summon', 'volley', 'meteor', 'breath', 'slam', 'shield'], hpMult: 2.2, atkMult: 1.5, castInterval: 2.4, hazardColor: '#ff2d55',
    },
];

export function getBossDef(floor: number): BossDef | null {
    return BOSSES.find(b => b.floor === floor) || null;
}

/** Nearest boss definition at or below a floor — used for arena theming fallbacks. */
export function getBossDefForFloor(floor: number): BossDef {
    const idx = Math.min(Math.max(0, Math.ceil(floor / 10) - 1), BOSSES.length - 1);
    return BOSSES[idx];
}

export function getBossFullName(def: BossDef): string {
    return `${def.name}, ${def.title}`;
}

// ===================================================================
// SPRITE PAINTERS
// Each painter draws into a 160x160 context. Ground line sits at y=150.
// `f` is the animation frame (0/1), `rage` is 0..1 (phase intensity).
// ===================================================================

const S = 160;

function shadow(ctx: CanvasRenderingContext2D, cx: number, w: number, h = 12): void {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(cx, 150, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
}

function glowOrb(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 0.5): void {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
}

function eyes(ctx: CanvasRenderingContext2D, pts: [number, number][], r: number, color: string): void {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.fillStyle = color;
    for (const [x, y] of pts) {
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 0.75, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function spike(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, lean = 0): void {
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.lineTo(x + lean, y - h);
    ctx.lineTo(x + w, y);
    ctx.closePath();
    ctx.fill();
}

// --- 1. GLOOPUS, THE SLIME KING -------------------------------------
function paintGloopus(ctx: CanvasRenderingContext2D, f: number, rage: number, p: BossPalette): void {
    const squash = f === 0 ? 0 : 5;
    shadow(ctx, 80, 52 + squash * 0.6);

    // Gel body — layered translucent domes
    ctx.save();
    ctx.globalAlpha = 0.9;
    const bodyGrad = ctx.createRadialGradient(66, 78 + squash, 8, 80, 96 + squash, 62);
    bodyGrad.addColorStop(0, p.light);
    bodyGrad.addColorStop(0.5, p.primary);
    bodyGrad.addColorStop(1, p.secondary);
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(80, 100 + squash * 0.5, 58, 48 - squash, 0, 0, Math.PI * 2);
    ctx.fill();
    // Upper dome
    ctx.beginPath();
    ctx.ellipse(80, 74 + squash, 44, 36 - squash, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Inner core — a swallowed skull
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.ellipse(80, 104 + squash, 15, 17, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.dark;
    ctx.beginPath(); ctx.ellipse(74, 101 + squash, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(87, 101 + squash, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(76, 112 + squash, 9, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(77, 112 + squash, 2, 4); ctx.fillRect(82, 112 + squash, 2, 4);

    // Surface highlight
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.beginPath(); ctx.ellipse(60, 62 + squash, 17, 11, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath(); ctx.ellipse(103, 86 + squash, 8, 14, 0.4, 0, Math.PI * 2); ctx.fill();

    // Drips
    ctx.fillStyle = p.primary;
    for (const [dx, dl] of [[36, 14], [58, 9], [104, 16], [124, 10]] as [number, number][]) {
        ctx.beginPath();
        ctx.ellipse(dx, 140 + squash * 0.4, 5, dl - f * 3, 0, 0, Math.PI * 2);
        ctx.fill();
    }

    // Crown
    ctx.fillStyle = p.accent;
    ctx.fillRect(56, 40 + squash, 48, 9);
    for (let i = 0; i < 5; i++) spike(ctx, 58 + i * 12, 40 + squash, 6, i === 2 ? 20 : 14);
    ctx.fillStyle = '#fff6b8';
    ctx.fillRect(56, 40 + squash, 48, 2);
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath(); ctx.arc(80, 45 + squash, 4, 0, Math.PI * 2); ctx.fill();

    // Eyes
    eyes(ctx, [[64, 74 + squash], [96, 74 + squash]], 8, p.eye);
    ctx.fillStyle = p.dark;
    ctx.beginPath(); ctx.ellipse(64, 75 + squash, 3, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(96, 75 + squash, 3, 5, 0, 0, Math.PI * 2); ctx.fill();

    if (rage > 0) glowOrb(ctx, 80, 96, 76, p.glow, 0.18 * rage);
}

// --- 2. OSSARIC, THE BONE TYRANT ------------------------------------
function paintOssaric(ctx: CanvasRenderingContext2D, f: number, rage: number, p: BossPalette): void {
    const bob = f === 0 ? 0 : 3;
    shadow(ctx, 80, 46);

    // Tattered cloak behind
    ctx.fillStyle = '#2c3a3a';
    ctx.beginPath();
    ctx.moveTo(46, 46 + bob); ctx.lineTo(24, 148); ctx.lineTo(136, 148); ctx.lineTo(114, 46 + bob);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1c2828';
    ctx.beginPath();
    ctx.moveTo(52, 60 + bob); ctx.lineTo(38, 148); ctx.lineTo(70, 148); ctx.lineTo(72, 60 + bob);
    ctx.closePath(); ctx.fill();

    // Legs
    ctx.fillStyle = p.secondary;
    ctx.fillRect(62, 112, 10, 34); ctx.fillRect(88, 112, 10, 34);
    ctx.fillStyle = p.dark;
    ctx.fillRect(58, 142, 18, 7); ctx.fillRect(84, 142, 18, 7);

    // Pelvis + spine
    ctx.fillStyle = p.primary;
    ctx.fillRect(66, 100, 28, 12);
    ctx.fillRect(76, 58 + bob, 8, 46);

    // Ribcage with soul-fire
    glowOrb(ctx, 80, 82 + bob, 30, p.glow, 0.55);
    ctx.strokeStyle = p.primary;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
        const ry = 64 + i * 9 + bob;
        ctx.beginPath();
        ctx.moveTo(60, ry); ctx.quadraticCurveTo(80, ry + 8, 100, ry);
        ctx.stroke();
    }
    ctx.lineWidth = 1;

    // Pauldrons
    ctx.fillStyle = p.accent;
    ctx.beginPath(); ctx.ellipse(50, 58 + bob, 20, 14, -0.25, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(110, 58 + bob, 20, 14, 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.light;
    spike(ctx, 44, 50 + bob, 6, 16, -4); spike(ctx, 116, 50 + bob, 6, 16, 4);

    // Arms
    ctx.fillStyle = p.secondary;
    ctx.fillRect(34, 62 + bob, 9, 40);
    ctx.fillRect(120, 62 + bob, 9, 40);

    // Greatsword in the right hand
    ctx.fillStyle = '#8d99a8';
    ctx.beginPath();
    ctx.moveTo(126, 96); ctx.lineTo(132, 20); ctx.lineTo(138, 96); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#cfd8e3';
    ctx.beginPath(); ctx.moveTo(130, 92); ctx.lineTo(132, 26); ctx.lineTo(134, 92); ctx.closePath(); ctx.fill();
    ctx.fillStyle = p.accent; ctx.fillRect(120, 96, 24, 6);
    ctx.fillStyle = '#4a3a2a'; ctx.fillRect(129, 102, 6, 16);

    // Skull with horned helm
    ctx.fillStyle = p.light;
    ctx.beginPath(); ctx.ellipse(80, 40 + bob, 20, 22, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.primary;
    ctx.fillRect(70, 52 + bob, 20, 10);
    ctx.fillStyle = p.dark;
    ctx.fillRect(72, 55 + bob, 3, 7); ctx.fillRect(78, 55 + bob, 3, 7); ctx.fillRect(84, 55 + bob, 3, 7);
    // Helm
    ctx.fillStyle = p.accent;
    ctx.beginPath(); ctx.ellipse(80, 30 + bob, 22, 16, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = p.light;
    ctx.beginPath(); ctx.moveTo(60, 30 + bob); ctx.lineTo(38, 4 + bob); ctx.lineTo(64, 20 + bob); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(100, 30 + bob); ctx.lineTo(122, 4 + bob); ctx.lineTo(96, 20 + bob); ctx.closePath(); ctx.fill();

    eyes(ctx, [[72, 40 + bob], [88, 40 + bob]], 5, p.eye);
    if (rage > 0) glowOrb(ctx, 80, 80, 74, p.glow, 0.16 * rage);
}

// --- 3. ARANYX, THE BROODMOTHER -------------------------------------
function paintAranyx(ctx: CanvasRenderingContext2D, f: number, rage: number, p: BossPalette): void {
    const step = f === 0 ? 0 : 4;
    shadow(ctx, 80, 58, 10);

    // Legs — 4 per side, jointed
    ctx.strokeStyle = p.secondary;
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
        const spread = 26 + i * 14;
        const lift = (i % 2 === 0 ? step : -step);
        ctx.lineWidth = 7 - i * 0.6;
        // left
        ctx.beginPath();
        ctx.moveTo(64, 84);
        ctx.lineTo(64 - spread * 0.7, 62 + i * 6 - lift);
        ctx.lineTo(64 - spread, 132 + i * 3);
        ctx.stroke();
        // right
        ctx.beginPath();
        ctx.moveTo(96, 84);
        ctx.lineTo(96 + spread * 0.7, 62 + i * 6 + lift);
        ctx.lineTo(96 + spread, 132 + i * 3);
        ctx.stroke();
    }
    ctx.lineWidth = 1;

    // Abdomen (egg sac)
    const abGrad = ctx.createRadialGradient(72, 96, 6, 84, 108, 46);
    abGrad.addColorStop(0, p.light);
    abGrad.addColorStop(1, p.secondary);
    ctx.fillStyle = abGrad;
    ctx.beginPath(); ctx.ellipse(84, 108, 44, 36, 0, 0, Math.PI * 2); ctx.fill();
    // Egg speckles
    ctx.fillStyle = p.accent;
    for (const [ex, ey, er] of [[70, 100, 5], [92, 96, 4], [104, 112, 5], [76, 122, 4], [90, 124, 3]] as number[][]) {
        ctx.globalAlpha = 0.75;
        ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Hourglass mark
    ctx.fillStyle = p.eye;
    ctx.beginPath();
    ctx.moveTo(78, 96); ctx.lineTo(94, 96); ctx.lineTo(82, 110); ctx.lineTo(94, 124); ctx.lineTo(78, 124); ctx.lineTo(88, 110);
    ctx.closePath(); ctx.fill();

    // Cephalothorax
    ctx.fillStyle = p.primary;
    ctx.beginPath(); ctx.ellipse(74, 74, 30, 24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.dark;
    ctx.beginPath(); ctx.ellipse(74, 84, 26, 12, 0, 0, Math.PI * 2); ctx.fill();

    // Head + fangs
    ctx.fillStyle = p.secondary;
    ctx.beginPath(); ctx.ellipse(64, 60, 22, 17, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.accent;
    ctx.beginPath(); ctx.moveTo(54, 70); ctx.lineTo(50, 88); ctx.lineTo(60, 72); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(72, 70); ctx.lineTo(76, 88); ctx.lineTo(66, 72); ctx.closePath(); ctx.fill();

    // Eight eyes
    eyes(ctx, [[54, 52], [64, 50], [74, 52], [58, 60], [70, 60]], 4, p.eye);
    eyes(ctx, [[50, 58], [78, 58], [64, 64]], 2.5, p.eye);

    if (rage > 0) glowOrb(ctx, 80, 90, 76, p.glow, 0.16 * rage);
}

// --- 4. HRIMTHAR, THE FROST WARDEN ----------------------------------
function paintHrimthar(ctx: CanvasRenderingContext2D, f: number, rage: number, p: BossPalette): void {
    const bob = f === 0 ? 0 : 2;
    shadow(ctx, 80, 50);

    // Back shards
    ctx.fillStyle = p.secondary;
    ctx.globalAlpha = 0.85;
    spike(ctx, 44, 74 + bob, 10, 44, -12);
    spike(ctx, 116, 74 + bob, 10, 44, 12);
    spike(ctx, 60, 52 + bob, 9, 40, -6);
    spike(ctx, 100, 52 + bob, 9, 40, 6);
    ctx.globalAlpha = 1;

    // Legs
    ctx.fillStyle = p.secondary;
    ctx.fillRect(56, 108, 18, 38); ctx.fillRect(86, 108, 18, 38);
    ctx.fillStyle = p.dark;
    ctx.fillRect(52, 140, 26, 9); ctx.fillRect(82, 140, 26, 9);

    // Torso — faceted ice
    const tg = ctx.createLinearGradient(48, 48, 112, 116);
    tg.addColorStop(0, p.light);
    tg.addColorStop(0.5, p.primary);
    tg.addColorStop(1, p.secondary);
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.moveTo(50, 56 + bob); ctx.lineTo(110, 56 + bob); ctx.lineTo(118, 100); ctx.lineTo(96, 116); ctx.lineTo(64, 116); ctx.lineTo(42, 100);
    ctx.closePath(); ctx.fill();
    // Facet lines
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.moveTo(50, 56 + bob); ctx.lineTo(80, 88); ctx.lineTo(110, 56 + bob);
    ctx.moveTo(42, 100); ctx.lineTo(80, 88); ctx.lineTo(118, 100);
    ctx.stroke();

    // Frozen core
    glowOrb(ctx, 80, 88, 26, p.glow, 0.85);
    ctx.fillStyle = p.glow;
    ctx.beginPath();
    ctx.moveTo(80, 74); ctx.lineTo(92, 88); ctx.lineTo(80, 104); ctx.lineTo(68, 88);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(80, 86, 4, 7, 0, 0, Math.PI * 2); ctx.fill();

    // Arms + fists
    ctx.fillStyle = p.primary;
    ctx.fillRect(24, 62 + bob, 20, 44); ctx.fillRect(116, 62 + bob, 20, 44);
    ctx.fillStyle = p.secondary;
    ctx.beginPath(); ctx.ellipse(34, 114, 19, 17, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(126, 114, 19, 17, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.light;
    spike(ctx, 26, 104, 6, 16, -6); spike(ctx, 134, 104, 6, 16, 6);

    // Head — crowned with icicles
    ctx.fillStyle = p.primary;
    ctx.beginPath();
    ctx.moveTo(62, 52 + bob); ctx.lineTo(98, 52 + bob); ctx.lineTo(92, 22 + bob); ctx.lineTo(68, 22 + bob);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = p.light;
    spike(ctx, 68, 22 + bob, 5, 18, -3); spike(ctx, 80, 20 + bob, 6, 24); spike(ctx, 92, 22 + bob, 5, 18, 3);

    eyes(ctx, [[72, 40 + bob], [88, 40 + bob]], 5, p.eye);
    if (rage > 0) glowOrb(ctx, 80, 84, 80, p.glow, 0.18 * rage);
}

// --- 5. VHALK, THE SPORELORD ----------------------------------------
function paintVhalk(ctx: CanvasRenderingContext2D, f: number, rage: number, p: BossPalette): void {
    const bob = f === 0 ? 0 : 3;
    shadow(ctx, 80, 48);

    // Root legs
    ctx.strokeStyle = p.secondary;
    ctx.lineWidth = 8; ctx.lineCap = 'round';
    for (const rx of [-26, -10, 8, 26]) {
        ctx.beginPath();
        ctx.moveTo(80 + rx * 0.4, 104);
        ctx.quadraticCurveTo(80 + rx, 128, 80 + rx * 1.5, 146);
        ctx.stroke();
    }
    ctx.lineWidth = 1;

    // Stalk body
    const sg = ctx.createLinearGradient(62, 60, 98, 116);
    sg.addColorStop(0, p.light); sg.addColorStop(1, p.secondary);
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(64, 108); ctx.quadraticCurveTo(58, 70 + bob, 70, 56 + bob);
    ctx.lineTo(90, 56 + bob); ctx.quadraticCurveTo(102, 70 + bob, 96, 108);
    ctx.closePath(); ctx.fill();

    // Arm-fronds
    ctx.strokeStyle = p.primary; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(64, 76 + bob); ctx.quadraticCurveTo(34, 84, 28, 112); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(96, 76 + bob); ctx.quadraticCurveTo(126, 84, 132, 112); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = p.accent;
    ctx.beginPath(); ctx.ellipse(28, 116, 11, 8, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(132, 116, 11, 8, -0.3, 0, Math.PI * 2); ctx.fill();

    // Gills under the cap
    ctx.fillStyle = p.glow;
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.ellipse(80, 54 + bob, 42, 12, 0, 0, Math.PI); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = p.dark;
    for (let i = -5; i <= 5; i++) {
        ctx.beginPath();
        ctx.moveTo(80 + i * 7, 50 + bob); ctx.lineTo(80 + i * 8, 62 + bob);
        ctx.stroke();
    }

    // Great cap
    const cg = ctx.createLinearGradient(30, 18, 130, 56);
    cg.addColorStop(0, p.accent); cg.addColorStop(0.45, p.primary); cg.addColorStop(1, p.secondary);
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.ellipse(80, 52 + bob, 60, 38, 0, Math.PI, 0);
    ctx.closePath(); ctx.fill();
    // Cap spots
    ctx.fillStyle = p.light;
    for (const [cx, cy, cr] of [[52, 34, 8], [80, 26, 10], [108, 36, 7], [66, 46, 5], [96, 46, 6]] as number[][]) {
        ctx.beginPath(); ctx.ellipse(cx, cy + bob, cr, cr * 0.72, 0, 0, Math.PI * 2); ctx.fill();
    }
    // Spore motes
    ctx.fillStyle = p.glow;
    ctx.globalAlpha = 0.6;
    for (let i = 0; i < 7; i++) {
        const a = i * 0.9 + f * 0.5;
        ctx.beginPath(); ctx.arc(80 + Math.cos(a) * 66, 60 + Math.sin(a) * 30, 2.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;

    eyes(ctx, [[70, 74 + bob], [90, 74 + bob]], 5, p.eye);
    if (rage > 0) glowOrb(ctx, 80, 60, 82, p.glow, 0.18 * rage);
}

// --- 6. IGNIVARR, THE MAGMA COLOSSUS --------------------------------
function paintIgnivarr(ctx: CanvasRenderingContext2D, f: number, rage: number, p: BossPalette): void {
    const bob = f === 0 ? 0 : 2;
    shadow(ctx, 80, 56);
    glowOrb(ctx, 80, 100, 84, p.glow, 0.28 + rage * 0.18);

    // Legs
    ctx.fillStyle = p.primary;
    ctx.fillRect(52, 106, 22, 40); ctx.fillRect(86, 106, 22, 40);
    ctx.fillStyle = p.secondary;
    ctx.fillRect(46, 138, 32, 11); ctx.fillRect(82, 138, 32, 11);

    // Torso — cracked obsidian
    ctx.fillStyle = p.primary;
    ctx.beginPath();
    ctx.moveTo(44, 52 + bob); ctx.lineTo(116, 52 + bob); ctx.lineTo(124, 96); ctx.lineTo(102, 114); ctx.lineTo(58, 114); ctx.lineTo(36, 96);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = p.secondary;
    ctx.beginPath();
    ctx.moveTo(58, 96); ctx.lineTo(102, 96); ctx.lineTo(102, 114); ctx.lineTo(58, 114);
    ctx.closePath(); ctx.fill();

    // Lava veins
    ctx.strokeStyle = p.accent;
    ctx.lineWidth = 3;
    ctx.shadowColor = p.glow; ctx.shadowBlur = 10;
    for (const path of [[[50, 58], [62, 76], [56, 96]], [[110, 58], [98, 78], [104, 100]], [[80, 112], [74, 128], [80, 144]]] as number[][][]) {
        ctx.beginPath();
        ctx.moveTo(path[0][0], path[0][1] + bob);
        for (let i = 1; i < path.length; i++) ctx.lineTo(path[i][0], path[i][1]);
        ctx.stroke();
    }
    ctx.shadowBlur = 0; ctx.lineWidth = 1;

    // Furnace chest
    glowOrb(ctx, 80, 82 + bob, 34, p.glow, 0.9);
    ctx.fillStyle = p.light;
    ctx.beginPath();
    ctx.moveTo(66, 66 + bob); ctx.lineTo(94, 66 + bob); ctx.lineTo(88, 96); ctx.lineTo(72, 96);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(74, 72 + bob, 12, 18);

    // Arms + molten fists
    ctx.fillStyle = p.primary;
    ctx.fillRect(16, 56 + bob, 24, 50); ctx.fillRect(120, 56 + bob, 24, 50);
    ctx.fillStyle = p.light;
    ctx.beginPath(); ctx.ellipse(28, 116, 22, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(132, 116, 22, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.accent;
    ctx.beginPath(); ctx.ellipse(28, 116, 13, 12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(132, 116, 13, 12, 0, 0, Math.PI * 2); ctx.fill();

    // Head — horned basalt
    ctx.fillStyle = p.secondary;
    ctx.beginPath();
    ctx.moveTo(60, 52 + bob); ctx.lineTo(100, 52 + bob); ctx.lineTo(94, 18 + bob); ctx.lineTo(66, 18 + bob);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = p.primary;
    ctx.beginPath(); ctx.moveTo(66, 22 + bob); ctx.lineTo(40, 2 + bob); ctx.lineTo(66, 12 + bob); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(94, 22 + bob); ctx.lineTo(120, 2 + bob); ctx.lineTo(94, 12 + bob); ctx.closePath(); ctx.fill();
    // Mouth vent
    ctx.fillStyle = p.accent;
    ctx.fillRect(68, 44 + bob, 24, 5);

    eyes(ctx, [[71, 34 + bob], [89, 34 + bob]], 6, p.eye);
}

// --- 7. PRISMA, THE CRYSTAL ARCHON ----------------------------------
function paintPrisma(ctx: CanvasRenderingContext2D, f: number, rage: number, p: BossPalette): void {
    const hover = f === 0 ? 0 : -5;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(80, 148, 34, 8, 0, 0, Math.PI * 2); ctx.fill();

    glowOrb(ctx, 80, 76 + hover, 78, p.glow, 0.35 + rage * 0.2);

    // Orbiting shards
    ctx.fillStyle = p.light;
    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + f * 0.45;
        const ox = 80 + Math.cos(a) * 60;
        const oy = 82 + hover + Math.sin(a) * 34;
        ctx.save();
        ctx.translate(ox, oy);
        ctx.rotate(a);
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.moveTo(0, -13); ctx.lineTo(7, 0); ctx.lineTo(0, 13); ctx.lineTo(-7, 0);
        ctx.closePath(); ctx.fill();
        ctx.restore();
    }
    ctx.globalAlpha = 1;

    // Lower shard mantle
    ctx.fillStyle = p.secondary;
    ctx.beginPath();
    ctx.moveTo(52, 96 + hover); ctx.lineTo(108, 96 + hover); ctx.lineTo(80, 146);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = p.primary;
    ctx.beginPath();
    ctx.moveTo(62, 98 + hover); ctx.lineTo(98, 98 + hover); ctx.lineTo(80, 134);
    ctx.closePath(); ctx.fill();

    // Central prism core
    const cg = ctx.createLinearGradient(50, 30 + hover, 110, 100 + hover);
    cg.addColorStop(0, p.light); cg.addColorStop(0.5, p.primary); cg.addColorStop(1, p.accent);
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(80, 18 + hover); ctx.lineTo(112, 62 + hover); ctx.lineTo(80, 104 + hover); ctx.lineTo(48, 62 + hover);
    ctx.closePath(); ctx.fill();
    // Facets
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.moveTo(80, 18 + hover); ctx.lineTo(80, 104 + hover);
    ctx.moveTo(48, 62 + hover); ctx.lineTo(112, 62 + hover);
    ctx.moveTo(80, 18 + hover); ctx.lineTo(64, 82 + hover);
    ctx.moveTo(80, 18 + hover); ctx.lineTo(96, 82 + hover);
    ctx.stroke();

    // Refraction beams
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = p.glow; ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
        const a = i * 1.57 + f * 0.3;
        ctx.beginPath();
        ctx.moveTo(80, 62 + hover);
        ctx.lineTo(80 + Math.cos(a) * 78, 62 + hover + Math.sin(a) * 62);
        ctx.stroke();
    }
    ctx.restore();
    ctx.lineWidth = 1;

    // Eye at the core
    eyes(ctx, [[80, 62 + hover]], 9, p.eye);
    ctx.fillStyle = p.accent;
    ctx.beginPath(); ctx.ellipse(80, 62 + hover, 3.5, 8, 0, 0, Math.PI * 2); ctx.fill();
}

// --- 8. NYXAROTH, THE SHADOW MONARCH --------------------------------
function paintNyxaroth(ctx: CanvasRenderingContext2D, f: number, rage: number, p: BossPalette): void {
    const drift = f === 0 ? 0 : -4;
    glowOrb(ctx, 80, 90 + drift, 80, p.glow, 0.22 + rage * 0.18);

    // Smoke tendrils below
    ctx.fillStyle = p.secondary;
    ctx.globalAlpha = 0.7;
    for (const tx of [50, 66, 80, 94, 110]) {
        ctx.beginPath();
        ctx.moveTo(tx - 8, 108 + drift);
        ctx.quadraticCurveTo(tx + (tx % 3 - 1) * 12, 132, tx, 152);
        ctx.quadraticCurveTo(tx - (tx % 3 - 1) * 10, 132, tx + 8, 108 + drift);
        ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Cloak
    const cg = ctx.createLinearGradient(80, 24 + drift, 80, 140);
    cg.addColorStop(0, p.light); cg.addColorStop(0.35, p.primary); cg.addColorStop(1, p.secondary);
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.moveTo(80, 24 + drift);
    ctx.quadraticCurveTo(24, 56 + drift, 30, 128);
    ctx.quadraticCurveTo(80, 112, 130, 128);
    ctx.quadraticCurveTo(136, 56 + drift, 80, 24 + drift);
    ctx.closePath(); ctx.fill();

    // Cloak inner void
    ctx.fillStyle = p.dark;
    ctx.beginPath();
    ctx.moveTo(80, 44 + drift);
    ctx.quadraticCurveTo(50, 66 + drift, 54, 120);
    ctx.quadraticCurveTo(80, 106, 106, 120);
    ctx.quadraticCurveTo(110, 66 + drift, 80, 44 + drift);
    ctx.closePath(); ctx.fill();

    // Reaching hands
    ctx.strokeStyle = p.light; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(46, 76 + drift); ctx.lineTo(26, 96 + drift); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(114, 76 + drift); ctx.lineTo(134, 96 + drift); ctx.stroke();
    ctx.lineWidth = 2;
    for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.moveTo(26, 96 + drift); ctx.lineTo(14 + i * 4, 108 + drift + i * 5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(134, 96 + drift); ctx.lineTo(146 - i * 4, 108 + drift + i * 5); ctx.stroke();
    }
    ctx.lineWidth = 1;

    // Hood + void face
    ctx.fillStyle = p.primary;
    ctx.beginPath(); ctx.ellipse(80, 40 + drift, 26, 30, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.ellipse(80, 44 + drift, 18, 22, 0, 0, Math.PI * 2); ctx.fill();

    // Void crown
    ctx.fillStyle = p.glow;
    ctx.save();
    ctx.shadowColor = p.glow; ctx.shadowBlur = 16;
    for (let i = 0; i < 5; i++) {
        const cx = 56 + i * 12;
        const ch = i === 2 ? 26 : 16 + (i % 2) * 4;
        spike(ctx, cx, 20 + drift, 4, ch);
    }
    ctx.restore();

    eyes(ctx, [[72, 42 + drift], [88, 42 + drift]], 4.5, p.eye);
}

// --- 9. VERDRAKAR, THE ELDER DRAKE ----------------------------------
function paintVerdrakar(ctx: CanvasRenderingContext2D, f: number, rage: number, p: BossPalette): void {
    const wing = f === 0 ? 0 : 10;
    shadow(ctx, 80, 60, 11);

    // Wings
    ctx.fillStyle = p.secondary;
    ctx.beginPath();
    ctx.moveTo(62, 60);
    ctx.quadraticCurveTo(8, 20 - wing, 2, 62 - wing);
    ctx.lineTo(20, 60); ctx.lineTo(10, 82 - wing); ctx.lineTo(34, 70); ctx.lineTo(28, 92 - wing);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(98, 60);
    ctx.quadraticCurveTo(152, 20 - wing, 158, 62 - wing);
    ctx.lineTo(140, 60); ctx.lineTo(150, 82 - wing); ctx.lineTo(126, 70); ctx.lineTo(132, 92 - wing);
    ctx.closePath(); ctx.fill();
    // Wing membrane sheen
    ctx.fillStyle = 'rgba(255,180,90,0.16)';
    ctx.beginPath(); ctx.moveTo(62, 60); ctx.quadraticCurveTo(20, 30 - wing, 12, 66 - wing); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(98, 60); ctx.quadraticCurveTo(140, 30 - wing, 148, 66 - wing); ctx.closePath(); ctx.fill();

    // Tail
    ctx.strokeStyle = p.primary; ctx.lineWidth = 14; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(84, 118); ctx.quadraticCurveTo(126, 132, 140, 108);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = p.light;
    ctx.beginPath(); ctx.moveTo(136, 116); ctx.lineTo(154, 92); ctx.lineTo(146, 118); ctx.closePath(); ctx.fill();

    // Hind legs
    ctx.fillStyle = p.secondary;
    ctx.fillRect(54, 106, 20, 38); ctx.fillRect(88, 106, 20, 38);
    ctx.fillStyle = p.dark;
    ctx.fillRect(48, 138, 30, 10); ctx.fillRect(84, 138, 30, 10);
    ctx.fillStyle = p.accent;
    for (let i = 0; i < 3; i++) { ctx.fillRect(50 + i * 9, 144, 5, 6); ctx.fillRect(86 + i * 9, 144, 5, 6); }

    // Body
    const bg = ctx.createLinearGradient(56, 40, 104, 120);
    bg.addColorStop(0, p.primary); bg.addColorStop(1, p.secondary);
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.ellipse(80, 84, 34, 44, 0, 0, Math.PI * 2); ctx.fill();
    // Gold belly scales
    ctx.fillStyle = p.accent;
    for (let i = 0; i < 5; i++) {
        ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.ellipse(80, 66 + i * 15, 20 - i * 2, 7, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Dorsal spines
    ctx.fillStyle = p.light;
    for (let i = 0; i < 4; i++) spike(ctx, 80, 48 + i * 16, 6, 14 - i * 2);

    // Fore claws
    ctx.fillStyle = p.primary;
    ctx.fillRect(38, 74, 16, 34); ctx.fillRect(106, 74, 16, 34);
    ctx.fillStyle = p.accent;
    for (let i = 0; i < 3; i++) { ctx.fillRect(36 + i * 6, 106, 4, 9); ctx.fillRect(104 + i * 6, 106, 4, 9); }

    // Neck + head
    ctx.fillStyle = p.primary;
    ctx.fillRect(70, 34, 20, 24);
    ctx.beginPath(); ctx.ellipse(80, 30, 26, 20, 0, 0, Math.PI * 2); ctx.fill();
    // Snout
    ctx.fillStyle = p.secondary;
    ctx.beginPath();
    ctx.moveTo(58, 30); ctx.lineTo(30, 36); ctx.lineTo(58, 44);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = p.light;
    ctx.beginPath(); ctx.moveTo(36, 36); ctx.lineTo(32, 44); ctx.lineTo(42, 38); ctx.closePath(); ctx.fill();
    // Horns
    ctx.fillStyle = p.light;
    ctx.beginPath(); ctx.moveTo(88, 16); ctx.lineTo(116, 0); ctx.lineTo(92, 22); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(80, 14); ctx.lineTo(100, -4); ctx.lineTo(86, 20); ctx.closePath(); ctx.fill();
    // Jaw glow (charging breath)
    glowOrb(ctx, 40, 38, 22, p.glow, 0.4 + rage * 0.4);

    eyes(ctx, [[64, 26]], 6, p.eye);
    ctx.fillStyle = p.dark;
    ctx.beginPath(); ctx.ellipse(64, 26, 2, 6, 0, 0, Math.PI * 2); ctx.fill();
}

// --- 10. ABADDON, THE ABYSSAL LORD ----------------------------------
function paintAbaddon(ctx: CanvasRenderingContext2D, f: number, rage: number, p: BossPalette): void {
    const bob = f === 0 ? 0 : 3;
    shadow(ctx, 80, 62, 12);
    glowOrb(ctx, 80, 84, 88, p.glow, 0.3 + rage * 0.25);

    // Shadow wings
    ctx.fillStyle = p.secondary;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(64, 54 + bob);
    ctx.quadraticCurveTo(0, 6, 4, 74); ctx.quadraticCurveTo(24, 58, 30, 96);
    ctx.quadraticCurveTo(44, 70, 64, 80);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(96, 54 + bob);
    ctx.quadraticCurveTo(160, 6, 156, 74); ctx.quadraticCurveTo(136, 58, 130, 96);
    ctx.quadraticCurveTo(116, 70, 96, 80);
    ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;

    // Cloven legs
    ctx.fillStyle = p.primary;
    ctx.fillRect(56, 108, 20, 30); ctx.fillRect(84, 108, 20, 30);
    ctx.fillStyle = p.dark;
    ctx.beginPath(); ctx.moveTo(52, 138); ctx.lineTo(78, 138); ctx.lineTo(70, 150); ctx.lineTo(58, 150); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(82, 138); ctx.lineTo(108, 138); ctx.lineTo(102, 150); ctx.lineTo(90, 150); ctx.closePath(); ctx.fill();

    // Torso
    const tg = ctx.createLinearGradient(50, 44, 110, 116);
    tg.addColorStop(0, p.light); tg.addColorStop(0.4, p.primary); tg.addColorStop(1, p.accent);
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.moveTo(52, 50 + bob); ctx.lineTo(108, 50 + bob); ctx.lineTo(118, 92);
    ctx.lineTo(96, 116); ctx.lineTo(64, 116); ctx.lineTo(42, 92);
    ctx.closePath(); ctx.fill();

    // Burning heart
    glowOrb(ctx, 80, 80 + bob, 30, p.glow, 0.95);
    ctx.fillStyle = p.eye;
    ctx.beginPath();
    ctx.moveTo(80, 62 + bob); ctx.lineTo(92, 80 + bob); ctx.lineTo(80, 100 + bob); ctx.lineTo(68, 80 + bob);
    ctx.closePath(); ctx.fill();

    // Four arms
    ctx.fillStyle = p.primary;
    ctx.fillRect(26, 52 + bob, 18, 46); ctx.fillRect(116, 52 + bob, 18, 46);
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillRect(34, 84, 16, 42); ctx.fillRect(110, 84, 16, 42);
    ctx.restore();
    ctx.fillStyle = p.accent;
    for (const hx of [35, 125]) {
        ctx.beginPath(); ctx.ellipse(hx, 104, 15, 13, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = p.dark;
    for (const hx of [42, 118]) {
        ctx.beginPath(); ctx.ellipse(hx, 132, 13, 11, 0, 0, Math.PI * 2); ctx.fill();
    }

    // Broken chains
    ctx.strokeStyle = '#6b6f78'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(48, 62 + bob); ctx.quadraticCurveTo(28, 96, 34, 128); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(112, 62 + bob); ctx.quadraticCurveTo(132, 96, 126, 128); ctx.stroke();
    ctx.lineWidth = 1;

    // Head — horned, many-eyed
    ctx.fillStyle = p.primary;
    ctx.beginPath(); ctx.ellipse(80, 34 + bob, 24, 24, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.dark;
    ctx.beginPath(); ctx.ellipse(80, 40 + bob, 18, 17, 0, 0, Math.PI * 2); ctx.fill();
    // Great horns
    ctx.fillStyle = p.accent;
    ctx.beginPath(); ctx.moveTo(58, 26 + bob); ctx.lineTo(22, -4); ctx.lineTo(60, 14 + bob); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(102, 26 + bob); ctx.lineTo(138, -4); ctx.lineTo(100, 14 + bob); ctx.closePath(); ctx.fill();
    // Crown of flame
    ctx.save();
    ctx.shadowColor = p.glow; ctx.shadowBlur = 18;
    ctx.fillStyle = p.glow;
    for (let i = 0; i < 5; i++) spike(ctx, 62 + i * 9, 14 + bob, 4, 12 + (i === 2 ? 8 : 0) + f * 3);
    ctx.restore();
    // Grin
    ctx.fillStyle = p.eye;
    ctx.fillRect(70, 46 + bob, 20, 3);
    ctx.fillStyle = p.dark;
    for (let i = 0; i < 5; i++) ctx.fillRect(71 + i * 4, 46 + bob, 1.5, 3);

    eyes(ctx, [[72, 32 + bob], [88, 32 + bob]], 5, p.eye);
    eyes(ctx, [[64, 42 + bob], [96, 42 + bob], [80, 24 + bob]], 3, p.eye);
}

type Painter = (ctx: CanvasRenderingContext2D, f: number, rage: number, p: BossPalette) => void;

const PAINTERS: Record<string, Painter> = {
    gloopus: paintGloopus,
    ossaric: paintOssaric,
    aranyx: paintAranyx,
    hrimthar: paintHrimthar,
    vhalk: paintVhalk,
    ignivarr: paintIgnivarr,
    prisma: paintPrisma,
    nyxaroth: paintNyxaroth,
    verdrakar: paintVerdrakar,
    abaddon: paintAbaddon,
    // Underworld. These reuse the strongest-fitting silhouettes driven by
    // wholly different palettes — a drowned choir reads nothing like a void
    // king even sharing a cloak shape.
    thalassor: paintNyxaroth,
    cinderach: paintHrimthar,
    ossuarch: paintOssaric,
    slagmaw: paintIgnivarr,
    the_hollow: paintAbaddon,
};

/** Paint a boss into a fresh 160x160 canvas. `rage` 0..1 adds phase glow. */
export function renderBossSprite(def: BossDef, frame: number, rage: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    const ctx = c.getContext('2d')!;
    const painter = PAINTERS[def.id] || paintOssaric;
    painter(ctx, frame, rage, def.palette);
    return c;
}

export const BOSS_SPRITE_SIZE = S;
