// ===== NEAR-DEATH STATE =====
// Below the danger threshold the screen floods with blood: a pulsing crimson
// vignette locked to a heartbeat, spatter creeping in from the edges, and the
// world draining of colour. It should feel like you are about to lose the run.

import type { PlayerState } from './types';
import { GameAudio } from './audio';

/** Absolute HP below which the warning kicks in. */
export const DANGER_HP = 30;
/** …or this fraction of max HP, whichever triggers first. */
export const DANGER_FRACTION = 0.25;

let spatterCanvas: HTMLCanvasElement | null = null;
let spatterKey = '';
let lastBeat = 0;
let beatPhase = 0;

/** 0 = safe, 1 = one hit from death. */
export function getDanger(player: PlayerState): number {
    if (!player.alive) return 0;
    const byAbs = 1 - player.stats.hp / DANGER_HP;
    const byPct = 1 - (player.stats.hp / player.stats.maxHp) / DANGER_FRACTION;
    const d = Math.max(byAbs, byPct);
    return Math.max(0, Math.min(1, d));
}

/** Procedural blood spatter around the screen edge, cached per size. */
function getSpatter(w: number, h: number): HTMLCanvasElement {
    const key = `${w}x${h}`;
    if (spatterCanvas && spatterKey === key) return spatterCanvas;

    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d')!;

    // Deterministic-ish scatter hugging the frame
    let seed = 1337;
    const rnd = () => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 4294967296;
    };

    const blob = (x: number, y: number, r: number, alpha: number) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(120,0,8,${alpha})`);
        g.addColorStop(0.6, `rgba(90,0,6,${alpha * 0.6})`);
        g.addColorStop(1, 'rgba(60,0,4,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        // Irregular splat rather than a clean circle
        ctx.moveTo(x + r, y);
        for (let a = 0; a < Math.PI * 2; a += 0.5) {
            const rr = r * (0.65 + rnd() * 0.6);
            ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fill();
    };

    const edgeCount = 34;
    for (let i = 0; i < edgeCount; i++) {
        const side = i % 4;
        const t = rnd();
        let x = 0, y = 0;
        if (side === 0) { x = t * w; y = rnd() * h * 0.18; }
        else if (side === 1) { x = t * w; y = h - rnd() * h * 0.18; }
        else if (side === 2) { x = rnd() * w * 0.16; y = t * h; }
        else { x = w - rnd() * w * 0.16; y = t * h; }
        blob(x, y, 26 + rnd() * 80, 0.55 + rnd() * 0.35);
    }

    // A few runs dripping down from the top edge
    for (let i = 0; i < 7; i++) {
        const x = rnd() * w;
        const len = 40 + rnd() * 150;
        const wdt = 3 + rnd() * 7;
        const g = ctx.createLinearGradient(x, 0, x, len);
        g.addColorStop(0, 'rgba(120,0,8,0.75)');
        g.addColorStop(1, 'rgba(90,0,6,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x, 0, wdt, len);
        ctx.beginPath();
        ctx.arc(x + wdt / 2, len, wdt * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(110,0,7,0.35)';
        ctx.fill();
    }

    spatterCanvas = c;
    spatterKey = key;
    return c;
}

/**
 * Draw the near-death treatment. Call late in the frame, after the world and
 * lighting but before the HUD, so the UI stays legible.
 */
export function renderNearDeath(
    ctx: CanvasRenderingContext2D,
    player: PlayerState,
    w: number,
    h: number,
    time: number,
): void {
    const danger = getDanger(player);
    if (danger <= 0) return;

    // Heartbeat gets faster and harder as HP falls
    const bpm = 78 + danger * 92;
    const beatMs = 60000 / bpm;
    if (time - lastBeat > beatMs) {
        lastBeat = time;
        beatPhase = 1;
        GameAudio.heartbeat(danger);
    }
    beatPhase = Math.max(0, beatPhase - 0.055);
    // Sharp thump, slow release
    const thump = Math.pow(beatPhase, 0.55);

    // --- Blood vignette: heavy at the edges, clear in the middle ---
    const strength = 0.30 + danger * 0.48 + thump * 0.22;
    const inner = 0.40 - danger * 0.20 - thump * 0.06;
    const g = ctx.createRadialGradient(
        w / 2, h / 2, Math.max(10, w * inner),
        w / 2, h / 2, w * 0.78,
    );
    g.addColorStop(0, 'rgba(120,0,0,0)');
    g.addColorStop(0.55, `rgba(105,0,4,${strength * 0.42})`);
    g.addColorStop(1, `rgba(72,0,3,${Math.min(0.95, strength)})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // --- Spatter creeping in ---
    ctx.save();
    ctx.globalAlpha = Math.min(0.85, 0.22 + danger * 0.5 + thump * 0.16);
    ctx.drawImage(getSpatter(w, h), 0, 0);
    ctx.restore();

    // --- Whole-screen crimson wash on the beat ---
    ctx.fillStyle = `rgba(150,0,10,${0.05 * danger + thump * 0.14 * danger})`;
    ctx.fillRect(0, 0, w, h);

    // --- Pulsing frame, like arterial pressure ---
    const border = 5 + thump * 12 + danger * 6;
    ctx.save();
    ctx.globalAlpha = 0.35 + thump * 0.5;
    const bg = ctx.createLinearGradient(0, 0, 0, border);
    bg.addColorStop(0, 'rgba(190,10,20,0.9)');
    bg.addColorStop(1, 'rgba(190,10,20,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, border);
    ctx.save();
    ctx.translate(0, h); ctx.scale(1, -1);
    ctx.fillRect(0, 0, w, border);
    ctx.restore();
    const sg = ctx.createLinearGradient(0, 0, border, 0);
    sg.addColorStop(0, 'rgba(190,10,20,0.9)');
    sg.addColorStop(1, 'rgba(190,10,20,0)');
    ctx.fillStyle = sg;
    ctx.fillRect(0, 0, border, h);
    ctx.save();
    ctx.translate(w, 0); ctx.scale(-1, 1);
    ctx.fillRect(0, 0, border, h);
    ctx.restore();
    ctx.restore();

    // --- "ON DEATH'S DOOR" warning at critical danger ---
    if (danger > 0.62) {
        const flash = 0.55 + Math.sin(time * 0.011) * 0.45;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.font = '12px "Press Start 2P"';
        ctx.globalAlpha = flash;
        ctx.fillStyle = '#ff2b2b';
        ctx.shadowColor = '#ff0000';
        ctx.shadowBlur = 22;
        ctx.fillText("ON DEATH'S DOOR", w / 2, h * 0.2);
        ctx.font = '7px "Press Start 2P"';
        ctx.globalAlpha = flash * 0.8;
        ctx.fillStyle = '#ffb3b3';
        ctx.shadowBlur = 10;
        ctx.fillText('HEAL — OR DIE HERE', w / 2, h * 0.2 + 20);
        ctx.restore();
    }
}

export function resetNearDeath(): void {
    lastBeat = 0;
    beatPhase = 0;
}
