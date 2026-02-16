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
}


function showDialogNode(npc: NPCState, index: number, player: PlayerState): void {
    const node = npc.dialog[index];
    if (!node) { closeDialog(); return; }
    npcNameEl.textContent = npc.name;
    npcTextEl.textContent = node.text;
    npcOptionsEl.innerHTML = '';

    // Check if this looks like a shop (items are present)
    const isShop = node.options.some(o => o.itemId);
    if (isShop) {
        npcOptionsEl.className = 'npc-shop-grid';
    } else {
        npcOptionsEl.className = '';
    }

    node.options.forEach(opt => {
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

        case 'heal':
            if (player.stats.hp < player.stats.maxHp) {
                player.stats.hp = player.stats.maxHp;
                spawnHealParticles(player.px + 8, player.py + 8);
                addFloatingText(player.px + 8, player.py, 'FULL HEAL', '#2ecc71');
                addMessage('The healer restored your health!', 'msg-heal');
                GameAudio.potionDrink();
            } else {
                addMessage('You are already at full health.');
            }
            closeDialog();
            break;

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
        case 'open_forge': closeDialog(); openForge(player); break;

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

        case 'shop':
            npc.currentDialog = 1;
            showDialogNode(npc, 1, player);
            break;

        default:
            closeDialog();
    }
}

export function checkNPCInteraction(player: PlayerState, floor: DungeonFloor): NPCState | null {
    for (const npc of floor.npcs) {
        const dist = Math.abs(npc.x - player.x) + Math.abs(npc.y - player.y);
        if (dist <= 1) return npc;
    }
    return null;
}
