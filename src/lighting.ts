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
