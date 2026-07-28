// ===== NPC DIALOG SYSTEM =====

import type { PlayerState, NPCState, DungeonFloor } from './types';
import { addMessage } from './hud';
import { GameAudio } from './audio';
import { spawnHealParticles, addFloatingText } from './particles';
import { addItemToInventory } from './inventory';
import { getItemDef } from './items';
import { openForge } from './forge';
import { getRarityColor } from './items';
import { Assets } from './assets';

const dialogEl = document.getElementById('npc-dialog')!;
const npcNameEl = document.getElementById('npc-name')!;
const npcTextEl = document.getElementById('npc-text')!;
const npcOptionsEl = document.getElementById('npc-options')!;

let dialogOpen = false;

export function isDialogOpen(): boolean { return dialogOpen; }

let currentActionCallback: ((action: string) => void) | undefined;

export function openDialog(npc: NPCState, player: PlayerState, onAction?: (action: string) => void): void {
    dialogOpen = true;
    currentActionCallback = onAction;
    GameAudio.npcGreet();
    showDialogNode(npc, npc.currentDialog, player);
    dialogEl.classList.remove('hidden');
}

export function closeDialog(): void {
    dialogOpen = false;
    currentActionCallback = undefined;
    dialogEl.classList.add('hidden');
    // ATTACK FIX: a dialog button keeps keyboard focus after the panel hides,
    // so the next Space press activates that button instead of swinging.
    const focused = document.activeElement as HTMLElement | null;
    if (focused && dialogEl.contains(focused)) focused.blur();
    npcOptionsEl.innerHTML = '';
}


function showDialogNode(npc: NPCState, index: number, player: PlayerState): void {
    const node = npc.dialog[index];
    if (!node) { closeDialog(); return; }
    npcNameEl.textContent = npc.name;
    npcTextEl.textContent = node.text;
    npcOptionsEl.innerHTML = '';

    // Once the hub portal is lit, the merchant's stock changes
    const options = [...node.options];
    if (npc.type === 'merchant' && player.unlocks?.portal) {
        if (index === 0) {
            npcTextEl.textContent = 'My scrolls... my scrolls work again! The ways are open. Where to?';
        }
        if (!options.some(o => o.itemId === 'city_scroll')) {
            options.splice(Math.max(0, options.length - 1), 0, {
                label: 'City Scroll (750g)', action: 'buy_city_scroll', cost: 750, itemId: 'city_scroll',
            });
        }
    }

    // Check if this looks like a shop (items are present)
    const isShop = options.some(o => o.itemId);
    if (isShop) {
        npcOptionsEl.className = 'npc-shop-grid';
    } else {
        npcOptionsEl.className = '';
    }

    options.forEach(opt => {
        if (opt.itemId) {
            // Render rich item card
            const def = getItemDef(opt.itemId);
            if (def) {
                const card = document.createElement('div');
                card.className = `shop-item-card rarity-${def.rarity}`;

                // Icon
                const iconCanvas = document.createElement('canvas');
                const icon = Assets.getItem(def.icon, def.rarity);
                if (icon) {
                    iconCanvas.width = 32; iconCanvas.height = 32;
                    const ctx = iconCanvas.getContext('2d')!;
                    ctx.drawImage(icon, 0, 0, 32, 32);
                }
                card.appendChild(iconCanvas);

                // Info container
                const info = document.createElement('div');
                info.className = 'shop-item-info';

                // Name
                const name = document.createElement('div');
                name.className = 'shop-item-name';
                name.textContent = def.name;
                name.style.color = getRarityColor(def.rarity);
                info.appendChild(name);

                // Desc/Stats
                const desc = document.createElement('div');
                desc.className = 'shop-item-desc';
                if (def.stats) {
                    const parts: string[] = [];
                    if (def.stats.atk) parts.push(`ATK+${def.stats.atk}`);
                    if (def.stats.def) parts.push(`DEF+${def.stats.def}`);
                    if (def.stats.spd) parts.push(`SPD+${def.stats.spd}`);
                    if (def.stats.critChance) parts.push(`CRIT+${Math.round(def.stats.critChance * 100)}%`);
                    if (def.stats.maxHp) parts.push(`HP+${def.stats.maxHp}`);
                    desc.textContent = parts.join(' ');
                } else if (def.foodEffects) {
                    desc.textContent = def.description;
                } else {
                    desc.textContent = def.description;
                }
                info.appendChild(desc);
                card.appendChild(info);

                // Buy Button
                const btn = document.createElement('button');
                btn.className = 'shop-buy-btn';
                btn.textContent = `${opt.cost}g`;
                if (player.gold < (opt.cost || 0)) btn.disabled = true;

                btn.addEventListener('click', (e) => {
                    e.stopPropagation(); // don't trigger card click if we add one
                    handleDialogAction(opt.action, opt.cost, npc, player);
                });

                card.appendChild(btn);
                npcOptionsEl.appendChild(card);
            }
        } else {
            // Standard action button
            const btn = document.createElement('button');
            btn.textContent = opt.label;
            // Add specific styling for "Leave" or "Forge"
            if (opt.action === 'close') btn.className = 'dialog-btn-close';
            else if (opt.action === 'open_forge') btn.className = 'dialog-btn-special';
            else btn.className = 'dialog-btn-std';

            btn.addEventListener('click', () => handleDialogAction(opt.action, opt.cost, npc, player));
            npcOptionsEl.appendChild(btn);
        }
    });
}

