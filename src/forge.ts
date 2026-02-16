// ===== FORGE SYSTEM: Combine 2 weapons into 1 powerful hybrid =====

import type { PlayerState, ItemDef, Rarity, InventoryItem } from './types';
import { addMessage, updateHotbar } from './hud';
import { GameAudio } from './audio';
import { addFloatingText } from './particles';
import { getRarityColor } from './items';
import { Assets } from './assets';

let forgeOpen = false;
let forgePlayer: PlayerState | null = null;
let selectedSlot1: number = -1; // inventory index
let selectedSlot2: number = -1;

export function isForgeOpen(): boolean { return forgeOpen; }

export function openForge(player: PlayerState): void {
    forgeOpen = true;
    forgePlayer = player;
    selectedSlot1 = -1;
    selectedSlot2 = -1;
    renderForgeUI();
    document.getElementById('forge-overlay')!.classList.remove('hidden');
}

export function closeForge(): void {
    forgeOpen = false;
    forgePlayer = null;
    selectedSlot1 = -1;
    selectedSlot2 = -1;
    document.getElementById('forge-overlay')!.classList.add('hidden');
}

function getWeaponsFromInventory(player: PlayerState): { item: InventoryItem; index: number }[] {
    return player.inventory
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => item.def.category === 'weapon');
}

