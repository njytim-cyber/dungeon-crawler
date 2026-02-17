// ===== PARTICLE SYSTEM =====
// Optimized: swap-and-pop removal, for-loops, single globalAlpha restore

import type { Particle, FloatingText } from './types';

// Use pre-allocated pool with active count instead of dynamic arrays
let particles: Particle[] = [];
let particleCount = 0;
let floatingTexts: FloatingText[] = [];
let textCount = 0;

export function spawnParticles(x: number, y: number, count: number, color: string, speed = 2, gravity = 0.05, size = 2): void {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const spd = Math.random() * speed;
        const p: Particle = {
            x, y,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            life: 1,
            maxLife: 0.4 + Math.random() * 0.4,
            color,
            size: size + Math.random() * size,
            gravity,
        };
        if (particleCount < particles.length) {
            particles[particleCount] = p;
        } else {
            particles.push(p);
        }
        particleCount++;
    }
}

export function spawnHitParticles(x: number, y: number): void {
    spawnParticles(x, y, 8, '#f1c40f', 3, 0.1, 2);
    spawnParticles(x, y, 4, '#e74c3c', 2, 0.05, 1);
}

export function spawnHealParticles(x: number, y: number): void {
    spawnParticles(x, y, 10, '#2ecc71', 1.5, -0.03, 2);
}

export function spawnLevelUpParticles(x: number, y: number): void {
    spawnParticles(x, y, 20, '#f1c40f', 3, -0.02, 3);
    spawnParticles(x, y, 10, '#fff', 2, -0.01, 2);
}

export function spawnDeathParticles(x: number, y: number, color: string): void {
    spawnParticles(x, y, 15, color, 2, 0.08, 2);
    spawnParticles(x, y, 5, '#555', 1, 0.05, 3);
}

export function spawnTorchEmbers(x: number, y: number): void {
    if (Math.random() > 0.1) return;
    spawnParticles(x, y, 1, '#f80', 0.5, -0.02, 1);
}

export function addFloatingText(x: number, y: number, text: string, color: string): void {
    const ft: FloatingText = { x, y, text, color, life: 1, vy: -1.5 };
    if (textCount < floatingTexts.length) {
        floatingTexts[textCount] = ft;
    } else {
        floatingTexts.push(ft);
    }
    textCount++;
}

export function updateParticles(dt: number): void {
    // Swap-and-pop removal (O(1) per removal instead of O(n) splice)
    for (let i = particleCount - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.life -= dt / p.maxLife;
        if (p.life <= 0) {
            // Swap with last active particle
            particleCount--;
            if (i < particleCount) {
                particles[i] = particles[particleCount];
            }
        }
    }

    for (let i = textCount - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.y += ft.vy * dt * 30;
        ft.life -= dt;
        if (ft.life <= 0) {
            textCount--;
            if (i < textCount) {
                floatingTexts[i] = floatingTexts[textCount];
            }
        }
    }
}

export function renderParticles(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    for (let i = 0; i < particleCount; i++) {
        const p = particles[i];
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - camX - p.size * 0.5, p.y - camY - p.size * 0.5, p.size, p.size);
    }
    ctx.globalAlpha = 1;
}

export function renderFloatingTexts(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    if (textCount === 0) return;
    ctx.font = '8px "Press Start 2P"';
    ctx.textAlign = 'center';
    for (let i = 0; i < textCount; i++) {
        const ft = floatingTexts[i];
        ctx.globalAlpha = Math.max(0, ft.life);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x - camX, ft.y - camY);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
}

export function clearParticles(): void {
    particleCount = 0;
    textCount = 0;
}
