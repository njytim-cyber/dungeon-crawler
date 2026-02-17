// ===== LIGHTING & FOG OF WAR =====

import type { DungeonFloor, PlayerState } from './types';

const LIGHT_RADIUS = 12;
const LIGHT_RADIUS_SQ = LIGHT_RADIUS * LIGHT_RADIUS;
const NUM_RAYS = 360;

// Precompute ray direction lookup table (avoids cos/sin every frame)
const RAY_DX: Float32Array = new Float32Array(NUM_RAYS);
const RAY_DY: Float32Array = new Float32Array(NUM_RAYS);
for (let i = 0; i < NUM_RAYS; i++) {
    const angle = (i / NUM_RAYS) * Math.PI * 2;
    RAY_DX[i] = Math.cos(angle) * 0.5;
    RAY_DY[i] = Math.sin(angle) * 0.5;
}

// Pre-bucketed alpha styles to avoid per-tile string interpolation
const ALPHA_STYLES: string[] = [];
for (let i = 0; i <= 20; i++) {
    ALPHA_STYLES[i] = `rgba(0,0,15,${(i / 100).toFixed(3)})`;
}

export function updateVisibility(floor: DungeonFloor, player: PlayerState): void {
    const { width, height, tiles, visible, explored } = floor;

    // Reset visibility
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            visible[y][x] = false;
        }
    }

    // Raycasting FOV with precomputed directions
    const px = player.x;
    const py = player.y;
    const startCX = px + 0.5;
    const startCY = py + 0.5;

    for (let i = 0; i < NUM_RAYS; i++) {
        const rdx = RAY_DX[i];
        const rdy = RAY_DY[i];
        let cx = startCX;
        let cy = startCY;

        for (let d = 0; d < LIGHT_RADIUS; d++) {
            const tx = cx | 0;  // Faster than Math.floor for positive numbers
            const ty = cy | 0;

            if (tx < 0 || tx >= width || ty < 0 || ty >= height) break;

            visible[ty][tx] = true;
            explored[ty][tx] = true;

            if (tiles[ty][tx] === 'WALL') break;

            cx += rdx;
            cy += rdy;
        }
    }
}

