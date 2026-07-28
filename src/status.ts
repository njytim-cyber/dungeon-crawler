// ===== STATUS EFFECTS =====
// Burn, poison and bleed tick damage. Freeze and stun take away turns.
// Weaken cuts damage dealt. Everything here works on both the player and
// enemies, so a poison dart trap and a Venom Fang use the same code path.

import type { EnemyState, PlayerState, StatusEffect, StatusKind, Element } from './types';
import { STATUS_DEFS, ELEMENT_COLOR } from './types';
import { addFloatingText, spawnParticles } from './particles';

/** How long each status lasts by default, and how hard it hits. */
const DEFAULTS: Record<StatusKind, { duration: number; power: number }> = {
    burn: { duration: 4, power: 4 },
    poison: { duration: 6, power: 3 },
    bleed: { duration: 5, power: 5 },
    freeze: { duration: 2.5, power: 0.5 },   // power = speed multiplier
    stun: { duration: 1.2, power: 0 },
    weaken: { duration: 5, power: 0.3 },     // power = damage reduction
};

/** Which status an element inflicts when it procs. */
export const ELEMENT_STATUS: Partial<Record<Element, StatusKind>> = {
    fire: 'burn',
    ice: 'freeze',
    poison: 'poison',
    shadow: 'weaken',
    lightning: 'stun',
};

interface StatusHost {
    statuses?: StatusEffect[];
}

/**
 * Apply a status. Re-applying refreshes the duration and keeps the stronger
 * power rather than stacking infinitely.
 */
export function applyStatus(
    host: StatusHost,
    kind: StatusKind,
    fromPlayer: boolean,
    powerScale = 1,
    durationScale = 1,
): void {
    if (!host.statuses) host.statuses = [];
    const d = DEFAULTS[kind];
    const power = kind === 'freeze' || kind === 'weaken' ? d.power : d.power * powerScale;
    const duration = d.duration * durationScale;

    const existing = host.statuses.find(s => s.kind === kind);
    if (existing) {
        existing.remaining = Math.max(existing.remaining, duration);
        existing.power = Math.max(existing.power, power);
        return;
    }
    host.statuses.push({
        kind,
        remaining: duration,
        power,
        tick: STATUS_DEFS[kind].interval,
        fromPlayer,
    });
}

export function hasStatus(host: StatusHost, kind: StatusKind): boolean {
    return !!host.statuses?.some(s => s.kind === kind && s.remaining > 0);
}

export function clearStatuses(host: StatusHost): void {
    if (host.statuses) host.statuses.length = 0;
}

/** Damage multiplier from debuffs the attacker is carrying. */
export function outgoingMultiplier(host: StatusHost): number {
    const weak = host.statuses?.find(s => s.kind === 'weaken');
    return weak ? 1 - weak.power : 1;
}

/** Speed multiplier from freeze. 1 = unaffected. */
export function speedMultiplier(host: StatusHost): number {
    const frozen = host.statuses?.find(s => s.kind === 'freeze');
    return frozen ? frozen.power : 1;
}

/** True while the host cannot act at all. */
export function isDisabled(host: StatusHost): boolean {
    return hasStatus(host, 'stun');
}

/**
 * Advance every status on an enemy. Returns the damage dealt this frame so the
 * caller can handle death, loot and kill credit in its own way.
 */
export function tickEnemyStatuses(enemy: EnemyState, dt: number): number {
    if (!enemy.statuses || enemy.statuses.length === 0) return 0;
    let damage = 0;

    for (let i = enemy.statuses.length - 1; i >= 0; i--) {
        const s = enemy.statuses[i];
        s.remaining -= dt;

        const def = STATUS_DEFS[s.kind];
        if (def.interval > 0) {
            s.tick -= dt;
            if (s.tick <= 0) {
                s.tick = def.interval;
                const dmg = Math.max(1, Math.round(s.power));
                damage += dmg;
                addFloatingText(enemy.px + 8, enemy.py - 4, `${dmg}`, def.color);
                spawnParticles(enemy.px + 8, enemy.py + 8, 3, def.color, 1.2, -0.02, 2);
            }
        }

        if (s.remaining <= 0) enemy.statuses.splice(i, 1);
    }

    enemy.disabledTimer = isDisabled(enemy) ? 0.1 : 0;
    return damage;
}

/** Same for the player. Returns damage taken. */
export function tickPlayerStatuses(player: PlayerState, dt: number): number {
    if (!player.statuses || player.statuses.length === 0) return 0;
    let damage = 0;

    for (let i = player.statuses.length - 1; i >= 0; i--) {
        const s = player.statuses[i];
        s.remaining -= dt;

        const def = STATUS_DEFS[s.kind];
        if (def.interval > 0) {
            s.tick -= dt;
            if (s.tick <= 0) {
                s.tick = def.interval;
                const dmg = Math.max(1, Math.round(s.power));
                damage += dmg;
                addFloatingText(player.px + 8, player.py - 4, `-${dmg}`, def.color);
                spawnParticles(player.px + 8, player.py + 8, 3, def.color, 1.2, -0.02, 2);
            }
        }

        if (s.remaining <= 0) player.statuses.splice(i, 1);
    }
    return damage;
}

/** Draw the little status pips floating over a creature. */
export function renderStatusIcons(
    ctx: CanvasRenderingContext2D,
    statuses: StatusEffect[] | undefined,
    sx: number,
    sy: number,
    tileSize: number,
    time: number,
): void {
    if (!statuses || statuses.length === 0) return;
    ctx.save();
    ctx.font = '8px sans-serif';
    ctx.textAlign = 'center';
    statuses.forEach((s, i) => {
        const def = STATUS_DEFS[s.kind];
        const bob = Math.sin(time * 0.006 + i * 1.4) * 1.5;
        const x = sx + tileSize / 2 + (i - (statuses.length - 1) / 2) * 9;
        ctx.globalAlpha = s.remaining < 1 ? Math.max(0.25, s.remaining) : 1;
        ctx.fillText(def.icon, x, sy - 10 + bob);
    });
    ctx.restore();
}

/** A wash of colour over a creature that is burning, frozen, poisoned… */
export function statusTint(statuses: StatusEffect[] | undefined): string | null {
    if (!statuses || statuses.length === 0) return null;
    // Strongest visual wins
    const order: StatusKind[] = ['freeze', 'burn', 'poison', 'bleed', 'stun', 'weaken'];
    for (const k of order) {
        if (statuses.some(s => s.kind === k)) return STATUS_DEFS[k].color;
    }
    return null;
}

export function elementColor(el: Element | undefined): string {
    return ELEMENT_COLOR[el ?? 'physical'];
}
