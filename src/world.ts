// ===== WORLD PROPS & INTERACTABLES =====
// The landslide, the broken bridge, the hub portal and the colosseum gate all
// behave the same way: walk up, press E, read a line, pay if you want it open.

import type { PlayerState, DungeonFloor, Position, TileType } from './types';

export type InteractKind = 'landslide' | 'bridge' | 'portal' | 'rush';

export interface WorldInteract {
    kind: InteractKind;
    x: number;
    y: number;
}

/** Gold prices for the one-off unlocks. */
export const PRICE = {
    landslide: 500,
    bridge: 3000,
    portal: 2000,
    cityScroll: 750,
} as const;

const KIND_BY_TILE: Partial<Record<TileType, InteractKind>> = {
    RUBBLE: 'landslide',
    BRIDGE_BROKEN: 'bridge',
    PORTAL_BROKEN: 'portal',
    PORTAL: 'portal',
    RUSH_GATE: 'rush',
};

/** The prop the player is standing next to, if any. */
export function getInteractAt(player: PlayerState, floor: DungeonFloor): WorldInteract | null {
    const around: Position[] = [
        { x: player.x, y: player.y },
        { x: player.x, y: player.y - 1 },
        { x: player.x, y: player.y + 1 },
        { x: player.x - 1, y: player.y },
        { x: player.x + 1, y: player.y },
        // Props are 2 tiles tall, so also look one further up
        { x: player.x, y: player.y - 2 },
    ];
    for (const p of around) {
        const tile = floor.tiles[p.y]?.[p.x];
        if (!tile) continue;
        const kind = KIND_BY_TILE[tile];
        if (kind) return { kind, x: p.x, y: p.y };
    }
    return null;
}

/** Replace every tile of one type on a map — used when an unlock lands. */
export function replaceTiles(floor: DungeonFloor, from: TileType, to: TileType): void {
    for (let y = 0; y < floor.height; y++) {
        for (let x = 0; x < floor.width; x++) {
            if (floor.tiles[y][x] === from) floor.tiles[y][x] = to;
        }
    }
}

// ===================================================================
// PROP SPRITES
// ===================================================================

const propCache: Record<string, HTMLCanvasElement> = {};

function mk(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return [c, c.getContext('2d')!];
}

