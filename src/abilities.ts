// ===== CLASS ABILITIES =====
// One signature move per class, on a cooldown, bound to X. These are what
// finally make the nine classes play differently rather than just roll
// different stat blocks.

import type { PlayerState, DungeonFloor, EnemyState, ClassName, Direction } from './types';
import { addFloatingText, spawnParticles, spawnHealParticles } from './particles';
import { GameAudio } from './audio';
import { applyStatus } from './status';

export interface AbilityDef {
    name: string;
    icon: string;
    description: string;
    cooldown: number;
    color: string;
}

export const ABILITIES: Record<ClassName, AbilityDef> = {
    warrior: {
        name: 'Whirlwind', icon: '🌀', color: '#e05a45', cooldown: 7,
        description: 'Sweep every adjacent tile for heavy damage.',
    },
    mage: {
        name: 'Chain Lightning', icon: '⚡', color: '#ffe066', cooldown: 9,
        description: 'Arcs between up to four nearby enemies, stunning them.',
    },
    rogue: {
        name: 'Shadowstep', icon: '💨', color: '#8ab4d8', cooldown: 6,
        description: 'Blink four tiles ahead and bleed whatever you pass through.',
    },
    paladin: {
        name: 'Consecrate', icon: '✨', color: '#ffe9a8', cooldown: 12,
        description: 'Holy ground: heals you and scorches the undead around you.',
    },
    ranger: {
        name: 'Volley', icon: '🏹', color: '#8fbf5a', cooldown: 8,
        description: 'Rain arrows on every enemy in sight.',
    },
    necromancer: {
        name: 'Siphon', icon: '💀', color: '#a97bff', cooldown: 9,
        description: 'Drain life from everything near you and take it for yourself.',
    },
    berserker: {
        name: 'Bloodrage', icon: '🩸', color: '#d23b3b', cooldown: 14,
        description: 'Spend 15% of your health for a huge attack surge.',
    },
    cleric: {
        name: 'Sanctuary', icon: '🛡️', color: '#ffd54f', cooldown: 15,
        description: 'Mend your wounds and shrug off every debuff.',
    },
    assassin: {
        name: 'Execute', icon: '🗡️', color: '#b388ff', cooldown: 10,
        description: 'A killing strike on the weakest foe in reach.',
    },
};

function dirOffset(dir: Direction): { dx: number; dy: number } {
    switch (dir) {
        case 0: return { dx: 0, dy: 1 };
        case 1: return { dx: 0, dy: -1 };
        case 2: return { dx: -1, dy: 0 };
        case 3: return { dx: 1, dy: 0 };
    }
}

function enemiesWithin(floor: DungeonFloor, x: number, y: number, radius: number): EnemyState[] {
    return floor.enemies.filter(e =>
        e.alive && Math.abs(e.x - x) + Math.abs(e.y - y) <= radius);
}

export interface AbilityHooks {
    addMsg: (msg: string, cls?: string) => void;
    /** Deal damage and handle death, loot and XP the same way a swing does */
    damageEnemy: (enemy: EnemyState, index: number, amount: number, color: string) => void;
    isWalkable: (x: number, y: number) => boolean;
    shake: (amount: number) => void;
}

/**
 * Fire the player's class ability. Returns false if it was not ready or had
 * no valid target, so the caller can play a "not yet" cue.
 */
