// ===== NPC DIALOG SYSTEM =====

import type { PlayerState, NPCState, DungeonFloor } from './types';
import { addMessage } from './hud';
import { GameAudio } from './audio';
import { spawnHealParticles, addFloatingText } from './particles';
import { addItemToInventory } from './inventory';
import { getItemDef } from './items';

const dialogEl = document.getElementById('npc-dialog')!;
const npcNameEl = document.getElementById('npc-name')!;
const npcTextEl = document.getElementById('npc-text')!;
const npcOptionsEl = document.getElementById('npc-options')!;

let dialogOpen = false;


export function isDialogOpen(): boolean { return dialogOpen; }

export function openDialog(npc: NPCState, player: PlayerState): void {
    dialogOpen = true;

    GameAudio.npcGreet();
    showDialogNode(npc, npc.currentDialog, player);
    dialogEl.classList.remove('hidden');
}

export function closeDialog(): void {
    dialogOpen = false;
    dialogEl.classList.add('hidden');
}

function showDialogNode(npc: NPCState, index: number, player: PlayerState): void {
    const node = npc.dialog[index];
    if (!node) { closeDialog(); return; }

    npcNameEl.textContent = npc.name;
    npcTextEl.textContent = node.text;
    npcOptionsEl.innerHTML = '';

    node.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.textContent = opt.label;
        btn.addEventListener('click', () => handleDialogAction(opt.action, opt.cost, npc, player));
        npcOptionsEl.appendChild(btn);
    });
}

function handleDialogAction(action: string, cost: number | undefined, npc: NPCState, player: PlayerState): void {
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

        case 'buy_hp':
            if (cost && player.gold >= cost) {
                player.gold -= cost;
                const potionDef = getItemDef('health_potion');
                if (potionDef) {
                    addItemToInventory(player, potionDef);
                    addMessage(`Bought Health Potion for ${cost}g`, 'msg-uncommon');
                    GameAudio.pickup();
                }
            } else {
                addMessage('Not enough gold!', 'msg-damage');
            }
            closeDialog();
            break;

        case 'buy_greater_hp':
            if (cost && player.gold >= cost) {
                player.gold -= cost;
                const gpDef = getItemDef('greater_health');
                if (gpDef) {
                    addItemToInventory(player, gpDef);
                    addMessage(`Bought Greater Potion for ${cost}g`, 'msg-uncommon');
                    GameAudio.pickup();
                }
            } else {
                addMessage('Not enough gold!', 'msg-damage');
            }
            closeDialog();
            break;

        case 'buy_armor':
            if (cost && player.gold >= cost) {
                player.gold -= cost;
                const armorDef = getItemDef('leather_armor');
                if (armorDef) {
                    addItemToInventory(player, armorDef);
                    addMessage(`Bought Leather Armor for ${cost}g`, 'msg-uncommon');
                    GameAudio.pickup();
                }
            } else {
                addMessage('Not enough gold!', 'msg-damage');
            }
            closeDialog();
            break;

        case 'buy_escape':
            if (cost && player.gold >= cost) {
                player.gold -= cost;
                const scrollDef = getItemDef('escape_scroll');
                if (scrollDef) {
                    addItemToInventory(player, scrollDef);
                    addMessage(`Bought Escape Scroll for ${cost}g`, 'msg-uncommon');
                    GameAudio.pickup();
                }
            } else {
                addMessage('Not enough gold!', 'msg-damage');
            }
            closeDialog();
            break;

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
                'Escape Scrolls teleport you to the stairs. Very handy!',
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
            // Show shop dialog page
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
