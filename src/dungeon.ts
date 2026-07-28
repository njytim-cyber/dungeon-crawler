// ===== DUNGEON GENERATOR =====
// BSP-based procedural dungeon generation

import type { TileType, Room, DungeonFloor, EnemyState, NPCState, Position, ChestState, DroppedItem, EnemyType, NPCType, DialogNode } from './types';
import { getItemsByFloor } from './items';
import { getBiome } from './biomes';
import { rollEliteModifier } from './systems';
import { carveBossArena } from './arena';
import { getBossDef } from './bosses';

// ===== SEEDED PRNG =====
// Mulberry32: fast, deterministic PRNG from a 32-bit seed
// Used in multiplayer so all players generate the same dungeon layout
let _seededRng: (() => number) | null = null;

function mulberry32(seed: number): () => number {
    return () => {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

/** Set a global seed for dungeon generation (call before generateFloor) */
export function setSeed(seed: number): void {
    _seededRng = mulberry32(seed);
}

/** Clear the seed (revert to Math.random for solo play) */
export function clearSeed(): void {
    _seededRng = null;
}

/** Get a random number — uses seeded PRNG if set, otherwise Math.random */
function rng(): number {
    return _seededRng ? _seededRng() : Math.random();
}

const MIN_ROOM_SIZE = 4;
const MAX_ROOM_SIZE = 10;

function createGrid(w: number, h: number, fill: TileType): TileType[][] {
    return Array.from({ length: h }, () => Array(w).fill(fill));
}

function createBoolGrid(w: number, h: number, fill: boolean): boolean[][] {
    return Array.from({ length: h }, () => Array(w).fill(fill));
}

interface BSPNode {
    x: number; y: number; w: number; h: number;
    left?: BSPNode; right?: BSPNode;
    room?: Room;
}

function splitBSP(node: BSPNode, depth: number): void {
    if (depth <= 0 || node.w < MIN_ROOM_SIZE * 2 + 2 || node.h < MIN_ROOM_SIZE * 2 + 2) return;

    const splitH = node.w > node.h ? false : node.h > node.w ? true : rng() > 0.5;

    if (splitH) {
        const split = Math.floor(node.y + node.h * (0.3 + rng() * 0.4));
        if (split - node.y < MIN_ROOM_SIZE + 1 || node.y + node.h - split < MIN_ROOM_SIZE + 1) return;
        node.left = { x: node.x, y: node.y, w: node.w, h: split - node.y };
        node.right = { x: node.x, y: split, w: node.w, h: node.y + node.h - split };
    } else {
        const split = Math.floor(node.x + node.w * (0.3 + rng() * 0.4));
        if (split - node.x < MIN_ROOM_SIZE + 1 || node.x + node.w - split < MIN_ROOM_SIZE + 1) return;
        node.left = { x: node.x, y: node.y, w: split - node.x, h: node.h };
        node.right = { x: split, y: node.y, w: node.x + node.w - split, h: node.h };
    }

    splitBSP(node.left!, depth - 1);
    splitBSP(node.right!, depth - 1);
}

function createRoomInNode(node: BSPNode): void {
    if (node.left && node.right) {
        createRoomInNode(node.left);
        createRoomInNode(node.right);
        return;
    }

    const rw = Math.min(MAX_ROOM_SIZE, Math.floor(MIN_ROOM_SIZE + rng() * (node.w - MIN_ROOM_SIZE - 1)));
    const rh = Math.min(MAX_ROOM_SIZE, Math.floor(MIN_ROOM_SIZE + rng() * (node.h - MIN_ROOM_SIZE - 1)));
    const rx = node.x + 1 + Math.floor(rng() * (node.w - rw - 1));
    const ry = node.y + 1 + Math.floor(rng() * (node.h - rh - 1));

    node.room = { x: rx, y: ry, w: rw, h: rh };
}

function getRoomCenter(room: Room): Position {
    return { x: Math.floor(room.x + room.w / 2), y: Math.floor(room.y + room.h / 2) };
}

function getNodeRoom(node: BSPNode): Room | undefined {
    if (node.room) return node.room;
    if (node.left) {
        const r = getNodeRoom(node.left);
        if (r) return r;
    }
    if (node.right) {
        const r = getNodeRoom(node.right);
        if (r) return r;
    }
    return undefined;
}

function connectRooms(tiles: TileType[][], r1: Room, r2: Room): void {
    const c1 = getRoomCenter(r1);
    const c2 = getRoomCenter(r2);
    let x = c1.x, y = c1.y;

    while (x !== c2.x) {
        if (y >= 0 && y < tiles.length && x >= 0 && x < tiles[0].length) {
            if (tiles[y][x] === 'WALL') tiles[y][x] = 'FLOOR';
            if (y + 1 < tiles.length && tiles[y + 1][x] === 'WALL') tiles[y + 1][x] = 'FLOOR';
        }
        x += x < c2.x ? 1 : -1;
    }
    while (y !== c2.y) {
        if (y >= 0 && y < tiles.length && x >= 0 && x < tiles[0].length) {
            if (tiles[y][x] === 'WALL') tiles[y][x] = 'FLOOR';
            if (x + 1 < tiles[0].length && tiles[y][x + 1] === 'WALL') tiles[y][x + 1] = 'FLOOR';
        }
        y += y < c2.y ? 1 : -1;
    }
}

function connectBSP(tiles: TileType[][], node: BSPNode): void {
    if (!node.left || !node.right) return;
    connectBSP(tiles, node.left);
    connectBSP(tiles, node.right);
    const r1 = getNodeRoom(node.left);
    const r2 = getNodeRoom(node.right);
    if (r1 && r2) connectRooms(tiles, r1, r2);
}

function collectRooms(node: BSPNode, rooms: Room[]): void {
    if (node.room) rooms.push(node.room);
    if (node.left) collectRooms(node.left, rooms);
    if (node.right) collectRooms(node.right, rooms);
}

const ENEMY_POOL_BY_DEPTH: EnemyType[][] = [
    ['rat', 'slime', 'bat', 'kobold'],                              // 1-10
    ['slime', 'bat', 'goblin', 'skeleton', 'kobold', 'zombie'],     // 11-20
    ['goblin', 'skeleton', 'spider', 'zombie', 'cultist', 'mimic'], // 21-30
    ['skeleton', 'spider', 'orc', 'harpy', 'cultist', 'gargoyle'],  // 31-40
    ['spider', 'orc', 'ghost', 'gargoyle', 'banshee', 'troll'],     // 41-50
    ['orc', 'ghost', 'wraith', 'minotaur', 'hellhound', 'troll'],   // 51-60
    ['ghost', 'wraith', 'golem', 'basilisk', 'hellhound', 'wisp'],  // 61-70
    ['wraith', 'golem', 'demon', 'revenant', 'shade', 'basilisk'],  // 71-80
    ['golem', 'demon', 'drake', 'revenant', 'shade', 'devourer'],   // 81-90
    ['demon', 'drake', 'lich', 'devourer', 'shade', 'minotaur'],    // 91-100
];

function getEnemyPool(floor: number): EnemyType[] {
    const idx = Math.min(Math.floor((floor - 1) / 10), ENEMY_POOL_BY_DEPTH.length - 1);
    return ENEMY_POOL_BY_DEPTH[idx];
}

function createEnemy(type: EnemyType, x: number, y: number, floor: number, isBoss: boolean): EnemyState {
    const scale = 1 + floor * 0.08;
    // ATK values raised across the board — monsters are meant to threaten you
    const baseStats: Record<EnemyType, { hp: number; atk: number; def: number; spd: number; xp: number }> = {
        // --- original roster ---
        slime: { hp: 18, atk: 5, def: 1, spd: 0.5, xp: 5 },
        bat: { hp: 11, atk: 6, def: 0, spd: 1.4, xp: 4 },
        skeleton: { hp: 28, atk: 9, def: 3, spd: 0.7, xp: 10 },
        goblin: { hp: 22, atk: 8, def: 2, spd: 0.9, xp: 8 },
        spider: { hp: 20, atk: 11, def: 2, spd: 1.1, xp: 12 },
        ghost: { hp: 32, atk: 13, def: 4, spd: 0.8, xp: 15 },
        orc: { hp: 46, atk: 16, def: 6, spd: 0.6, xp: 20 },
        wraith: { hp: 38, atk: 19, def: 3, spd: 1.0, xp: 25 },
        golem: { hp: 70, atk: 22, def: 12, spd: 0.35, xp: 35 },
        demon: { hp: 56, atk: 25, def: 8, spd: 0.8, xp: 40 },
        drake: { hp: 78, atk: 28, def: 10, spd: 0.7, xp: 50 },
        lich: { hp: 60, atk: 32, def: 6, spd: 0.9, xp: 60 },

        // --- expanded roster ---
        rat: { hp: 8, atk: 4, def: 0, spd: 1.5, xp: 3 },
        kobold: { hp: 16, atk: 7, def: 1, spd: 1.1, xp: 6 },
        zombie: { hp: 34, atk: 8, def: 2, spd: 0.35, xp: 9 },       // slow, tanky
        cultist: { hp: 24, atk: 12, def: 2, spd: 0.9, xp: 14 },      // glass cannon
        harpy: { hp: 26, atk: 12, def: 1, spd: 1.5, xp: 16 },        // fast
        gargoyle: { hp: 48, atk: 13, def: 11, spd: 0.45, xp: 22 },   // armoured
        mimic: { hp: 40, atk: 20, def: 6, spd: 0.6, xp: 26 },        // ambusher
        banshee: { hp: 30, atk: 18, def: 2, spd: 1.1, xp: 24 },
        minotaur: { hp: 85, atk: 26, def: 9, spd: 0.75, xp: 45 },
        basilisk: { hp: 62, atk: 24, def: 9, spd: 0.6, xp: 42 },
        revenant: { hp: 66, atk: 27, def: 7, spd: 0.95, xp: 48 },
        hellhound: { hp: 44, atk: 24, def: 5, spd: 1.5, xp: 38 },    // very fast
        shade: { hp: 40, atk: 30, def: 3, spd: 1.2, xp: 52 },        // deadly, fragile
        troll: { hp: 95, atk: 21, def: 8, spd: 0.45, xp: 40 },       // huge HP pool
        wisp: { hp: 18, atk: 22, def: 0, spd: 1.7, xp: 30 },         // fast, squishy
        devourer: { hp: 88, atk: 34, def: 11, spd: 0.8, xp: 70 },
    };

    const base = baseStats[type];
    const bossMultiplier = isBoss ? 5 : 1;

    return {
        type,
        x, y,
        px: x * 16, py: y * 16,
        hp: Math.floor(base.hp * scale * bossMultiplier),
        maxHp: Math.floor(base.hp * scale * bossMultiplier),
        atk: Math.floor(base.atk * scale * bossMultiplier * 0.7),
        def: Math.floor(base.def * scale * (isBoss ? 2 : 1)),
        spd: base.spd,
        moveTimer: 0,
        animFrame: 0,
        animTimer: 0,
        alive: true,
        isBoss,
        bossFloor: isBoss ? floor : 0,
        aggroRange: isBoss ? 12 : 6,
        dropTable: getItemsByFloor(floor),
        xpReward: Math.floor(base.xp * scale * (isBoss ? 10 : 1)),
    };
}

/** Summon a weakened add during a boss fight. */
export function createMinion(type: EnemyType, x: number, y: number, floor: number, hpScale: number): EnemyState {
    const e = createEnemy(type, x, y, floor, false);
    e.hp = Math.max(1, Math.floor(e.hp * hpScale));
    e.maxHp = e.hp;
    e.xpReward = Math.floor(e.xpReward * 0.5);
    e.aggroRange = 14;
    return e;
}

function createNPC(type: NPCType, x: number, y: number, floor: number): NPCState {
    const names: Record<NPCType, string> = {
        merchant: 'Travelling Merchant',
        healer: 'Wandering Healer',
        sage: 'Ancient Sage',
        cook: 'Chef Rosemary',
        fishmonger: 'Old Fisher Pete',
        farmer: 'Farmer Green',
        blacksmith: 'Forge Master Grimm',
    };
    const dialogs: Record<NPCType, DialogNode[]> = {
        merchant: [
            {
                text: `Welcome, adventurer! Buying or selling?`, options: [
                    { label: 'Health Potion (10g)', action: 'buy_hp', cost: 10, itemId: 'health_potion' },
                    { label: 'Greater Potion (30g)', action: 'buy_greater_hp', cost: 30, itemId: 'greater_health' },
                    { label: 'Escape Scroll (40g)', action: 'buy_escape', cost: 40, itemId: 'escape_scroll' },
                    { label: 'More stock...', action: 'next' },
                ]
            },
            {
                text: 'The good stuff. And I buy gear, if you have any to shift.', options: [
                    { label: 'Ultra Potion (80g)', action: 'buy_ultra_hp', cost: 80, itemId: 'ultra_health' },
                    { label: 'Antidote (18g)', action: 'buy_antidote', cost: 18, itemId: 'antidote' },
                    { label: 'Whetstone (45g)', action: 'buy_whetstone', cost: 45, itemId: 'whetstone' },
                    { label: '💰 Sell gear', action: 'sell_gear' },
                    { label: '🎒 Sell odds and ends', action: 'sell_junk' },
                    { label: '◀ Back', action: 'prev' },
                    { label: 'Leave', action: 'close' },
                ]
            },
        ],
        healer: [
            {
                text: 'You look half-dead. I can mend that — for coin. Nothing here is free.', options: [
                    { label: 'Full heal (price by wound)', action: 'heal' },
                    { label: 'Quick patch-up (cheaper)', action: 'heal_partial' },
                    { label: 'Buy Antidote (18g)', action: 'buy_antidote', cost: 18, itemId: 'antidote' },
                    { label: 'Buy Phoenix Tear (200g)', action: 'buy_phoenix', cost: 200, itemId: 'phoenix_tear' },
                    { label: 'Leave', action: 'close' },
                ]
            },
        ],
        sage: [
            {
                text: `You have reached floor ${floor}. ${floor < 50 ? 'The deeper you go, the stronger the enemies.' : 'Few have ventured this deep.'}`, options: [
                    { label: 'Any advice?', action: 'hint' },
                    { label: 'Tell me about the bosses', action: 'lore_boss' },
                    { label: 'What lies below?', action: 'lore_depth' },
                    { label: 'Leave', action: 'close' },
                ]
            },
        ],
        cook: [
            {
                text: 'Welcome to my kitchen! I cook food that gives you special powers. What would you like?', options: [
                    { label: 'Bread (5g)', action: 'buy_bread', cost: 5, itemId: 'bread' },
                    { label: 'Meat Stew (25g)', action: 'buy_stew', cost: 25, itemId: 'meat_stew' },
                    { label: 'Iron Soup (25g)', action: 'buy_soup', cost: 25, itemId: 'iron_soup' },
                    { label: 'Speed Salad (20g)', action: 'buy_salad', cost: 20, itemId: 'speed_salad' },
                    { label: 'More food...', action: 'next' },
                ]
            },
            {
                text: 'Here are my specialty dishes!', options: [
                    { label: 'Golden Pie (50g)', action: 'buy_pie', cost: 50, itemId: 'golden_pie' },
                    { label: 'Berry Smoothie (30g)', action: 'buy_smoothie', cost: 30, itemId: 'berry_smoothie' },
                    { label: 'Battle Cookie (40g)', action: 'buy_cookie', cost: 40, itemId: 'battle_cookie' },
                    { label: "Scholar's Tea (60g)", action: 'buy_tea', cost: 60, itemId: 'xp_tea' },
                    { label: 'Dragon Feast (100g)', action: 'buy_feast', cost: 100, itemId: 'dragon_feast' },
                    { label: '◀ Back to the menu', action: 'prev' },
                    { label: 'Leave', action: 'close' },
                ]
            },
        ],
        fishmonger: [
            {
                text: 'Ahoy! Rod\'s for sale, river\'s to the east. And I buy every fish you pull out of it.', options: [
                    { label: 'Buy Fishing Rod (50g)', action: 'buy_rod', cost: 50, itemId: 'fishing_rod' },
                    { label: '🐟 Sell me your catch', action: 'sell_fish' },
                    { label: 'Where do I fish?', action: 'fish_hint' },
                    { label: 'Leave', action: 'close' },
                ]
            },
        ],
        farmer: [
            {
                text: 'Howdy! Buy seeds and plant them on the farm plots. Water them with a watering can for faster growth!', options: [
                    { label: 'Watering Can (40g)', action: 'buy_can', cost: 40, itemId: 'watering_can' },
                    { label: 'Wheat Seed (5g)', action: 'buy_wheat_seed', cost: 5, itemId: 'wheat_seed' },
                    { label: 'Berry Seed (8g)', action: 'buy_berry_seed', cost: 8, itemId: 'berry_seed' },
                    { label: 'More seeds...', action: 'next' },
                ]
            },
            {
                text: 'The rare stock. And I\'ll take produce off your hands.', options: [
                    { label: 'Golden Seed (20g)', action: 'buy_golden_seed', cost: 20, itemId: 'golden_seed' },
                    { label: 'Dragon Seed (50g)', action: 'buy_dragon_seed', cost: 50, itemId: 'dragon_seed' },
                    { label: '🌾 Sell produce', action: 'sell_crops' },
                    { label: '◀ Back', action: 'prev' },
                    { label: 'Leave', action: 'close' },
                ]
            },
        ],
        blacksmith: [
            {
                text: '⚒️ Welcome to the forge! I sell steel, I forge steel, and I buy any blade you have no use for.', options: [
                    { label: 'Iron Sword (30g)', action: 'buy_iron_sword', cost: 30, itemId: 'iron_sword' },
                    { label: 'Short Bow (25g)', action: 'buy_short_bow', cost: 25, itemId: 'short_bow' },
                    { label: 'Bone Axe (20g)', action: 'buy_bone_axe', cost: 20, itemId: 'bone_axe' },
                    { label: '💰 Sell me your weapons', action: 'sell_gear' },
                    { label: 'More weapons...', action: 'next' },
                ]
            },
            {
                text: '⚒️ My finer wares. The forge takes weapons, armour and rings — two of a kind, and mind the cap: +3 without a Limit Breaker.', options: [
                    { label: 'Steel Sword (80g)', action: 'buy_steel_sword', cost: 80, itemId: 'steel_sword' },
                    { label: 'War Axe (90g)', action: 'buy_war_axe', cost: 90, itemId: 'war_axe' },
                    { label: 'Long Bow (75g)', action: 'buy_long_bow', cost: 75, itemId: 'long_bow' },
                    { label: '🔥 OPEN THE FORGE!', action: 'open_forge' },
                    { label: '⚔️ Sell gear', action: 'sell_gear' },
                    { label: '◀ Back', action: 'prev' },
                    { label: 'Leave', action: 'close' },
                ]
            },
        ],
    };
    return {
        type, x, y,
        name: names[type],
        dialog: dialogs[type],
        currentDialog: 0,
    };
}

export function generateFloor(floor: number): DungeonFloor {
    const w = 40 + Math.floor(floor * 0.3);
    const h = 30 + Math.floor(floor * 0.2);
    const tiles = createGrid(w, h, 'WALL');

    const root: BSPNode = { x: 0, y: 0, w, h };
    const depth = 4 + Math.floor(rng() * 2);
    splitBSP(root, depth);
    createRoomInNode(root);
    const rooms: Room[] = [];
    collectRooms(root, rooms);

    // Carve rooms
    rooms.forEach(room => {
        for (let ry = room.y; ry < room.y + room.h; ry++) {
            for (let rx = room.x; rx < room.x + room.w; rx++) {
                if (ry > 0 && ry < h - 1 && rx > 0 && rx < w - 1) {
                    tiles[ry][rx] = 'FLOOR';
                }
            }
        }
    });

    // Connect rooms
    connectBSP(tiles, root);

    // Place stairs
    const firstRoom = rooms[0];
    const lastRoom = rooms[rooms.length - 1];
    const stairsUp: Position = getRoomCenter(firstRoom);
    const stairsDown: Position = getRoomCenter(lastRoom);
    tiles[stairsUp.y][stairsUp.x] = 'STAIRS_UP';
    tiles[stairsDown.y][stairsDown.x] = 'STAIRS_DOWN';

    // Place chests
    const chests: ChestState[] = [];
    const chestCount = 1 + Math.floor(rng() * 3);
    for (let i = 0; i < chestCount && rooms.length > 2; i++) {
        const room = rooms[1 + Math.floor(rng() * (rooms.length - 2))];
        const cx = room.x + 1 + Math.floor(rng() * (room.w - 2));
        const cy = room.y + 1 + Math.floor(rng() * (room.h - 2));
        if (tiles[cy][cx] === 'FLOOR') {
            tiles[cy][cx] = 'CHEST';
            chests.push({ x: cx, y: cy, opened: false });
        }
    }

    // Place traps
    const trapCount = Math.floor(floor * 0.3 + rng() * 3);
    for (let i = 0; i < trapCount; i++) {
        const room = rooms[Math.floor(rng() * rooms.length)];
        const tx = room.x + 1 + Math.floor(rng() * (room.w - 2));
        const ty = room.y + 1 + Math.floor(rng() * (room.h - 2));
        if (tiles[ty][tx] === 'FLOOR') {
            tiles[ty][tx] = 'TRAP';
        }
    }

    // Place doors at corridor entrances (simplified)
    for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
            if (tiles[y][x] === 'FLOOR') {
                const horizDoor = tiles[y][x - 1] === 'WALL' && tiles[y][x + 1] === 'WALL' && tiles[y - 1][x] === 'FLOOR' && tiles[y + 1][x] === 'FLOOR';
                const vertDoor = tiles[y - 1][x] === 'WALL' && tiles[y + 1][x] === 'WALL' && tiles[y][x - 1] === 'FLOOR' && tiles[y][x + 1] === 'FLOOR';
                if ((horizDoor || vertDoor) && rng() < 0.25) {
                    tiles[y][x] = 'DOOR';
                }
            }
        }
    }

    // Spawn enemies — denser than before so floors feel populated
    const enemies: EnemyState[] = [];
    const enemyCount = 7 + Math.floor(floor * 0.8 + rng() * 7);
    const pool = getEnemyPool(floor);

    for (let i = 0; i < enemyCount; i++) {
        const room = rooms[1 + Math.floor(rng() * (rooms.length - 1))];
        const ex = room.x + 1 + Math.floor(rng() * (room.w - 2));
        const ey = room.y + 1 + Math.floor(rng() * (room.h - 2));
        if (tiles[ey][ex] === 'FLOOR') {
            const type = pool[Math.floor(rng() * pool.length)];
            const enemy = createEnemy(type, ex, ey, floor, false);

            // Roll for elite modifier
            const elite = rollEliteModifier(floor);
            if (elite) {
                enemy.isElite = true;
                enemy.eliteModifier = elite.modifier;
                enemy.eliteColor = elite.color;
                enemy.eliteName = elite.name;
                enemy.eliteXpMult = elite.xpMult;
                enemy.eliteGoldMult = elite.goldMult;
                // Apply stat multipliers
                enemy.hp = Math.floor(enemy.hp * elite.statMult.hp);
                enemy.maxHp = enemy.hp;
                enemy.atk = Math.floor(enemy.atk * elite.statMult.atk);
                enemy.def = Math.floor(enemy.def * elite.statMult.def);
                enemy.spd = enemy.spd * elite.statMult.spd;
                enemy.xpReward = Math.floor(enemy.xpReward * elite.xpMult);
                enemy.aggroRange = Math.min(12, enemy.aggroRange + 2);
            }

            enemies.push(enemy);
        }
    }

    // Boss every 10 floors — spawned here, then relocated into its arena below
    if (floor % 10 === 0 && rooms.length > 1) {
        const bossRoom = rooms[rooms.length - 1];
        const bc = getRoomCenter(bossRoom);
        const bx = Math.min(bc.x + 2, bossRoom.x + bossRoom.w - 2);
        const by = bc.y;
        const def = getBossDef(floor);
        const bossPool = getEnemyPool(floor);
        const bossType = def ? def.baseType : bossPool[bossPool.length - 1];
        const boss = createEnemy(bossType, bx, by, floor, true);
        if (def) {
            boss.hp = Math.floor(boss.hp * def.hpMult);
            boss.maxHp = boss.hp;
            boss.atk = Math.floor(boss.atk * def.atkMult);
        }
        enemies.push(boss);
    }

    // Spawn NPCs (one per floor, random type)
    const npcs: NPCState[] = [];
    if (rooms.length > 2 && rng() < 0.4) {
        const npcRoom = rooms[1 + Math.floor(rng() * (rooms.length - 2))];
        const nc = getRoomCenter(npcRoom);
        const npcTypes: NPCType[] = ['merchant', 'healer', 'sage'];
        const npcType = npcTypes[Math.floor(rng() * npcTypes.length)];
        npcs.push(createNPC(npcType, nc.x, nc.y, floor));
    }

    const explored = createBoolGrid(w, h, false);
    const visible = createBoolGrid(w, h, false);

    // ===== SECRET ROOMS =====
    let hasSecretRoom = false;
    if (rooms.length > 3 && rng() < 0.3 + floor * 0.005) {
        // Create a small secret room off the side of an existing room
        const sourceRoom = rooms[1 + Math.floor(rng() * (rooms.length - 2))];
        const side = Math.floor(rng() * 4); // 0=top, 1=bottom, 2=left, 3=right
        let sx: number, sy: number, sw = 3, sh = 3;

        switch (side) {
            case 0: sx = sourceRoom.x + 1; sy = sourceRoom.y - sh - 1; break;
            case 1: sx = sourceRoom.x + 1; sy = sourceRoom.y + sourceRoom.h + 1; break;
            case 2: sx = sourceRoom.x - sw - 1; sy = sourceRoom.y + 1; break;
            default: sx = sourceRoom.x + sourceRoom.w + 1; sy = sourceRoom.y + 1; break;
        }

        // Check bounds
        if (sx > 1 && sy > 1 && sx + sw < w - 1 && sy + sh < h - 1) {
            // Carve secret room
            for (let ry = sy; ry < sy + sh; ry++) {
                for (let rx = sx; rx < sx + sw; rx++) {
                    tiles[ry][rx] = 'FLOOR';
                }
            }
            // Place a secret wall (breakable) connecting to source room
            let doorX: number, doorY: number;
            switch (side) {
                case 0: doorX = sx + 1; doorY = sy + sh; break;
                case 1: doorX = sx + 1; doorY = sy - 1; break;
                case 2: doorX = sx + sw; doorY = sy + 1; break;
                default: doorX = sx - 1; doorY = sy + 1; break;
            }
            if (doorX > 0 && doorY > 0 && doorX < w - 1 && doorY < h - 1) {
                tiles[doorY][doorX] = 'SECRET_WALL';
                // Place a chest in the secret room
                const cx = sx + Math.floor(sw / 2);
                const cy = sy + Math.floor(sh / 2);
                tiles[cy][cx] = 'CHEST';
                chests.push({ x: cx, y: cy, opened: false });
                hasSecretRoom = true;
            }
        }
    }

    // ===== TRAP ROOM (occasional special floor) =====
    let isTrapRoom = false;
    if (floor > 5 && floor % 10 !== 0 && rng() < 0.15) {
        // Add spike traps to a random room
        const trapRoom = rooms[1 + Math.floor(rng() * Math.max(1, rooms.length - 2))];
        for (let ry = trapRoom.y + 1; ry < trapRoom.y + trapRoom.h - 1; ry++) {
            for (let rx = trapRoom.x + 1; rx < trapRoom.x + trapRoom.w - 1; rx++) {
                if (tiles[ry][rx] === 'FLOOR' && rng() < 0.4) {
                    tiles[ry][rx] = 'SPIKES';
                }
            }
        }
        isTrapRoom = true;
    }

    // Biome
    const biome = getBiome(floor);

    const result: DungeonFloor = {
        width: w, height: h, tiles, rooms, explored, visible,
        enemies, npcs, items: [] as DroppedItem[], stairsDown, stairsUp, chests,
        biome: biome.name,
        hasSecretRoom,
        isTrapRoom,
    };

    // Boss floors get a purpose-built arena grafted onto the south edge
    if (floor % 10 === 0) {
        const arena = carveBossArena(result, floor, rng);
        if (arena) result.arena = arena;
    }

    return result;
}

