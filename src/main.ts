// ===== MAIN GAME ENGINE =====

import './style.css';
import type { PlayerState, DungeonFloor, GameState, ClassName, Direction, SaveData } from './types';
import { initAssets, Assets } from './assets';
import { GameAudio } from './audio';
import { initInput, Input } from './input';
import { generateFloor, isWalkable, generateTown, setSeed, clearSeed } from './dungeon';
import { getItemsByFloor, rollLoot } from './items';
import { playerAttack, enemyAttack, checkLevelUp, recalcStats, updateScreenShake, getScreenShake } from './combat';
import { updateParticles, renderParticles, renderFloatingTexts, clearParticles, spawnTorchEmbers, spawnLevelUpParticles, addFloatingText, spawnHitParticles, spawnDeathParticles } from './particles';
import { updateVisibility, renderLighting, renderDayNightOverlay } from './lighting';
import { renderMinimap } from './minimap';
import { updateHUD, updateHotbar, addMessage, showHUD, hideHUD } from './hud';
import { initInventory, toggleInventory, isInventoryOpen, closeInventory, addItemToInventory, useHotbarSlot, setFloorItems } from './inventory';
import { initTitleScreen, showGameOver, showVictory, getClassDef, isHardcoreSelected } from './screens';
import { checkNPCInteraction, openDialog, isDialogOpen, closeDialog } from './npc';
import { initI18n, t } from './i18n';
import { initSettings, loadSettings, isSettingsOpen, closeSettings, openSettings, isTutorialOpen, closeTutorial, openTutorial } from './settings';
import { APP_VERSION } from './version';
import { startFishing, fishingCatch, isFishingActive, updateFishingCooldown, interactWithCrop, updateCrops, getAdjacentFishSpot, getAdjacentCropTile, initTownActivities } from './town';
import { isForgeOpen, initForge } from './forge';
import { getBiome } from './biomes';
import { getBiomeTiles, renderWallShadows, renderWallTops, renderTorchGlows, renderDungeonParticles, renderBiomeAmbient, updateDungeonParticles, findTorchPositions, clearDungeonParticles } from './dungeon-renderer';
import { createGameSystems, checkAchievements, updateQuestProgress, refreshQuests, updatePet } from './systems';
import { initSystemsUI, isSystemsUIOpen, closeSystemsUI, openBestiary, openAchievements, openSkillTree, openQuests, openMuseum, openHearts } from './systems-ui';
import * as MP from './multiplayer';
import { isCoopOpen, isMultiplayerActive } from './multiplayer-ui';
import { AVATARS } from './multiplayer-types';
import type { RemotePlayerState } from './multiplayer-types';

// Canvas setup
const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let gameState: GameState = 'TITLE';
let player: PlayerState;
let currentFloor: DungeonFloor;
let cameraX = 0;
let cameraY = 0;
let tileSize = 32;
let lastTime = 0;
let footstepTimer = 0;
let vignetteCanvas: HTMLCanvasElement | null = null;

// 2.5D renderer state
let currentTorchPositions: { x: number; y: number }[] = [];
let lastTorchFloor = -999;

// Floor transition state
let transitioning = false;

// Attack cooldown fix: track if attack was already pressed
let attackHeld = false;
// In town, screen taps trigger interact instead of attack
let _pendingTownInteract = false;

// ===== MULTIPLAYER SYNC =====
let mpSyncTimer = 0;
let mpStatsSyncTimer = 0;
let lastSentX = -1;
let lastSentY = -1;
let lastSentDir = -1;
let chatMessages: { uid: string; username: string; message: string; nameColor?: string; time: number }[] = [];
let chatInput = '';
let chatOpen = false;

const SAVE_KEY = 'dungeon-crawler-save';

// Track floors for return from town
let savedDungeonFloor: DungeonFloor | null = null;
let savedPlayerPos = { x: 0, y: 0 };
let townFloor: DungeonFloor | null = null;

// Escape to town handler
window.addEventListener('escape-to-town', () => {
  if (gameState !== 'PLAYING' || !player || !currentFloor) return;
  if (currentFloor.isTown || player.floor === 0) {
    addMessage('You are already in a safe area!', 'msg-common');
    return;
  }
  // Save dungeon state
  savedDungeonFloor = currentFloor;
  savedPlayerPos = { x: player.x, y: player.y };
  // Generate or reuse town
  if (!townFloor) townFloor = generateTown();
  currentFloor = townFloor;
  setFloorItems(currentFloor.items);
  player.x = 15; player.y = 24;
  player.px = player.x * 16; player.py = player.y * 16;
  showFloorTransition(-1); // -1 = town
  closeInventory();
});

