// ===== COMBAT SYSTEM =====

import type { PlayerState, EnemyState, DungeonFloor, Direction, Element } from './types';
import { spawnHitParticles, addFloatingText, spawnDeathParticles, spawnParticles } from './particles';
import { rollLoot, getBossWeapon, getBossTrophy } from './items';
import { GameAudio } from './audio';
import { recordKill, updateQuestProgress, applySkillBonuses, applyRuneBonuses, getMuseumReward, getTrophyBonus } from './systems';
import { getBossDamageTaken } from './arena';
import { applyStatus, isDisabled, speedMultiplier, outgoingMultiplier, elementColor, ELEMENT_STATUS } from './status';

let screenShake = 0;
let screenShakeX = 0;
let screenShakeY = 0;

export function getScreenShake(): { x: number; y: number } {
    return { x: screenShakeX, y: screenShakeY };
}

export function updateScreenShake(dt: number): void {
    if (screenShake > 0) {
        screenShake -= dt;
        screenShakeX = (Math.random() - 0.5) * screenShake * 10;
        screenShakeY = (Math.random() - 0.5) * screenShake * 10;
    } else {
        screenShakeX = 0;
        screenShakeY = 0;
    }
}

function getDirOffset(dir: Direction): { dx: number; dy: number } {
    switch (dir) {
        case 0: return { dx: 0, dy: 1 };  // down
        case 1: return { dx: 0, dy: -1 }; // up
        case 2: return { dx: -1, dy: 0 }; // left
        case 3: return { dx: 1, dy: 0 };  // right
    }
}

// ===== WEAPON ARCHETYPES =====
// The shape of a swing is decided by what you are holding, not by your class.

export type WeaponKind = 'sword' | 'axe' | 'dagger' | 'staff' | 'bow' | 'mace' | 'unarmed';

export interface WeaponProfile {
    kind: WeaponKind;
    /** Tiles struck, relative to facing (fx = forward, sx = sideways) */
    pattern: { fx: number; sx: number }[];
    /** Seconds between swings */
    cooldown: number;
    /** Damage multiplier applied to the whole swing */
    damageMult: number;
    /** Fires a projectile instead of striking tiles */
    ranged: boolean;
    /** Projectile speed in tiles/sec */
    projectileSpeed?: number;
    label: string;
}

const PROFILES: Record<WeaponKind, WeaponProfile> = {
    // Balanced 3-tile arc in front of you
    sword: {
        kind: 'sword', label: 'arcing slash', cooldown: 0.34, damageMult: 1, ranged: false,
        pattern: [{ fx: 1, sx: 0 }, { fx: 1, sx: -1 }, { fx: 1, sx: 1 }],
    },
    // Wide, slow cleave that also clips the tiles beside you
    axe: {
        kind: 'axe', label: 'heavy cleave', cooldown: 0.55, damageMult: 1.35, ranged: false,
        pattern: [{ fx: 1, sx: 0 }, { fx: 1, sx: -1 }, { fx: 1, sx: 1 }, { fx: 0, sx: -1 }, { fx: 0, sx: 1 }],
    },
    // Fast single stab, big crit bonus handled in playerAttack
    dagger: {
        kind: 'dagger', label: 'quick stab', cooldown: 0.18, damageMult: 0.7, ranged: false,
        pattern: [{ fx: 1, sx: 0 }],
    },
    // Slow but reaches two tiles and hits in a line
    mace: {
        kind: 'mace', label: 'crushing blow', cooldown: 0.5, damageMult: 1.3, ranged: false,
        pattern: [{ fx: 1, sx: 0 }, { fx: 2, sx: 0 }],
    },
    // Ranged magic bolt
    staff: {
        kind: 'staff', label: 'arcane bolt', cooldown: 0.5, damageMult: 1.1, ranged: true,
        projectileSpeed: 9, pattern: [],
    },
    // Ranged arrow, faster and further than a bolt
    bow: {
        kind: 'bow', label: 'loosed arrow', cooldown: 0.42, damageMult: 1, ranged: true,
        projectileSpeed: 13, pattern: [],
    },
    unarmed: {
        kind: 'unarmed', label: 'punch', cooldown: 0.3, damageMult: 0.5, ranged: false,
        pattern: [{ fx: 1, sx: 0 }],
    },
};