function paintRubble(): HTMLCanvasElement {
    const [c, ctx] = mk(16, 32);
    // A heaped slope of broken rock and torn earth
    ctx.fillStyle = '#3a3229';
    ctx.beginPath();
    ctx.moveTo(0, 32); ctx.lineTo(0, 18); ctx.lineTo(5, 10);
    ctx.lineTo(11, 13); ctx.lineTo(16, 8); ctx.lineTo(16, 32);
    ctx.closePath(); ctx.fill();
    // Boulders
    const rocks: number[][] = [[3, 20, 5], [10, 17, 6], [6, 26, 4], [13, 24, 5], [2, 14, 3]];
    for (const [rx, ry, rr] of rocks) {
        ctx.fillStyle = '#4d4438';
        ctx.beginPath(); ctx.ellipse(rx, ry, rr, rr * 0.8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#655a4a';
        ctx.beginPath(); ctx.ellipse(rx - rr * 0.25, ry - rr * 0.3, rr * 0.5, rr * 0.35, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.ellipse(rx + rr * 0.3, ry + rr * 0.4, rr * 0.45, rr * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    }
    // Splintered timber poking out
    ctx.fillStyle = '#5d4126';
    ctx.save(); ctx.translate(9, 15); ctx.rotate(-0.5); ctx.fillRect(0, 0, 9, 2); ctx.restore();
    ctx.fillStyle = '#3f2c19';
    ctx.save(); ctx.translate(2, 22); ctx.rotate(0.35); ctx.fillRect(0, 0, 7, 2); ctx.restore();
    // Loose scree at the base
    ctx.fillStyle = '#2b241c';
    for (let i = 0; i < 9; i++) ctx.fillRect((i * 5) % 15, 28 + (i % 3), 2, 1);
    return c;
}

function paintBrokenBridge(): HTMLCanvasElement {
    const [c, ctx] = mk(16, 16);
    // Water below
    ctx.fillStyle = '#1d4b63';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(1, 4, 6, 1); ctx.fillRect(9, 11, 5, 1);
    // A stub of decking clinging to the bank
    ctx.fillStyle = '#5a3f26';
    ctx.fillRect(0, 3, 7, 10);
    ctx.fillStyle = '#6d4d2f';
    ctx.fillRect(0, 3, 7, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 11, 7, 2);
    // Splintered end
    ctx.fillStyle = '#3f2c19';
    ctx.beginPath();
    ctx.moveTo(7, 3); ctx.lineTo(10, 6); ctx.lineTo(7, 8); ctx.lineTo(9, 11); ctx.lineTo(7, 13);
    ctx.closePath(); ctx.fill();
    // Snapped rope hanging
    ctx.strokeStyle = '#8a7350'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(6, 2); ctx.quadraticCurveTo(11, 5, 10, 9); ctx.stroke();
    // Rotten post
    ctx.fillStyle = '#4a3320';
    ctx.fillRect(2, 0, 2, 4);
    return c;
}

function paintPortal(broken: boolean): HTMLCanvasElement {
    const [c, ctx] = mk(16, 32);
    // Stone arch
    ctx.fillStyle = '#3f3a44';
    ctx.beginPath();
    ctx.moveTo(1, 32); ctx.lineTo(1, 12);
    ctx.quadraticCurveTo(8, 1, 15, 12);
    ctx.lineTo(15, 32);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#524b58';
    ctx.beginPath();
    ctx.moveTo(1, 12); ctx.quadraticCurveTo(8, 1, 15, 12);
    ctx.lineTo(13, 13); ctx.quadraticCurveTo(8, 4, 3, 13);
    ctx.closePath(); ctx.fill();
    // Inner opening
    ctx.fillStyle = broken ? '#141018' : '#1a0f2e';
    ctx.beginPath();
    ctx.moveTo(4, 32); ctx.lineTo(4, 13);
    ctx.quadraticCurveTo(8, 6, 12, 13);
    ctx.lineTo(12, 32);
    ctx.closePath(); ctx.fill();

    if (broken) {
        // Dead: cracked keystone, dark aperture, rubble at the foot
        ctx.strokeStyle = '#1c181f'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(8, 4); ctx.lineTo(7, 12); ctx.lineTo(10, 18); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(2, 20); ctx.lineTo(6, 24); ctx.stroke();
        ctx.fillStyle = '#2e2a33';
        ctx.fillRect(3, 29, 4, 3); ctx.fillRect(9, 30, 5, 2);
        // A single dying spark
        ctx.fillStyle = 'rgba(150,110,220,0.35)';
        ctx.fillRect(7, 20, 2, 2);
    } else {
        // Live: swirling violet aperture
        const g = ctx.createRadialGradient(8, 20, 1, 8, 20, 9);
        g.addColorStop(0, '#e8d8ff');
        g.addColorStop(0.4, '#9b6bff');
        g.addColorStop(1, 'rgba(90,40,180,0)');
        ctx.fillStyle = g;
        ctx.fillRect(2, 10, 12, 22);
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.fillRect(7, 14, 1, 12);
        // Lit runes on the arch
        ctx.fillStyle = '#c9a4ff';
        ctx.fillRect(3, 15, 1, 1); ctx.fillRect(12, 15, 1, 1); ctx.fillRect(8, 7, 1, 1);
    }
    return c;
}

function paintRushGate(): HTMLCanvasElement {
    const [c, ctx] = mk(16, 32);
    // Colosseum arch in pale stone
    ctx.fillStyle = '#6b6152';
    ctx.fillRect(0, 6, 16, 26);
    ctx.fillStyle = '#7d7261';
    ctx.fillRect(0, 6, 16, 2);
    // Blocks
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    for (let y = 8; y < 32; y += 5) ctx.fillRect(0, y, 16, 1);
    for (let y = 8; y < 32; y += 10) ctx.fillRect(7, y, 1, 5);
    // Dark archway
    ctx.fillStyle = '#140f0c';
    ctx.beginPath();
    ctx.moveTo(4, 32); ctx.lineTo(4, 18);
    ctx.quadraticCurveTo(8, 11, 12, 18);
    ctx.lineTo(12, 32);
    ctx.closePath(); ctx.fill();
    // Crossed swords over the keystone
    ctx.strokeStyle = '#c9a227'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(4, 1); ctx.lineTo(12, 9); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(12, 1); ctx.lineTo(4, 9); ctx.stroke();
    // Torch sconces
    ctx.fillStyle = '#ff8a3d';
    ctx.fillRect(1, 14, 2, 3); ctx.fillRect(13, 14, 2, 3);
    return c;
}

function paintCityFloor(): HTMLCanvasElement {
    const [c, ctx] = mk(16, 16);
    // Laid paving slabs, cleaner and cooler than dungeon stone
    ctx.fillStyle = '#5a5f66';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#646a72';
    ctx.fillRect(0, 0, 15, 7); ctx.fillRect(0, 8, 7, 7);
    ctx.fillStyle = '#6e747d';
    ctx.fillRect(8, 8, 7, 7);
    ctx.fillStyle = '#474b52';
    ctx.fillRect(0, 7, 16, 1); ctx.fillRect(7, 8, 1, 8); ctx.fillRect(15, 0, 1, 7);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, 0, 15, 1); ctx.fillRect(0, 8, 7, 1); ctx.fillRect(8, 8, 7, 1);
    return c;
}

function paintCityBuilding(): HTMLCanvasElement {
    const [c, ctx] = mk(16, 16);
    // Rendered facade with tall windows
    ctx.fillStyle = '#3d4149';
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = '#474c55';
    ctx.fillRect(1, 1, 14, 14);
    // Windows, some lit
    for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
            const wx = 3 + i * 7, wy = 3 + j * 6;
            const lit = (i + j) % 3 !== 0;
            ctx.fillStyle = lit ? '#ffd88a' : '#20242b';
            ctx.fillRect(wx, wy, 4, 4);
            ctx.fillStyle = 'rgba(0,0,0,0.35)';
            ctx.fillRect(wx, wy, 4, 1);
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.fillRect(wx, wy + 3, 4, 1);
        }
    }
    // Cornice
    ctx.fillStyle = '#585e68';
    ctx.fillRect(0, 0, 16, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 15, 16, 1);
    return c;
}

