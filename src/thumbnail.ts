// ===== TITLE SCREEN THUMBNAIL =====
// Composes a little diorama out of the real game assets so the main menu
// shows what the game actually looks like, rather than a stock image.

import { Assets } from './assets';
import { getBiomeTiles } from './dungeon-renderer';
import { getBiome } from './biomes';
import { getBossDef } from './bosses';

// Rendered wide so it can be used as a full-bleed menu backdrop
const W = 480;
const H = 270;
const T = 24; // tile size in the diorama

export function renderThumbnail(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const biome = getBiome(21);            // Spider Caves — moody purple
    const tiles = getBiomeTiles(biome);
    const cols = Math.ceil(W / T);
    const rows = Math.ceil(H / T);

    // A hand-authored chamber: broken pillars and a ruined back wall
    const isWall = (cx: number, cy: number): boolean =>
        cy <= 0 || cy >= rows - 1 || cx <= 0 || cx >= cols - 1
        || (cy === 2 && cx > 3 && cx < 7)
        || (cy === 2 && cx > 12 && cx < 16)
        || (cx === 10 && cy > 6 && cy < 9);

    // Floor pass
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            ctx.drawImage(tiles.floor, x * T, y * T, T, T);
        }
    }

    // Wall pass (2.5D, matching the in-game look)
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            if (!isWall(x, y)) continue;
            const front = !isWall(x, y + 1);
            if (front) {
                ctx.drawImage(tiles.wall, x * T, y * T - T * 0.5, T, T * 1.5);
            } else {
                ctx.drawImage(tiles.wall, 0, 0, 16, 8, x * T, y * T, T, T);
            }
        }
    }

    // Torch pools of light
    for (const [tx, ty] of [[3, 1], [10, 1], [17, 1], [6, 9]] as number[][]) {
        const g = ctx.createRadialGradient(tx * T + T / 2, ty * T + T, 0, tx * T + T / 2, ty * T + T, T * 3);
        g.addColorStop(0, 'rgba(255,190,110,0.16)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(tx * T - T * 3, ty * T - T * 2, T * 6, T * 6);
    }

    // Props
    ctx.drawImage(Assets.get('chest'), 3 * T, 6 * T, T, T);
    const potion = Assets.getItem('potion_hp', 'common');
    if (potion) ctx.drawImage(potion, 8 * T + 4, 8 * T + 4, T - 8, T - 8);

    // Mobs closing in from both sides
    const bat = Assets.getEnemy('bat', 0);
    if (bat) ctx.drawImage(bat, 4 * T, 4 * T, T, T);
    const spider = Assets.getEnemy('spider', 1);
    if (spider) ctx.drawImage(spider, 11 * T, 8 * T, T, T);
    const skeleton = Assets.getEnemy('skeleton', 0);
    if (skeleton) ctx.drawImage(skeleton, 9 * T, 3 * T, T, T);

    const shadow = (cx: number, cy: number, rx: number) => {
        ctx.save();
        ctx.globalAlpha = 0.42;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, rx * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    };

    // The Broodmother looming on the right
    const boss = getBossDef(30);
    if (boss) {
        const sprite = Assets.getBoss(30, 0);
        if (sprite) {
            const span = T * 4.2;
            shadow(15 * T, 8 * T + T - 4, span * 0.3);
            ctx.drawImage(sprite, 15 * T - span / 2, 8 * T + T - span, span, span);
        }
    }

    // The hero, mid-swing
    const hero = Assets.getPlayer('warrior', 3, 0);
    if (hero) {
        shadow(6 * T + T / 2, 8 * T + T - 3, T * 0.32);
        ctx.drawImage(hero, 6 * T, 7 * T, T, T * 2);
        // Swing arc
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = 'rgba(220,240,255,0.75)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(6 * T + T / 2, 8 * T + T / 2, T * 1.2, -0.55, 0.75);
        ctx.stroke();
        ctx.restore();
    }

    // Biome ambience + vignette so it matches the in-game grade
    ctx.fillStyle = `rgba(${biome.ambientColor},0.16)`;
    ctx.fillRect(0, 0, W, H);
    const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.18, W / 2, H / 2, W * 0.62);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.62)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);

    return c;
}

/** Drop the diorama into the title screen's thumbnail frame. */
export function mountThumbnail(): void {
    const holder = document.getElementById('title-thumb');
    if (!holder || holder.querySelector('canvas')) return;
    try {
        const canvas = renderThumbnail();
        canvas.className = 'title-thumb-canvas';
        holder.appendChild(canvas);
    } catch (err) {
        // A missing asset should never block the menu
        console.warn('[thumb] could not render preview', err);
        holder.classList.add('hidden');
    }
}
