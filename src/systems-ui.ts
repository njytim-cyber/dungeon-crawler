// ===== SYSTEMS UI =====
// UI panels for Bestiary, Skills, Achievements, Quests, Pet

import type { PlayerState } from './types';
import {
    getEnemyLore, getAllAchievements, getAvailableSkills, getSkillLevel, canLearnSkill,
    getHeartLevel, getAllArtifacts,
    TROPHY_IDS, isTrophy, countTrophies, getTrophyBonus, nextTrophySet,
} from './systems';
import { recalcStats } from './combat';
import { getItemDef } from './items';
import { addMessage } from './hud';

let currentPanel: string | null = null;

export function isSystemsUIOpen(): boolean {
    return currentPanel !== null;
}

export function closeSystemsUI(): void {
    const overlay = document.getElementById('systems-overlay');
    if (overlay) overlay.classList.add('hidden');
    currentPanel = null;
}

export function openBestiary(player: PlayerState): void {
    if (!player.systems) return;
    currentPanel = 'bestiary';
    const overlay = document.getElementById('systems-overlay')!;
    const content = document.getElementById('systems-content')!;
    const title = document.getElementById('systems-title')!;

    overlay.classList.remove('hidden');
    title.textContent = '📖 Bestiary';

    const bestiary = player.systems.bestiary;
    let html = '<div class="systems-grid">';

    const allTypes = ['slime', 'bat', 'goblin', 'skeleton', 'spider', 'ghost', 'orc', 'wraith', 'golem', 'demon', 'drake', 'lich'];
    for (const type of allTypes) {
        const entry = bestiary.enemies[type];
        const lore = getEnemyLore(type);
        if (entry) {
            html += `<div class="sys-card discovered">
                <div class="sys-card-title">${lore?.name || type}</div>
                <div class="sys-card-desc">${lore?.desc || ''}</div>
                <div class="sys-card-stat">Kills: ${entry.kills} | First seen: Floor ${entry.firstSeen}</div>
            </div>`;
        } else {
            html += `<div class="sys-card unknown">
                <div class="sys-card-title">???</div>
                <div class="sys-card-desc">Not yet discovered.</div>
            </div>`;
        }
    }
    html += '</div>';
    html += `<div class="sys-summary">${Object.keys(bestiary.enemies).length}/12 enemies discovered | ${bestiary.itemsFound.length} items found</div>`;
    content.innerHTML = html;
}

export function openAchievements(player: PlayerState): void {
    if (!player.systems) return;
    currentPanel = 'achievements';
    const overlay = document.getElementById('systems-overlay')!;
    const content = document.getElementById('systems-content')!;
    const title = document.getElementById('systems-title')!;

    overlay.classList.remove('hidden');
    title.textContent = '🏆 Achievements';

    const all = getAllAchievements();
    let html = '<div class="systems-grid">';
    for (const ach of all) {
        const unlocked = player.systems.achievements.includes(ach.id);
        html += `<div class="sys-card ${unlocked ? 'unlocked' : 'locked'}">
            <div class="sys-card-icon">${unlocked ? ach.icon : '🔒'}</div>
            <div class="sys-card-title">${unlocked ? ach.name : '???'}</div>
            <div class="sys-card-desc">${unlocked ? ach.desc : 'Keep playing to unlock!'}</div>
        </div>`;
    }
    html += '</div>';
    html += `<div class="sys-summary">${player.systems.achievements.length}/${all.length} unlocked</div>`;
    content.innerHTML = html;
}