export function renderLighting(
    ctx: CanvasRenderingContext2D,
    floor: DungeonFloor,
    player: PlayerState,
    camX: number,
    camY: number,
    canvasW: number,
    canvasH: number,
    tileSize: number
): void {
    const { width, height, visible, explored } = floor;

    // Draw fog overlay
    const startTileX = Math.max(0, Math.floor(camX / tileSize));
    const startTileY = Math.max(0, Math.floor(camY / tileSize));
    const endTileX = Math.min(width, Math.ceil((camX + canvasW) / tileSize));
    const endTileY = Math.min(height, Math.ceil((camY + canvasH) / tileSize));

    // Batch fog rendering — group tiles by alpha level to minimise fillStyle changes
    const unexploredTiles: number[] = [];
    const dimmedTiles: number[] = [];
    // For visible tiles, bucket by alpha (0-20 scale)
    const alphaBuckets: number[][] = [];
    for (let i = 0; i <= 20; i++) alphaBuckets[i] = [];

    const playerX = player.x;
    const playerY = player.y;

    for (let ty = startTileY; ty < endTileY; ty++) {
        const visRow = visible[ty];
        const expRow = explored[ty];
        for (let tx = startTileX; tx < endTileX; tx++) {
            if (!expRow[tx]) {
                unexploredTiles.push(tx, ty);
            } else if (!visRow[tx]) {
                dimmedTiles.push(tx, ty);
            } else {
                const ddx = tx - playerX;
                const ddy = ty - playerY;
                const distSq = ddx * ddx + ddy * ddy;
                // Map squared distance to alpha bucket (0-20)
                const bucket = Math.min(20, (distSq / LIGHT_RADIUS_SQ * 20) | 0);
                if (bucket > 1) {
                    alphaBuckets[bucket].push(tx, ty);
                }
            }
        }
    }

    // Draw unexplored (single fillStyle)
    if (unexploredTiles.length > 0) {
        ctx.fillStyle = '#000';
        for (let i = 0; i < unexploredTiles.length; i += 2) {
            ctx.fillRect(unexploredTiles[i] * tileSize - camX, unexploredTiles[i + 1] * tileSize - camY, tileSize, tileSize);
        }
    }

    // Draw dimmed (single fillStyle)
    if (dimmedTiles.length > 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        for (let i = 0; i < dimmedTiles.length; i += 2) {
            ctx.fillRect(dimmedTiles[i] * tileSize - camX, dimmedTiles[i + 1] * tileSize - camY, tileSize, tileSize);
        }
    }

    // Draw visible tiles grouped by alpha bucket (minimises fillStyle changes)
    for (let b = 2; b <= 20; b++) {
        const tiles = alphaBuckets[b];
        if (tiles.length === 0) continue;
        ctx.fillStyle = ALPHA_STYLES[b];
        for (let i = 0; i < tiles.length; i += 2) {
            ctx.fillRect(tiles[i] * tileSize - camX, tiles[i + 1] * tileSize - camY, tileSize, tileSize);
        }
    }

    // Torch flicker effect on player position
    const now = performance.now();
    const flickerRadius = LIGHT_RADIUS * tileSize * (0.9 + Math.sin(now * 0.003) * 0.1);
    const px = player.px - camX + tileSize / 2;
    const py_pos = player.py - camY + tileSize / 2;
    const gradient = ctx.createRadialGradient(px, py_pos, 0, px, py_pos, flickerRadius);
    gradient.addColorStop(0, 'rgba(255,200,100,0.05)');
    gradient.addColorStop(0.5, 'rgba(255,150,50,0.02)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasW, canvasH);
}

export function renderDayNightOverlay(ctx: CanvasRenderingContext2D, width: number, height: number, time: number): void {
    // time is in minutes (0-1440)
    // 0 = 00:00 midnight
    // 360 = 06:00
    // 720 = 12:00
    // 1080 = 18:00
    // 1440 = 24:00

    // Night: 22:00 (1320) -> 05:00 (300)
    // Dawn: 05:00 (300) -> 07:00 (420)
    // Day: 07:00 (420) -> 17:00 (1020)
    // Sunset: 17:00 (1020) -> 20:00 (1200)
    // Dusk: 20:00 (1200) -> 22:00 (1320)



    if (time >= 300 && time < 420) {
        // Dawn (Blue/Black to Orange/Yellow)
        const ratio = (time - 300) / 120;
        // 0.6 alpha -> 0.0 alpha? No, transition colors.
        // Simple: 0.5 Dark Blue -> 0.2 Yellow/Orange -> 0.0
        // Use separate fill for simplicity

        // Fading out Night
        ctx.fillStyle = `rgba(10, 10, 30, ${0.4 * (1 - ratio)})`;
        ctx.fillRect(0, 0, width, height);

        // Fading in Sunrise
        ctx.fillStyle = `rgba(255, 200, 100, ${0.2 * ratio})`;
        ctx.fillRect(0, 0, width, height);
    }
    else if (time >= 420 && time < 1020) {
        // Day - Clear
    }
    else if (time >= 1020 && time < 1200) {
        // Sunset (Orange)
        const ratio = (time - 1020) / 180;
        ctx.fillStyle = `rgba(255, 100, 50, ${0.3 * ratio})`;
        ctx.fillRect(0, 0, width, height);
    }
    else if (time >= 1200 && time < 1320) {
        // Dusk (Orange -> Dark Blue)
        const ratio = (time - 1200) / 120;

        // Fading out Sunset
        ctx.fillStyle = `rgba(255, 100, 50, ${0.3 * (1 - ratio)})`;
        ctx.fillRect(0, 0, width, height);

        // Fading in Night
        ctx.fillStyle = `rgba(10, 10, 30, ${0.4 * ratio})`;
        ctx.fillRect(0, 0, width, height);
    }
    else {
        // Night
        ctx.fillStyle = 'rgba(10, 10, 30, 0.4)';
        ctx.fillRect(0, 0, width, height);
    }
}