/** Map an item's icon to its combat archetype. */
export function getWeaponProfile(player: PlayerState): WeaponProfile {
    const icon = player.equipment.weapon?.icon;
    switch (icon) {
        case 'sword': return PROFILES.sword;
        case 'axe': return PROFILES.axe;
        case 'dagger': return PROFILES.dagger;
        case 'staff': return PROFILES.staff;
        case 'bow': return PROFILES.bow;
        case 'shield': return PROFILES.mace;
        default: return player.equipment.weapon ? PROFILES.sword : PROFILES.unarmed;
    }
}

/** Turn a forward/sideways offset into world tiles for the given facing. */
export function patternToTiles(
    player: PlayerState,
    pattern: { fx: number; sx: number }[],
): { x: number; y: number }[] {
    const { dx, dy } = getDirOffset(player.dir);
    // Sideways axis is the forward vector rotated 90 degrees
    const sx = -dy;
    const sy = dx;
    return pattern.map(p => ({
        x: player.x + dx * p.fx + sx * p.sx,
        y: player.y + dy * p.fx + sy * p.sx,
    }));
}

// ===== PLAYER PROJECTILES =====
// Bows and staves fire these. Tile-space coordinates, same convention as the
// boss projectiles in arena.ts.
export interface PlayerProjectile {
    px: number; py: number;
    vx: number; vy: number;
    life: number;
    damage: number;
    crit: boolean;
    element: Element;
    color: string;
    kind: 'arrow' | 'bolt';
    /** Enemies already struck, so one shot cannot hit the same target twice */
    hit: Set<EnemyState>;
    /** Shots that pierce keep travelling */
    pierce: number;
}

let playerProjectiles: PlayerProjectile[] = [];

export function getPlayerProjectiles(): PlayerProjectile[] { return playerProjectiles; }
export function clearPlayerProjectiles(): void { playerProjectiles = []; }

function firePlayerProjectile(player: PlayerState, profile: WeaponProfile): void {
    const { dx, dy } = getDirOffset(player.dir);
    const weapon = player.equipment.weapon;
    const element: Element = weapon?.element ?? (profile.kind === 'staff' ? 'shadow' : 'physical');
    const crit = Math.random() < player.stats.critChance;
    const base = Math.max(1, player.stats.atk) * profile.damageMult * outgoingMultiplier(player);

    playerProjectiles.push({
        px: player.x + 0.5,
        py: player.y + 0.5,
        vx: dx * (profile.projectileSpeed ?? 10),
        vy: dy * (profile.projectileSpeed ?? 10),
        life: 1.6,
        damage: Math.max(1, Math.floor(base * (0.85 + Math.random() * 0.3) * (crit ? 2 : 1))),
        crit,
        element,
        color: elementColor(element),
        kind: profile.kind === 'bow' ? 'arrow' : 'bolt',
        hit: new Set(),
        // Staves punch through one extra target
        pierce: profile.kind === 'staff' ? 1 : 0,
    });
}

/** Roll the equipped weapon's on-hit status against a target. */
export function applyWeaponProc(player: PlayerState, target: EnemyState): void {
    const w = player.equipment.weapon;
    if (!w) return;
    const status = w.procStatus ?? (w.element ? ELEMENT_STATUS[w.element] : undefined);
    if (!status) return;
    const chance = w.procChance ?? 0.25;
    if (Math.random() > chance) return;
    applyStatus(target, status, true, w.procPower ?? 1, w.procDuration ?? 1);
}

/**
 * Advance player projectiles. The caller supplies collision and the kill
 * handler so combat.ts stays free of map and loot plumbing.
 */