export function openSkillTree(player: PlayerState): void {
    if (!player.systems) return;
    currentPanel = 'skills';
    const overlay = document.getElementById('systems-overlay')!;
    const content = document.getElementById('systems-content')!;
    const title = document.getElementById('systems-title')!;

    overlay.classList.remove('hidden');
    title.textContent = `🌟 Skills (${player.systems.skillPoints} points)`;

    const available = getAvailableSkills(player.className);
    let html = '<div class="systems-grid">';
    for (const skill of available) {
        const level = getSkillLevel(player.systems.skills, skill.id);
        const canLearn = canLearnSkill(player.systems.skills, skill.id, player.systems.skillPoints);
        html += `<div class="sys-card ${canLearn ? 'learnable' : ''}" ${canLearn ? `data-skill="${skill.id}"` : ''}>
            <div class="sys-card-icon">${skill.icon}</div>
            <div class="sys-card-title">${skill.name} (${level}/${skill.maxLevel})</div>
            <div class="sys-card-desc">${skill.desc}</div>
            <div class="sys-card-stat">${skill.effect(level)}</div>
            ${canLearn ? '<div class="sys-card-action">Click to learn!</div>' : ''}
        </div>`;
    }
    html += '</div>';
    content.innerHTML = html;

    // Add click handlers
    content.querySelectorAll('[data-skill]').forEach(el => {
        el.addEventListener('click', () => {
            const skillId = (el as HTMLElement).dataset.skill!;
            if (player.systems && canLearnSkill(player.systems.skills, skillId, player.systems.skillPoints)) {
                if (!player.systems.skills[skillId]) player.systems.skills[skillId] = 0;
                player.systems.skills[skillId]++;
                player.systems.skillPoints--;
                recalcStats(player);
                openSkillTree(player); // refresh
            }
        });
    });
}

export function openQuests(player: PlayerState): void {
    if (!player.systems) return;
    currentPanel = 'quests';
    const overlay = document.getElementById('systems-overlay')!;
    const content = document.getElementById('systems-content')!;
    const title = document.getElementById('systems-title')!;

    overlay.classList.remove('hidden');
    title.textContent = '📋 Quests';

    const quests = player.systems.quests;
    let html = '';
    if (quests.active.length === 0) {
        html = '<div class="sys-empty">No active quests. Wait for the next day!</div>';
    } else {
        html = '<div class="systems-list">';
        for (const q of quests.active) {
            const pct = Math.floor((q.progress / q.amount) * 100);
            html += `<div class="sys-quest ${q.completed ? (q.claimed ? 'claimed' : 'complete') : ''}">
                <div class="quest-header">
                    <span class="quest-icon">${q.icon}</span>
                    <span class="quest-name">${q.name}</span>
                    ${q.completed && !q.claimed ? '<span class="quest-claim" data-quest="' + q.id + '">CLAIM!</span>' : ''}
                </div>
                <div class="quest-desc">${q.desc}</div>
                <div class="quest-progress-bar">
                    <div class="quest-progress-fill" style="width:${pct}%"></div>
                    <span class="quest-progress-text">${q.progress}/${q.amount}</span>
                </div>
                <div class="quest-reward">${q.claimed ? '✅ Claimed' : `Reward: ${q.rewardGold}g, ${q.rewardXp} XP`}</div>
            </div>`;
        }
        html += '</div>';
    }
    content.innerHTML = html;

    // Claim handlers
    content.querySelectorAll('[data-quest]').forEach(el => {
        el.addEventListener('click', () => {
            const questId = (el as HTMLElement).dataset.quest!;
            const quest = quests.active.find(q => q.id === questId);
            if (quest && quest.completed && !quest.claimed) {
                quest.claimed = true;
                player.gold += quest.rewardGold;
                player.xp += quest.rewardXp;
                openQuests(player); // refresh
            }
        });
    });
}