export function isWalkable(tiles: TileType[][], x: number, y: number): boolean {
    if (y < 0 || y >= tiles.length || x < 0 || x >= tiles[0].length) return false;
    const t = tiles[y][x];
    return t !== 'WALL' && t !== 'WATER' && t !== 'BUILDING' && t !== 'TREE' && t !== 'SECRET_WALL'
        && t !== 'PILLAR' && t !== 'BOSS_GATE_SEALED' && t !== 'FORGE' && t !== 'ANVIL'
        // World props block until they are dealt with
        && t !== 'RUBBLE' && t !== 'BRIDGE_BROKEN' && t !== 'PORTAL_BROKEN' && t !== 'RUSH_GATE'
        // City scenery
        && t !== 'CITY_BUILDING' && t !== 'LAMP' && t !== 'PLANTER';
}

export function generateTown(unlocks?: { landslide: boolean; bridge: boolean }): DungeonFloor {
    const w = 56, h = 44;
    const tiles = createGrid(w, h, 'GRASS');
    // Border of trees
    for (let x = 0; x < w; x++) { tiles[0][x] = 'TREE'; tiles[h - 1][x] = 'TREE'; }
    for (let y = 0; y < h; y++) { tiles[y][0] = 'TREE'; tiles[y][w - 1] = 'TREE'; }
    // Extra trees in corners
    for (let i = 1; i < 4; i++) { tiles[1][i] = 'TREE'; tiles[1][w - 1 - i] = 'TREE'; tiles[h - 2][i] = 'TREE'; tiles[h - 2][w - 1 - i] = 'TREE'; }

    // ===== RIVER =====
    // A river runs top-to-bottom down the east side of town, well clear of the
    // smithy. It meanders slightly so it doesn't read as a canal.
    const riverBank: number[] = [];
    for (let y = 1; y < h - 1; y++) {
        const cx = 29 + Math.round(Math.sin(y * 0.45) * 1.2);
        riverBank[y] = cx;
        for (let x = cx - 1; x <= cx + 1; x++) {
            if (x > 0 && x < w - 1) tiles[y][x] = 'WATER';
        }
    }
    // Fishing spots along the bank
    for (const fy of [6, 11, 17, 22]) {
        tiles[fy][riverBank[fy]] = 'FISH_SPOT';
    }
    // Bridge across the river on the main east-west road
    for (let x = riverBank[13] - 2; x <= riverBank[13] + 2; x++) {
        if (x > 0 && x < w - 1) { tiles[13][x] = 'BRIDGE'; tiles[14][x] = 'BRIDGE'; }
    }

    // Main path (cross shape)
    for (let x = 4; x < riverBank[13] - 2; x++) { tiles[13][x] = 'PATH'; tiles[14][x] = 'PATH'; }
    for (let y = 4; y < h - 4; y++) { tiles[y][15] = 'PATH'; tiles[y][16] = 'PATH'; }
    // Entry point at bottom
    tiles[h - 2][15] = 'PATH'; tiles[h - 2][16] = 'PATH';
    tiles[h - 1][15] = 'PATH'; tiles[h - 1][16] = 'PATH';

    // Cook shop (top left building, 5x4)
    for (let y = 4; y < 8; y++) for (let x = 4; x < 9; x++) tiles[y][x] = 'BUILDING';
    tiles[7][6] = 'PATH'; // door
    // Flowers around cook
    tiles[8][4] = 'FLOWER'; tiles[8][5] = 'FLOWER'; tiles[8][8] = 'FLOWER';

    // Fish shop (top right, beside the river)
    for (let y = 4; y < 8; y++) for (let x = 21; x < 26; x++) tiles[y][x] = 'BUILDING';
    tiles[7][23] = 'PATH'; // door
    for (let y = 8; y < 14; y++) { tiles[y][23] = 'PATH'; }

    // Farm shop (left side building)
    for (let y = 17; y < 21; y++) for (let x = 4; x < 9; x++) tiles[y][x] = 'BUILDING';
    tiles[17][6] = 'PATH'; // door
    // Farm crop plots
    for (let y = 22; y < 25; y++) for (let x = 4; x < 12; x++) tiles[y][x] = 'CROP';
    // Flowers and decorations
    tiles[10][8] = 'FLOWER'; tiles[10][20] = 'FLOWER';
    tiles[12][10] = 'FLOWER'; tiles[12][19] = 'FLOWER';
    // Fence around farm (with gate opening)
    for (let x = 3; x < 13; x++) tiles[21][x] = 'FENCE';
    tiles[21][7] = 'PATH'; tiles[21][8] = 'PATH'; // Farm gate
    for (let x = 3; x < 13; x++) tiles[25][x] = 'FENCE';
    for (let y = 21; y < 26; y++) { tiles[y][3] = 'FENCE'; tiles[y][12] = 'FENCE'; }
    // Path leading to farm gate
    for (let y = 14; y < 22; y++) { tiles[y][7] = 'PATH'; tiles[y][8] = 'PATH'; }

    // ===== SMITHY (dry ground, no water anywhere near it) =====
    // Workshop building
    for (let y = 21; y < 26; y++) for (let x = 19; x < 26; x++) tiles[y][x] = 'BUILDING';
    tiles[21][22] = 'PATH'; // door

    // Open-air working yard in front of the workshop
    for (let y = 17; y < 21; y++) for (let x = 18; x < 27; x++) tiles[y][x] = 'PATH';
    // The forge hearth against the workshop wall, with the anvil in front of it
    tiles[17][20] = 'FORGE';
    tiles[17][21] = 'FORGE';
    tiles[19][21] = 'ANVIL';
    // Quench barrel and rack flank the anvil
    tiles[19][24] = 'FENCE';
    tiles[17][25] = 'FENCE';
    // Road from the crossroads to the yard
    for (let y = 14; y < 18; y++) { tiles[y][19] = 'PATH'; tiles[y][20] = 'PATH'; }

    // ===================================================================
    // THE LOWER TOWN — everything south of the old map edge
    // ===================================================================

    // South road continuing from the crossroads down to the new district
    for (let y = 14; y < h - 2; y++) { tiles[y][15] = 'PATH'; tiles[y][16] = 'PATH'; }

    // --- Market row (west side) ---
    for (let y = 29; y < 34; y++) for (let x = 5; x < 12; x++) tiles[y][x] = 'BUILDING';
    tiles[33][8] = 'PATH';
    for (let y = 34; y < 38; y++) { tiles[y][8] = 'PATH'; }
    for (let x = 8; x < 16; x++) { tiles[37][x] = 'PATH'; tiles[38][x] = 'PATH'; }
    // Market stalls and planters
    tiles[35][5] = 'FENCE'; tiles[35][6] = 'FENCE'; tiles[35][11] = 'FENCE';
    tiles[28][6] = 'FLOWER'; tiles[28][10] = 'FLOWER'; tiles[36][12] = 'FLOWER';

    // --- Wooded common (south) ---
    for (const [tx, ty] of [[4, 40], [7, 41], [11, 40], [19, 41], [23, 40], [12, 27], [3, 33]] as number[][]) {
        if (ty < h - 1 && tx < w - 1) tiles[ty][tx] = 'TREE';
    }

    // --- Landslide: a spill of rock burying the east road to the colosseum ---
    // Two tiles thick so it reads as a wall of debris, not a pebble.
    const slideY = 30;
    for (let x = 20; x < 27; x++) {
        tiles[slideY][x] = 'RUBBLE';
        tiles[slideY + 1][x] = 'RUBBLE';
    }
    // Road approaching the slide from the crossroads
    for (let y = 26; y < slideY; y++) { tiles[y][22] = 'PATH'; tiles[y][23] = 'PATH'; }
    // Road beyond it, up to the colosseum gate
    for (let y = slideY + 2; y < 36; y++) { tiles[y][22] = 'PATH'; tiles[y][23] = 'PATH'; }

    // --- Colosseum (boss rush) at the far south-east ---
    for (let y = 36; y < 42; y++) for (let x = 18; x < 28; x++) tiles[y][x] = 'BUILDING';
    tiles[36][22] = 'RUSH_GATE';
    tiles[36][23] = 'RUSH_GATE';
    // Banner posts flanking the gate
    tiles[35][20] = 'FENCE'; tiles[35][25] = 'FENCE';

    // If the landslide is already cleared, the road is open
    if (unlocks?.landslide) {
        for (let x = 20; x < 27; x++) {
            tiles[slideY][x] = 'PATH';
            tiles[slideY + 1][x] = 'PATH';
        }
    }

    // --- The broken bridge on the far bank, north-east ---
    // It reaches out over the river and stops in mid-air.
    const bridgeY = 8;
    const bankX = riverBank[bridgeY];
    for (let x = bankX - 3; x <= bankX + 3; x++) {
        if (x > 0 && x < w - 1) {
            tiles[bridgeY][x] = unlocks?.bridge ? 'BRIDGE' : 'BRIDGE_BROKEN';
        }
    }
    // Approach path from the fish shop road
    for (let x = 24; x < bankX - 2; x++) tiles[bridgeY][x] = 'PATH';
    for (let y = bridgeY; y < 14; y++) tiles[y][25] = 'PATH';
    // Once repaired, the far side has a road running to the Underworld stair
    if (unlocks?.bridge) {
        for (let x = bankX + 4; x < w - 4; x++) tiles[bridgeY][x] = 'PATH';
        tiles[bridgeY][w - 4] = 'STAIRS_DOWN';   // the descent into Dungeon 2
    } else {
        // Otherwise the far bank is just overgrown
        for (const ty of [bridgeY - 1, bridgeY + 1, bridgeY + 2]) {
            for (let x = bankX + 4; x < w - 3; x += 3) {
                if (ty > 0 && ty < h - 1) tiles[ty][x] = 'TREE';
            }
        }
    }

    // Stairs back to dungeon 1 (entry point)
    const stairsUp: Position = { x: 15, y: h - 3 };
    tiles[stairsUp.y][stairsUp.x] = 'STAIRS_DOWN';
    const stairsDown: Position = { x: 16, y: h - 3 };
    tiles[h - 3][16] = 'PATH';
    // NPCs
    const npcs: NPCState[] = [
        createNPC('cook', 6, 9, 0),
        createNPC('fishmonger', 23, 9, 0),
        createNPC('farmer', 6, 16, 0),
        createNPC('healer', 14, 12, 0),
        createNPC('merchant', 18, 12, 0),
        createNPC('sage', 16, 10, 0),
        createNPC('blacksmith', 22, 19, 0),
        // Lower town gets its own traders
        createNPC('merchant', 9, 35, 0),
        createNPC('healer', 13, 37, 0),
    ];
    const explored = createBoolGrid(w, h, true);
    const visible = createBoolGrid(w, h, true);
    return {
        width: w, height: h, tiles, rooms: [], explored, visible,
        enemies: [], npcs, items: [], stairsDown, stairsUp, chests: [],
        isTown: true,
        region: 'town',
    };
}

