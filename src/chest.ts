// ===== CHEST LOOT PANEL =====
// Chests are no longer vacuumed up by walking over them. Stand next to one,
// press Space (or E), and a 5-slot panel opens: click a slot to take that
// item, or Ctrl+A / the TAKE ALL button to sweep the lot.

import type { PlayerState, ChestState, DungeonFloor, InventoryItem, ItemDef } from './types';
import { Assets } from './assets';
import { GameAudio } from './audio';
import { addMessage, updateHotbar } from './hud';
import { addItemToInventory } from './inventory';
import { getItemsByFloor, rollLoot, getItemDef, getRarityColor } from './items';
import { addFloatingText, spawnParticles } from './particles';

export const CHEST_SLOTS = 5;

let open = false;
let activeChest: ChestState | null = null;
let activePlayer: PlayerState | null = null;

export function isChestOpen(): boolean { return open; }

/** The chest the player can currently reach (same tile or orthogonally adjacent). */
export function getReachableChest(player: PlayerState, floor: DungeonFloor): ChestState | null {
    if (!floor.chests) return null;
    for (const c of floor.chests) {
        const d = Math.abs(c.x - player.x) + Math.abs(c.y - player.y);
        if (d <= 1) {
            // Nothing left inside — treat as scenery
            if (c.opened && !chestHasContents(c)) continue;
            return c;
        }
    }
    return null;
}

export function chestHasContents(c: ChestState): boolean {
    return (c.gold ?? 0) > 0 || (c.loot?.length ?? 0) > 0;
}

/** Roll a chest's contents the first time it is cracked open. */
function rollChestContents(chest: ChestState, floor: number): void {
    if (chest.loot) return;

    const loot: InventoryItem[] = [];
    const drops = getItemsByFloor(floor);

    // 2-4 item rolls, deeper floors lean richer
    const rolls = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < rolls && loot.length < CHEST_SLOTS; i++) {
        const def = rollLoot(drops);
        if (!def) continue;
        const existing = def.stackable ? loot.find(l => l.def.id === def.id) : undefined;
        if (existing) existing.count++;
        else loot.push({ def, count: 1 });
    }

    // Guarantee at least one item so a chest is never a pure disappointment
    if (loot.length === 0) {
        const fallback = getItemDef(floor >= 30 ? 'greater_health' : 'health_potion');
        if (fallback) loot.push({ def: fallback, count: 1 + Math.floor(Math.random() * 2) });
    }

    // Deep chests can hide a Limit Breaker
    if (floor >= 10 && loot.length < CHEST_SLOTS && Math.random() < 0.08) {
        const lb = getItemDef('limit_breaker');
        if (lb) loot.push({ def: lb, count: 1 });
    }

    chest.loot = loot;
    chest.gold = Math.floor(20 + Math.random() * 30 * (1 + floor * 0.1));
}

export function openChest(player: PlayerState, chest: ChestState, floorNum: number): void {
    rollChestContents(chest, floorNum);

    if (!chest.opened) {
        chest.opened = true;
        GameAudio.chestOpen();
        spawnParticles(chest.x * 16 + 8, chest.y * 16 + 4, 14, '#ffd54f', 2, -0.03, 2);
    }

    open = true;
    activeChest = chest;
    activePlayer = player;
    render();
    panel().classList.remove('hidden');
}

export function closeChest(): void {
    open = false;
    activeChest = null;
    activePlayer = null;
    panel().classList.add('hidden');
}

function panel(): HTMLElement {
    return document.getElementById('chest-panel')!;
}

/** Take one slot. Returns false if the inventory is full. */
function takeSlot(index: number): boolean {
    if (!activeChest || !activePlayer || !activeChest.loot) return false;
    const entry = activeChest.loot[index];
    if (!entry) return false;

    if (!addItemToInventory(activePlayer, entry.def, entry.count)) {
        addMessage('Inventory full!', 'msg-damage');
        return false;
    }

    activeChest.loot.splice(index, 1);
    GameAudio.pickup();
    addMessage(`Took ${entry.def.name}${entry.count > 1 ? ` x${entry.count}` : ''}`, `msg-${entry.def.rarity}`);
    addFloatingText(activePlayer.px + 8, activePlayer.py, `+${entry.def.name}`, getRarityColor(entry.def.rarity));
    updateHotbar(activePlayer);
    return true;
}

function takeGold(): void {
    if (!activeChest || !activePlayer) return;
    const g = activeChest.gold ?? 0;
    if (g <= 0) return;
    activePlayer.gold += g;
    activeChest.gold = 0;
    GameAudio.pickup();
    addMessage(`Found ${g} gold!`, 'msg-xp');
    addFloatingText(activePlayer.px + 8, activePlayer.py - 8, `+${g}g`, '#f1c40f');
}