export function openMuseum(player: PlayerState): void {
    if (!player.systems) return;
    currentPanel = 'museum';
    const overlay = document.getElementById('systems-overlay')!;
    const content = document.getElementById('systems-content')!;
    const title = document.getElementById('systems-title')!;

    overlay.classList.remove('hidden');
    title.textContent = '🏛️ Museum';

    const allArtifacts = getAllArtifacts();
    let html = '<div class="systems-grid">';
    for (const art of allArtifacts) {
        const donated = player.systems.museum.includes(art.id);
        html += `<div class="sys-card ${donated ? 'donated' : 'empty'}">
            <div class="sys-card-icon">${donated ? art.icon : '❓'}</div>
            <div class="sys-card-title">${donated ? art.name : '???'}</div>
            <div class="sys-card-desc">${donated ? art.desc : 'Find in dungeon chests'}</div>
        </div>`;
    }
    html += '</div>';
    html += `<div class="sys-summary">${player.systems.museum.length}/${allArtifacts.length} donated | Bonus: +${Math.floor(player.systems.museum.length * 0.5)} ATK, +${Math.floor(player.systems.museum.length * 0.3)} DEF, +${player.systems.museum.length * 2} HP</div>`;

    // ===== TROPHY HALL =====
    const held = player.inventory.filter(i => isTrophy(i.def.id));
    const donatedTrophies = countTrophies(player.systems.museum);
    const bonus = getTrophyBonus(player.systems.museum);
    const next = nextTrophySet(player.systems.museum);

    html += `<div class="sys-tab-section-title" style="margin-top:18px">🏆 Trophy Hall</div>`;
    html += '<div class="systems-grid">';
    for (const id of TROPHY_IDS) {
        const def = getItemDef(id);
        const donated = player.systems.museum.includes(id);
        const inBag = held.find(h => h.def.id === id);
        html += `<div class="sys-card ${donated ? 'donated' : inBag ? 'learnable' : 'empty'}" ${inBag && !donated ? `data-trophy="${id}"` : ''}>
            <div class="sys-card-icon">${donated ? '🏆' : inBag ? '📦' : '❓'}</div>
            <div class="sys-card-title">${donated || inBag ? (def?.name ?? id) : '???'}</div>
            <div class="sys-card-desc">${donated ? 'On the wall' : inBag ? 'In your bag' : 'Defeat the boss'}</div>
            ${inBag && !donated ? '<div class="sys-card-action">Click to mount</div>' : ''}
        </div>`;
    }
    html += '</div>';

    html += `<div class="sys-summary">${donatedTrophies}/${TROPHY_IDS.length} mounted`;
    if (bonus.atk || bonus.def || bonus.maxHp || bonus.critChance) {
        html += ` | Set bonus: +${bonus.atk} ATK, +${bonus.def} DEF, +${bonus.maxHp} HP, +${Math.round(bonus.critChance * 100)}% CRIT`;
    }
    if (next) html += `<br><span style="color:#888">Next: ${next.name} at ${next.at} — ${next.desc}</span>`;
    html += '</div>';

    content.innerHTML = html;

    // Mounting a trophy consumes it from the bag
    content.querySelectorAll('[data-trophy]').forEach(el => {
        el.addEventListener('click', () => {
            const id = (el as HTMLElement).dataset.trophy!;
            if (!player.systems) return;
            const idx = player.inventory.findIndex(i => i.def.id === id);
            if (idx < 0) return;
            player.inventory.splice(idx, 1);
            player.systems.museum.push(id);
            recalcStats(player);
            addMessage(`🏆 Mounted ${getItemDef(id)?.name ?? id} in the Trophy Hall.`, 'msg-legendary');
            openMuseum(player);   // refresh
        });
    });
}

export function openHearts(player: PlayerState): void {
    if (!player.systems) return;
    currentPanel = 'hearts';
    const overlay = document.getElementById('systems-overlay')!;
    const content = document.getElementById('systems-content')!;
    const title = document.getElementById('systems-title')!;

    overlay.classList.remove('hidden');
    title.textContent = '❤️ Relationships';

    const npcTypes = ['cook', 'fishmonger', 'farmer', 'blacksmith', 'healer', 'sage', 'merchant'];
    const npcNames: Record<string, string> = { cook: 'Chef Rosemary', fishmonger: 'Old Fisher Pete', farmer: 'Farmer Green', blacksmith: 'Forge Master Grimm', healer: 'Wandering Healer', sage: 'Ancient Sage', merchant: 'Travelling Merchant' };

    let html = '<div class="systems-list">';
    for (const npc of npcTypes) {
        const level = getHeartLevel(player.systems.hearts, npc);
        const hearts = '❤️'.repeat(level) + '🖤'.repeat(10 - level);
        const discount = Math.floor(level * 5);
        html += `<div class="sys-quest">
            <div class="quest-header">
                <span class="quest-name">${npcNames[npc] || npc}</span>
            </div>
            <div class="quest-desc">${hearts}</div>
            <div class="quest-reward">${discount > 0 ? `${discount}% shop discount` : 'Give gifts to increase hearts!'}</div>
        </div>`;
    }
    html += '</div>';
    content.innerHTML = html;
}

export function initSystemsUI(): void {
    const closeBtn = document.getElementById('systems-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeSystemsUI);
    }
}