export function useAbility(
    player: PlayerState,
    floor: DungeonFloor,
    hooks: AbilityHooks,
): boolean {
    if (!player.alive) return false;
    if (player.abilityCooldown > 0) {
        hooks.addMsg(`${ABILITIES[player.className].name} is not ready (${Math.ceil(player.abilityCooldown)}s)`, 'msg-common');
        return false;
    }

    const def = ABILITIES[player.className];
    const idx = (e: EnemyState) => floor.enemies.indexOf(e);
    let used = true;

    switch (player.className) {
        case 'warrior': {
            const targets = enemiesWithin(floor, player.x, player.y, 1);
            if (targets.length === 0) { used = false; break; }
            for (const e of targets) {
                hooks.damageEnemy(e, idx(e), Math.floor(player.stats.atk * 1.8), def.color);
                applyStatus(e, 'bleed', true, 1, 1);
            }
            spawnParticles(player.px + 8, player.py + 8, 26, def.color, 4, 0, 3);
            hooks.shake(0.35);
            break;
        }

        case 'mage': {
            const chain = enemiesWithin(floor, player.x, player.y, 7)
                .sort((a, b) =>
                    (Math.abs(a.x - player.x) + Math.abs(a.y - player.y)) -
                    (Math.abs(b.x - player.x) + Math.abs(b.y - player.y)))
                .slice(0, 4);
            if (chain.length === 0) { used = false; break; }
            let dmg = Math.floor(player.stats.atk * 1.6);
            for (const e of chain) {
                hooks.damageEnemy(e, idx(e), dmg, def.color);
                applyStatus(e, 'stun', true, 1, 1);
                spawnParticles(e.px + 8, e.py + 8, 12, def.color, 3, 0, 2);
                dmg = Math.floor(dmg * 0.75);   // each arc is weaker
            }
            hooks.shake(0.25);
            break;
        }

        case 'rogue': {
            const { dx, dy } = dirOffset(player.dir);
            let steps = 0;
            for (let i = 1; i <= 4; i++) {
                const nx = player.x + dx * i;
                const ny = player.y + dy * i;
                if (!hooks.isWalkable(nx, ny)) break;
                steps = i;
                // Cut anything standing in the path
                for (const e of floor.enemies) {
                    if (e.alive && e.x === nx && e.y === ny) {
                        hooks.damageEnemy(e, idx(e), Math.floor(player.stats.atk * 1.4), def.color);
                        applyStatus(e, 'bleed', true, 1.5, 1.4);
                    }
                }
            }
            if (steps === 0) { used = false; break; }
            spawnParticles(player.px + 8, player.py + 8, 16, def.color, 3, 0, 2);
            player.x += dx * steps;
            player.y += dy * steps;
            player.invincibleTimer = Math.max(player.invincibleTimer, 0.5);
            spawnParticles(player.x * 16 + 8, player.y * 16 + 8, 16, def.color, 3, 0, 2);
            break;
        }

        case 'paladin': {
            const heal = Math.floor(player.stats.maxHp * 0.2);
            player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + heal);
            addFloatingText(player.px + 8, player.py - 8, `+${heal}`, '#2ecc71');
            spawnHealParticles(player.px + 8, player.py + 8);
            const undead = ['skeleton', 'zombie', 'wraith', 'lich', 'revenant', 'ghost', 'banshee', 'shade'];
            for (const e of enemiesWithin(floor, player.x, player.y, 3)) {
                const holy = undead.includes(e.type) ? 2.4 : 1.2;
                hooks.damageEnemy(e, idx(e), Math.floor(player.stats.atk * holy), def.color);
                applyStatus(e, 'burn', true, 1, 1);
            }
            spawnParticles(player.px + 8, player.py + 8, 30, def.color, 3, -0.03, 3);
            break;
        }

        case 'ranger': {
            const targets = floor.enemies.filter(e => e.alive && floor.visible[e.y]?.[e.x]);
            if (targets.length === 0) { used = false; break; }
            targets.forEach((e, i) => {
                window.setTimeout(() => {
                    if (!e.alive) return;
                    hooks.damageEnemy(e, idx(e), Math.floor(player.stats.atk * 1.1), def.color);
                    spawnParticles(e.px + 8, e.py + 8, 8, def.color, 2, 0.1, 2);
                }, i * 70);
            });
            hooks.addMsg(`🏹 Volley — ${targets.length} target${targets.length === 1 ? '' : 's'}!`, 'msg-uncommon');
            break;
        }

        case 'necromancer': {
            const targets = enemiesWithin(floor, player.x, player.y, 4);
            if (targets.length === 0) { used = false; break; }
            let drained = 0;
            for (const e of targets) {
                const dmg = Math.floor(player.stats.atk * 1.3);
                hooks.damageEnemy(e, idx(e), dmg, def.color);
                applyStatus(e, 'weaken', true, 1, 1);
                drained += Math.floor(dmg * 0.35);
                spawnParticles(e.px + 8, e.py + 8, 10, def.color, 2, -0.04, 2);
            }
            const healed = Math.min(drained, player.stats.maxHp - player.stats.hp);
            player.stats.hp += healed;
            if (healed > 0) addFloatingText(player.px + 8, player.py - 8, `+${healed}`, '#a97bff');
            break;
        }

        case 'berserker': {
            const cost = Math.floor(player.stats.maxHp * 0.15);
            if (player.stats.hp <= cost + 1) {
                hooks.addMsg('Not enough blood to spend!', 'msg-damage');
                return false;
            }
            player.stats.hp -= cost;
            addFloatingText(player.px + 8, player.py, `-${cost}`, '#d23b3b');
            if (!player.buffs) player.buffs = [];
            player.buffs.push({
                name: 'Bloodrage', icon: '🩸',
                effect: { type: 'atk_boost', value: Math.floor(player.stats.atk * 0.8), duration: 12 },
                remaining: 12,
            });
            player.buffs.push({
                name: 'Bloodrage', icon: '🩸',
                effect: { type: 'crit_boost', value: 0.2, duration: 12 },
                remaining: 12,
            });
            spawnParticles(player.px + 8, player.py + 8, 30, def.color, 3.5, -0.02, 3);
            hooks.shake(0.4);
            hooks.addMsg('🩸 BLOODRAGE!', 'msg-legendary');
            break;
        }

        case 'cleric': {
            const heal = Math.floor(player.stats.maxHp * 0.45);
            const healed = Math.min(heal, player.stats.maxHp - player.stats.hp);
            player.stats.hp += healed;
            if (player.statuses) player.statuses.length = 0;
            addFloatingText(player.px + 8, player.py - 8, `+${healed}`, '#2ecc71');
            spawnHealParticles(player.px + 8, player.py + 8);
            spawnParticles(player.px + 8, player.py + 8, 24, def.color, 2.5, -0.04, 3);
            player.invincibleTimer = Math.max(player.invincibleTimer, 1.5);
            hooks.addMsg('🛡️ Sanctuary — cleansed and mended.', 'msg-heal');
            break;
        }

        case 'assassin': {
            const inReach = enemiesWithin(floor, player.x, player.y, 2);
            if (inReach.length === 0) { used = false; break; }
            // Go for whatever is closest to death
            const target = inReach.reduce((a, b) => (a.hp / a.maxHp <= b.hp / b.maxHp ? a : b));
            const pct = target.hp / target.maxHp;
            // Below a third health this is a straight execution
            const mult = pct < 0.33 ? 6 : 2.4;
            hooks.damageEnemy(target, idx(target), Math.floor(player.stats.atk * mult), def.color);
            spawnParticles(target.px + 8, target.py + 8, 22, def.color, 3, 0, 3);
            hooks.shake(0.3);
            if (pct < 0.33) addFloatingText(target.px + 8, target.py - 16, 'EXECUTE', '#b388ff');
            break;
        }
    }

    if (!used) {
        hooks.addMsg('No target in range.', 'msg-common');
        return false;
    }

    player.abilityCooldown = def.cooldown;
    GameAudio.levelUp();
    addFloatingText(player.px + 8, player.py - 22, `${def.icon} ${def.name}`, def.color);
    return true;
}