/** Sweep only the coin, leaving the items in the chest for later. */
export function takeGoldOnly(): void {
    if (!activeChest || !activePlayer) return;
    if ((activeChest.gold ?? 0) <= 0) return;
    takeGold();
    render();
    if (!chestHasContents(activeChest)) closeChest();
}

export function takeAll(): void {
    if (!activeChest || !activePlayer) return;
    takeGold();
    let blocked = false;
    // Walk backwards so splices inside takeSlot don't skip entries
    for (let i = (activeChest.loot?.length ?? 0) - 1; i >= 0; i--) {
        if (!takeSlot(i)) { blocked = true; break; }
    }
    render();
    if (!blocked && !chestHasContents(activeChest)) {
        addMessage('The chest is empty.', 'msg-common');
        closeChest();
    }
}

function render(): void {
    if (!activeChest) return;
    const slotsEl = document.getElementById('chest-slots')!;
    const goldEl = document.getElementById('chest-gold')!;
    slotsEl.innerHTML = '';

    const loot = activeChest.loot ?? [];
    for (let i = 0; i < CHEST_SLOTS; i++) {
        const slot = document.createElement('div');
        slot.className = 'chest-slot';
        const entry: InventoryItem | undefined = loot[i];

        if (entry) {
            slot.classList.add('filled', `rarity-${entry.def.rarity}`);
            const icon = Assets.getItem(entry.def.icon, entry.def.rarity);
            if (icon) {
                const c = document.createElement('canvas');
                c.width = icon.width; c.height = icon.height;
                c.getContext('2d')!.drawImage(icon, 0, 0);
                slot.appendChild(c);
            }
            const name = document.createElement('span');
            name.className = 'chest-slot-name';
            name.style.color = getRarityColor(entry.def.rarity);
            name.textContent = entry.def.name;
            slot.appendChild(name);

            if (entry.count > 1) {
                const count = document.createElement('span');
                count.className = 'chest-slot-count';
                count.textContent = `x${entry.count}`;
                slot.appendChild(count);
            }

            slot.title = describe(entry.def);
            slot.addEventListener('click', () => {
                const idx = (activeChest?.loot ?? []).indexOf(entry);
                if (idx >= 0 && takeSlot(idx)) {
                    render();
                    if (activeChest && !chestHasContents(activeChest)) closeChest();
                }
            });
        } else {
            slot.classList.add('empty');
        }
        slotsEl.appendChild(slot);
    }

    const g = activeChest.gold ?? 0;
    goldEl.textContent = g > 0 ? `💰 ${g} gold` : '';
    goldEl.classList.toggle('hidden', g <= 0);

    // Gold-only button is pointless once the coin is gone
    const goldBtn = document.getElementById('chest-take-gold') as HTMLButtonElement | null;
    if (goldBtn) {
        goldBtn.classList.toggle('hidden', g <= 0);
        goldBtn.textContent = `💰 TAKE ${g} GOLD ONLY`;
    }
}

function describe(def: ItemDef): string {
    const parts: string[] = [def.name, def.description];
    if (def.stats) {
        const s: string[] = [];
        if (def.stats.atk) s.push(`ATK+${def.stats.atk}`);
        if (def.stats.def) s.push(`DEF+${def.stats.def}`);
        if (def.stats.spd) s.push(`SPD+${def.stats.spd}`);
        if (def.stats.maxHp) s.push(`HP+${def.stats.maxHp}`);
        if (def.stats.critChance) s.push(`CRIT+${Math.round(def.stats.critChance * 100)}%`);
        if (s.length) parts.push(s.join(' '));
    }
    return parts.join('\n');
}

export function initChestUI(): void {
    document.getElementById('chest-close')?.addEventListener('click', closeChest);
    document.getElementById('chest-take-all')?.addEventListener('click', takeAll);
    document.getElementById('chest-take-gold')?.addEventListener('click', takeGoldOnly);
    document.getElementById('chest-backdrop')?.addEventListener('click', closeChest);

    // Ctrl+A sweeps the chest, G takes just the coin, Esc closes it
    window.addEventListener('keydown', (e) => {
        if (!open) return;
        if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
            e.preventDefault();
            takeAll();
        } else if (!e.ctrlKey && !e.metaKey && (e.key === 'g' || e.key === 'G')) {
            e.preventDefault();
            takeGoldOnly();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeChest();
        }
    });
}
