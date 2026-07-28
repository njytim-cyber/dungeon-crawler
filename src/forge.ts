// ===== FORGE SYSTEM: Combine 2 pieces of gear into 1 stronger hybrid =====
// Works on weapons, armour and rings. Both inputs must share an equip slot —
// you cannot beat a ring and a greatsword into the same object.

import type { PlayerState, ItemDef, Rarity, InventoryItem, EquipSlot } from './types';
import { ENCHANT_CAP, ENCHANT_CAP_BROKEN, ENCHANT_CAP_CITY } from './types';
import { addMessage, updateHotbar } from './hud';
import { GameAudio } from './audio';
import { addFloatingText } from './particles';
import { getRarityColor, RARITY_ORDER } from './items';
import { Assets } from './assets';
import { recalcStats } from './combat';

let forgeOpen = false;
let forgePlayer: PlayerState | null = null;
let selectedSlot1: number = -1; // inventory index
let selectedSlot2: number = -1;
/** Which equipment slot the bench is currently filtered to */
let activeTab: EquipSlot = 'weapon';

export function isForgeOpen(): boolean { return forgeOpen; }

/** True when the player is at the City's master smithy. */
let atCityForge = false;

/** The base enchant cap at the current bench. */
function baseCap(): number {
    return atCityForge ? ENCHANT_CAP_CITY : ENCHANT_CAP;
}

export function openForge(player: PlayerState, isCity = false): void {
    forgeOpen = true;
    forgePlayer = player;
    atCityForge = isCity;
    selectedSlot1 = -1;
    selectedSlot2 = -1;
    activeTab = 'weapon';
    renderForgeUI();
    const box = document.getElementById('forge-box');
    if (box) box.classList.toggle('forge-city', isCity);
    const header = document.querySelector('#forge-header h2');
    if (header) header.textContent = isCity ? '🏙️ THE MASTER FORGE' : '⚒️ THE FORGE';
    document.getElementById('forge-overlay')!.classList.remove('hidden');
}

export function closeForge(): void {
    forgeOpen = false;
    forgePlayer = null;
    selectedSlot1 = -1;
    selectedSlot2 = -1;
    document.getElementById('forge-overlay')!.classList.add('hidden');
}

const FORGEABLE: EquipSlot[] = ['weapon', 'armor', 'ring'];

const SLOT_LABEL: Record<EquipSlot, string> = {
    weapon: '⚔️ Weapons', armor: '🛡️ Armour', ring: '💍 Rings',
};

const SLOT_NOUN: Record<EquipSlot, string> = {
    weapon: 'weapon', armor: 'armour', ring: 'ring',
};

function slotOf(def: ItemDef): EquipSlot | null {
    if (def.equipSlot && FORGEABLE.includes(def.equipSlot)) return def.equipSlot;
    return null;
}

/** Every forgeable item in the bag, optionally narrowed to one slot. */
function getForgeableFromInventory(player: PlayerState, slot?: EquipSlot): { item: InventoryItem; index: number }[] {
    return player.inventory
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => {
            const s = slotOf(item.def);
            return s !== null && (slot === undefined || s === slot);
        });
}

// Hard ceilings so forged gear can never trivialise the game. Each slot has
// its own profile: armour can stack DEF/HP, rings stay modest across the board.
const STAT_CEILING: Record<EquipSlot, Record<string, number>> = {
    weapon: { atk: 45, def: 30, maxHp: 120, spd: 4, critChance: 0.4 },
    armor: { atk: 15, def: 45, maxHp: 150, spd: 3, critChance: 0.15 },
    ring: { atk: 20, def: 20, maxHp: 90, spd: 3, critChance: 0.3 },
};

export function getEnchant(def: ItemDef): number {
    return def.enchant ?? 0;
}

/** How many Limit Breakers the player is carrying. */
export function countLimitBreakers(player: PlayerState): number {
    return player.inventory
        .filter(i => i.def.id === 'limit_breaker')
        .reduce((n, i) => n + i.count, 0);
}

/** Consume one Limit Breaker. Returns false if the player has none. */
function spendLimitBreaker(player: PlayerState): boolean {
    const idx = player.inventory.findIndex(i => i.def.id === 'limit_breaker');
    if (idx < 0) return false;
    const entry = player.inventory[idx];
    entry.count--;
    if (entry.count <= 0) player.inventory.splice(idx, 1);
    return true;
}

