// ===== TOWN ACTIVITIES: FISHING & FARMING =====

import type { PlayerState, DungeonFloor, CropPlot } from './types';
import { addMessage } from './hud';
import { GameAudio } from './audio';
import { addFloatingText, spawnHealParticles } from './particles';
import { addItemToInventory } from './inventory';
import { getItemDef } from './items';

// ==================
// FISHING MINIGAME
// ==================

let fishingActive = false;
let fishingMarkerPos = 0; // 0-1
let fishingDir = 1;
let fishingSpeed = 1.2;
let sweetSpotCenter = 0.5;
let sweetSpotWidth = 0.15; // Width of sweet spot (smaller = harder)
let fishingAnimFrame: number | null = null;
let fishingPlayer: PlayerState | null = null;
let fishingCooldown = 0;

const fishingOverlay = () => document.getElementById('fishing-overlay')!;
const fishingMarker = () => document.getElementById('fishing-marker')!;
const fishingSweetspot = () => document.getElementById('fishing-sweetspot')!;
const fishingResult = () => document.getElementById('fishing-result')!;

export function isFishingActive(): boolean { return fishingActive; }

// Initialize catch button listeners (call once on game start)
export function initTownActivities(): void {
    const catchBtn = document.getElementById('fishing-catch-btn');
    if (catchBtn) {
        catchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            fishingCatch();
        });
        catchBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            fishingCatch();
        });
    }

    // Also allow tapping the fishing bar itself to catch
    const bar = document.getElementById('fishing-bar');
    if (bar) {
        bar.addEventListener('click', (e) => {
            e.preventDefault();
            fishingCatch();
        });
        bar.addEventListener('touchstart', (e) => {
            e.preventDefault();
            fishingCatch();
        });
    }
}

export function startFishing(player: PlayerState): void {
    if (fishingActive || fishingCooldown > 0) return;
    if (!player.hasFishingRod) {
        addMessage('You need a Fishing Rod! Buy one from the Fishmonger.', 'msg-damage');
        return;
    }

    fishingActive = true;
    fishingPlayer = player;
    fishingMarkerPos = 0;
    fishingDir = 1;
    fishingSpeed = 1.0 + Math.random() * 0.8; // Random speed each cast
    sweetSpotCenter = 0.3 + Math.random() * 0.4; // Random position
    sweetSpotWidth = 0.12 + Math.random() * 0.08; // Random width

    // Set up sweet spot visual
    const ssEl = fishingSweetspot();
    ssEl.style.left = `${(sweetSpotCenter - sweetSpotWidth / 2) * 100}%`;
    ssEl.style.width = `${sweetSpotWidth * 100}%`;

    fishingResult().textContent = '';
    fishingOverlay().classList.remove('hidden');

    addMessage('🎣 Casting line...', 'msg-uncommon');

    // Start animation loop
    fishingAnimFrame = requestAnimationFrame(fishingLoop);
}

let lastFishingTime = 0;

function fishingLoop(time: number): void {
    if (!fishingActive) return;

    const dt = lastFishingTime ? (time - lastFishingTime) / 1000 : 0.016;
    lastFishingTime = time;

    // Move marker back and forth
    fishingMarkerPos += fishingDir * fishingSpeed * dt;
    if (fishingMarkerPos >= 1) { fishingMarkerPos = 1; fishingDir = -1; }
    if (fishingMarkerPos <= 0) { fishingMarkerPos = 0; fishingDir = 1; }

    // Update marker visual
    const marker = fishingMarker();
    marker.style.left = `${fishingMarkerPos * 97}%`;

    fishingAnimFrame = requestAnimationFrame(fishingLoop);
}

