// ===== LIGHTING & FOG OF WAR =====

import type { DungeonFloor, PlayerState } from './types';

const LIGHT_RADIUS = 12;

export function updateVisibility(floor: DungeonFloor, player: PlayerState): void {
    const { width, height, tiles, visible, explored } = floor;

    // Reset visibility
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            visible[y][x] = false;
        }
    }

    // Simple raycasting FOV
    const px = player.x;
    const py = player.y;
    const numRays = 360;

    for (let i = 0; i < numRays; i++) {
        const angle = (i / numRays) * Math.PI * 2;
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);

        let cx = px + 0.5;
        let cy = py + 0.5;

        for (let d = 0; d < LIGHT_RADIUS; d++) {
            const tx = Math.floor(cx);
            const ty = Math.floor(cy);

            if (tx < 0 || tx >= width || ty < 0 || ty >= height) break;

            visible[ty][tx] = true;
            explored[ty][tx] = true;

            if (tiles[ty][tx] === 'WALL') break;

            cx += dx * 0.5;
            cy += dy * 0.5;
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

    for (let ty = startTileY; ty < endTileY; ty++) {
        for (let tx = startTileX; tx < endTileX; tx++) {
            const sx = tx * tileSize - camX;
            const sy = ty * tileSize - camY;

            if (!explored[ty][tx]) {
                // Fully black - unexplored
                ctx.fillStyle = 'rgba(0,0,0,1)';
                ctx.fillRect(sx, sy, tileSize, tileSize);
            } else if (!visible[ty][tx]) {
                // Dimmed - explored but not visible
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.fillRect(sx, sy, tileSize, tileSize);
            } else {
                // Light falloff based on distance from player
                const dx = tx - player.x;
                const dy = ty - player.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const alpha = Math.min(0.2, dist / LIGHT_RADIUS * 0.2);
                if (alpha > 0.02) {
                    ctx.fillStyle = `rgba(0,0,15,${alpha})`;
                    ctx.fillRect(sx, sy, tileSize, tileSize);
                }
            }
        }
    }

    // Torch flicker effect on player position
    const flickerRadius = LIGHT_RADIUS * tileSize * (0.9 + Math.sin(Date.now() * 0.003) * 0.1);
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