/** The enchant level a merge of these two would produce. */
export function resultEnchant(w1: ItemDef, w2: ItemDef): number {
    return Math.max(getEnchant(w1), getEnchant(w2)) + 1;
}

export interface ForgeCheck {
    ok: boolean;
    /** True when the forge is only possible by spending a Limit Breaker */
    needsBreaker: boolean;
    reason: string;
}

export function checkForge(player: PlayerState, w1: ItemDef, w2: ItemDef): ForgeCheck {
    const s1 = slotOf(w1);
    const s2 = slotOf(w2);
    if (!s1 || !s2) {
        return { ok: false, needsBreaker: false, reason: 'Only weapons, armour and rings can be forged.' };
    }
    if (s1 !== s2) {
        return {
            ok: false, needsBreaker: false,
            reason: `Those do not go together — a ${SLOT_NOUN[s1]} and a ${SLOT_NOUN[s2]}. Pick two of the same kind.`,
        };
    }

    const cap = baseCap();
    const next = resultEnchant(w1, w2);

    if (next > ENCHANT_CAP_BROKEN) {
        return { ok: false, needsBreaker: false, reason: `+${ENCHANT_CAP_BROKEN} is the absolute limit. This ${SLOT_NOUN[s1]} cannot be pushed further.` };
    }
    if (next > cap) {
        // Past the bench's own limit you need a Limit Breaker — and only the
        // City's master smith knows how to spend one without ruining the piece.
        if (!atCityForge) {
            return {
                ok: false, needsBreaker: true,
                reason: `This bench stops at +${cap}. Only the City's master forge can push past it with a Limit Breaker.`,
            };
        }
        if (countLimitBreakers(player) <= 0) {
            return { ok: false, needsBreaker: true, reason: `Enchantment is capped at +${cap}. You need a Limit Breaker to reach +${next}.` };
        }
        return {
            ok: true, needsBreaker: true,
            reason: `Consumes 1 Limit Breaker to reach +${next} — MYTHIC work.`,
        };
    }
    return { ok: true, needsBreaker: false, reason: '' };
}

// Generate the merged piece of gear from two defs of the same slot
function generateForgedItem(w1: ItemDef, w2: ItemDef): ItemDef {
    const slot: EquipSlot = slotOf(w1) ?? 'weapon';
    const ceilings = STAT_CEILING[slot];
    const s1 = w1.stats || {};
    const s2 = w2.stats || {};
    const combinedStats: Partial<Record<string, number>> = {};

    const enchant = Math.min(resultEnchant(w1, w2), ENCHANT_CAP_BROKEN);
    // Growth is bounded: the better stat, plus half the weaker one, then a
    // modest per-level bonus. No more exponential stat stacking.
    const enchantMult = 1 + enchant * 0.1;

    const allKeys = new Set([...Object.keys(s1), ...Object.keys(s2)]);
    for (const key of allKeys) {
        const v1 = (s1 as any)[key] || 0;
        const v2 = (s2 as any)[key] || 0;
        const better = Math.max(v1, v2);
        const worse = Math.min(v1, v2);
        let merged = (better + worse * 0.5) * enchantMult;

        // Negative stats (e.g. heavy weapons' SPD penalty) are kept, not amplified
        if (better <= 0) merged = better;

        const ceiling = ceilings[key];
        if (key === 'critChance') {
            if (ceiling !== undefined) merged = Math.min(merged, ceiling);
            if (merged > 0) (combinedStats as any)[key] = Math.round(merged * 1000) / 1000;
        } else {
            merged = Math.floor(merged);
            if (ceiling !== undefined) merged = Math.min(merged, ceiling);
            if (merged !== 0) (combinedStats as any)[key] = merged;
        }
    }

    // Upgrade rarity one step. MYTHIC is reserved: only the City's master
    // forge, only with a Limit Breaker, only past that bench's cap.
    const rarityOrder: Rarity[] = RARITY_ORDER;
    const maxRarityIdx = Math.max(rarityOrder.indexOf(w1.rarity), rarityOrder.indexOf(w2.rarity));
    const canBeMythic = atCityForge && enchant > ENCHANT_CAP_CITY;
    const ceilingIdx = rarityOrder.indexOf(canBeMythic ? 'mythic' : 'legendary');
    const forgedRarity = rarityOrder[Math.min(maxRarityIdx + 1, ceilingIdx)];

    const baseName = generateMergedName(w1.name, w2.name);
    const name = `${baseName} +${enchant}`;

    // Keep the icon of the piece that contributed most to its slot's main stat
    const keyStat = slot === 'weapon' ? 'atk' : slot === 'armor' ? 'def' : 'maxHp';
    const lead1 = (s1 as any)[keyStat] || w1.value / 100;
    const lead2 = (s2 as any)[keyStat] || w2.value / 100;
    const icon = lead1 >= lead2 ? w1.icon : w2.icon;

    const isBoss = !!(w1.isBossWeapon || w2.isBossWeapon);
    let desc = `Forged from ${w1.name} + ${w2.name}.`;
    if (enchant > ENCHANT_CAP) desc += ' ⚡ Limit broken.';
    if (isBoss) desc += ' 🔥 Boss-infused.';

    return {
        id: `forged_${Date.now()}_${Math.floor(Math.random() * 1e6)}`,
        name,
        description: desc,
        category: slot === 'weapon' ? 'weapon' : slot === 'armor' ? 'armor' : 'ring',
        rarity: forgedRarity,
        icon,
        equipSlot: slot,
        stats: combinedStats as any,
        value: Math.floor((w1.value + w2.value) * 0.9),
        isForged: true,
        isBossWeapon: isBoss,
        enchant,
    };
}

