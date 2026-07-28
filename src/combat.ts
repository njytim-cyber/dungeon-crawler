// ===== COMBAT SYSTEM =====

import type { PlayerState, EnemyState, DungeonFloor, Direction } from './types';
import { spawnHitParticles, addFloatingText, spawnDeathParticles } from './particles';
import { rollLoot, getBossWeapon, getBossTrophy } from './items';
import { GameAudio } from './audio';
import { recordKill, updateQuestProgress, applySkillBonuses, applyRuneBonuses, getMuseumReward } from './systems';
import { getBossDamageTaken } from './arena';

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

export function playerAttack(player: PlayerState, floor: DungeonFloor, addMsg: (msg: string, cls?: string) => void, onEnemyHit?: (enemyIndex: number, damage: number, killed: boolean, xpGain: number, goldGain: number, enemyType: string) => void): void {
    if (player.attackCooldown > 0 || !player.alive) return;

    player.attackCooldown = 0.35;
    GameAudio.swordSlash();

    const { dx, dy } = getDirOffset(player.dir);
    const attackX = player.x + dx;
    const attackY = player.y + dy;

    floor.enemies.forEach((enemy, enemyIndex) => {
        if (!enemy.alive) return;

        const hitRange = enemy.isBoss ? 2 : 1;
        const dist = Math.abs(enemy.x - attackX) + Math.abs(enemy.y - attackY);
        if (dist <= hitRange) {
            const crit = Math.random() < player.stats.critChance;
            const baseDmg = Math.max(1, player.stats.atk - enemy.def / 2);
            const variance = 0.8 + Math.random() * 0.4;
            // Bosses can raise a ward that soaks most of a hit
            const ward = enemy.isBoss ? getBossDamageTaken(floor.bossFight ?? null) : 1;
            let damage = Math.max(1, Math.floor(baseDmg * variance * (crit ? 2 : 1) * ward));

            if (ward < 1) {
                addFloatingText(enemy.px + 8, enemy.py - 12, 'WARDED', '#4fc3f7');
            }

            enemy.hp -= damage;
            GameAudio.hit();
            spawnHitParticles(enemy.px + 8, enemy.py + 8);
            addFloatingText(enemy.px + 8, enemy.py, crit ? `CRIT ${damage}` : `${damage}`, crit ? '#f1c40f' : '#fff');
            screenShake = crit ? 0.3 : 0.15;

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
    }

    s.hp = Math.min(player.stats.hp, s.maxHp);
    if (player.stats.hp === player.stats.maxHp) s.hp = s.maxHp;
    player.stats = s;
}