export function fishingCatch(): void {
    if (!fishingActive || !fishingPlayer) return;

    fishingActive = false;
    lastFishingTime = 0;
    if (fishingAnimFrame !== null) {
        cancelAnimationFrame(fishingAnimFrame);
        fishingAnimFrame = null;
    }

    // Determine accuracy: how close marker is to sweet spot center
    const dist = Math.abs(fishingMarkerPos - sweetSpotCenter);
    const inSweetSpot = dist <= sweetSpotWidth / 2;

    // Fish selection based on accuracy
    let fishId: string;
    let resultText: string;

    if (inSweetSpot && dist < 0.02) {
        // Perfect! Legendary fish
        const roll = Math.random();
        if (roll < 0.3) {
            fishId = 'legendary_koi';
            resultText = '✨ PERFECT! You caught a Legendary Koi!';
        } else {
            fishId = 'phantom_fish';
            resultText = '🌟 Amazing! You caught a Phantom Fish!';
        }
    } else if (inSweetSpot) {
        // Good catch — rare/uncommon fish
        const roll = Math.random();
        if (roll < 0.4) {
            fishId = 'golden_trout';
            resultText = '🎉 Great catch! Golden Trout!';
        } else {
            fishId = 'bass';
            resultText = '👍 Nice! River Bass!';
        }
    } else if (dist < sweetSpotWidth) {
        // Close but not in sweet spot — common fish
        fishId = 'small_fish';
        resultText = '🐟 Caught a Small Fish.';
    } else {
        // Miss — nothing or common fish
        if (Math.random() < 0.5) {
            fishId = 'small_fish';
            resultText = '🐟 Barely caught a Small Fish...';
        } else {
            fishId = '';
            resultText = '💨 The fish got away!';
        }
    }

    const resultEl = fishingResult();

    if (fishId) {
        const def = getItemDef(fishId);
        if (def) {
            addItemToInventory(fishingPlayer, def);
            fishingPlayer.fishCaught++;
            GameAudio.pickup();
            addFloatingText(fishingPlayer.px + 8, fishingPlayer.py, `+${def.name}`, '#3498db');
            addMessage(`Caught: ${def.name}!`, `msg-${def.rarity}`);
        }
    } else {
        addMessage('The fish got away...', 'msg-common');
    }

    resultEl.textContent = resultText;

    // Close overlay after a delay
    fishingCooldown = 1.5;
    setTimeout(() => {
        fishingOverlay().classList.add('hidden');
        fishingCooldown = 0;
    }, 1500);
}

export function updateFishingCooldown(dt: number): void {
    if (fishingCooldown > 0) fishingCooldown -= dt;
}

// ==================
// FARMING SYSTEM
// ==================

// CropPlots are stored on the player. Each has a tile position, a seed type, growth stage, etc.
// Growth stages: 0 = empty, 1 = planted, 2 = growing, 3 = ready to harvest

const CROP_GROW_TIME = 30; // seconds per stage (30s plant→growing, 30s growing→ready)

export function interactWithCrop(player: PlayerState, _floor: DungeonFloor, tileX: number, tileY: number): void {
    // Find existing crop at this position
    if (!player.crops) player.crops = [];
    let crop = player.crops.find(c => c.x === tileX && c.y === tileY);

    if (crop) {
        if (crop.growthStage >= 3) {
            // Harvest!
            harvestCrop(player, crop, tileX, tileY);
        } else if (!crop.wateredToday && player.hasWateringCan) {
            // Water the crop
            crop.wateredToday = true;
            crop.growthTimer -= CROP_GROW_TIME * 0.4; // Watering speeds growth by 40%
            addMessage('🚿 Watered the crop! It will grow faster.', 'msg-uncommon');
            addFloatingText(tileX * 16 + 8, tileY * 16, '💧', '#3498db');
            GameAudio.potionDrink();
        } else if (crop.wateredToday) {
            addMessage(`This crop ${crop.growthStage < 3 ? 'is still growing...' : 'is ready to harvest!'}`, 'msg-common');
        } else {
            addMessage('This crop is growing. Use a Watering Can to speed it up!', 'msg-common');
        }
    } else {
        // Try to plant a seed
        plantSeed(player, tileX, tileY);
    }
}