function generateMergedName(name1: string, name2: string): string {
    // Split each name into words
    const words1 = name1.split(' ');
    const words2 = name2.split(' ');

    if (words1.length >= 2 && words2.length >= 2) {
        // Take first word from w1, last word from w2 (e.g., "Iron Sword" + "Long Bow" = "Iron Bow")
        // But let's be more creative — portmanteau style
        const first = words1[0];
        const last = words2[words2.length - 1];

        // Occasionally create a portmanteau from single words
        if (words1.length === 2 && words2.length === 2) {
            // "Bone Axe" + "Long Bow" → "Bonelong Bow" (first word1 + first word2 + last word2)
            const prefix = words1[0] + words2[0].toLowerCase();
            return prefix + ' ' + words2[words2.length - 1];
        }
        return first + ' ' + last;
    }

    // Fallback: combine first halves
    const half1 = name1.slice(0, Math.ceil(name1.length / 2));
    const half2 = name2.slice(Math.floor(name2.length / 2));
    return half1 + half2;
}

function getForgeCost(w1: ItemDef, w2: ItemDef): number {
    const baseVal = (w1.value + w2.value);
    const isBoss = w1.isBossWeapon || w2.isBossWeapon;
    return Math.floor(baseVal * (isBoss ? 0.8 : 0.5));
}

