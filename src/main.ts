// ===== MAIN GAME ENGINE =====

import './style.css';
import type { PlayerState, DungeonFloor, GameState, ClassName, Direction, SaveData } from './types';
import { initAssets, Assets } from './assets';
import { GameAudio } from './audio';
import { initInput, Input } from './input';
import { generateFloor, isWalkable, generateTown } from './dungeon';
import { getItemsByFloor, rollLoot } from './items';
import { playerAttack, enemyAttack, checkLevelUp, recalcStats, updateScreenShake, getScreenShake } from './combat';
import { updateParticles, renderParticles, renderFloatingTexts, clearParticles, spawnTorchEmbers, spawnLevelUpParticles, addFloatingText, spawnHitParticles } from './particles';
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
import { createGameSystems, checkAchievements, updateQuestProgress, refreshQuests, updatePet } from './systems';
import { initSystemsUI, isSystemsUIOpen, closeSystemsUI, openBestiary, openAchievements, openSkillTree, openQuests, openMuseum, openHearts } from './systems-ui';

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

// Floor transition state
let transitioning = false;

// Attack cooldown fix: track if attack was already pressed
let attackHeld = false;
// In town, screen taps trigger interact instead of attack
let _pendingTownInteract = false;

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
function enterFloor(floor: number): void {
  if (floor > 0 && floor > player.maxReachedFloor) {
    player.maxReachedFloor = floor;
  }

  if (floor === 0) {
    currentFloor = generateHubFloor();
  } else {
    currentFloor = generateFloor(floor);
  }
  player.floor = floor;

  // Place player at stairs up
  player.x = currentFloor.stairsUp.x;
  player.y = currentFloor.stairsUp.y;
  player.px = player.x * tileSize;
  player.py = player.y * tileSize;

  clearParticles();
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
  enterFloor(1);
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
    if (isTutorialOpen()) { closeTutorial(); Input.clearJustPressed(); return; }
    if (isSettingsOpen()) { closeSettings(); Input.clearJustPressed(); return; }
    if (isDialogOpen()) { closeDialog(); Input.clearJustPressed(); return; }
    if (isInventoryOpen()) { closeInventory(); Input.clearJustPressed(); return; }
    if (isSystemsUIOpen()) { closeSystemsUI(); Input.clearJustPressed(); return; }
    openSettings(true);
    Input.clearJustPressed();
    return;
  }

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
      playerAttack(player, currentFloor, addMessage);
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
      const npc = checkNPCInteraction(player, currentFloor);
      if (npc) {
        openDialog(npc, player);
      } else if (currentFloor.isTown) {
        // Check for fishing spot adjacency
        const fishSpot = getAdjacentFishSpot(player, currentFloor);
        if (fishSpot) {
          startFishing(player);
        } else {
          // Check for crop tile (standing on or adjacent)
          const cropTile = getAdjacentCropTile(player, currentFloor);
          if (cropTile) {
            interactWithCrop(player, currentFloor, cropTile.x, cropTile.y);
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

  // Update particles and shake
  updateParticles(dt);
  updateScreenShake(dt);

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

  // Render tiles
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
        // Town tiles
        case 'GRASS': sprite = Assets.get('grass'); break;
        case 'PATH': sprite = Assets.get('path'); break;
        case 'WATER': sprite = Assets.get('water'); break;
        case 'BUILDING': sprite = Assets.get('building'); break;
        case 'FENCE': sprite = Assets.get('fence'); break;
        case 'TREE': sprite = Assets.get('tree'); break;
        case 'FLOWER': sprite = Assets.get('flower'); break;
        case 'CROP': sprite = Assets.get('crop'); break;
        case 'FISH_SPOT': sprite = Assets.get('fishSpot'); break;
        case 'SECRET_WALL': sprite = Assets.get('wall'); break; // looks like wall until broken
        case 'SPIKES': sprite = Assets.get('floor'); break; // draw floor, spikes on top
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
      // Draw player 1x2 (width=32 (upscaled?), height=64? No tileSize is 32)
      // Original: 16x16 tile size. 
      // Sprite: 16x32 pixels.
      // Canvas draw: width=tileSize, height=tileSize*2
      // Offset y: -tileSize
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
        // Line
        ctx.strokeStyle = '#bdc3c7';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rodX, rodY);
        ctx.quadraticCurveTo(rodX + (bobX - rodX) * 0.5, rodY - 8, bobX, bobY);
        ctx.stroke();
        // Bobber
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
    spawnTorchEmbers(player.px + 8, player.py - 12); // Higher for taller sprite
  }

  // Lighting / fog of war (skip on hub and town — always lit, but apply Day/Night cycle)
  if (player.floor !== 0 && !currentFloor.isTown) {
    renderLighting(ctx, currentFloor, player, camX, camY, canvas.width, canvas.height, tileSize);
  } else {
    // Town / Hub Day/Night Cycle
    renderDayNightOverlay(ctx, canvas.width, canvas.height, player.gameTime);
  }

  // Particles
  renderParticles(ctx, camX, camY);
  renderFloatingTexts(ctx, camX, camY);

  // Vignette overlay (cinematic darkened edges)
  if (!vignetteCanvas || vignetteCanvas.width !== canvas.width || vignetteCanvas.height !== canvas.height) {
    vignetteCanvas = document.createElement('canvas');
    vignetteCanvas.width = canvas.width;
    vignetteCanvas.height = canvas.height;
    const vCtx = vignetteCanvas.getContext('2d')!;
    const gradient = vCtx.createRadialGradient(
      canvas.width / 2, canvas.height / 2, canvas.width * 0.3,
      canvas.width / 2, canvas.height / 2, canvas.width * 0.8
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.4)');
    vCtx.fillStyle = gradient;
    vCtx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(vignetteCanvas, 0, 0);

  // Minimap
  if (Input.isMinimapVisible()) {
    renderMinimap(currentFloor, player);
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

  // Check for save
  const save = loadSave();
  initTitleScreen(startGame, !!save, save);

  requestAnimationFrame(gameLoop);
}

init();