function plantSeed(player: PlayerState, tileX: number, tileY: number): void {
    // Look for seeds in inventory
    const seedIds = ['dragon_seed', 'golden_seed', 'berry_seed', 'wheat_seed'];
    let seedIdx = -1;
    let seedInv: typeof player.inventory[0] | null = null;

    for (const sid of seedIds) {
        const idx = player.inventory.findIndex(i => i.def.id === sid);
        if (idx >= 0) {
            seedIdx = idx;
            seedInv = player.inventory[idx];
            break;
        }
    }

    // Also try reverse order (plant cheapest first by checking all)
    // Actually let's plant the first seed found from best to worst
    if (seedIdx < 0) {
        addMessage('You have no seeds! Buy some from the Farmer.', 'msg-damage');
        return;
    }

    const seedDef = seedInv!.def;
    seedInv!.count--;
    if (seedInv!.count <= 0) player.inventory.splice(seedIdx, 1);

    // Map seed to harvest
    const seedToHarvest: Record<string, string> = {
        'wheat_seed': 'wheat',
        'berry_seed': 'berries',
        'golden_seed': 'golden_fruit',
        'dragon_seed': 'dragon_fruit',
    };

    const newCrop: CropPlot = {
        x: tileX,
        y: tileY,
        seedId: seedDef.id,
        harvestId: seedToHarvest[seedDef.id] || 'wheat',
        growthStage: 1,
        growthTimer: CROP_GROW_TIME,
        wateredToday: false,
    };

    player.crops.push(newCrop);
    addMessage(`🌱 Planted ${seedDef.name}!`, 'msg-uncommon');
    addFloatingText(tileX * 16 + 8, tileY * 16, '🌱', '#2ecc71');
    GameAudio.pickup();
}

function harvestCrop(player: PlayerState, crop: CropPlot, tileX: number, tileY: number): void {
    const def = getItemDef(crop.harvestId);
    if (def) {
        addItemToInventory(player, def);
        player.cropsHarvested++;
        addMessage(`🌾 Harvested ${def.name}!`, `msg-${def.rarity}`);
        addFloatingText(tileX * 16 + 8, tileY * 16, `+${def.name}`, '#f1c40f');
        GameAudio.pickup();
        spawnHealParticles(tileX * 16 + 8, tileY * 16 + 8);
    }

    // Remove crop from player's list so the plot can be re-planted
    const idx = player.crops.indexOf(crop);
    if (idx >= 0) player.crops.splice(idx, 1);
}

export function updateCrops(player: PlayerState, dt: number): void {
    if (!player.crops) return;
    for (const crop of player.crops) {
        if (crop.growthStage >= 3) continue; // Already ready
        crop.growthTimer -= dt;
        if (crop.growthTimer <= 0) {
            crop.growthStage++;
            crop.growthTimer = CROP_GROW_TIME;
            crop.wateredToday = false;
            if (crop.growthStage >= 3) {
                addMessage(`🌾 A ${crop.harvestId} crop is ready to harvest!`, 'msg-rare');
            }
        }
    }
}

// Check if player is adjacent to a fish spot
export function getAdjacentFishSpot(player: PlayerState, floor: DungeonFloor): { x: number; y: number } | null {
    const dirs = [
        { x: 0, y: -1 }, { x: 0, y: 1 },
        { x: -1, y: 0 }, { x: 1, y: 0 },
    ];
    for (const d of dirs) {
        const nx = player.x + d.x;
        const ny = player.y + d.y;
        if (ny >= 0 && ny < floor.height && nx >= 0 && nx < floor.width) {
            if (floor.tiles[ny][nx] === 'FISH_SPOT' || floor.tiles[ny][nx] === 'WATER') {
                return { x: nx, y: ny };
            }
        }
    }
    return null;
}// Check if player is adjacent to or standing on a crop tile
export function getAdjacentCropTile(player: PlayerState, floor: DungeonFloor): { x: number; y: number } | null {
    // Check standing tile first
    if (floor.tiles[player.y]?.[player.x] === 'CROP') {
        return { x: player.x, y: player.y };
    }
    // Check adjacent tiles
    const dirs = [
        { x: 0, y: -1 }, { x: 0, y: 1 },
        { x: -1, y: 0 }, { x: 1, y: 0 },
    ];
    for (const d of dirs) {
        const nx = player.x + d.x;
        const ny = player.y + d.y;
        if (ny >= 0 && ny < floor.height && nx >= 0 && nx < floor.width) {
            if (floor.tiles[ny][nx] === 'CROP') {
                return { x: nx, y: ny };
            }
        }
    }
    return null;
}