function renderForgeUI(): void {
    if (!forgePlayer) return;

    const grid = document.getElementById('forge-weapon-grid')!;
    const preview = document.getElementById('forge-preview')!;
    const previewStats = document.getElementById('forge-result-stats')!;
    const forgeBtn = document.getElementById('forge-confirm-btn') as HTMLButtonElement;

    // --- Slot tabs: weapons / armour / rings ---
    const tabRow = document.getElementById('forge-tabs')!;
    tabRow.innerHTML = '';
    for (const slot of FORGEABLE) {
        const count = getForgeableFromInventory(forgePlayer, slot).length;
        const btn = document.createElement('button');
        btn.className = 'forge-tab' + (slot === activeTab ? ' active' : '');
        btn.textContent = `${SLOT_LABEL[slot]} (${count})`;
        btn.addEventListener('click', () => {
            if (activeTab === slot) return;
            activeTab = slot;
            // Selections do not survive a slot change — they could not be merged anyway
            selectedSlot1 = -1;
            selectedSlot2 = -1;
            renderForgeUI();
        });
        tabRow.appendChild(btn);
    }

    const forgeables = getForgeableFromInventory(forgePlayer, activeTab);

    // Render selection grid
    grid.innerHTML = '';
    forgeables.forEach(({ item, index }) => {
        const slot = document.createElement('div');
        slot.className = 'forge-weapon-slot';
        if (index === selectedSlot1) slot.classList.add('selected-1');
        if (index === selectedSlot2) slot.classList.add('selected-2');

        // Rarity border
        slot.classList.add(`rarity-${item.def.rarity}`);

        // Icon
        const icon = Assets.getItem(item.def.icon, item.def.rarity);
        if (icon) {
            const img = document.createElement('canvas');
            img.width = icon.width; img.height = icon.height;
            img.getContext('2d')!.drawImage(icon, 0, 0);
            img.style.imageRendering = 'pixelated';
            img.style.width = '32px'; img.style.height = '32px';
            slot.appendChild(img);
        }

        // Name
        const label = document.createElement('span');
        label.className = 'forge-item-name';
        label.style.color = getRarityColor(item.def.rarity);
        label.textContent = item.def.name;
        slot.appendChild(label);

        // Stats summary
        const stats = item.def.stats;
        if (stats) {
            const statText = document.createElement('span');
            statText.className = 'forge-item-stats';
            const parts: string[] = [];
            if (stats.atk) parts.push(`ATK+${stats.atk}`);
            if (stats.def) parts.push(`DEF+${stats.def}`);
            if (stats.spd) parts.push(`SPD+${stats.spd}`);
            if (stats.critChance) parts.push(`CRIT+${Math.round(stats.critChance * 100)}%`);
            if (stats.maxHp) parts.push(`HP+${stats.maxHp}`);
            statText.textContent = parts.join(' ');
            slot.appendChild(statText);
        }

        if (item.def.isBossWeapon) {
            const badge = document.createElement('span');
            badge.className = 'forge-boss-badge';
            badge.textContent = '⚔️ BOSS';
            slot.appendChild(badge);
        }

        slot.addEventListener('click', () => {
            if (selectedSlot1 === index) {
                selectedSlot1 = -1;
            } else if (selectedSlot2 === index) {
                selectedSlot2 = -1;
            } else if (selectedSlot1 === -1) {
                selectedSlot1 = index;
            } else if (selectedSlot2 === -1) {
                selectedSlot2 = index;
            } else {
                // Replace slot 2
                selectedSlot2 = index;
            }
            renderForgeUI();
        });

        grid.appendChild(slot);
    });

    if (forgeables.length === 0) {
        grid.innerHTML = `<div style="color: #888; padding: 20px; text-align: center;">No ${SLOT_NOUN[activeTab]} in your bag. Equipped gear cannot be forged — unequip it first.</div>`;
    } else if (forgeables.length === 1) {
        const note = document.createElement('div');
        note.style.cssText = 'color:#8a7a68;padding:8px;text-align:center;font-size:8px;';
        note.textContent = `You need two ${SLOT_NOUN[activeTab]} pieces to forge.`;
        grid.appendChild(note);
    }

    // Preview merged item
    if (selectedSlot1 >= 0 && selectedSlot2 >= 0 && forgePlayer) {
        const w1 = forgePlayer.inventory[selectedSlot1]?.def;
        const w2 = forgePlayer.inventory[selectedSlot2]?.def;

        if (w1 && w2) {
            const result = generateForgedItem(w1, w2);
            const cost = getForgeCost(w1, w2);
            const check = checkForge(forgePlayer, w1, w2);
            const breakers = countLimitBreakers(forgePlayer);

            preview.innerHTML = `
                <div class="forge-result-name" style="color: ${getRarityColor(result.rarity)}">${result.name}</div>
                <div class="forge-result-desc">${result.description}</div>
                <div class="forge-enchant-row">
                    <span class="forge-enchant-pip">Enchant +${result.enchant}</span>
                    <span class="forge-cap">bench cap +${baseCap()} · absolute +${ENCHANT_CAP_BROKEN}</span>
                </div>
                ${check.reason ? `<div class="forge-warn ${check.ok ? '' : 'forge-warn-bad'}">${check.reason}</div>` : ''}
                <div class="forge-breakers">💥 Limit Breakers: ${breakers}</div>
            `;

            const rs = result.stats || {};
            let statsHtml = '';
            if (rs.atk) statsHtml += `<span class="stat-forge-atk">⚔ ATK +${rs.atk}</span>`;
            if (rs.def) statsHtml += `<span class="stat-forge-def">🛡 DEF +${rs.def}</span>`;
            if (rs.spd) statsHtml += `<span class="stat-forge-spd">💨 SPD ${rs.spd > 0 ? '+' : ''}${rs.spd}</span>`;
            if (rs.critChance) statsHtml += `<span class="stat-forge-crit">🎯 CRIT +${Math.round(rs.critChance * 100)}%</span>`;
            if (rs.maxHp) statsHtml += `<span class="stat-forge-hp">❤️ MaxHP +${rs.maxHp}</span>`;
            previewStats.innerHTML = statsHtml;

            const affordable = forgePlayer.gold >= cost;
            forgeBtn.textContent = check.ok
                ? `🔥 FORGE! (${cost}g${check.needsBreaker ? ' + 1 💥' : ''})`
                : '🚫 CANNOT FORGE';
            forgeBtn.disabled = !check.ok || !affordable;
            forgeBtn.classList.remove('hidden');
            forgeBtn.onclick = () => performForge(result, cost);
        }
    } else {
        preview.innerHTML = `<div style="color: #888;">Select 2 ${SLOT_NOUN[activeTab]} pieces to merge</div>`;
        previewStats.innerHTML = '';
        forgeBtn.classList.add('hidden');
    }

    // Show selection labels
    const sel1Label = document.getElementById('forge-sel1-label')!;
    const sel2Label = document.getElementById('forge-sel2-label')!;
    sel1Label.textContent = selectedSlot1 >= 0 ? forgePlayer.inventory[selectedSlot1]?.def.name || '—' : `Select ${SLOT_NOUN[activeTab]} 1`;
    sel2Label.textContent = selectedSlot2 >= 0 ? forgePlayer.inventory[selectedSlot2]?.def.name || '—' : `Select ${SLOT_NOUN[activeTab]} 2`;
}