export function updatePlayerProjectiles(
    dt: number,
    floor: DungeonFloor,
    player: PlayerState,
    canFly: (x: number, y: number) => boolean,
    onKill: (enemy: EnemyState, index: number, damage: number) => void,
): void {
    for (let i = playerProjectiles.length - 1; i >= 0; i--) {
        const pr = playerProjectiles[i];
        pr.px += pr.vx * dt;
        pr.py += pr.vy * dt;
        pr.life -= dt;

        const tx = Math.floor(pr.px);
        const ty = Math.floor(pr.py);

        let consumed = false;
        for (let e = 0; e < floor.enemies.length; e++) {
            const enemy = floor.enemies[e];
            if (!enemy.alive || pr.hit.has(enemy)) continue;
            const reach = enemy.isBoss ? 1.4 : 0.7;
            const ddx = pr.px - (enemy.x + 0.5);
            const ddy = pr.py - (enemy.y + 0.5);
            if (ddx * ddx + ddy * ddy > reach * reach) continue;

            pr.hit.add(enemy);
            const ward = enemy.isBoss ? getBossDamageTaken(floor.bossFight ?? null) : 1;
            const dmg = Math.max(1, Math.floor(pr.damage * ward - enemy.def / 3));
            enemy.hp -= dmg;
            GameAudio.hit();
            spawnHitParticles(enemy.px + 8, enemy.py + 8);
            addFloatingText(enemy.px + 8, enemy.py, pr.crit ? `CRIT ${dmg}` : `${dmg}`,
                pr.crit ? '#f1c40f' : pr.color);
            applyWeaponProc(player, enemy);

            if (enemy.hp <= 0) onKill(enemy, e, dmg);

            if (pr.pierce > 0) { pr.pierce--; } else { consumed = true; }
            break;
        }

        if (consumed || pr.life <= 0 || !canFly(tx, ty)) {
            spawnParticles(pr.px * 16, pr.py * 16, 4, pr.color, 1.5, 0.03, 2);
            playerProjectiles.splice(i, 1);
        }
    }
}