function paintLamp(): HTMLCanvasElement {
    const [c, ctx] = mk(16, 32);
    // Cast-iron street lamp
    ctx.fillStyle = '#23262b';
    ctx.fillRect(7, 8, 2, 22);
    ctx.fillStyle = '#33373d';
    ctx.fillRect(7, 8, 1, 22);
    // Base
    ctx.fillStyle = '#1a1d21';
    ctx.fillRect(5, 29, 6, 3);
    // Lantern housing
    ctx.fillStyle = '#2a2e34';
    ctx.beginPath();
    ctx.moveTo(4, 8); ctx.lineTo(12, 8); ctx.lineTo(10, 1); ctx.lineTo(6, 1);
    ctx.closePath(); ctx.fill();
    // Glass + flame
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(6, 3, 4, 4);
    ctx.fillStyle = '#fff6d0';
    ctx.fillRect(7, 4, 2, 2);
    // Finial
    ctx.fillStyle = '#3d424a';
    ctx.fillRect(7, 0, 2, 1);
    return c;
}

function paintPlanter(): HTMLCanvasElement {
    const [c, ctx] = mk(16, 16);
    ctx.fillStyle = '#4a4a52';
    ctx.fillRect(2, 8, 12, 7);
    ctx.fillStyle = '#5a5a64';
    ctx.fillRect(2, 8, 12, 2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(2, 14, 12, 1);
    // Soil + trimmed shrub
    ctx.fillStyle = '#2e2318';
    ctx.fillRect(3, 9, 10, 2);
    ctx.fillStyle = '#3f6b3a';
    ctx.beginPath(); ctx.ellipse(8, 7, 6, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#4f8046';
    ctx.beginPath(); ctx.ellipse(6, 5, 3.4, 2.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d8607a';
    ctx.fillRect(10, 4, 2, 2); ctx.fillRect(5, 8, 2, 2);
    return c;
}

export function getProp(key: string): HTMLCanvasElement {
    if (propCache[key]) return propCache[key];
    let c: HTMLCanvasElement;
    switch (key) {
        case 'rubble': c = paintRubble(); break;
        case 'bridgeBroken': c = paintBrokenBridge(); break;
        case 'portal': c = paintPortal(false); break;
        case 'portalBroken': c = paintPortal(true); break;
        case 'rushGate': c = paintRushGate(); break;
        case 'cityFloor': c = paintCityFloor(); break;
        case 'cityBuilding': c = paintCityBuilding(); break;
        case 'lamp': c = paintLamp(); break;
        case 'planter': c = paintPlanter(); break;
        default: c = paintRubble(); break;
    }
    propCache[key] = c;
    return c;
}