// Guards against a double-click forging twice off one selection
let forging = false;

function performForge(result: ItemDef, cost: number): void {
    const player = forgePlayer;
    if (!player || forging) return;

    // Re-validate the selection at click time. The old code trusted the
    // closure, so a second click after the reset spliced random inventory
    // entries and pushed a second copy of the weapon — the duplication bug.
    const idx1 = selectedSlot1;
    const idx2 = selectedSlot2;
    if (idx1 < 0 || idx2 < 0 || idx1 === idx2) return;
    const entry1 = player.inventory[idx1];
    const entry2 = player.inventory[idx2];
    if (!entry1 || !entry2) { selectedSlot1 = -1; selectedSlot2 = -1; renderForgeUI(); return; }

    const w1 = entry1.def;
    const w2 = entry2.def;

    if (player.gold < cost) {
        addMessage('Not enough gold!', 'msg-damage');
        return;
    }

    const check = checkForge(player, w1, w2);
    if (!check.ok) {
        addMessage(check.reason, 'msg-damage');
        return;
    }
    if (check.needsBreaker && !spendLimitBreaker(player)) {
        addMessage('You need a Limit Breaker for that.', 'msg-damage');
        return;
    }

    forging = true;
    try {
        player.gold -= cost;

        // Clear the consumed pieces out of the hotbar by identity
        for (let i = 0; i < player.hotbar.length; i++) {
            if (player.hotbar[i] === entry1 || player.hotbar[i] === entry2) {
                player.hotbar[i] = null;
            }
        }

        // Remove both inputs — highest index first so the second index stays valid
        const removeFirst = Math.max(idx1, idx2);
        const removeSecond = Math.min(idx1, idx2);
        player.inventory.splice(removeFirst, 1);
        player.inventory.splice(removeSecond, 1);

        // Equip the result into ITS OWN slot (weapon / armor / ring) OR put it
        // in the bag — never both. Doing both was the other half of the
        // duplication bug: unequipping minted a copy.
        const targetSlot: EquipSlot = result.equipSlot ?? 'weapon';
        const displaced = player.equipment[targetSlot];
        player.equipment[targetSlot] = result;
        if (displaced) {
            // The piece it replaced goes back in the bag if there is room
            if (player.inventory.length < 32) {
                player.inventory.push({ def: displaced, count: 1 });
            } else {
                addMessage(`No room for ${displaced.name} — it was left behind.`, 'msg-damage');
            }
        }
        recalcStats(player);

        GameAudio.chestOpen();
        addMessage(`⚒️ FORGED: ${result.name}!`, 'msg-legendary');
        if (check.needsBreaker) addMessage('💥 A Limit Breaker shatters. The cap gives way.', 'msg-legendary');
        addFloatingText(player.x * 16 + 8, player.y * 16 - 16, '⚒️ FORGED!', '#f39c12');

        updateHotbar(player);
    } finally {
        forging = false;
    }

    // Reset selection and re-render
    selectedSlot1 = -1;
    selectedSlot2 = -1;
    renderForgeUI();
}

export function initForge(): void {
    const closeBtn = document.getElementById('forge-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeForge);
        closeBtn.addEventListener('touchstart', (e) => { e.preventDefault(); closeForge(); });
    }
}