function buyItem(itemId: string, cost: number, player: PlayerState): boolean {
    if (player.gold >= cost) {
        const def = getItemDef(itemId);
        if (def) {
            player.gold -= cost;
            addItemToInventory(player, def);
            addMessage(`Bought ${def.name} for ${cost}g`, 'msg-uncommon');
            GameAudio.pickup();
            return true;
        }
    } else {
        addMessage('Not enough gold!', 'msg-damage');
    }
    return false;
}

function handleDialogAction(action: string, cost: number | undefined, npc: NPCState, player: PlayerState): void {
    if (currentActionCallback) {
        currentActionCallback(action);
    }

    switch (action) {
        case 'close':
            closeDialog();
            break;

        // Healing is never free. The healer charges by the point, scaled to
        // how deep you have been — no more infinite free full-heals.
        case 'heal': {
            if (player.stats.hp >= player.stats.maxHp) {
                addMessage('You are already at full health.');
                closeDialog();
                break;
            }
            const missing = player.stats.maxHp - player.stats.hp;
            const price = Math.max(10, Math.ceil(missing * (1.2 + player.maxReachedFloor * 0.03)));
            if (player.gold < price) {
                addMessage(`The healer wants ${price}g. You cannot afford it.`, 'msg-damage');
                closeDialog();
                break;
            }
            player.gold -= price;
            player.stats.hp = player.stats.maxHp;
            spawnHealParticles(player.px + 8, player.py + 8);
            addFloatingText(player.px + 8, player.py, `FULL HEAL -${price}g`, '#2ecc71');
            addMessage(`The healer mends you for ${price}g.`, 'msg-heal');
            GameAudio.potionDrink();
            closeDialog();
            break;
        }

        // Partial patch-up — cheaper, tops you up by a fixed amount
        case 'heal_partial': {
            const amount = 40 + player.maxReachedFloor;
            const price = Math.max(8, Math.ceil(amount * 0.6));
            if (player.stats.hp >= player.stats.maxHp) {
                addMessage('You are already at full health.');
                closeDialog();
                break;
            }
            if (player.gold < price) {
                addMessage(`That costs ${price}g. You cannot afford it.`, 'msg-damage');
                closeDialog();
                break;
            }
            player.gold -= price;
            const healed = Math.min(amount, player.stats.maxHp - player.stats.hp);
            player.stats.hp += healed;
            spawnHealParticles(player.px + 8, player.py + 8);
            addFloatingText(player.px + 8, player.py, `+${healed}`, '#2ecc71');
            addMessage(`Patched up for ${price}g (+${healed} HP).`, 'msg-heal');
            GameAudio.potionDrink();
            closeDialog();
            break;
        }

        case 'buy_city_scroll': buyItem('city_scroll', cost || 750, player); closeDialog(); break;
        case 'buy_ultra_hp': buyItem('ultra_health', cost || 80, player); closeDialog(); break;
        case 'buy_antidote': buyItem('antidote', cost || 18, player); closeDialog(); break;
        case 'buy_whetstone': buyItem('whetstone', cost || 45, player); closeDialog(); break;
        case 'buy_phoenix': buyItem('phoenix_tear', cost || 200, player); closeDialog(); break;

        case 'fish_hint':
            addMessage('Fisher: "River runs down the east side. Stand on the bank and press E."', 'msg-uncommon');
            closeDialog();
            break;

        case 'lore_boss': {
            const lore = [
                'Gloopus was a drain. Then it was a king. Nobody agreed to that.',
                'Ossaric sat on that throne of skulls before the catacombs had a name.',
                'Aranyx lays eggs faster than you can burn them. Do not linger.',
                'Hrimthar was the mountain. Someone woke it up.',
                'Vhalk is not one creature. It is a grove that learned to want.',
                'Ignivarr was forged before fire had a name — its own words, apparently.',
                'Prisma shows you yourself. Then it stops obeying you.',
                'Nyxaroth does not put out the torches. It puts out the light.',
                'Verdrakar sleeps on gold because gold does not scream.',
                'Abaddon is chained. That is not a comfort. Ask why it needed chains.',
            ];
            addMessage(`Sage: "${lore[Math.floor(Math.random() * lore.length)]}"`, 'msg-rare');
            closeDialog();
            break;
        }

        case 'lore_depth': {
            const next = Math.floor(player.floor / 10) * 10 + 10;
            addMessage(`Sage: "Floor ${next} holds an arena. The gate seals behind you. Bring potions — nothing down there heals you for free."`, 'msg-rare');
            closeDialog();
            break;
        }

        case 'buy_hp': buyItem('health_potion', cost || 10, player); closeDialog(); break;
        case 'buy_greater_hp': buyItem('greater_health', cost || 30, player); closeDialog(); break;
        case 'buy_armor': buyItem('leather_armor', cost || 15, player); closeDialog(); break;
        case 'buy_escape': buyItem('escape_scroll', cost || 40, player); closeDialog(); break;

        // Cook shop items
        case 'buy_bread': buyItem('bread', cost || 5, player); closeDialog(); break;
        case 'buy_stew': buyItem('meat_stew', cost || 25, player); closeDialog(); break;
        case 'buy_soup': buyItem('iron_soup', cost || 25, player); closeDialog(); break;
        case 'buy_salad': buyItem('speed_salad', cost || 20, player); closeDialog(); break;
        case 'buy_pie': buyItem('golden_pie', cost || 50, player); closeDialog(); break;
        case 'buy_feast': buyItem('dragon_feast', cost || 100, player); closeDialog(); break;
        case 'buy_smoothie': buyItem('berry_smoothie', cost || 30, player); closeDialog(); break;
        case 'buy_cookie': buyItem('battle_cookie', cost || 40, player); closeDialog(); break;
        case 'buy_tea': buyItem('xp_tea', cost || 60, player); closeDialog(); break;

        // Fishmonger shop
        case 'buy_rod': if (buyItem('fishing_rod', cost || 50, player)) player.hasFishingRod = true; closeDialog(); break;

        // Farmer shop
        case 'buy_can': if (buyItem('watering_can', cost || 40, player)) player.hasWateringCan = true; closeDialog(); break;
        case 'buy_wheat_seed': buyItem('wheat_seed', cost || 5, player); closeDialog(); break;
        case 'buy_berry_seed': buyItem('berry_seed', cost || 8, player); closeDialog(); break;
        case 'buy_golden_seed': buyItem('golden_seed', cost || 20, player); closeDialog(); break;
        case 'buy_dragon_seed': buyItem('dragon_seed', cost || 50, player); closeDialog(); break;

        // Blacksmith shop
        case 'buy_iron_sword': buyItem('iron_sword', cost || 30, player); closeDialog(); break;
        case 'buy_short_bow': buyItem('short_bow', cost || 25, player); closeDialog(); break;
        case 'buy_bone_axe': buyItem('bone_axe', cost || 20, player); closeDialog(); break;
        case 'buy_steel_sword': buyItem('steel_sword', cost || 80, player); closeDialog(); break;
        case 'buy_war_axe': buyItem('war_axe', cost || 90, player); closeDialog(); break;
        case 'buy_long_bow': buyItem('long_bow', cost || 75, player); closeDialog(); break;
        case 'open_forge': closeDialog(); openForge(player, false); break;
        case 'open_city_forge': closeDialog(); openForge(player, true); break;

        // City smith stock
        case 'buy_guardsman': buyItem('guardsman_blade', cost || 400, player); closeDialog(); break;
        case 'buy_rapier': buyItem('duelist_rapier', cost || 430, player); closeDialog(); break;
        case 'buy_clockbow': buyItem('clocksprung_bow', cost || 820, player); closeDialog(); break;
        case 'buy_lampstaff': buyItem('lamplighters_staff', cost || 850, player); closeDialog(); break;
        case 'buy_maul': buyItem('magistrates_maul', cost || 900, player); closeDialog(); break;
        case 'buy_civic_plate': buyItem('civic_plate', cost || 780, player); closeDialog(); break;
        case 'buy_signet': buyItem('signet_of_office', cost || 700, player); closeDialog(); break;

        case 'hint': {
            const hints = [
                'Bosses appear every 10 floors. Prepare well!',
                'Chests often contain rare items. Keep an eye out!',
                'Traps can be avoided if you watch the floor carefully.',
                'Equip better gear to increase your stats.',
                'Health potions can save your life in boss fights.',
                'Some enemies are weak but fast. Others are slow but deadly.',
                'The deeper you go, the stronger the enemies become.',
                'Use keys to open locked doors.',
                'NPCs like me can help you along the way.',
                'Level up to become stronger!',
                'Return to the Hub from Settings to heal and restock.',
                'Rings provide passive stat bonuses. Don\'t ignore them!',
                'Press R to quickly use a potion from your hotbar.',
                'Escape Scrolls teleport you to the town!',
                'Visit the Cook for food that gives special buffs!',
                'Try fishing at the pond for rare catches!',
                'Plant seeds at the farm to grow valuable crops!',
                'Food buffs stack — eat a meal before a boss fight!',
                'Visit the Blacksmith to FORGE two weapons into one!',
                'Boss weapons can be merged for incredible power!',
            ];
            const hint = hints[Math.floor(Math.random() * hints.length)];
            addMessage(`Sage: "${hint}"`, 'msg-uncommon');
            closeDialog();
            break;
        }

        case 'next':
            npc.currentDialog++;
            showDialogNode(npc, npc.currentDialog, player);
            break;

        // Step back a page — every multi-page vendor now has a way home
        case 'prev':
            npc.currentDialog = Math.max(0, npc.currentDialog - 1);
            showDialogNode(npc, npc.currentDialog, player);
            break;

        case 'shop':
            npc.currentDialog = 1;
            showDialogNode(npc, 1, player);
            break;

        // ===== SELLING =====
        case 'sell_fish':
            showSellMenu(npc, player, i => i.def.category === 'fish', '🐟 What are you selling?', 1.0);
            break;
        case 'sell_crops':
            showSellMenu(npc, player, i => i.def.category === 'food' && !!i.def.foodEffects, '🌾 Let me see the harvest.', 0.9);
            break;
        case 'sell_gear':
            showSellMenu(npc, player,
                i => (i.def.category === 'weapon' || i.def.category === 'armor' || i.def.category === 'ring')
                    && player.equipment.weapon?.id !== i.def.id
                    && player.equipment.armor?.id !== i.def.id
                    && player.equipment.ring?.id !== i.def.id,
                '⚔️ Scrap or treasure? Let me judge.', 0.5);
            break;
        case 'sell_junk':
            showSellMenu(npc, player, i => i.def.category === 'key' || i.def.category === 'scroll', '🎒 Odds and ends?', 0.7);
            break;

        default:
            closeDialog();
    }
}