// ===================================================================
// THE CITY — reached with a City Scroll once the hub portal is repaired
// ===================================================================
/** The City smith trades in rare and epic goods and runs the master forge. */
function createCityBlacksmith(x: number, y: number): NPCState {
    const npc = createNPC('blacksmith', x, y, 0);
    npc.name = 'Master Smith Aurel';
    npc.dialog = [
        {
            text: '🏙️ City work. Rare steel, epic commissions, and a forge that takes a piece to +4 without breaking a sweat. What do you need?',
            options: [
                { label: "Guardsman's Blade (400g)", action: 'buy_guardsman', cost: 400, itemId: 'guardsman_blade' },
                { label: "Duelist's Rapier (430g)", action: 'buy_rapier', cost: 430, itemId: 'duelist_rapier' },
                { label: 'Civic Plate (780g)', action: 'buy_civic_plate', cost: 780, itemId: 'civic_plate' },
                { label: 'Epic commissions...', action: 'next' },
            ],
        },
        {
            text: 'Epic work — and if you carry a Limit Breaker, I can take a piece past +4. That is MYTHIC, and nowhere else can do it.',
            options: [
                { label: 'Clocksprung Bow (820g)', action: 'buy_clockbow', cost: 820, itemId: 'clocksprung_bow' },
                { label: "Lamplighter's Staff (850g)", action: 'buy_lampstaff', cost: 850, itemId: 'lamplighters_staff' },
                { label: "Magistrate's Maul (900g)", action: 'buy_maul', cost: 900, itemId: 'magistrates_maul' },
                { label: 'Signet of Office (700g)', action: 'buy_signet', cost: 700, itemId: 'signet_of_office' },
                { label: '🔥 THE MASTER FORGE', action: 'open_city_forge' },
                { label: '⚔️ Sell me your gear', action: 'sell_gear' },
                { label: '◀ Back', action: 'prev' },
                { label: 'Leave', action: 'close' },
            ],
        },
    ];
    return npc;
}

