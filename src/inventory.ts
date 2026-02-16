// ===== INVENTORY UI =====

import type { PlayerState, ItemDef, EquipSlot } from './types';
import { Assets } from './assets';

import { recalcStats } from './combat';
import { GameAudio } from './audio';
import { addMessage, updateHotbar } from './hud';
import { spawnHealParticles, addFloatingText } from './particles';

const panel = document.getElementById('inventory-panel')!;
const closeBtn = document.getElementById('close-inventory')!;
const grid = document.getElementById('inventory-grid')!;
const statsDisplay = document.getElementById('stats-display')!;
const tooltip = document.getElementById('item-tooltip')!;
const equipSlots = document.querySelectorAll('.equip-slot');

let isOpen = false;


export function initInventory(player: PlayerState): void {


    closeBtn.addEventListener('click', () => toggleInventory(player));
    document.getElementById('inventory-btn')!.addEventListener('click', () => toggleInventory(player));

    // Tooltip hide on click outside
    panel.addEventListener('mouseleave', () => hideTooltip());
}

export function toggleInventory(player: PlayerState): void {
    isOpen = !isOpen;
    if (isOpen) {
        renderInventory(player);
        panel.classList.remove('hidden');
    } else {
        panel.classList.add('hidden');
        hideTooltip();
    }
}

export function isInventoryOpen(): boolean { return isOpen; }

export function closeInventory(): void {
    isOpen = false;
    panel.classList.add('hidden');
    hideTooltip();
}

function renderInventory(player: PlayerState): void {
    // Stats
    statsDisplay.innerHTML = '';
    const stats = [
        ['HP', `${Math.ceil(player.stats.hp)}/${player.stats.maxHp}`],
        ['ATK', `${player.stats.atk}`],
        ['DEF', `${player.stats.def}`],
        ['SPD', `${player.stats.spd.toFixed(1)}`],
        ['CRIT', `${Math.floor(player.stats.critChance * 100)}%`],
        ['Gold', `${player.gold}`],
        ['Keys', `${player.keys}`],
        ['Level', `${player.level}`],
    ];
    stats.forEach(([label, value]) => {
        const row = document.createElement('div');
        row.className = 'stat-row';
        row.innerHTML = `<span class="stat-label">${label}</span><span class="stat-value">${value}</span>`;
        statsDisplay.appendChild(row);
    });

    // Equipment slots
    equipSlots.forEach(slot => {
        const el = slot as HTMLElement;
        const slotName = el.dataset.slot as EquipSlot;
        const item = player.equipment[slotName];
        const existingCanvas = el.querySelector('canvas');
        if (existingCanvas) existingCanvas.remove();
        el.classList.remove('filled', 'rarity-common', 'rarity-uncommon', 'rarity-rare', 'rarity-legendary');

        if (item) {
            el.classList.add('filled', `rarity-${item.rarity}`);
            const icon = Assets.getItem(item.icon, item.rarity);
            if (icon) {
                const clone = document.createElement('canvas');
                clone.width = icon.width;
                clone.height = icon.height;
                clone.getContext('2d')!.drawImage(icon, 0, 0);
                clone.style.width = '40px';
                clone.style.height = '40px';
                el.insertBefore(clone, el.querySelector('.equip-label'));
            }

            el.onmouseenter = (e) => showTooltip(item, e, true);
            el.onmouseleave = () => hideTooltip();
            el.onclick = () => { unequipItem(player, slotName); renderInventory(player); };
        } else {
            el.onmouseenter = null;
            el.onmouseleave = null;
            el.onclick = null;
        }
    });

    // Inventory grid
    grid.innerHTML = '';
    const maxSlots = 32;
    for (let i = 0; i < maxSlots; i++) {
        const slotDiv = document.createElement('div');
        slotDiv.className = 'inv-slot';
        const item = player.inventory[i];

        if (item) {
            slotDiv.classList.add(`rarity-${item.def.rarity}`);
            const icon = Assets.getItem(item.def.icon, item.def.rarity);
            if (icon) {
                const clone = document.createElement('canvas');
                clone.width = icon.width;
                clone.height = icon.height;
                clone.getContext('2d')!.drawImage(icon, 0, 0);
                clone.style.width = '100%';
                clone.style.height = '100%';
                slotDiv.appendChild(clone);
            }

            if (item.count > 1) {
                const count = document.createElement('span');
                count.className = 'item-count';
                count.textContent = `${item.count}`;
                slotDiv.appendChild(count);
            }

            slotDiv.onmouseenter = (e) => showTooltip(item.def, e);
            slotDiv.onmouseleave = () => hideTooltip();
            slotDiv.onclick = () => { useOrEquipItem(player, i); renderInventory(player); };
        }

        grid.appendChild(slotDiv);
    }
}