// ===== CANVAS RESIZE =====
function resizeCanvas(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ===== FLOOR TRANSITION ANIMATION =====
function showFloorTransition(floorNum: number): void {
  transitioning = true;
  const overlay = document.getElementById('floor-transition')!;
  const text = document.getElementById('floor-transition-text')!;
  text.textContent = floorNum === -1 ? '🏘️ Welcome to Town!' : floorNum === 0 ? t('hub_welcome') : t('entered_floor', floorNum);
  overlay.classList.remove('hidden');

  // Reset animation
  overlay.style.animation = 'none';
  text.style.animation = 'none';
  void overlay.offsetWidth; // trigger reflow
  overlay.style.animation = '';
  text.style.animation = '';

  setTimeout(() => {
    overlay.classList.add('hidden');
    transitioning = false;
  }, 1500);
}

// ===== DAMAGE FLASH =====
function showDamageFlash(): void {
  const flash = document.getElementById('damage-flash')!;
  flash.classList.remove('hidden');
  flash.style.animation = 'none';
  void flash.offsetWidth;
  flash.style.animation = '';
  setTimeout(() => flash.classList.add('hidden'), 300);
}

// ===== CREATE PLAYER =====
function renderBuffBar(): void {
  let bar = document.getElementById('buff-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'buff-bar';
    document.getElementById('hud')?.appendChild(bar);
  }
  if (!player || !player.buffs || player.buffs.length === 0) {
    bar.innerHTML = '';
    return;
  }
  bar.innerHTML = player.buffs.map(b => {
    const secs = Math.ceil(b.remaining);
    return `<span class="buff-icon" title="${b.name}">${b.icon} ${secs}s</span>`;
  }).join('');
}

function createPlayer(className: ClassName, name: string): PlayerState {
  const classDef = getClassDef(className);
  const stats = { ...classDef.baseStats };

  return {
    name,
    className,
    x: 0, y: 0,
    px: 0, py: 0,
    dir: 0 as Direction,
    stats: { ...stats },
    baseStats: { ...stats },
    xp: 0,
    xpToLevel: 100,
    level: 1,
    floor: 1,
    gold: 0,
    inventory: [],
    equipment: { weapon: null, armor: null, ring: null },
    hotbar: [null, null, null, null, null],
    attackCooldown: 0,
    invincibleTimer: 0,
    moveTimer: 0,
    animFrame: 0,
    animTimer: 0,
    keys: 0,
    alive: true,
    totalKills: 0,
    totalDamageDealt: 0,
    totalFloorsCleared: 0,
    maxReachedFloor: 1,
    buffs: [],
    fishCaught: 0,
    cropsHarvested: 0,
    gameTime: 480, // Start at 8:00 AM
    day: 1,
    crops: [],
    hasFishingRod: false,
    hasWateringCan: false,
    systems: createGameSystems(),
  };
}

// ===== HUB FLOOR (Floor 0) =====
function generateHubFloor(): DungeonFloor {
  const W = 20, H = 15;
  const tiles: import('./types').TileType[][] = [];
  const explored: boolean[][] = [];
  const visible: boolean[][] = [];

  for (let y = 0; y < H; y++) {
    tiles[y] = [];
    explored[y] = [];
    visible[y] = [];
    for (let x = 0; x < W; x++) {
      tiles[y][x] = (x === 0 || x === W - 1 || y === 0 || y === H - 1) ? 'WALL' : 'FLOOR';
      explored[y][x] = true;
      visible[y][x] = true;
    }
  }

  // Stairs down (to floor 1) — center-right
  tiles[7][17] = 'STAIRS_DOWN';

  return {
    width: W,
    height: H,
    tiles,
    rooms: [{ x: 1, y: 1, w: W - 2, h: H - 2 }],
    explored,
    visible,
    enemies: [],
    npcs: [
      {
        type: 'merchant', x: 5, y: 5, name: 'Hub Merchant',
        dialog: [
          {
            text: 'Welcome to my shop, adventurer! Take a look at my wares.',
            options: [
              { label: 'Buy Health Potion (10g)', action: 'buy_hp', cost: 10 },
              { label: 'Buy Greater Potion (30g)', action: 'buy_greater_hp', cost: 30 },
              { label: 'Buy Leather Armor (15g)', action: 'buy_armor', cost: 15 },
              { label: 'Buy Escape Scroll (40g)', action: 'buy_escape', cost: 40 },
              { label: 'Leave', action: 'close' },
            ]
          }
        ],
        currentDialog: 0,
      },
      {
        type: 'healer', x: 10, y: 5, name: 'Hub Healer',
        dialog: [
          {
            text: 'Rest your weary bones, traveler. I shall restore you to full health.',
            options: [
              { label: 'Heal me (free)', action: 'heal' },
              { label: 'Leave', action: 'close' },
            ]
          }
        ],
        currentDialog: 0,
      },
      {
        type: 'sage', x: 15, y: 5, name: 'Hub Sage',
        dialog: [
          {
            text: 'Greetings, brave soul. I have studied these dungeons for centuries. Ask and I shall share my wisdom.',
            options: [
              { label: 'Any advice?', action: 'hint' },
              { label: 'Leave', action: 'close' },
            ]
          }
        ],
        currentDialog: 0,
      },
    ],
    items: [],
    stairsDown: { x: 17, y: 7 },
    stairsUp: { x: 2, y: 7 },
    chests: [],
  };
}

// ===== FLOOR TRANSITION =====
function enterFloor(floor: number, seed?: number): void {
  if (floor > 0 && floor > player.maxReachedFloor) {
    player.maxReachedFloor = floor;
  }

  // In multiplayer, generate a seed if we don't have one (host scenario)
  // so we can both use it locally AND broadcast it
  let floorSeed = seed;
  if (isMultiplayerActive() && floorSeed === undefined && floor > 0) {
    floorSeed = Math.floor(Math.random() * 999999);
  }

  if (floor === 0) {
    clearSeed(); // no seed for hub
    currentFloor = generateHubFloor();
  } else {
    // If a seed is provided (co-op), use it for deterministic generation
    if (floorSeed !== undefined) {
      setSeed(floorSeed + floor); // combine seed + floor for unique per-floor
    } else {
      clearSeed(); // solo play uses Math.random
    }
    currentFloor = generateFloor(floor);
    clearSeed(); // reset after generation so gameplay randomness is normal
  }
  player.floor = floor;

  // Place player at stairs up
  player.x = currentFloor.stairsUp.x;
  player.y = currentFloor.stairsUp.y;
  player.px = player.x * tileSize;
  player.py = player.y * tileSize;

  clearParticles();
  clearDungeonParticles();
  lastTorchFloor = -999; // Force torch recalculation
  setFloorItems(currentFloor.items);
  updateVisibility(currentFloor, player);

  if (floor === 0) {
    addMessage(t('hub_welcome'), 'msg-uncommon');
  } else {
    GameAudio.stairsDescend();
    GameAudio.startAmbient(floor);
    const biome = getBiome(floor);
    addMessage(`${biome.icon} Floor ${floor} — ${biome.name}`, floor % 10 === 0 ? 'msg-legendary' : 'msg-xp');

    if (currentFloor.hasSecretRoom) {
      addMessage('You sense a hidden passage nearby...', 'msg-uncommon');
    }
    if (currentFloor.isTrapRoom) {
      addMessage('⚠️ Beware! This floor is rigged with traps!', 'msg-damage');
    }

    if (floor % 10 === 0) {
      GameAudio.bossAppear();
      addMessage(t('boss_warning'), 'msg-damage');
    }

    // Update quest progress for floor type
    if (player.systems) {
      updateQuestProgress(player.systems.quests, 'floor', '', floor);
    }
  }

  showFloorTransition(floor);

  if (isMultiplayerActive() && floorSeed !== undefined) {
    MP.sendFloorChange(floor, floorSeed);
  }
}

// ===== SAVE / LOAD =====
function saveGame(): void {
  const data: SaveData = {
    player: {
      name: player.name,
      className: player.className,
      level: player.level,
      floor: player.floor,
      maxReachedFloor: player.maxReachedFloor,
      xp: player.xp,
      xpToLevel: player.xpToLevel,
      gold: player.gold,
      keys: player.keys,
      baseStats: { ...player.baseStats },
      stats: { ...player.stats },
      totalKills: player.totalKills,
      totalDamageDealt: player.totalDamageDealt,
      totalFloorsCleared: player.totalFloorsCleared,
      inventory: player.inventory.map(i => ({ def: i.def, count: i.count })),
      equipment: { ...player.equipment },
      hotbar: player.hotbar.map(h => h ? { def: h.def, count: h.count } : null),
      gameTime: player.gameTime,
      day: player.day,
      crops: player.crops,
      systems: player.systems,
    },
    floor: player.floor,
    timestamp: Date.now(),
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  GameAudio.saveGame();
  addMessage(t('game_saved'), 'msg-uncommon');
}

function loadSave(): SaveData | null {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

function loadGame(data: SaveData): void {
  const p = data.player;
  player = createPlayer(p.className!, p.name || 'Hero');
  Object.assign(player, p);
  // Ensure maxReachedFloor satisfies constraint
  if (!player.maxReachedFloor) player.maxReachedFloor = player.floor || 1;
  // Ensure systems exists for old saves
  if (!player.systems) player.systems = createGameSystems();

  player.alive = true;

  // Restore hotbar from save data (fix: preserve hotbar)
  if (p.hotbar && Array.isArray(p.hotbar)) {
    player.hotbar = (p.hotbar as any[]).map((h: any) => {
      if (h && h.def) return { def: h.def, count: h.count || 1 };
      return null;
    });
  } else {
    player.hotbar = [null, null, null, null, null];
    player.inventory.forEach(item => {
      if (item.def.category === 'consumable') {
        for (let i = 0; i < 5; i++) {
          if (!player.hotbar[i]) { player.hotbar[i] = item; break; }
        }
      }
    });
  }

  recalcStats(player);
  enterFloor(p.floor!);
}

// ===== START GAME =====
function startGame(className: ClassName, name?: string): void {
  GameAudio.init();

  if (className === '__continue__' as ClassName) {
    const save = loadSave();
    if (save) {
      loadGame(save);
      gameState = 'PLAYING';
      showHUD();
      if (Input.isMobile()) document.getElementById('mobile-controls')!.classList.remove('hidden');
      initInventory(player);
      updateHUD(player);
      updateHotbar(player);
      return;
    }
  }

  player = createPlayer(className, name || 'Hero');
  if (player.systems && isHardcoreSelected()) {
    player.systems.hardcore = true;
  }
  gameState = 'PLAYING';
  showHUD();

  if (Input.isMobile()) {
    document.getElementById('mobile-controls')!.classList.remove('hidden');
  }

  initInventory(player);

  // Check for co-op seed (set by multiplayer game start callback)
  const coopSeed = (window as any).__coopSeed;
  const coopFloor = (window as any).__coopFloor || 1;
  delete (window as any).__coopSeed;
  delete (window as any).__coopFloor;

  enterFloor(coopFloor, coopSeed);
  updateHUD(player);
  updateHotbar(player);

  // Show tutorial for first-time players
  if (!localStorage.getItem('dungeon-crawler-tutorial-seen')) {
    openTutorial();
    localStorage.setItem('dungeon-crawler-tutorial-seen', '1');
  }
}

function returnToHub(): void {
  if (gameState === 'PLAYING') {
    enterFloor(0);
  }
}

function resetGame(): void {
  gameState = 'TITLE';
  hideHUD();
  localStorage.removeItem(SAVE_KEY);
  document.getElementById('mobile-controls')!.classList.add('hidden');
  closeInventory();
  closeDialog();
  clearParticles();
  GameAudio.stopAmbient();

  const save = loadSave();
  initTitleScreen(startGame, !!save, save);
}

// ===== UPDATE =====
function update(dt: number): void {
  if (gameState !== 'PLAYING') return;
  if (transitioning) return;

  // Escape key: close overlays or open settings
  if (Input.wantsEscape()) {
    if (chatOpen) { chatOpen = false; closeChatInput(); Input.clearJustPressed(); return; }
    if (isTutorialOpen()) { closeTutorial(); Input.clearJustPressed(); return; }
    if (isSettingsOpen()) { closeSettings(); Input.clearJustPressed(); return; }
    if (isDialogOpen()) { closeDialog(); Input.clearJustPressed(); return; }
    if (isInventoryOpen()) { closeInventory(); Input.clearJustPressed(); return; }
    if (isSystemsUIOpen()) { closeSystemsUI(); Input.clearJustPressed(); return; }
    openSettings(true);
    Input.clearJustPressed();
    return;
  }

  // Block gameplay when co-op overlays open
  if (isCoopOpen()) return;

  // Block gameplay when overlays open
  if (isInventoryOpen() || isDialogOpen() || isSettingsOpen() || isTutorialOpen() || isForgeOpen() || isSystemsUIOpen()) return;

  // Block movement during fishing (but still allow interact/tap to catch)
  if (isFishingActive()) {
    if (Input.isInteracting() || _pendingTownInteract || Input.isAttacking()) {
      _pendingTownInteract = false;
      fishingCatch();
    }
    return;
  }

  // Tab: toggle minimap
  if (Input.wantsMinimapToggle()) {
    Input.toggleMinimap();
    const minimapContainer = document.getElementById('minimap-container');
    if (minimapContainer) {
      minimapContainer.style.display = Input.isMinimapVisible() ? '' : 'none';
    }
  }

  // B: Bestiary, K: Skills, J: Quests
  if (Input.wasPressed('KeyB')) { openBestiary(player); return; }
  if (Input.wasPressed('KeyK')) { openSkillTree(player); return; }
  if (Input.wasPressed('KeyJ')) { openQuests(player); return; }

  // R: use first consumable in hotbar
  if (Input.wantsQuickUse()) {
    for (let i = 0; i < 5; i++) {
      if (player.hotbar[i] && player.hotbar[i]!.def.category === 'consumable') {
        useHotbarSlot(player, i);
        break;
      }
    }
  }

  // Player movement
  const dir = Input.getDirection();
  player.moveTimer -= dt;
  player.attackCooldown -= dt;
  player.invincibleTimer -= dt;

  if (dir && player.moveTimer <= 0 && player.alive) {
    const nx = player.x + dir.x;
    const ny = player.y + dir.y;

    // Direction
    if (dir.y > 0) player.dir = 0;
    else if (dir.y < 0) player.dir = 1;
    else if (dir.x < 0) player.dir = 2;
    else if (dir.x > 0) player.dir = 3;

    if (isWalkable(currentFloor.tiles, nx, ny)) {
      // BUG FIX: check diagonal enemy bypass — check both target AND adjacent tiles
      const enemyBlocking = currentFloor.enemies.find(e => e.alive && e.x === nx && e.y === ny);
      if (!enemyBlocking) {
        player.x = nx;
        player.y = ny;
        player.moveTimer = 0.12 / player.stats.spd;

        footstepTimer -= dt;
        if (footstepTimer <= 0) {
          GameAudio.footstep();
          footstepTimer = 0.25;
        }

        // Check tile interactions
        const tile = currentFloor.tiles[ny][nx];
        if (tile === 'STAIRS_DOWN') {
          if (currentFloor.isTown) {
            // Return to dungeon from town
            if (savedDungeonFloor) {
              currentFloor = savedDungeonFloor;
              setFloorItems(currentFloor.items);
              player.x = savedPlayerPos.x;
              player.y = savedPlayerPos.y;
              player.px = player.x * 16;
              player.py = player.y * 16;
              savedDungeonFloor = null;
              showFloorTransition(player.floor);
              addMessage('You return to the dungeon...', 'msg-common');
            } else {
              enterFloor(player.floor > 0 ? player.floor : 1);
            }
          } else if (player.floor === 0) {
            // Hub stairs logic
            if (player.maxReachedFloor > 1) {
              // Dialog to choose floor
              openDialog({
                type: 'sage', // Just for icon
                name: 'Dungeon Entrance',
                x: 0, y: 0,
                currentDialog: 0,
                dialog: [{
                  text: `Return to safest camp at floor ${player.maxReachedFloor} or start over?`,
                  options: [
                    { label: `Floor ${player.maxReachedFloor}`, action: 'enter_max' },
                    { label: 'Floor 1', action: 'enter_1' },
                    { label: 'Cancel', action: 'close' }
                  ]
                }]
              }, player, (action) => {
                if (action === 'enter_max') {
                  enterFloor(player.maxReachedFloor);
                  closeDialog();
                } else if (action === 'enter_1') {
                  enterFloor(1);
                  closeDialog();
                }
              });
              // Step back to avoid immediate re-trigger?
              // Actually if dialog opens, input is blocked, so handling it is fine.
            } else {
              enterFloor(1);
            }
          } else {
            // Normal dungeon
            if (player.floor >= 100) {
              gameState = 'VICTORY';
              showVictory(player, resetGame);
            } else {
              player.totalFloorsCleared++;
              enterFloor(player.floor + 1);
            }
          }
        } else if (tile === 'STAIRS_UP') {
          // Go to hub or previous floor
          if (player.floor > 0) {
            enterFloor(0); // Return to hub
          }
        } else if (tile === 'TRAP') {
          const trapDmg = Math.floor(5 + player.floor * 0.5);
          player.stats.hp -= trapDmg;
          player.invincibleTimer = 0.5;
          GameAudio.trapActivate();
          spawnHitParticles(player.px + 8, player.py + 8);
          addFloatingText(player.px + 8, player.py, `-${trapDmg}`, '#e74c3c');
          addMessage(`Stepped on a trap! -${trapDmg} HP`, 'msg-damage');
          currentFloor.tiles[ny][nx] = 'FLOOR';
          showDamageFlash();
          if (player.stats.hp <= 0) { player.stats.hp = 0; player.alive = false; }
        } else if (tile === 'SPIKES') {
          // Spike damage (repeating, not destroyed)
          const spikeDmg = Math.floor(3 + player.floor * 0.3);
          player.stats.hp -= spikeDmg;
          player.invincibleTimer = 0.3;
          spawnHitParticles(player.px + 8, player.py + 8);
          addFloatingText(player.px + 8, player.py, `-${spikeDmg}`, '#636e72');
          addMessage(`Ouch! Spikes! -${spikeDmg} HP`, 'msg-damage');
          showDamageFlash();
          if (player.stats.hp <= 0) { player.stats.hp = 0; player.alive = false; }
        } else if (tile === 'CHEST') {
          const chest = currentFloor.chests.find(c => c.x === nx && c.y === ny);
          if (chest && !chest.opened) {
            chest.opened = true;
            currentFloor.tiles[ny][nx] = 'FLOOR';
            GameAudio.chestOpen();

            const goldAmount = Math.floor(20 + Math.random() * 30 * (1 + player.floor * 0.1));
            player.gold += goldAmount;
            addFloatingText(player.px + 8, player.py, `+${goldAmount}g`, '#f1c40f');
            addMessage(`Opened a chest! Found ${goldAmount} gold!`, 'msg-xp');

            if (Math.random() < 0.6) {
              const drops = getItemsByFloor(player.floor);
              const loot = rollLoot(drops);
              if (loot) {
                addItemToInventory(player, loot);
                addMessage(`Found ${loot.name}!`, `msg-${loot.rarity}`);
              }
            }
          }
        } else if (tile === 'DOOR') {
          GameAudio.doorOpen();
          currentFloor.tiles[ny][nx] = 'FLOOR';
        }

        // Town auto-interactions on step
        if (currentFloor.isTown) {
          // Auto-farm: stepped on crop tile
          if (tile === 'CROP') {
            interactWithCrop(player, currentFloor, nx, ny);
          }
        }

        // Pick up dropped items
        const droppedItem = currentFloor.items.find(i => i.x === nx && i.y === ny);
        if (droppedItem) {
          if (addItemToInventory(player, droppedItem.def, droppedItem.count)) {
            currentFloor.items = currentFloor.items.filter(i => i !== droppedItem);
            GameAudio.pickup();
            addMessage(`Picked up ${droppedItem.def.name}`, `msg-${droppedItem.def.rarity}`);
            updateHotbar(player);
          }
        }

        // Update visibility
        updateVisibility(currentFloor, player);
      }
    }
  }

  // Lerp player pixel position
  const targetPx = player.x * tileSize;
  const targetPy = player.y * tileSize;
  player.px += (targetPx - player.px) * 0.2;
  player.py += (targetPy - player.py) * 0.2;

  // Player animation
  player.animTimer += dt;
  if (player.animTimer > 0.2) {
    player.animTimer = 0;
    if (dir) player.animFrame = (player.animFrame + 1) % 2;
  }

  // Attack — BUG FIX: single-press, not continuous fire
  const wantsAttack = Input.isAttacking();
  if (wantsAttack && !attackHeld && player.alive) {
    if (currentFloor.isTown) {
      // In town, tapping the screen acts as interact (fish/farm/NPC)
      _pendingTownInteract = true;
    } else {
      // Check if attacking a SECRET_WALL
      const atkDir = player.dir;
      const atkX = player.x + (atkDir === 3 ? 1 : atkDir === 2 ? -1 : 0);
      const atkY = player.y + (atkDir === 0 ? 1 : atkDir === 1 ? -1 : 0);
      if (atkY >= 0 && atkY < currentFloor.height && atkX >= 0 && atkX < currentFloor.width &&
        currentFloor.tiles[atkY][atkX] === 'SECRET_WALL') {
        currentFloor.tiles[atkY][atkX] = 'FLOOR';
        addMessage('💫 You discovered a secret room!', 'msg-legendary');
        addFloatingText(atkX * tileSize, atkY * tileSize, '💫 SECRET!', '#f1c40f');
        GameAudio.chestOpen();
      }
      playerAttack(player, currentFloor, addMessage, isMultiplayerActive() ? (enemyIndex, damage, killed, xpGain, goldGain, enemyType) => {
        MP.sendPlayerAttack(enemyIndex, damage, killed);
        // Share loot with teammates when enemy dies
        if (killed && (xpGain > 0 || goldGain > 0)) {
          MP.sendShareLoot(xpGain, goldGain, enemyType);
        }
      } : undefined);
    }
    attackHeld = true;
  }
  if (!wantsAttack) attackHeld = false;

  // Interact (NPC, Fishing, Farming) — also triggered by screen tap in town
  const wantsInteract = Input.isInteracting() || _pendingTownInteract;
  _pendingTownInteract = false;
  if (wantsInteract && player.alive) {
    if (isFishingActive()) {
      fishingCatch();
    } else {
      // Check for dead teammate revive (co-op walk-to-revive)
      let revived = false;
      if (isMultiplayerActive()) {
        const remotePlayers = MP.getRemotePlayers();
        const { dx, dy } = { dx: player.dir === 3 ? 1 : player.dir === 2 ? -1 : 0, dy: player.dir === 0 ? 1 : player.dir === 1 ? -1 : 0 };
        const checkX = player.x + dx;
        const checkY = player.y + dy;
        remotePlayers.forEach((rp: RemotePlayerState) => {
          if (!rp.alive && Math.abs(rp.x - checkX) <= 1 && Math.abs(rp.y - checkY) <= 1 && !revived) {
            MP.sendReviveRequest(rp.uid);
            addMessage(`💚 Reviving ${rp.username}...`, 'msg-legendary');
            spawnLevelUpParticles(rp.px + 8, rp.py + 8);
            revived = true;
          }
        });
      }

      if (!revived) {
        const npc = checkNPCInteraction(player, currentFloor);
        if (npc) {
          openDialog(npc, player);
        } else if (currentFloor.isTown) {
          const fishSpot = getAdjacentFishSpot(player, currentFloor);
          if (fishSpot) {
            startFishing(player);
          } else {
            const cropTile = getAdjacentCropTile(player, currentFloor);
            if (cropTile) {
              interactWithCrop(player, currentFloor, cropTile.x, cropTile.y);
            }
          }
        }
      }
    }
  }

  // Hotbar keys
  for (let i = 0; i < 5; i++) {
    if (Input.wasPressed(`Digit${i + 1}`)) {
      useHotbarSlot(player, i);
    }
  }

  // Toggle inventory
  if (Input.wantsInventory()) {
    toggleInventory(player);
  }

  // Enemy AI
  currentFloor.enemies.forEach(enemy => {
    // BUG FIX: skip dead enemies entirely
    if (!enemy.alive) return;

    enemy.animTimer += dt;
    if (enemy.animTimer > 0.3) {
      enemy.animTimer = 0;
      enemy.animFrame = (enemy.animFrame + 1) % 2;
    }

    // Chase player if in range and visible
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.abs(dx) + Math.abs(dy);

    if (dist <= enemy.aggroRange && currentFloor.visible[enemy.y]?.[enemy.x]) {
      enemy.moveTimer -= dt;

      // Attack if adjacent — BUG FIX: also check enemy is alive AND has cooldown
      if (dist <= 1 && enemy.moveTimer <= 0) {
        enemy.moveTimer = 0.8 / enemy.spd;
        enemyAttack(enemy, player, addMessage);
        // Show damage flash when player takes hit
        if (player.invincibleTimer <= 0) {
          showDamageFlash();
        }
      } else if (enemy.moveTimer <= 0 && dist > 1) {
        // Move toward player
        enemy.moveTimer = 0.5 / enemy.spd;

        let mx = 0, my = 0;
        if (Math.abs(dx) > Math.abs(dy)) {
          mx = dx > 0 ? 1 : -1;
        } else {
          my = dy > 0 ? 1 : -1;
        }

        const enx = enemy.x + mx;
        const eny = enemy.y + my;

        if (isWalkable(currentFloor.tiles, enx, eny) &&
          !currentFloor.enemies.some(e => e.alive && e !== enemy && e.x === enx && e.y === eny) &&
          !(enx === player.x && eny === player.y)) {
          enemy.x = enx;
          enemy.y = eny;
        }
      }
    }

    // Lerp enemy pixel position
    const etx = enemy.x * tileSize;
    const ety = enemy.y * tileSize;
    enemy.px += (etx - enemy.px) * 0.15;
    enemy.py += (ety - enemy.py) * 0.15;
  });

  // Level up check
  while (checkLevelUp(player, addMessage)) {
    spawnLevelUpParticles(player.px + 8, player.py + 8);
  }

  // Town activities
  updateCrops(player, dt);
  updateFishingCooldown(dt);

  // Time Cycle (1 real sec = 1 game min -> 24m day)
  player.gameTime += dt;
  if (player.gameTime >= 1440) {
    player.gameTime = 0;
    player.day++;
    addMessage(`Day ${player.day} has begun!`, 'msg-rare');
    if (player.crops) player.crops.forEach(c => c.wateredToday = false);
    // Refresh daily quests
    if (player.systems) refreshQuests(player.systems.quests, player.day, player.maxReachedFloor);
  }

  // Check achievements
  if (player.systems) {
    const newAch = checkAchievements(player, player.systems);
    for (const ach of newAch) {
      addMessage(`🏆 Achievement: ${ach.name} — ${ach.desc}`, 'msg-legendary');
      addFloatingText(player.px + 8, player.py - 16, `🏆 ${ach.name}`, '#f1c40f');
    }
  }

  // Update pet
  if (player.systems?.pet) {
    updatePet(player.systems.pet, dt, player.totalKills);
  }

  // Check death
  if (!player.alive && gameState === 'PLAYING') {
    gameState = 'GAME_OVER';
    GameAudio.stopAmbient();
    // Hardcore: delete save permanently
    if (player.systems?.hardcore) {
      localStorage.removeItem(SAVE_KEY);
    }
    setTimeout(() => showGameOver(player, resetGame), 1000);
  }

  // ===== MULTIPLAYER SYNC =====
  if (isMultiplayerActive() && player.alive) {
    mpSyncTimer += dt;
    mpStatsSyncTimer += dt;

    // Send position every 100ms (or on change)
    if (mpSyncTimer >= 0.1) {
      mpSyncTimer = 0;
      if (player.x !== lastSentX || player.y !== lastSentY || player.dir !== lastSentDir) {
        MP.sendPlayerMove(player.x, player.y, player.dir, player.px, player.py, player.animFrame);
        lastSentX = player.x;
        lastSentY = player.y;
        lastSentDir = player.dir;
      }
    }

    // Send stats every 2 seconds
    if (mpStatsSyncTimer >= 2) {
      mpStatsSyncTimer = 0;
      MP.sendPlayerStats(player.stats, player.level, player.equipment, player.alive);
    }
  }

  // Expire old chat messages (after 8 seconds)
  const now = performance.now();
  chatMessages = chatMessages.filter(m => now - m.time < 8000);

  // Update particles and shake
  updateParticles(dt);
  updateScreenShake(dt);

  // Update dungeon atmospheric particles
  if (player.floor > 0 && !currentFloor.isTown) {
    updateDungeonParticles(dt, player, currentFloor);
  }

  // Camera
  const targetCamX = player.px - canvas.width / 2 + tileSize / 2;
  const targetCamY = player.py - canvas.height / 2 + tileSize / 2;
  cameraX += (targetCamX - cameraX) * 0.1;
  cameraY += (targetCamY - cameraY) * 0.1;

  // Update buffs
  if (player.buffs && player.buffs.length > 0) {
    let needsRecalc = false;
    for (let i = player.buffs.length - 1; i >= 0; i--) {
      const buff = player.buffs[i];
      buff.remaining -= dt;
      // Regen effect
      if (buff.effect.type === 'regen' && player.stats.hp < player.stats.maxHp) {
        player.stats.hp = Math.min(player.stats.maxHp, player.stats.hp + buff.effect.value * dt);
      }
      if (buff.remaining <= 0) {
        player.buffs.splice(i, 1);
        addMessage(`${buff.name} buff expired.`, 'msg-common');
        needsRecalc = true;
      }
    }
    if (needsRecalc) recalcStats(player);
  }

  // Update HUD
  updateHUD(player, !!currentFloor?.isTown);

  // Render buff bar
  renderBuffBar();
}

// ===== RENDER =====
function render(): void {
  if (gameState === 'TITLE') return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;

  const shake = getScreenShake();
  const camX = cameraX + shake.x;
  const camY = cameraY + shake.y;

  const { width, height, tiles, visible, explored, enemies, npcs, items, chests } = currentFloor;

  // Cache time once per frame instead of calling Date.now() multiple times
  const frameTime = performance.now();

  // Build chest lookup map (O(1) instead of O(n) find per tile)
  const chestMap = new Map<string, boolean>();
  for (let i = 0; i < chests.length; i++) {
    chestMap.set(`${chests[i].x},${chests[i].y}`, chests[i].opened);
  }

  // Build crop lookup map
  const cropMap = new Map<string, { growthStage: number }>();
  if (player.crops) {
    for (let i = 0; i < player.crops.length; i++) {
      const c = player.crops[i];
      cropMap.set(`${c.x},${c.y}`, c);
    }
  }

  // Determine visible tile range
  const startX = Math.max(0, (camX / tileSize) | 0);
  const startY = Math.max(0, (camY / tileSize) | 0);
  const endX = Math.min(width, Math.ceil((camX + canvas.width) / tileSize) + 1);
  const endY = Math.min(height, Math.ceil((camY + canvas.height) / tileSize) + 1);

  // Get biome tiles for dungeon floors
  const isDungeon = player.floor > 0 && !currentFloor.isTown;
  const biome = isDungeon ? getBiome(player.floor) : null;
  const biomeTiles = isDungeon && biome ? getBiomeTiles(biome) : null;

  // Cache torch positions per floor
  if (isDungeon && player.floor !== lastTorchFloor) {
    currentTorchPositions = findTorchPositions(currentFloor);
    lastTorchFloor = player.floor;
  }

  // ===== PASS 1: Render floor tiles (everything except walls) =====
  for (let y = startY; y < endY; y++) {
    const expRow = explored[y];
    const visRow = visible[y];
    const tileRow = tiles[y];
    for (let x = startX; x < endX; x++) {
      if (!expRow[x]) continue;

      const sx = x * tileSize - camX;
      const sy = y * tileSize - camY;
      const tile = tileRow[x];

      let sprite: HTMLCanvasElement | null = null;

      if (isDungeon && biomeTiles) {
        // Use biome-tinted tiles for dungeon
        switch (tile) {
          case 'WALL':
          case 'SECRET_WALL':
            // Walls drawn in floor color first (they get overdrawn in pass 2)
            sprite = biomeTiles.floor;
            break;
          case 'FLOOR': sprite = biomeTiles.floor; break;
          case 'DOOR': sprite = biomeTiles.door; break;
          case 'STAIRS_DOWN': sprite = biomeTiles.stairsDown; break;
          case 'STAIRS_UP': sprite = biomeTiles.stairsUp; break;
          case 'CHEST': {
            // Draw floor underneath chest
            ctx.drawImage(biomeTiles.floor, sx, sy, tileSize, tileSize);
            const opened = chestMap.get(`${x},${y}`);
            sprite = opened ? Assets.get('chestOpen') : Assets.get('chest');
            break;
          }
          case 'TRAP':
            sprite = visRow[x] ? Assets.get('trap') : biomeTiles.floor;
            break;
          case 'SPIKES':
            sprite = biomeTiles.floor;
            break;
          default:
            // Fallback for any non-dungeon tiles
            switch (tile) {
              case 'GRASS': sprite = Assets.get('grass'); break;
              case 'PATH': sprite = Assets.get('path'); break;
              case 'WATER': sprite = Assets.get('water'); break;
              case 'BUILDING': sprite = Assets.get('building'); break;
              case 'FENCE': sprite = Assets.get('fence'); break;
              case 'TREE': sprite = Assets.get('tree'); break;
              case 'FLOWER': sprite = Assets.get('flower'); break;
              case 'CROP': sprite = Assets.get('crop'); break;
              case 'FISH_SPOT': sprite = Assets.get('fishSpot'); break;
            }
        }
      } else {
        // Town / Hub — use original tiles
        switch (tile) {
          case 'WALL': sprite = Assets.get('wall'); break;
          case 'FLOOR': sprite = Assets.get('floor'); break;
          case 'DOOR': sprite = Assets.get('door'); break;
          case 'STAIRS_DOWN': sprite = Assets.get('stairsDown'); break;
          case 'STAIRS_UP': sprite = Assets.get('stairsUp'); break;
          case 'CHEST': {
            const opened = chestMap.get(`${x},${y}`);
            sprite = opened ? Assets.get('chestOpen') : Assets.get('chest');
            break;
          }
          case 'TRAP': sprite = visRow[x] ? Assets.get('trap') : Assets.get('floor'); break;
          case 'GRASS': sprite = Assets.get('grass'); break;
          case 'PATH': sprite = Assets.get('path'); break;
          case 'WATER': sprite = Assets.get('water'); break;
          case 'BUILDING': sprite = Assets.get('building'); break;
          case 'FENCE': sprite = Assets.get('fence'); break;
          case 'TREE': sprite = Assets.get('tree'); break;
          case 'FLOWER': sprite = Assets.get('flower'); break;
          case 'CROP': sprite = Assets.get('crop'); break;
          case 'FISH_SPOT': sprite = Assets.get('fishSpot'); break;
          case 'SECRET_WALL': sprite = Assets.get('wall'); break;
          case 'SPIKES': sprite = Assets.get('floor'); break;
        }
      }

      if (sprite) {
        ctx.drawImage(sprite, sx, sy, tileSize, tileSize);
      }

      // Draw spike overlay
      if (tile === 'SPIKES' && visRow[x]) {
        const spikePhase = Math.sin(frameTime * 0.00167 + x * 3 + y * 7);
        if (spikePhase > -0.3) {
          ctx.fillStyle = '#636e72';
          for (let si = 0; si < 3; si++) {
            const spx = sx + 4 + si * 10;
            const spy = sy + 8 + (spikePhase > 0.5 ? 0 : 4);
            ctx.beginPath();
            ctx.moveTo(spx, spy + 8);
            ctx.lineTo(spx + 4, spy);
            ctx.lineTo(spx + 8, spy + 8);
            ctx.fill();
          }
        }
      }

      // Subtle crack overlay for secret walls (hint)
      if (tile === 'SECRET_WALL' && visRow[x]) {
        ctx.strokeStyle = 'rgba(180,160,120,0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx + 8, sy + 2); ctx.lineTo(sx + 12, sy + 14);
        ctx.moveTo(sx + 20, sy + 6); ctx.lineTo(sx + 16, sy + 18);
        ctx.stroke();
      }

      // Render crop growth overlays
      if (tile === 'CROP') {
        const crop = cropMap.get(`${x},${y}`);
        if (crop) {
          if (crop.growthStage === 1) {
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(sx + 6, sy + 10, 4, 4);
            ctx.fillRect(sx + 7, sy + 7, 2, 3);
          } else if (crop.growthStage === 2) {
            ctx.fillStyle = '#27ae60';
            ctx.fillRect(sx + 5, sy + 6, 6, 8);
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(sx + 3, sy + 4, 4, 3);
            ctx.fillRect(sx + 9, sy + 5, 4, 3);
            ctx.fillRect(sx + 6, sy + 3, 4, 3);
          } else if (crop.growthStage >= 3) {
            ctx.fillStyle = '#1e8449';
            ctx.fillRect(sx + 4, sy + 4, 8, 10);
            ctx.fillStyle = '#27ae60';
            ctx.fillRect(sx + 2, sy + 2, 5, 4);
            ctx.fillRect(sx + 9, sy + 3, 5, 4);
            ctx.fillStyle = '#f1c40f';
            ctx.fillRect(sx + 6, sy + 5, 4, 3);
            ctx.fillRect(sx + 5, sy + 8, 6, 2);
            const pulse = 0.4 + Math.sin(frameTime * 0.0025) * 0.3;
            ctx.fillStyle = `rgba(241, 196, 15, ${pulse})`;
            ctx.fillRect(sx + 4, sy + 3, 8, 10);
          }
        }
      }
    }
  }

  // ===== PASS 1.5: Wall shadows on floor tiles (dungeon only) =====
  if (isDungeon) {
    renderWallShadows(ctx, currentFloor, camX, camY, tileSize, startX, startY, endX, endY);
  }

  // ===== PASS 2: Render 3D walls on top (dungeon only) =====
  if (isDungeon && biome) {
    renderWallTops(ctx, currentFloor, biome, camX, camY, tileSize, startX, startY, endX, endY);
  }

  // Render dropped items
  for (let ii = 0; ii < items.length; ii++) {
    const item = items[ii];
    if (!visible[item.y]?.[item.x]) continue;
    const sx = item.x * tileSize - camX;
    const sy = item.y * tileSize - camY;
    const icon = Assets.getItem(item.def.icon, item.def.rarity);
    if (icon) {
      const bob = Math.sin(frameTime * 0.004 + item.x * 7) * 2;
      ctx.drawImage(icon, sx + 4, sy + bob + 2, tileSize - 8, tileSize - 8);
    }
  }

  // Render NPCs
  ctx.font = '6px "Press Start 2P"';
  for (let ni = 0; ni < npcs.length; ni++) {
    const npc = npcs[ni];
    if (!visible[npc.y]?.[npc.x]) continue;
    const sx = npc.x * tileSize - camX;
    const sy = npc.y * tileSize - camY;
    const sprite = Assets.getNPC(npc.type);
    if (sprite) {
      ctx.drawImage(sprite, sx, sy - tileSize, tileSize, tileSize * 2);
      // Name tag
      ctx.fillStyle = '#f1c40f';
      ctx.textAlign = 'center';
      ctx.fillText(npc.name, sx + tileSize / 2, sy - tileSize - 4);
    }
  }
  ctx.textAlign = 'left';

  // Render enemies
  for (let ei = 0; ei < enemies.length; ei++) {
    const enemy = enemies[ei];
    if (!enemy.alive) continue;
    if (!visible[enemy.y]?.[enemy.x]) continue;

    const sx = enemy.px - camX;
    const sy = enemy.py - camY;

    if (enemy.isBoss) {
      const bossSprite = Assets.getBoss(enemy.bossFloor, enemy.animFrame);
      if (bossSprite) {
        ctx.drawImage(bossSprite, sx - tileSize / 2, sy - tileSize, tileSize * 2, tileSize * 2);
      }
    } else {
      const sprite = Assets.getEnemy(enemy.type, enemy.animFrame);
      if (sprite) {
        // Enemies are still 16x16 for now, or 16x32?
        // Assets.ts says generic enemies are 16x16 centered in 16x16 canvas.
        // Wait, I updated generateEnemy to be 16x16 on a 16x16 canvas in the last edit? 
        // No, I kept them 16x16. 
        ctx.drawImage(sprite, sx, sy, tileSize, tileSize);
      }
    }

    // Health bar
    const hpPct = enemy.hp / enemy.maxHp;
    const barW = enemy.isBoss ? tileSize * 1.5 : tileSize - 4;
    const barX = sx + (enemy.isBoss ? -tileSize * 0.25 : 2);
    const barY = sy - 6;
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barW, 3);
    ctx.fillStyle = hpPct > 0.5 ? '#2ecc71' : hpPct > 0.25 ? '#f39c12' : '#e74c3c';
    ctx.fillRect(barX, barY, barW * hpPct, 3);

    // Elite glow effect
    if (enemy.isElite && enemy.eliteColor) {
      ctx.save();
      const glowPulse = 0.3 + Math.sin(frameTime * 0.00333) * 0.2;
      ctx.shadowColor = enemy.eliteColor;
      ctx.shadowBlur = 10 + Math.sin(frameTime * 0.005) * 5;
      // Use pre-parsed RGB if available, else parse once
      if (!enemy._eliteRGB) {
        enemy._eliteRGB = [
          parseInt(enemy.eliteColor.slice(1, 3), 16),
          parseInt(enemy.eliteColor.slice(3, 5), 16),
          parseInt(enemy.eliteColor.slice(5, 7), 16)
        ];
      }
      const [er, eg, eb] = enemy._eliteRGB;
      ctx.fillStyle = `rgba(${er},${eg},${eb},${glowPulse})`;
      ctx.fillRect(sx - 2, sy - 2, tileSize + 4, tileSize + 4);
      ctx.restore();
      // Elite label
      ctx.save();
      ctx.fillStyle = enemy.eliteColor;
      ctx.font = '5px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText(enemy.eliteName || 'Elite', sx + tileSize / 2, barY - 3);
      ctx.restore();
    }

    // AGGRO INDICATOR: show "!" when enemy is chasing player
    const edx = player.x - enemy.x;
    const edy = player.y - enemy.y;
    const eDist = Math.abs(edx) + Math.abs(edy);
    if (eDist <= enemy.aggroRange && eDist > 1) {
      ctx.save();
      ctx.fillStyle = '#e74c3c';
      ctx.font = 'bold 10px "Press Start 2P"';
      ctx.textAlign = 'center';
      // Bounce animation
      const bounce = Math.sin(frameTime * 0.008) * 3;
      ctx.fillText('!', sx + tileSize / 2, sy - 10 + bounce);
      ctx.restore();
    }
  }

  // ===== RENDER REMOTE PLAYERS (CO-OP) =====
  if (isMultiplayerActive()) {
    const remotePlayers = MP.getRemotePlayers();
    const emoteBubbles = MP.getEmoteBubbles();
    const now = Date.now();
    ctx.font = '6px "Press Start 2P"';

    remotePlayers.forEach((rp: RemotePlayerState) => {
      const rpx = rp.px - camX;
      const rpy = rp.py - camY;

      // Check if on-screen
      const onScreen = rpx >= -tileSize * 2 && rpx <= canvas.width + tileSize &&
        rpy >= -tileSize * 2 && rpy <= canvas.height + tileSize;

      if (onScreen) {
        if (rp.alive) {
          // Draw remote player sprite
          ctx.globalAlpha = 0.85;
          const rpSprite = Assets.getPlayer(rp.className, rp.dir, rp.animFrame);
          if (rpSprite) {
            ctx.drawImage(rpSprite, rpx, rpy - tileSize, tileSize, tileSize * 2);
          } else {
            const avDef = AVATARS[rp.avatar] || AVATARS[0];
            ctx.fillStyle = avDef.colors.body;
            ctx.beginPath();
            ctx.arc(rpx + tileSize / 2, rpy + tileSize / 2, tileSize / 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        } else {
          // Dead player: ghost effect with skull
          ctx.globalAlpha = 0.35;
          const rpSprite = Assets.getPlayer(rp.className, rp.dir, 0);
          if (rpSprite) {
            ctx.drawImage(rpSprite, rpx, rpy - tileSize, tileSize, tileSize * 2);
          }
          ctx.globalAlpha = 1;
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('\u2620\ufe0f', rpx + tileSize / 2, rpy + tileSize / 2 + 4);
          ctx.font = '6px "Press Start 2P"';
        }

        // Username tag above head
        ctx.textAlign = 'center';
        ctx.fillStyle = rp.nameColor || '#a29bfe';
        ctx.fillText(rp.username, rpx + tileSize / 2, rpy - tileSize - 6);

        // Health bar (for alive players)
        if (rp.stats && rp.alive) {
          const hpPct = rp.stats.hp / rp.stats.maxHp;
          const barW = tileSize - 4;
          const barX = rpx + 2;
          const barY = rpy - tileSize - 2;
          ctx.fillStyle = '#333';
          ctx.fillRect(barX, barY, barW, 3);
          ctx.fillStyle = hpPct > 0.5 ? '#2ecc71' : hpPct > 0.25 ? '#f39c12' : '#e74c3c';
          ctx.fillRect(barX, barY, barW * hpPct, 3);
        }

        // Emote bubble
        const emote = emoteBubbles.get(rp.uid);
        if (emote) {
          const age = (now - emote.time) / 1000;
          if (age < 3) {
            const fadeAlpha = age > 2 ? Math.max(0, 1 - (age - 2)) : 1;
            const floatY = Math.sin(age * 2) * 2;
            ctx.globalAlpha = fadeAlpha;
            // Bubble background
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            const bubX = rpx + tileSize / 2;
            const bubY = rpy - tileSize - 20 + floatY;
            ctx.beginPath();
            ctx.arc(bubX, bubY, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
            // Emote icon
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fff';
            ctx.fillText(MP.EMOTES[emote.emoteId] || '\u2764\ufe0f', bubX, bubY + 5);
            ctx.font = '6px "Press Start 2P"';
            ctx.globalAlpha = 1;
          } else {
            emoteBubbles.delete(rp.uid);
          }
        }
      } else {
        // ===== OFF-SCREEN TEAMMATE ARROW =====
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const angle = Math.atan2(rpy - centerY, rpx - centerX);
        const padding = 20;

        // Clamp position to canvas edge
        let arrowX = centerX + Math.cos(angle) * (canvas.width / 2 - padding);
        let arrowY = centerY + Math.sin(angle) * (canvas.height / 2 - padding);
        arrowX = Math.max(padding, Math.min(canvas.width - padding, arrowX));
        arrowY = Math.max(padding, Math.min(canvas.height - padding, arrowY));

        ctx.save();
        ctx.translate(arrowX, arrowY);
        ctx.rotate(angle);

        // Arrow shape
        const color = rp.nameColor || '#a29bfe';
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.moveTo(10, 0);
        ctx.lineTo(-5, -6);
        ctx.lineTo(-2, 0);
        ctx.lineTo(-5, 6);
        ctx.closePath();
        ctx.fill();

        // Pulse glow
        const pulse = 0.5 + Math.sin(frameTime * 0.005) * 0.3;
        ctx.globalAlpha = pulse;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.restore();

        // Name label near arrow
        ctx.save();
        ctx.font = '5px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.7;
        const name = rp.username.length > 8 ? rp.username.slice(0, 8) + '..' : rp.username;
        ctx.fillText(name, arrowX, arrowY + 14);
        // Distance indicator
        const dist = Math.floor(Math.sqrt((rp.x - player.x) ** 2 + (rp.y - player.y) ** 2));
        ctx.fillStyle = '#888';
        ctx.fillText(`${dist}`, arrowX, arrowY + 22);
        ctx.restore();
      }
    });

    // Show local player emote too
    const localProfile = MP.getProfile();
    if (localProfile) {
      const emote = emoteBubbles.get(localProfile.uid);
      if (emote) {
        const age = (now - emote.time) / 1000;
        if (age < 3) {
          const fadeAlpha = age > 2 ? Math.max(0, 1 - (age - 2)) : 1;
          const floatY = Math.sin(age * 2) * 2;
          const psx = player.px - camX;
          const psy = player.py - camY;
          ctx.globalAlpha = fadeAlpha;
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          const bubX = psx + tileSize / 2;
          const bubY = psy - tileSize - 20 + floatY;
          ctx.beginPath();
          ctx.arc(bubX, bubY, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(MP.EMOTES[emote.emoteId] || '\u2764\ufe0f', bubX, bubY + 5);
          ctx.font = '6px "Press Start 2P"';
          ctx.globalAlpha = 1;
        }
      }
    }

    ctx.textAlign = 'left';

    // ===== BOSS HP BAR (shared, at top of screen) =====
    if (currentFloor && !currentFloor.isTown) {
      const boss = currentFloor.enemies.find(e => e.isBoss && e.alive);
      if (boss) {
        ctx.save();
        const barWidth = Math.min(canvas.width - 80, 320);
        const barX = (canvas.width - barWidth) / 2;
        const barY = 28;
        const barH = 12;
        const hpPct = Math.max(0, boss.hp / boss.maxHp);

        // Background
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(barX - 4, barY - 14, barWidth + 8, barH + 22);
        ctx.strokeStyle = '#c0392b';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX - 4, barY - 14, barWidth + 8, barH + 22);

        // Boss name
        ctx.font = '7px "Press Start 2P"';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#e74c3c';
        ctx.fillText(`\u2620 ${boss.type} \u2620`, canvas.width / 2, barY - 2);

        // HP bar background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(barX, barY, barWidth, barH);

        // HP bar fill with gradient
        const grad = ctx.createLinearGradient(barX, barY, barX + barWidth * hpPct, barY);
        grad.addColorStop(0, '#c0392b');
        grad.addColorStop(1, '#e74c3c');
        ctx.fillStyle = grad;
        ctx.fillRect(barX, barY, barWidth * hpPct, barH);

        // HP text
        ctx.font = '5px "Press Start 2P"';
        ctx.fillStyle = '#fff';
        ctx.fillText(`${Math.ceil(boss.hp)} / ${boss.maxHp}`, canvas.width / 2, barY + barH - 2);

        // Decorative corners
        ctx.strokeStyle = '#f39c12';
        ctx.lineWidth = 1;
        const cLen = 6;
        // Top-left
        ctx.beginPath(); ctx.moveTo(barX - 4, barY - 14 + cLen); ctx.lineTo(barX - 4, barY - 14); ctx.lineTo(barX - 4 + cLen, barY - 14); ctx.stroke();
        // Top-right
        ctx.beginPath(); ctx.moveTo(barX + barWidth + 4 - cLen, barY - 14); ctx.lineTo(barX + barWidth + 4, barY - 14); ctx.lineTo(barX + barWidth + 4, barY - 14 + cLen); ctx.stroke();
        // Bottom-left
        ctx.beginPath(); ctx.moveTo(barX - 4, barY + barH + 8 - cLen); ctx.lineTo(barX - 4, barY + barH + 8); ctx.lineTo(barX - 4 + cLen, barY + barH + 8); ctx.stroke();
        // Bottom-right
        ctx.beginPath(); ctx.moveTo(barX + barWidth + 4 - cLen, barY + barH + 8); ctx.lineTo(barX + barWidth + 4, barY + barH + 8); ctx.lineTo(barX + barWidth + 4, barY + barH + 8 - cLen); ctx.stroke();

        ctx.restore();
      }
    }
  }

  // Render player
  if (player.alive) {
    const psx = player.px - camX;
    const psy = player.py - camY;

    // Invincibility flash
    if (player.invincibleTimer > 0 && Math.floor(player.invincibleTimer * 10) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    const sprite = Assets.getPlayer(player.className, player.dir, player.animFrame);
    if (sprite) {
      ctx.drawImage(sprite, psx, psy - tileSize, tileSize, tileSize * 2);
    }

    ctx.globalAlpha = 1;

    // Attack visual
    if (player.attackCooldown > 0.2) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      const ad = player.dir;
      const ax = psx + (ad === 3 ? tileSize : ad === 2 ? -tileSize / 2 : tileSize / 4);
      const ay = psy + (ad === 0 ? tileSize : ad === 1 ? -tileSize / 2 : tileSize / 4);
      ctx.fillRect(ax, ay, tileSize / 2, tileSize / 2);
    }

    // Fishing line visual
    if (isFishingActive() && currentFloor.isTown) {
      const fishSpot = getAdjacentFishSpot(player, currentFloor);
      if (fishSpot) {
        const bobX = fishSpot.x * tileSize - camX + tileSize / 2;
        const bobY = fishSpot.y * tileSize - camY + tileSize / 2 + Math.sin(frameTime * 0.00333) * 2;
        const rodX = psx + tileSize / 2;
        const rodY = psy - tileSize / 2;
        ctx.strokeStyle = '#bdc3c7';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rodX, rodY);
        ctx.quadraticCurveTo(rodX + (bobX - rodX) * 0.5, rodY - 8, bobX, bobY);
        ctx.stroke();
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(bobX, bobY, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ecf0f1';
        ctx.beginPath();
        ctx.arc(bobX, bobY - 2, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Torch ember particles
    spawnTorchEmbers(player.px + 8, player.py - 12);
  }

  // Lighting / fog of war (skip on hub and town — always lit, but apply Day/Night cycle)
  if (player.floor !== 0 && !currentFloor.isTown) {
    renderLighting(ctx, currentFloor, player, camX, camY, canvas.width, canvas.height, tileSize);
  } else {
    // Town / Hub Day/Night Cycle
    renderDayNightOverlay(ctx, canvas.width, canvas.height, player.gameTime);
  }

  // ===== 2.5D DUNGEON ATMOSPHERE =====
  if (isDungeon && biome) {
    // Torch glow on walls
    renderTorchGlows(ctx, currentTorchPositions, biome, camX, camY, tileSize, canvas.width, canvas.height);
    // Atmospheric dungeon particles (dust, fog, embers)
    renderDungeonParticles(ctx, camX, camY);
    // Biome ambient color overlay
    renderBiomeAmbient(ctx, biome, canvas.width, canvas.height);
  }

  // Particles
  renderParticles(ctx, camX, camY);
  renderFloatingTexts(ctx, camX, camY);

  // Vignette overlay (cinematic darkened edges — stronger in dungeons)
  const vignetteStrength = isDungeon ? 0.6 : 0.35;
  const vignetteInner = isDungeon ? 0.2 : 0.3;
  const vignetteOuter = isDungeon ? 0.7 : 0.8;
  const vigKey = `${canvas.width}_${canvas.height}_${vignetteStrength}`;
  if (!vignetteCanvas || (vignetteCanvas as any)._vigKey !== vigKey) {
    vignetteCanvas = document.createElement('canvas');
    vignetteCanvas.width = canvas.width;
    vignetteCanvas.height = canvas.height;
    (vignetteCanvas as any)._vigKey = vigKey;
    const vCtx = vignetteCanvas.getContext('2d')!;
    const gradient = vCtx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, canvas.width * vignetteInner,
      canvas.width / 2, canvas.height / 2, canvas.width * vignetteOuter
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(0,0,0,${vignetteStrength})`);
    vCtx.fillStyle = gradient;
    vCtx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(vignetteCanvas, 0, 0);

  // Minimap
  if (Input.isMinimapVisible()) {
    renderMinimap(currentFloor, player, isMultiplayerActive() ? MP.getRemotePlayers() : undefined);
  }

  // ===== RENDER CHAT MESSAGES (CO-OP) =====
  if (isMultiplayerActive() && chatMessages.length > 0) {
    ctx.save();
    ctx.font = '8px "Press Start 2P"';
    const chatX = 10;
    let chatY = canvas.height - 140;
    for (let i = Math.max(0, chatMessages.length - 6); i < chatMessages.length; i++) {
      const msg = chatMessages[i];
      const age = (performance.now() - msg.time) / 8000;
      ctx.globalAlpha = Math.max(0, 1 - age * 1.5);
      // Background
      const text = `${msg.username}: ${msg.message}`;
      const tw = ctx.measureText(text).width;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(chatX - 2, chatY - 8, tw + 8, 12);
      // Username
      ctx.fillStyle = msg.nameColor || '#a29bfe';
      const usernameText = `${msg.username}: `;
      ctx.fillText(usernameText, chatX, chatY);
      // Message
      ctx.fillStyle = '#e0d8c0';
      ctx.fillText(msg.message, chatX + ctx.measureText(usernameText).width, chatY);
      chatY += 14;
    }
    ctx.restore();
  }

  // Chat input indicator
  if (chatOpen) {
    ctx.save();
    ctx.font = '9px "Press Start 2P"';
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(8, canvas.height - 130, 300, 18);
    ctx.strokeStyle = '#ffd54f';
    ctx.strokeRect(8, canvas.height - 130, 300, 18);
    ctx.fillStyle = '#ffd54f';
    ctx.fillText('💬 ' + chatInput + '●', 12, canvas.height - 116);
    ctx.restore();
  }

  // ===== PARTY HUD (CO-OP) =====
  if (isMultiplayerActive()) {
    const remotePlayers = MP.getRemotePlayers();
    if (remotePlayers.size > 0) {
      ctx.save();
      const partyX = canvas.width - 170;
      let partyY = 80;

      // Panel background
      const panelH = 12 + remotePlayers.size * 36;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.beginPath();
      const r = 6;
      ctx.moveTo(partyX - 8 + r, partyY - 8);
      ctx.lineTo(partyX + 162 - r, partyY - 8);
      ctx.quadraticCurveTo(partyX + 162, partyY - 8, partyX + 162, partyY - 8 + r);
      ctx.lineTo(partyX + 162, partyY - 8 + panelH - r);
      ctx.quadraticCurveTo(partyX + 162, partyY - 8 + panelH, partyX + 162 - r, partyY - 8 + panelH);
      ctx.lineTo(partyX - 8 + r, partyY - 8 + panelH);
      ctx.quadraticCurveTo(partyX - 8, partyY - 8 + panelH, partyX - 8, partyY - 8 + panelH - r);
      ctx.lineTo(partyX - 8, partyY - 8 + r);
      ctx.quadraticCurveTo(partyX - 8, partyY - 8, partyX - 8 + r, partyY - 8);
      ctx.fill();

      ctx.strokeStyle = 'rgba(162, 155, 254, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      remotePlayers.forEach((rp: RemotePlayerState) => {
        // Name + level
        ctx.font = '7px "Press Start 2P"';
        ctx.fillStyle = rp.nameColor || '#a29bfe';
        ctx.textAlign = 'left';
        const name = rp.username.length > 10 ? rp.username.slice(0, 10) + '..' : rp.username;
        ctx.fillText(name, partyX, partyY);
        ctx.fillStyle = '#888';
        ctx.textAlign = 'right';
        ctx.fillText(`Lv${rp.level || 1}`, partyX + 154, partyY);

        // HP bar
        if (rp.stats) {
          const hpPct = Math.max(0, rp.stats.hp / rp.stats.maxHp);
          const barW = 154;
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(partyX, partyY + 4, barW, 8);
          const hpColor = hpPct > 0.5 ? '#2ecc71' : hpPct > 0.25 ? '#f39c12' : '#e74c3c';
          ctx.fillStyle = hpColor;
          ctx.fillRect(partyX, partyY + 4, barW * hpPct, 8);
          ctx.strokeStyle = 'rgba(255,255,255,0.15)';
          ctx.strokeRect(partyX, partyY + 4, barW, 8);

          // HP text
          ctx.font = '5px "Press Start 2P"';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#fff';
          ctx.fillText(`${Math.ceil(rp.stats.hp)}/${rp.stats.maxHp}`, partyX + barW / 2, partyY + 11);
        }

        // Dead indicator
        if (!rp.alive) {
          ctx.font = '6px "Press Start 2P"';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#e74c3c';
          ctx.fillText('☠️ DEAD', partyX + 77, partyY + 24);
        }

        partyY += 36;
      });

      ctx.textAlign = 'left';
      ctx.restore();
    }

    // Ping display (top-right corner)
    const ping = MP.getLatency();
    if (ping > 0) {
      ctx.save();
      ctx.font = '6px "Press Start 2P"';
      ctx.textAlign = 'right';
      ctx.fillStyle = ping < 100 ? '#2ecc71' : ping < 250 ? '#f39c12' : '#e74c3c';
      ctx.fillText(`${ping}ms`, canvas.width - 10, 16);
      ctx.restore();
    }
  }
}

// ===== GAME LOOP =====
function gameLoop(timestamp: number): void {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;

  update(dt);
  render();
  Input.clearJustPressed();

  requestAnimationFrame(gameLoop);
}

// ===== CHAT HELPERS =====
function openChatInput(): void {
  chatOpen = true;
  chatInput = '';
  // Create a hidden input to capture text on mobile
  let chatEl = document.getElementById('chat-hidden-input') as HTMLInputElement;
  if (!chatEl) {
    chatEl = document.createElement('input');
    chatEl.id = 'chat-hidden-input';
    chatEl.type = 'text';
    chatEl.maxLength = 100;
    chatEl.style.cssText = 'position:fixed;bottom:0;left:0;width:300px;opacity:0;pointer-events:none;z-index:-1;';
    document.body.appendChild(chatEl);
  }
  chatEl.value = '';
  chatEl.style.pointerEvents = 'auto';
  chatEl.style.opacity = '0';
  chatEl.focus();

  chatEl.oninput = () => { chatInput = chatEl.value; };
  chatEl.onkeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (chatInput.trim()) {
        MP.sendChat(chatInput.trim());
        const profile = MP.getProfile();
        if (profile) {
          chatMessages.push({
            uid: profile.uid,
            username: profile.username,
            message: chatInput.trim(),
            nameColor: profile.nameColor,
            time: performance.now()
          });
        }
      }
      chatOpen = false;
      closeChatInput();
      e.preventDefault();
    } else if (e.key === 'Escape') {
      chatOpen = false;
      closeChatInput();
      e.preventDefault();
    }
  };
}

function closeChatInput(): void {
  chatOpen = false;
  chatInput = '';
  const chatEl = document.getElementById('chat-hidden-input') as HTMLInputElement;
  if (chatEl) {
    chatEl.blur();
    chatEl.style.pointerEvents = 'none';
  }
}

// ===== INIT =====
function init(): void {
  // Initialize systems
  initI18n();
  loadSettings();
  initAssets();
  initInput();
  initSettings(returnToHub);
  initTownActivities();
  initForge();

  // Display version
  const versionLabel = `v${APP_VERSION}`;
  document.getElementById('title-version')!.textContent = versionLabel;
  document.getElementById('settings-version')!.textContent = versionLabel;

  // Save button
  document.getElementById('save-btn')!.addEventListener('click', () => {
    if (gameState === 'PLAYING') saveGame();
  });

  // Systems UI
  initSystemsUI();
  const panelOpeners: Record<string, (p: PlayerState) => void> = {
    bestiary: openBestiary, achievements: openAchievements, skills: openSkillTree,
    quests: openQuests, museum: openMuseum, hearts: openHearts,
  };
  document.querySelectorAll('.sys-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (gameState !== 'PLAYING') return;
      const panel = (btn as HTMLElement).dataset.panel!;
      const opener = panelOpeners[panel];
      if (opener) opener(player);
    });
  });

  // ===== MULTIPLAYER EVENT HANDLERS =====
  // Handle remote enemy damage
  MP.on('enemy_damage', (enemyIndex: number, damage: number, _fromUid: string) => {
    if (!currentFloor || !currentFloor.enemies[enemyIndex]) return;
    const enemy = currentFloor.enemies[enemyIndex];
    if (enemy.alive) {
      enemy.hp -= damage;
      spawnHitParticles(enemy.px + 8, enemy.py + 8);
      addFloatingText(enemy.px + 8, enemy.py, `-${damage}`, '#a29bfe');
      if (enemy.hp <= 0) {
        enemy.hp = 0;
        enemy.alive = false;
      }
    }
  });

  MP.on('enemy_killed', (enemyIndex: number, killerUid: string) => {
    if (!currentFloor || !currentFloor.enemies[enemyIndex]) return;
    const enemy = currentFloor.enemies[enemyIndex];
    enemy.hp = 0;
    enemy.alive = false;

    // Victory celebration for boss kills in co-op!
    if (enemy.isBoss && isMultiplayerActive()) {
      const remotePlayers = MP.getRemotePlayers();
      let killerName = 'the party';
      remotePlayers.forEach(rp => { if (rp.uid === killerUid) killerName = rp.username; });
      addMessage(`🎉🎉🎉 BOSS DEFEATED! ${killerName} dealt the final blow! 🎉🎉🎉`, 'msg-legendary');
      addFloatingText(enemy.px, enemy.py - 16, '🎉 VICTORY!', '#f1c40f');
      // Firework particles
      for (let i = 0; i < 30; i++) {
        const colors = ['#e74c3c', '#f39c12', '#2ecc71', '#3498db', '#9b59b6', '#f1c40f'];
        spawnDeathParticles(enemy.px + Math.random() * 32, enemy.py + Math.random() * 32, colors[Math.floor(Math.random() * colors.length)]);
      }
    }
  });

  // Handle chat messages from other players
  MP.on('chat_msg', (fromUid: string, fromUsername: string, message: string, nameColor?: string) => {
    chatMessages.push({ uid: fromUid, username: fromUsername, message, nameColor, time: performance.now() });
    addMessage(`💬 ${fromUsername}: ${message}`, 'msg-uncommon');
  });

  // Handle player join/leave notifications
  MP.on('player_joined', (rp: RemotePlayerState) => {
    addMessage(`🟢 ${rp.username} joined the dungeon!`, 'msg-rare');
  });

  MP.on('player_left', (_uid: string) => {
    addMessage(`🔴 A player left the dungeon.`, 'msg-common');
  });

  // Handle starter gear from login
  window.addEventListener('mp-starter-gear', ((e: CustomEvent) => {
    if (!player) return;
    const gear = e.detail;
    if (Array.isArray(gear)) {
      for (const item of gear) {
        addItemToInventory(player, item);
        addMessage(`🎁 Login reward: ${item.name}!`, 'msg-legendary');
      }
    }
  }) as EventListener);

  // Handle admin rewards (admins get +1 level/skill when players login)
  MP.on('admin_reward', (reward: any) => {
    if (!player) return;
    const levels = reward.levelUp || 0;
    const sp = reward.skillPoints || 0;
    if (levels > 0) player.level += levels;
    if (sp > 0 && player.systems) player.systems.skillPoints += sp;
    addMessage(`👑 ${reward.message}`, 'msg-legendary');
  });

  // Handle floor change from teammates
  MP.on('floor_change', (floor: number, seed: number, _fromUid: string) => {
    if (!player || gameState !== 'PLAYING') return;
    // Follow the party to the new floor with the same seed for identical map
    addMessage(`🚪 Party is moving to Floor ${floor}!`, 'msg-rare');
    setTimeout(() => {
      if (player && gameState === 'PLAYING') {
        enterFloor(floor, seed);
      }
    }, 1500);
  });

  // Handle shared loot from teammates killing enemies
  MP.on('shared_loot', (xp: number, gold: number, enemyType: string, killerUsername: string) => {
    if (!player || gameState !== 'PLAYING') return;
    // Co-op bonus: teammates get 50% of XP and gold
    const sharedXP = Math.floor(xp * 0.5);
    const sharedGold = Math.floor(gold * 0.5);
    if (sharedXP > 0) {
      player.xp += sharedXP;
      addFloatingText(player.px + 8, player.py - 8, `+${sharedXP} XP`, '#a29bfe');
    }
    if (sharedGold > 0) {
      player.gold += sharedGold;
      addFloatingText(player.px + 8, player.py + 8, `+${sharedGold}g`, '#ffd54f');
    }
    addMessage(`⚔️ ${killerUsername} defeated ${enemyType}! +${sharedXP} XP, +${sharedGold}g`, 'msg-xp');
    checkLevelUp(player, addMessage);
  });

  // Handle revive from teammate
  MP.on('revive_player', (targetUid: string, _fromUid: string, fromUsername: string) => {
    if (!player) return;
    const profile = MP.getProfile();
    if (profile && targetUid === profile.uid && !player.alive) {
      player.alive = true;
      player.stats.hp = Math.floor(player.stats.maxHp * 0.3);
      addMessage(`💚 ${fromUsername} revived you!`, 'msg-legendary');
      spawnLevelUpParticles(player.px + 8, player.py + 8);
    }
  });

  // Teleport to party host position
  MP.on('teleport_info', (hostX: number, hostY: number) => {
    if (!player || gameState !== 'PLAYING') return;
    player.x = hostX;
    player.y = hostY;
    player.px = hostX * tileSize;
    player.py = hostY * tileSize;
    addMessage(`✨ Teleported to the party leader!`, 'msg-rare');
    spawnLevelUpParticles(player.px + 8, player.py + 8);
  });

  // Emote notification
  MP.on('emote', (_fromUid: string, fromUsername: string, emoteId: number) => {
    const emoteText = MP.EMOTES[emoteId] || '❤️';
    addMessage(`${emoteText} ${fromUsername}`, 'msg-uncommon');
  });

  // Chat key binding (T key to open chat in co-op)
  // Emote keybinds (1-8 in co-op when chat is closed, Shift held)
  window.addEventListener('keydown', (e) => {
    if (gameState !== 'PLAYING') return;
    if (!isMultiplayerActive()) return;
    if (isInventoryOpen() || isDialogOpen() || isSettingsOpen() || isCoopOpen()) return;

    // Emote keys: Shift+1 through Shift+8
    if (e.shiftKey && !chatOpen) {
      const emoteKeys = ['1', '2', '3', '4', '5', '6', '7', '8'];
      const idx = emoteKeys.indexOf(e.key);
      if (idx !== -1) {
        e.preventDefault();
        MP.sendEmote(idx);
        return;
      }
    }

    // Chat: T key
    if (chatOpen) return;
    if (e.key === 't' || e.key === 'T') {
      e.preventDefault();
      openChatInput();
    }

    // Teleport: P key
    if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      MP.teleportToParty();
    }
  });

  // Check for save
  const save = loadSave();
  initTitleScreen(startGame, !!save, save);

  requestAnimationFrame(gameLoop);
}

init();

// ===== VERSION CHECK =====
// Periodically check if a newer version is available
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

function checkVersion(): void {
  const WORKER_URL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:8787'
    : 'https://dungeon-crawler-server.huiling-koh.workers.dev';

  fetch(`${WORKER_URL}/health`)
    .then(r => r.json())
    .then(data => {
      if (data.minClientVersion && compareVersions(APP_VERSION, data.minClientVersion) < 0) {
        showUpdateBanner(data.minClientVersion);
      }
    })
    .catch(() => { /* offline or unreachable, skip */ });
}

function showUpdateBanner(newVersion: string): void {
  if (document.getElementById('update-banner')) return; // already showing
  const banner = document.createElement('div');
  banner.id = 'update-banner';
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:linear-gradient(90deg,#e74c3c,#c0392b);color:#fff;padding:10px 20px;text-align:center;font-family:\"Press Start 2P\",monospace;font-size:11px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.4);';
  banner.innerHTML = `⚠️ New version v${newVersion} available! Click here or refresh to update. (You have v${APP_VERSION})`;
  banner.onclick = () => location.reload();
  document.body.prepend(banner);
}

// Check immediately and every 5 minutes
checkVersion();
setInterval(checkVersion, 5 * 60 * 1000);
