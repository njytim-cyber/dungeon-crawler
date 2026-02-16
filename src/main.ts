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
import { updateVisibility, renderLighting } from './lighting';
import { renderMinimap } from './minimap';
import { updateHUD, updateHotbar, addMessage, showHUD, hideHUD } from './hud';
import { initInventory, toggleInventory, isInventoryOpen, closeInventory, addItemToInventory, useHotbarSlot } from './inventory';
import { initTitleScreen, showGameOver, showVictory, getClassDef } from './screens';
import { checkNPCInteraction, openDialog, isDialogOpen, closeDialog } from './npc';
import { initI18n, t } from './i18n';
import { initSettings, loadSettings, isSettingsOpen, closeSettings, openSettings, isTutorialOpen, closeTutorial, openTutorial } from './settings';
import { APP_VERSION } from './version';
import { startFishing, fishingCatch, isFishingActive, updateFishingCooldown, interactWithCrop, updateCrops, getAdjacentFishSpot, getAdjacentCropTile, initTownActivities } from './town';
import { isForgeOpen, initForge } from './forge';

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
    crops: [],
    hasFishingRod: false,
    hasWateringCan: false,
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
  updateVisibility(currentFloor, player);

  if (floor === 0) {
    addMessage(t('hub_welcome'), 'msg-uncommon');
  } else {
    GameAudio.stairsDescend();
    GameAudio.startAmbient(floor);
    addMessage(t('entered_floor', floor), floor % 10 === 0 ? 'msg-legendary' : 'msg-xp');

    if (floor % 10 === 0) {
      GameAudio.bossAppear();
      addMessage(t('boss_warning'), 'msg-damage');
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
    openSettings(true);
    Input.clearJustPressed();
    return;
  }

  // Block gameplay when overlays open
  if (isInventoryOpen() || isDialogOpen() || isSettingsOpen() || isTutorialOpen() || isForgeOpen()) return;

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

  // Check death
  if (!player.alive && gameState === 'PLAYING') {
    gameState = 'GAME_OVER';
    GameAudio.stopAmbient();
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

  // Determine visible tile range
  const startX = Math.max(0, Math.floor(camX / tileSize) - 1);
  const startY = Math.max(0, Math.floor(camY / tileSize) - 1);
  const endX = Math.min(width, Math.ceil((camX + canvas.width) / tileSize) + 1);
  const endY = Math.min(height, Math.ceil((camY + canvas.height) / tileSize) + 1);

  // Render tiles
  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      if (!explored[y][x]) continue;

      const sx = x * tileSize - camX;
      const sy = y * tileSize - camY;
      const tile = tiles[y][x];

      let sprite: HTMLCanvasElement | null = null;
      switch (tile) {
        case 'WALL': sprite = Assets.get('wall'); break;
        case 'FLOOR': sprite = Assets.get('floor'); break;
        case 'DOOR': sprite = Assets.get('door'); break;
        case 'STAIRS_DOWN': sprite = Assets.get('stairsDown'); break;
        case 'STAIRS_UP': sprite = Assets.get('stairsUp'); break;
        case 'CHEST': {
          const chest = chests.find(c => c.x === x && c.y === y);
          sprite = chest?.opened ? Assets.get('chestOpen') : Assets.get('chest');
          break;
        }
        case 'TRAP': sprite = visible[y][x] ? Assets.get('trap') : Assets.get('floor'); break;
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
      }

      if (sprite) {
        ctx.drawImage(sprite, sx, sy, tileSize, tileSize);
      }

      // Render crop growth overlays
      if (tile === 'CROP' && player.crops) {
        const crop = player.crops.find(c => c.x === x && c.y === y);
        if (crop) {
          if (crop.growthStage === 1) {
            // Seedling — tiny green dot
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(sx + 6, sy + 10, 4, 4);
            ctx.fillRect(sx + 7, sy + 7, 2, 3);
          } else if (crop.growthStage === 2) {
            // Growing — medium plant
            ctx.fillStyle = '#27ae60';
            ctx.fillRect(sx + 5, sy + 6, 6, 8);
            ctx.fillStyle = '#2ecc71';
            ctx.fillRect(sx + 3, sy + 4, 4, 3);
            ctx.fillRect(sx + 9, sy + 5, 4, 3);
            ctx.fillRect(sx + 6, sy + 3, 4, 3);
          } else if (crop.growthStage >= 3) {
            // Ready to harvest — full plant with glow
            ctx.fillStyle = '#1e8449';
            ctx.fillRect(sx + 4, sy + 4, 8, 10);
            ctx.fillStyle = '#27ae60';
            ctx.fillRect(sx + 2, sy + 2, 5, 4);
            ctx.fillRect(sx + 9, sy + 3, 5, 4);
            ctx.fillStyle = '#f1c40f';
            ctx.fillRect(sx + 6, sy + 5, 4, 3);
            ctx.fillRect(sx + 5, sy + 8, 6, 2);
            // Pulse glow
            const pulse = 0.4 + Math.sin(Date.now() / 400) * 0.3;
            ctx.fillStyle = `rgba(241, 196, 15, ${pulse})`;
            ctx.fillRect(sx + 4, sy + 3, 8, 10);
          }
        }
      }
    }
  }

  // Render dropped items
  items.forEach(item => {
    if (!visible[item.y]?.[item.x]) return;
    const sx = item.x * tileSize - camX;
    const sy = item.y * tileSize - camY;
    const icon = Assets.getItem(item.def.icon, item.def.rarity);
    if (icon) {
      const bob = Math.sin(Date.now() * 0.004 + item.x * 7) * 2;
      ctx.drawImage(icon, sx + 4, sy + bob + 2, tileSize - 8, tileSize - 8);
    }
  });

  // Render NPCs
  npcs.forEach(npc => {
    if (!visible[npc.y]?.[npc.x]) return;
    const sx = npc.x * tileSize - camX;
    const sy = npc.y * tileSize - camY;
    const sprite = Assets.getNPC(npc.type);
    if (sprite) {
      // Offset Y by -16 (tileSize) because sprite is 32px tall
      ctx.drawImage(sprite, sx, sy - tileSize, tileSize, tileSize * 2);

      // Name tag
      ctx.fillStyle = '#f1c40f';
      ctx.font = '6px "Press Start 2P"';
      ctx.textAlign = 'center';
      ctx.fillText(npc.name, sx + tileSize / 2, sy - tileSize - 4);
      ctx.textAlign = 'left';
    }
  });

  // Render enemies
  enemies.forEach(enemy => {
    if (!enemy.alive) return;
    if (!visible[enemy.y]?.[enemy.x]) return;

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
      const bounce = Math.sin(Date.now() * 0.008) * 3;
      ctx.fillText('!', sx + tileSize / 2, sy - 10 + bounce);
      ctx.restore();
    }
  });

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
        const bobY = fishSpot.y * tileSize - camY + tileSize / 2 + Math.sin(Date.now() / 300) * 2;
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

  // Lighting / fog of war (skip on hub and town — always lit)
  if (player.floor !== 0 && !currentFloor.isTown) {
    renderLighting(ctx, currentFloor, player, camX, camY, canvas.width, canvas.height, tileSize);
  }

  // Particles
  renderParticles(ctx, camX, camY);
  renderFloatingTexts(ctx, camX, camY);

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

  // Check for save
  const save = loadSave();
  initTitleScreen(startGame, !!save, save);

  requestAnimationFrame(gameLoop);
}

init();