function showTooltip(item: ItemDef, e: MouseEvent, isEquipped = false): void {
    tooltip.classList.remove('hidden');
    const rarityColors: Record<string, string> = {
        common: '#aaa', uncommon: '#2ecc71', rare: '#3498db', legendary: '#e67e22'
    };

    let html = `<div class="tt-name" style="color:${rarityColors[item.rarity]}">${item.name}</div>`;
    html += `<div class="tt-rarity">${item.rarity.toUpperCase()}</div>`;
    html += `<div class="tt-desc">${item.description}</div>`;

    if (item.stats) {
        const statLines = Object.entries(item.stats)
            .map(([k, v]) => `${k.toUpperCase()}: ${(v as number) > 0 ? '+' : ''}${v}`)
            .join('<br>');
        html += `<div class="tt-stats">${statLines}</div>`;
    }
    if (item.healAmount) {
        html += `<div class="tt-stats">Heals: ${item.healAmount} HP</div>`;
    }

    html += `<div class="tt-action">${isEquipped ? 'Click to unequip' : item.equipSlot ? 'Click to equip' : item.category === 'consumable' ? 'Click to use' : ''}</div>`;
    tooltip.innerHTML = html;

    // Position tooltip
    const rect = tooltip.getBoundingClientRect();
    let left = e.clientX + 10;
    let top = e.clientY - 10;
    if (left + rect.width > window.innerWidth) left = e.clientX - rect.width - 10;
    if (top + rect.height > window.innerHeight) top = window.innerHeight - rect.height - 10;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
}

function hideTooltip(): void {
    tooltip.classList.add('hidden');
}

function useOrEquipItem(player: PlayerState, index: number): void {
    const item = player.inventory[index];
    if (!item) return;

    const def = item.def;

    if (def.equipSlot) {
        // Equip
        const old = player.equipment[def.equipSlot];
        player.equipment[def.equipSlot] = def;

        // Remove from inventory
        item.count--;
        if (item.count <= 0) player.inventory.splice(index, 1);

        // Put old item back
        if (old) addItemToInventory(player, old);

        recalcStats(player);
        GameAudio.pickup();
        addMessage(`Equipped ${def.name}`, `msg-${def.rarity}`);
    } else if (def.category === 'consumable') {
        if (def.healAmount && player.stats.hp < player.stats.maxHp) {
            const heal = Math.min(def.healAmount, player.stats.maxHp - player.stats.hp);
            player.stats.hp += heal;
            GameAudio.potionDrink();
            spawnHealParticles(player.px + 8, player.py + 8);
            addFloatingText(player.px + 8, player.py, `+${heal}`, '#2ecc71');
            addMessage(`Used ${def.name}, healed ${heal} HP`, 'msg-heal');

            item.count--;
            if (item.count <= 0) player.inventory.splice(index, 1);
        }
    } else if (def.category === 'scroll') {
        if (def.id === 'power_scroll') {
            player.baseStats.atk += 2;
            recalcStats(player);
            addMessage('ATK permanently increased by 2!', 'msg-legendary');
            item.count--;
            if (item.count <= 0) player.inventory.splice(index, 1);
        }
    }

    updateHotbar(player);
}

function unequipItem(player: PlayerState, slot: EquipSlot): void {
    const item = player.equipment[slot];
    if (!item) return;

    if (player.inventory.length >= 32) {
        addMessage('Inventory full!', 'msg-damage');
        return;
    }

    addItemToInventory(player, item);
    player.equipment[slot] = null;
    recalcStats(player);
    addMessage(`Unequipped ${item.name}`);
    updateHotbar(player);
}

export function addItemToInventory(player: PlayerState, def: ItemDef, count = 1): boolean {
    if (def.stackable) {
        const existing = player.inventory.find(i => i.def.id === def.id);
        if (existing) {
            existing.count += count;
            return true;
        }
    }
    if (player.inventory.length >= 32) return false;
    player.inventory.push({ def, count });

    // Auto-assign to hotbar if consumable and slot is empty
    if (def.category === 'consumable') {
        for (let i = 0; i < 5; i++) {
            if (!player.hotbar[i]) {
                player.hotbar[i] = player.inventory[player.inventory.length - 1];
                break;
            }
        }
    }

    return true;
}

export function useHotbarSlot(player: PlayerState, slot: number): void {
    const item = player.hotbar[slot];
    if (!item) return;

    const idx = player.inventory.indexOf(item);
    if (idx === -1) {
        player.hotbar[slot] = null;
        return;
    }

    useOrEquipItem(player, idx);

    // Check if item was used up
    if (!player.inventory.includes(item)) {
        player.hotbar[slot] = null;
    }

    if (isOpen) renderInventory(player);
}