// Generate the merged weapon from two weapon defs
function generateForgedWeapon(w1: ItemDef, w2: ItemDef): ItemDef {
    // Combine stats (add both, with 20% forge bonus)
    const s1 = w1.stats || {};
    const s2 = w2.stats || {};
    const combinedStats: Partial<Record<string, number>> = {};

    const allKeys = new Set([...Object.keys(s1), ...Object.keys(s2)]);
    for (const key of allKeys) {
        const v1 = (s1 as any)[key] || 0;
        const v2 = (s2 as any)[key] || 0;
        // Add both stats with a 20% forge bonus
        const combined = v1 + v2;
        (combinedStats as any)[key] = key === 'critChance'
            ? Math.min(combined * 1.1, 0.5) // cap crit at 50%
            : Math.floor(combined * 1.2);
    }

    // Upgrade rarity
    const rarityOrder: Rarity[] = ['common', 'uncommon', 'rare', 'legendary'];
    const maxRarityIdx = Math.max(rarityOrder.indexOf(w1.rarity), rarityOrder.indexOf(w2.rarity));
    const forgedRarity = rarityOrder[Math.min(maxRarityIdx + 1, 3)];

    // Generate cool merged name
    const name = generateMergedName(w1.name, w2.name);

    // Pick icon from the weapon with higher ATK
    const icon = (s1.atk || 0) >= (s2.atk || 0) ? w1.icon : w2.icon;

    // Description with power indicator
    const isBoss = w1.isBossWeapon || w2.isBossWeapon;
    const bothBoss = w1.isBossWeapon && w2.isBossWeapon;
    let desc = `Forged from ${w1.name} + ${w2.name}.`;
    if (bothBoss) desc += ' ⚡ DUAL BOSS POWER! All stats doubled!';
    else if (isBoss) desc += ' 🔥 Boss-infused weapon!';

    // Double bonus if BOTH weapons are boss weapons!
    if (bothBoss) {
        for (const key of Object.keys(combinedStats)) {
            (combinedStats as any)[key] = key === 'critChance'
                ? Math.min((combinedStats as any)[key] * 1.5, 0.5)
                : Math.floor((combinedStats as any)[key] * 1.5);
        }
    }

    return {
        id: `forged_${Date.now()}`,
        name,
        description: desc,
        category: 'weapon',
        rarity: forgedRarity,
        icon,
        equipSlot: 'weapon',
        stats: combinedStats as any,
        value: Math.floor((w1.value + w2.value) * 1.5),
        isForged: true,
        isBossWeapon: isBoss,
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

    const weapons = getWeaponsFromInventory(forgePlayer);
    const grid = document.getElementById('forge-weapon-grid')!;
    const preview = document.getElementById('forge-preview')!;
    const previewStats = document.getElementById('forge-result-stats')!;
    const forgeBtn = document.getElementById('forge-confirm-btn') as HTMLButtonElement;

    // Render weapon selection grid
    grid.innerHTML = '';
    weapons.forEach(({ item, index }) => {
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

    if (weapons.length === 0) {
        grid.innerHTML = '<div style="color: #888; padding: 20px; text-align: center;">No weapons in inventory! Buy some weapons first.</div>';
    }

    // Preview merged weapon
    if (selectedSlot1 >= 0 && selectedSlot2 >= 0 && forgePlayer) {
        const w1 = forgePlayer.inventory[selectedSlot1]?.def;
        const w2 = forgePlayer.inventory[selectedSlot2]?.def;

        if (w1 && w2) {
            const result = generateForgedWeapon(w1, w2);
            const cost = getForgeCost(w1, w2);

            preview.innerHTML = `
                <div class="forge-result-name" style="color: ${getRarityColor(result.rarity)}">${result.name}</div>
                <div class="forge-result-desc">${result.description}</div>
            `;

            const rs = result.stats || {};
            let statsHtml = '';
            if (rs.atk) statsHtml += `<span class="stat-forge-atk">⚔ ATK +${rs.atk}</span>`;
            if (rs.def) statsHtml += `<span class="stat-forge-def">🛡 DEF +${rs.def}</span>`;
            if (rs.spd) statsHtml += `<span class="stat-forge-spd">💨 SPD +${rs.spd}</span>`;
            if (rs.critChance) statsHtml += `<span class="stat-forge-crit">🎯 CRIT +${Math.round(rs.critChance * 100)}%</span>`;
            if (rs.maxHp) statsHtml += `<span class="stat-forge-hp">❤️ MaxHP +${rs.maxHp}</span>`;
            previewStats.innerHTML = statsHtml;

            forgeBtn.textContent = `🔥 FORGE! (${cost}g)`;
            forgeBtn.disabled = forgePlayer.gold < cost;
            forgeBtn.classList.remove('hidden');
            forgeBtn.onclick = () => performForge(w1, w2, result, cost);
        }
    } else {
        preview.innerHTML = '<div style="color: #888;">Select 2 weapons to merge</div>';
        previewStats.innerHTML = '';
        forgeBtn.classList.add('hidden');
    }

    // Show selection labels
    const sel1Label = document.getElementById('forge-sel1-label')!;
    const sel2Label = document.getElementById('forge-sel2-label')!;
    sel1Label.textContent = selectedSlot1 >= 0 ? forgePlayer.inventory[selectedSlot1]?.def.name || '—' : 'Select weapon 1';
    sel2Label.textContent = selectedSlot2 >= 0 ? forgePlayer.inventory[selectedSlot2]?.def.name || '—' : 'Select weapon 2';
}

function performForge(w1: ItemDef, w2: ItemDef, result: ItemDef, cost: number): void {
    if (!forgePlayer) return;
    if (forgePlayer.gold < cost) {
        addMessage('Not enough gold!', 'msg-damage');
        return;
    }

    // Deduct gold
    forgePlayer.gold -= cost;

    // Remove both weapons from inventory (higher index first to avoid shifting)
    const idx1 = selectedSlot1;
    const idx2 = selectedSlot2;
    const removeFirst = Math.max(idx1, idx2);
    const removeSecond = Math.min(idx1, idx2);

    // Also unequip if either weapon is equipped
    if (forgePlayer.equipment.weapon && (forgePlayer.equipment.weapon.id === w1.id || forgePlayer.equipment.weapon.id === w2.id)) {
        forgePlayer.equipment.weapon = null;
    }

    // Clear from hotbar
    for (let i = 0; i < forgePlayer.hotbar.length; i++) {
        if (forgePlayer.hotbar[i] && (forgePlayer.hotbar[i]!.def.id === w1.id || forgePlayer.hotbar[i]!.def.id === w2.id)) {
            forgePlayer.hotbar[i] = null;
        }
    }

    forgePlayer.inventory.splice(removeFirst, 1);
    forgePlayer.inventory.splice(removeSecond, 1);

    // Add forged weapon
    forgePlayer.inventory.push({ def: result, count: 1 });

    // Auto-equip the forged weapon
    forgePlayer.equipment.weapon = result;

    GameAudio.chestOpen(); // satisfying sound
    addMessage(`⚒️ FORGED: ${result.name}!`, 'msg-legendary');
    addFloatingText(forgePlayer.x * 16 + 8, forgePlayer.y * 16 - 16, '⚒️ FORGED!', '#f39c12');

    updateHotbar(forgePlayer);

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
