// ===== MINIMAP =====

import type { DungeonFloor, PlayerState, EnemyState } from './types';
import type { RemotePlayerState } from './multiplayer-types';

const minimapCanvas = document.getElementById('minimapCanvas') as HTMLCanvasElement | null;
const MINIMAP_SCALE = 2;

export function renderMinimap(floor: DungeonFloor, player: PlayerState, remotePlayers?: Map<string, RemotePlayerState>): void {
    if (!minimapCanvas) return;
    const ctx = minimapCanvas.getContext('2d');
    if (!ctx) return;

    const mw = 140;
    const mh = 140;
    minimapCanvas.width = mw;
    minimapCanvas.height = mh;

    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, mw, mh);

    // Center on player
    const offsetX = Math.floor(mw / 2 - player.x * MINIMAP_SCALE);
    const offsetY = Math.floor(mh / 2 - player.y * MINIMAP_SCALE);

    const { width, height, tiles, explored, visible } = floor;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (!explored[y][x]) continue;

            const mx = x * MINIMAP_SCALE + offsetX;
            const my = y * MINIMAP_SCALE + offsetY;

            if (mx < -MINIMAP_SCALE || mx > mw || my < -MINIMAP_SCALE || my > mh) continue;

            const tile = tiles[y][x];
            const isVisible = visible[y][x];
            const alpha = isVisible ? 1 : 0.4;

            ctx.globalAlpha = alpha;

            switch (tile) {
                case 'WALL':
                    ctx.fillStyle = '#334';
                    break;
                case 'FLOOR':
                    ctx.fillStyle = '#665';
                    break;
                case 'DOOR':
                    ctx.fillStyle = '#885';
                    break;
                case 'STAIRS_DOWN':
                    ctx.fillStyle = '#5a5';
                    break;
                case 'STAIRS_UP':
                    ctx.fillStyle = '#88a';
                    break;
                case 'CHEST':
                    ctx.fillStyle = '#da0';
                    break;
                case 'TRAP':
                    ctx.fillStyle = isVisible ? '#a33' : '#665';
                    break;
                default:
                    ctx.fillStyle = '#222';
            }

            ctx.fillRect(mx, my, MINIMAP_SCALE, MINIMAP_SCALE);
        }
    }

    ctx.globalAlpha = 1;

    // Draw enemies on minimap (only visible ones)
    floor.enemies.forEach((enemy: EnemyState) => {
        if (!enemy.alive || !visible[enemy.y]?.[enemy.x]) return;
        const mx = enemy.x * MINIMAP_SCALE + offsetX;
        const my = enemy.y * MINIMAP_SCALE + offsetY;
        ctx.fillStyle = enemy.isBoss ? '#f00' : '#e74c3c';
        ctx.fillRect(mx, my, MINIMAP_SCALE, MINIMAP_SCALE);
    });

    // Draw NPCs
    floor.npcs.forEach(npc => {
        if (!visible[npc.y]?.[npc.x]) return;
        const mx = npc.x * MINIMAP_SCALE + offsetX;
        const my = npc.y * MINIMAP_SCALE + offsetY;
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(mx, my, MINIMAP_SCALE, MINIMAP_SCALE);
    });

    // Draw remote players (co-op teammates)
    if (remotePlayers) {
        remotePlayers.forEach(rp => {
            const mx = rp.x * MINIMAP_SCALE + offsetX;
            const my = rp.y * MINIMAP_SCALE + offsetY;
            if (mx < -MINIMAP_SCALE || mx > mw || my < -MINIMAP_SCALE || my > mh) return;
            // Pulsing dot for teammates
            ctx.fillStyle = rp.nameColor || '#a29bfe';
            ctx.globalAlpha = rp.alive ? 1 : 0.4;
            ctx.fillRect(mx - 1, my - 1, MINIMAP_SCALE + 2, MINIMAP_SCALE + 2);
            ctx.globalAlpha = 1;
        });
    }

    // Draw player
    const pmx = player.x * MINIMAP_SCALE + offsetX;
    const pmy = player.y * MINIMAP_SCALE + offsetY;
    ctx.fillStyle = '#fff';
    ctx.fillRect(pmx, pmy, MINIMAP_SCALE + 1, MINIMAP_SCALE + 1);
}