export function generateCity(): DungeonFloor {
    const w = 44, h = 34;
    const tiles = createGrid(w, h, 'CITY_FLOOR');

    // Outer wall of buildings
    for (let x = 0; x < w; x++) { tiles[0][x] = 'CITY_BUILDING'; tiles[h - 1][x] = 'CITY_BUILDING'; }
    for (let y = 0; y < h; y++) { tiles[y][0] = 'CITY_BUILDING'; tiles[y][w - 1] = 'CITY_BUILDING'; }

    // City blocks — a grid, because someone planned this place
    const block = (bx: number, by: number, bw: number, bh: number, doorX: number) => {
        for (let y = by; y < by + bh; y++) {
            for (let x = bx; x < bx + bw; x++) {
                if (y > 0 && y < h - 1 && x > 0 && x < w - 1) tiles[y][x] = 'CITY_BUILDING';
            }
        }
        if (by + bh < h - 1) tiles[by + bh - 1][doorX] = 'CITY_FLOOR';
    };
    block(3, 3, 8, 6, 6);
    block(15, 3, 9, 6, 19);
    block(28, 3, 12, 6, 33);
    block(3, 14, 8, 7, 6);
    block(28, 14, 12, 7, 33);
    block(3, 26, 10, 5, 7);
    block(18, 26, 10, 5, 22);
    block(32, 26, 8, 5, 35);

    // Boulevards: wide central avenue and a cross street
    for (let y = 1; y < h - 1; y++) { tiles[y][12] = 'CITY_FLOOR'; tiles[y][13] = 'CITY_FLOOR'; tiles[y][14] = 'CITY_FLOOR'; }
    for (let x = 1; x < w - 1; x++) { tiles[11][x] = 'CITY_FLOOR'; tiles[12][x] = 'CITY_FLOOR'; tiles[23][x] = 'CITY_FLOOR'; }

    // Street lamps down the avenue and along the cross street
    for (let y = 4; y < h - 3; y += 5) { tiles[y][11] = 'LAMP'; tiles[y + 2][15] = 'LAMP'; }
    for (let x = 6; x < w - 4; x += 7) { tiles[10][x] = 'LAMP'; tiles[24][x] = 'LAMP'; }

    // Planters and a small civic square
    for (const [px, py] of [[17, 13], [20, 13], [17, 21], [20, 21], [26, 13], [26, 21]] as number[][]) {
        tiles[py][px] = 'PLANTER';
    }

    // The master smithy: a proper workshop with a double hearth
    for (let y = 15; y < 21; y++) for (let x = 17; x < 25; x++) tiles[y][x] = 'CITY_BUILDING';
    tiles[20][20] = 'CITY_FLOOR';
    tiles[14][19] = 'FORGE';
    tiles[14][20] = 'FORGE';
    tiles[14][21] = 'FORGE';
    tiles[16][20] = 'ANVIL';

    // Return portal home, at the top of the avenue
    tiles[2][13] = 'PORTAL';

    const stairsUp: Position = { x: 13, y: 3 };
    const stairsDown: Position = { x: 13, y: 3 };

    const npcs: NPCState[] = [
        createCityBlacksmith(20, 13),
        createNPC('merchant', 8, 12, 0),
        createNPC('healer', 31, 12, 0),
        createNPC('sage', 13, 24, 0),
        createNPC('cook', 22, 24, 0),
        createNPC('fishmonger', 35, 24, 0),
    ];

    const explored = createBoolGrid(w, h, true);
    const visible = createBoolGrid(w, h, true);
    return {
        width: w, height: h, tiles, rooms: [], explored, visible,
        enemies: [], npcs, items: [], stairsDown, stairsUp, chests: [],
        isTown: true,
        region: 'city',
    };
}