// ===== SELL MENU =====
// Renders a live list of matching inventory items with a price per unit.
function showSellMenu(
    npc: NPCState,
    player: PlayerState,
    filter: (i: PlayerState['inventory'][0]) => boolean,
    title: string,
    rate: number,
): void {
    npcNameEl.textContent = npc.name;
    npcTextEl.textContent = title;
    npcOptionsEl.className = 'npc-shop-grid';
    npcOptionsEl.innerHTML = '';

    const sellable = player.inventory
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => filter(item) && item.def.id !== 'limit_breaker');

    if (sellable.length === 0) {
        npcTextEl.textContent = `${title}\n\nYou have nothing I want.`;
    }

    for (const { item } of sellable) {
        const def = item.def;
        const unit = Math.max(1, Math.floor(def.value * rate));

        const card = document.createElement('div');
        card.className = `shop-item-card rarity-${def.rarity}`;

        const iconCanvas = document.createElement('canvas');
        const icon = Assets.getItem(def.icon, def.rarity);
        if (icon) {
            iconCanvas.width = 32; iconCanvas.height = 32;
            iconCanvas.getContext('2d')!.drawImage(icon, 0, 0, 32, 32);
        }
        card.appendChild(iconCanvas);

        const info = document.createElement('div');
        info.className = 'shop-item-info';
        const name = document.createElement('div');
        name.className = 'shop-item-name';
        name.textContent = item.count > 1 ? `${def.name} x${item.count}` : def.name;
        name.style.color = getRarityColor(def.rarity);
        info.appendChild(name);
        const desc = document.createElement('div');
        desc.className = 'shop-item-desc';
        desc.textContent = `Sells for ${unit}g each`;
        info.appendChild(desc);
        card.appendChild(info);

        const btn = document.createElement('button');
        btn.className = 'shop-buy-btn';
        btn.textContent = `Sell ${unit}g`;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            // Re-find by identity: indices shift as things are sold
            const idx = player.inventory.indexOf(item);
            if (idx < 0) { showSellMenu(npc, player, filter, title, rate); return; }
            item.count--;
            player.gold += unit;
            if (item.count <= 0) player.inventory.splice(idx, 1);
            // Drop it from the hotbar if it is gone
            for (let h = 0; h < player.hotbar.length; h++) {
                if (player.hotbar[h] === item && item.count <= 0) player.hotbar[h] = null;
            }
            addMessage(`Sold ${def.name} for ${unit}g.`, 'msg-uncommon');
            GameAudio.pickup();
            showSellMenu(npc, player, filter, title, rate);
        });
        card.appendChild(btn);
        npcOptionsEl.appendChild(card);
    }

    // Sell-all convenience, then a way back
    if (sellable.length > 1) {
        const allBtn = document.createElement('button');
        allBtn.className = 'dialog-btn-special';
        const total = sellable.reduce((n, { item }) => n + Math.max(1, Math.floor(item.def.value * rate)) * item.count, 0);
        allBtn.textContent = `Sell everything (${total}g)`;
        allBtn.addEventListener('click', () => {
            let earned = 0;
            for (const { item } of sellable) {
                const unit = Math.max(1, Math.floor(item.def.value * rate));
                earned += unit * item.count;
                const idx = player.inventory.indexOf(item);
                if (idx >= 0) player.inventory.splice(idx, 1);
                for (let h = 0; h < player.hotbar.length; h++) {
                    if (player.hotbar[h] === item) player.hotbar[h] = null;
                }
            }
            player.gold += earned;
            addMessage(`Sold everything for ${earned}g.`, 'msg-xp');
            GameAudio.chestOpen();
            showSellMenu(npc, player, filter, title, rate);
        });
        npcOptionsEl.appendChild(allBtn);
    }

    const back = document.createElement('button');
    back.className = 'dialog-btn-std';
    back.textContent = '◀ Back';
    back.addEventListener('click', () => showDialogNode(npc, npc.currentDialog, player));
    npcOptionsEl.appendChild(back);
}

export function checkNPCInteraction(player: PlayerState, floor: DungeonFloor): NPCState | null {
    for (const npc of floor.npcs) {
        const dist = Math.abs(npc.x - player.x) + Math.abs(npc.y - player.y);
        if (dist <= 1) return npc;
    }
    return null;
}