/** Draw arrows and bolts. Tile space -> screen. */
export function renderPlayerProjectiles(
    ctx: CanvasRenderingContext2D,
    camX: number, camY: number, tileSize: number,
): void {
    for (const pr of playerProjectiles) {
        const sx = pr.px * tileSize - camX;
        const sy = pr.py * tileSize - camY;
        const a = Math.atan2(pr.vy, pr.vx);
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(a);
        ctx.shadowColor = pr.color;
        ctx.shadowBlur = 8;
        if (pr.kind === 'arrow') {
            const L = tileSize * 0.5;
            ctx.strokeStyle = '#8d6e4a';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-L, 0); ctx.lineTo(L * 0.5, 0); ctx.stroke();
            ctx.fillStyle = pr.color;
            ctx.beginPath();
            ctx.moveTo(L, 0); ctx.lineTo(L * 0.4, -3.5); ctx.lineTo(L * 0.4, 3.5);
            ctx.closePath(); ctx.fill();
            // Fletching
            ctx.fillStyle = '#d8d2c4';
            ctx.beginPath();
            ctx.moveTo(-L, 0); ctx.lineTo(-L * 0.6, -3); ctx.lineTo(-L * 0.5, 0);
            ctx.closePath(); ctx.fill();
        } else {
            const r = tileSize * 0.2;
            ctx.fillStyle = pr.color;
            ctx.beginPath(); ctx.ellipse(0, 0, r * 1.6, r, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.beginPath(); ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
}

export function playerAttack(player: PlayerState, floor: DungeonFloor, addMsg: (msg: string, cls?: string) => void, onEnemyHit?: (enemyIndex: number, damage: number, killed: boolean, xpGain: number, goldGain: number, enemyType: string) => void): void {
    if (player.attackCooldown > 0 || !player.alive) return;
    if (isDisabled(player)) { addMsg('You are stunned!', 'msg-damage'); return; }

    const profile = getWeaponProfile(player);
    // Freeze slows your swings as well as your feet
    player.attackCooldown = profile.cooldown / Math.max(0.35, speedMultiplier(player));

    // Ranged weapons launch a projectile and are resolved elsewhere
    if (profile.ranged) {
        firePlayerProjectile(player, profile);
        GameAudio.swordSlash();
        return;
    }

    GameAudio.swordSlash();

    const tiles = patternToTiles(player, profile.pattern);
    const weaponElement: Element = player.equipment.weapon?.element ?? 'physical';

    floor.enemies.forEach((enemy, enemyIndex) => {
        if (!enemy.alive) return;

        // A tile counts as struck if it is in the swing; bosses are big enough
        // to be clipped from one tile further out.
        const reach = enemy.isBoss ? 1 : 0;
        const inSwing = tiles.some(t =>
            Math.abs(enemy.x - t.x) + Math.abs(enemy.y - t.y) <= reach);
        if (inSwing) {
            // Daggers crit far more often to make up for their small hits
            const critBonus = profile.kind === 'dagger' ? 0.15 : 0;
            const crit = Math.random() < player.stats.critChance + critBonus;
            const baseDmg = Math.max(1, player.stats.atk - enemy.def / 2);
            const variance = 0.8 + Math.random() * 0.4;
            // Bosses can raise a ward that soaks most of a hit
            const ward = enemy.isBoss ? getBossDamageTaken(floor.bossFight ?? null) : 1;
            const weakened = outgoingMultiplier(player);
            let damage = Math.max(1, Math.floor(
                baseDmg * variance * (crit ? 2 : 1) * ward * profile.damageMult * weakened,
            ));

            if (ward < 1) {
                addFloatingText(enemy.px + 8, enemy.py - 12, 'WARDED', '#4fc3f7');
            }

            enemy.hp -= damage;
            GameAudio.hit();
            spawnHitParticles(enemy.px + 8, enemy.py + 8);
            const hitColor = crit ? '#f1c40f' : elementColor(weaponElement);
            addFloatingText(enemy.px + 8, enemy.py, crit ? `CRIT ${damage}` : `${damage}`, hitColor);
            screenShake = crit ? 0.3 : 0.15;

            // On-hit status from the weapon's affixes
            applyWeaponProc(player, enemy);

            let xpGain = 0;
            let goldGain = 0;

            if (enemy.hp <= 0) {
                enemy.alive = false;
                GameAudio.enemyDeath();
                spawnDeathParticles(enemy.px + 8, enemy.py + 8, '#e74c3c');
                // Apply XP boost from buffs
                xpGain = enemy.xpReward;
                if (player.buffs) {
                    for (const buff of player.buffs) {
                        if (buff.effect.type === 'xp_boost') xpGain = Math.floor(xpGain * (1 + buff.effect.value));
                    }
                }
                player.xp += xpGain;
                player.totalKills++;
                player.totalDamageDealt += damage;
                addMsg(`Defeated ${enemy.type}! +${xpGain} XP`, 'msg-xp');

                // Track in bestiary & quests
                if (player.systems) {
                    recordKill(player.systems.bestiary, enemy.type, player.floor);
                    updateQuestProgress(player.systems.quests, 'kill', enemy.type);
                }

                // Drop loot
                const loot = rollLoot(enemy.dropTable);
                if (loot) {
                    floor.items.push({ x: enemy.x, y: enemy.y, def: loot, count: 1 });
                    addMsg(`${enemy.type} dropped ${loot.name}!`, `msg-${loot.rarity}`);
                }

                // Boss drops: signature weapon + trophy, both guaranteed
                if (enemy.isBoss) {
                    const bossWeapon = getBossWeapon(player.floor);
                    if (bossWeapon) {
                        floor.items.push({ x: enemy.x + 1, y: enemy.y, def: bossWeapon, count: 1 });
                        addMsg(`⚔️ BOSS DROP: ${bossWeapon.name}!`, 'msg-legendary');
                        addFloatingText(enemy.px + 8, enemy.py - 8, '⚔️ BOSS LOOT!', '#e67e22');
                    }
                    const trophy = getBossTrophy(player.floor);
                    if (trophy) {
                        floor.items.push({ x: enemy.x - 1, y: enemy.y, def: trophy, count: 1 });
                        addMsg(`🏆 TROPHY: ${trophy.name}!`, 'msg-legendary');
                    }
                }

                // Gold drop (with elite multiplier)
                const eliteGoldMult = enemy.eliteGoldMult || 1;
                goldGain = Math.floor((5 + Math.random() * 10 * (1 + player.floor * 0.1)) * eliteGoldMult);
                player.gold += goldGain;
                addFloatingText(enemy.px + 8, enemy.py + 16, `+${goldGain}g`, '#f1c40f');
            }

            // Notify multiplayer sync
            if (onEnemyHit) {
                onEnemyHit(enemyIndex, damage, enemy.hp <= 0, xpGain, goldGain, enemy.type);
            }
        }
    });
}

export function enemyAttack(enemy: EnemyState, player: PlayerState, addMsg: (msg: string, cls?: string) => void): number {
    if (player.invincibleTimer > 0) return 0;

    // Armour reduces damage but never negates it — a hit always hurts.
    // (Previously DEF/2 could trivialise whole floors.)
    const mitigation = player.stats.def * 0.28;
    const baseDmg = Math.max(enemy.atk * 0.35, enemy.atk - mitigation);
    const variance = 0.85 + Math.random() * 0.35;
    // Enemies crit too
    const crit = Math.random() < 0.08;
    const damage = Math.max(1, Math.floor(baseDmg * variance * (crit ? 1.8 : 1)));

    player.stats.hp -= damage;
    // Shorter mercy window — you can't tank your way through a pack any more
    player.invincibleTimer = 0.35;
    GameAudio.playerHurt();
    spawnHitParticles(player.px + 8, player.py + 8);
    addFloatingText(player.px + 8, player.py, crit ? `CRIT -${damage}` : `-${damage}`, crit ? '#ff8a3d' : '#e74c3c');
    screenShake = crit ? 0.32 : 0.2;
    addMsg(`${enemy.type}${enemy.isBoss ? ' BOSS' : ''} hit you for ${damage}${crit ? ' (CRIT!)' : ''} damage!`, 'msg-damage');

    if (player.stats.hp <= 0) {
        player.stats.hp = 0;
        player.alive = false;
    }

    return damage;
}

export function checkLevelUp(player: PlayerState, addMsg: (msg: string, cls?: string) => void): boolean {
    if (player.xp < player.xpToLevel) return false;

    player.xp -= player.xpToLevel;
    player.level++;
    player.xpToLevel = Math.floor(player.xpToLevel * 1.15);

    // Stat gains
    player.baseStats.maxHp += 5 + Math.floor(player.level * 0.5);
    player.baseStats.atk += 1 + Math.floor(player.level * 0.2);
    player.baseStats.def += 1 + Math.floor(player.level * 0.15);

    // Levelling no longer refills you. Health is a resource you have to
    // manage with potions and food — that is the whole tension of a run.
    const hpBefore = player.stats.hp;
    recalcStats(player);
    player.stats.hp = Math.min(hpBefore, player.stats.maxHp);
    player.baseStats.hp = player.stats.hp;

    GameAudio.levelUp();
    addMsg(`Level up! You are now level ${player.level}. (No free heal — ration your potions.)`, 'msg-xp');

    // Grant skill point every 3 levels
    if (player.systems && player.level % 3 === 0) {
        player.systems.skillPoints++;
        addMsg(`🌟 Skill point earned! Open Skills to spend it.`, 'msg-uncommon');
    }

    return true;
}

export function recalcStats(player: PlayerState): void {
    const s = { ...player.baseStats };

    // Apply equipment bonuses
    const slots: (keyof typeof player.equipment)[] = ['weapon', 'armor', 'ring'];
    slots.forEach(slot => {
        const item = player.equipment[slot];
        if (item?.stats) {
            Object.entries(item.stats).forEach(([key, val]) => {
                if (key in s) (s as any)[key] += val;
            });
        }
    });

    // Apply active buff bonuses
    if (player.buffs) {
        for (const buff of player.buffs) {
            const fx = buff.effect;
            if (fx.type === 'atk_boost') s.atk += fx.value;
            else if (fx.type === 'def_boost') s.def += fx.value;
            else if (fx.type === 'spd_boost') s.spd += fx.value;
            else if (fx.type === 'crit_boost') s.critChance += fx.value;
            else if (fx.type === 'maxhp_boost') s.maxHp += fx.value;
        }
    }

    // Apply skill bonuses
    if (player.systems?.skills) {
        const skillBonus = applySkillBonuses(player.systems.skills);
        for (const [key, val] of Object.entries(skillBonus)) {
            if (key in s) (s as any)[key] += val;
        }
    }

    // Apply rune bonuses
    if (player.systems?.runes) {
        const runeBonus = applyRuneBonuses(player.systems.runes);
        for (const [key, val] of Object.entries(runeBonus)) {
            if (key in s) (s as any)[key] += val;
        }
    }

    // Apply museum bonus
    if (player.systems?.museum && player.systems.museum.length > 0) {
        const museumBonus = getMuseumReward(player.systems.museum.length);
        s.atk += museumBonus.atk;
        s.def += museumBonus.def;
        s.maxHp += museumBonus.maxHp;

        // Boss trophies form their own set with milestone bonuses
        const trophy = getTrophyBonus(player.systems.museum);
        s.atk += trophy.atk;
        s.def += trophy.def;
        s.maxHp += trophy.maxHp;
        s.critChance += trophy.critChance;
    }

    s.hp = Math.min(player.stats.hp, s.maxHp);
    if (player.stats.hp === player.stats.maxHp) s.hp = s.maxHp;
    player.stats = s;
}
