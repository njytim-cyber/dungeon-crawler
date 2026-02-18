// ===== DUNGEON GENERATOR =====
// BSP-based procedural dungeon generation

import type { TileType, Room, DungeonFloor, EnemyState, NPCState, Position, ChestState, DroppedItem, EnemyType, NPCType, DialogNode } from './types';
import { getItemsByFloor } from './items';
import { getBiome } from './biomes';
import { rollEliteModifier } from './systems';

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
    ['slime', 'bat'],                          // 1-10
    ['slime', 'bat', 'goblin', 'skeleton'],    // 11-20
    ['goblin', 'skeleton', 'spider'],          // 21-30
    ['skeleton', 'spider', 'orc'],             // 31-40
    ['spider', 'orc', 'ghost'],               // 41-50
    ['orc', 'ghost', 'wraith'],               // 51-60
    ['ghost', 'wraith', 'golem'],             // 61-70
    ['wraith', 'golem', 'demon'],             // 71-80
    ['golem', 'demon', 'drake'],              // 81-90
    ['demon', 'drake', 'lich'],               // 91-100
];

function getEnemyPool(floor: number): EnemyType[] {
    const idx = Math.min(Math.floor((floor - 1) / 10), ENEMY_POOL_BY_DEPTH.length - 1);
    return ENEMY_POOL_BY_DEPTH[idx];
}

function createEnemy(type: EnemyType, x: number, y: number, floor: number, isBoss: boolean): EnemyState {
    const scale = 1 + floor * 0.08;
    const baseStats: Record<EnemyType, { hp: number; atk: number; def: number; spd: number; xp: number }> = {
        slime: { hp: 15, atk: 3, def: 1, spd: 0.5, xp: 5 },
        bat: { hp: 10, atk: 4, def: 0, spd: 1.2, xp: 4 },
        skeleton: { hp: 25, atk: 6, def: 3, spd: 0.6, xp: 10 },
        goblin: { hp: 20, atk: 5, def: 2, spd: 0.8, xp: 8 },
        spider: { hp: 18, atk: 7, def: 2, spd: 1.0, xp: 12 },
        ghost: { hp: 30, atk: 8, def: 4, spd: 0.7, xp: 15 },
        orc: { hp: 40, atk: 10, def: 6, spd: 0.5, xp: 20 },
        wraith: { hp: 35, atk: 12, def: 3, spd: 0.9, xp: 25 },
        golem: { hp: 60, atk: 14, def: 12, spd: 0.3, xp: 35 },
        demon: { hp: 50, atk: 16, def: 8, spd: 0.7, xp: 40 },
        drake: { hp: 70, atk: 18, def: 10, spd: 0.6, xp: 50 },
        lich: { hp: 55, atk: 20, def: 6, spd: 0.8, xp: 60 },
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
                text: `Welcome, adventurer! I have wares for you.`, options: [
                    { label: 'Health Potion (10g)', action: 'buy_hp', cost: 10, itemId: 'health_potion' },
                    { label: 'Greater Potion (30g)', action: 'buy_greater_hp', cost: 30, itemId: 'greater_health' },
                    { label: 'Escape Scroll (40g)', action: 'buy_escape', cost: 40, itemId: 'escape_scroll' },
                    { label: 'Leave', action: 'close' },
                ]
            },
        ],
        healer: [
            { text: 'You look weary, traveler. Let me restore your strength.', options: [{ label: 'Heal me (free)', action: 'heal' }, { label: 'Leave', action: 'close' }] },
        ],
        sage: [
            { text: `You have reached floor ${floor}. ${floor < 50 ? 'The deeper you go, the stronger the enemies.' : 'Few have ventured this deep.'}`, options: [{ label: 'Any advice?', action: 'hint' }, { label: 'Leave', action: 'close' }] },
        ],
        cook: [
            {
                text: 'Welcome to my kitchen! I cook food that gives you special powers. What would you like?', options: [
                    { label: 'Bread (5g)', action: 'buy_bread', cost: 5, itemId: 'food_bread' },
                    { label: 'Meat Stew (25g)', action: 'buy_stew', cost: 25, itemId: 'food_stew' },
                    { label: 'Iron Soup (25g)', action: 'buy_soup', cost: 25, itemId: 'food_soup' },
                    { label: 'Speed Salad (20g)', action: 'buy_salad', cost: 20, itemId: 'food_salad' },
                    { label: 'More food...', action: 'next' },
                ]
            },
            {
                text: 'Here are my specialty dishes!', options: [
                    { label: 'Golden Pie (50g)', action: 'buy_pie', cost: 50, itemId: 'food_pie' },
                    { label: 'Berry Smoothie (30g)', action: 'buy_smoothie', cost: 30, itemId: 'food_smoothie' },
                    { label: 'Battle Cookie (40g)', action: 'buy_cookie', cost: 40, itemId: 'food_cookie' },
                    { label: "Scholar's Tea (60g)", action: 'buy_tea', cost: 60, itemId: 'food_tea' },
                    { label: 'Dragon Feast (100g)', action: 'buy_feast', cost: 100, itemId: 'food_feast' },
                    { label: 'Leave', action: 'close' },
                ]
            },
        ],
        fishmonger: [
            {
                text: 'Ahoy! Want a fishing rod? Head to the pond south side to fish. Fish heal and give buffs!', options: [
                    { label: 'Buy Fishing Rod (50g)', action: 'buy_rod', cost: 50, itemId: 'fishing_rod' },
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
                    { label: 'Golden Seed (20g)', action: 'buy_golden_seed', cost: 20, itemId: 'golden_seed' },
                    { label: 'Dragon Seed (50g)', action: 'buy_dragon_seed', cost: 50, itemId: 'dragon_seed' },
                    { label: 'Leave', action: 'close' },
                ]
            },
        ],
        blacksmith: [
            {
                text: '⚒️ Welcome to the forge! I sell weapons and can FORGE two weapons into one mighty creation! What\'ll it be?', options: [
                    { label: 'Iron Sword (30g)', action: 'buy_iron_sword', cost: 30, itemId: 'iron_sword' },
                    { label: 'Short Bow (25g)', action: 'buy_short_bow', cost: 25, itemId: 'short_bow' },
                    { label: 'Bone Axe (20g)', action: 'buy_bone_axe', cost: 20, itemId: 'bone_axe' },
                    { label: 'More weapons...', action: 'next' },
                ]
            },
            {
                text: '⚒️ My finer wares! Or step up to the forge and combine two weapons into something powerful!', options: [
                    { label: 'Steel Sword (80g)', action: 'buy_steel_sword', cost: 80, itemId: 'steel_sword' },
                    { label: 'War Axe (90g)', action: 'buy_war_axe', cost: 90, itemId: 'war_axe' },
                    { label: 'Long Bow (75g)', action: 'buy_long_bow', cost: 75, itemId: 'long_bow' },
                    { label: '🔥 OPEN THE FORGE!', action: 'open_forge' },
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

    // Spawn enemies
    const enemies: EnemyState[] = [];
    const enemyCount = 3 + Math.floor(floor * 0.5 + rng() * 5);
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

    // Boss every 10 floors
    if (floor % 10 === 0 && rooms.length > 1) {
        const bossRoom = rooms[rooms.length - 1];
        const bc = getRoomCenter(bossRoom);
        // Boss is placed near stairs down
        const bx = Math.min(bc.x + 2, bossRoom.x + bossRoom.w - 2);
        const by = bc.y;
        if (tiles[by][bx] === 'FLOOR') {
            const bossPool = getEnemyPool(floor);
            const bossType = bossPool[bossPool.length - 1]; // strongest type for this range
            enemies.push(createEnemy(bossType, bx, by, floor, true));
        }
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

    return {
        width: w, height: h, tiles, rooms, explored, visible,
        enemies, npcs, items: [] as DroppedItem[], stairsDown, stairsUp, chests,
        biome: biome.name,
        hasSecretRoom,
        isTrapRoom,
    };
}

export function isWalkable(tiles: TileType[][], x: number, y: number): boolean {
    if (y < 0 || y >= tiles.length || x < 0 || x >= tiles[0].length) return false;
    const t = tiles[y][x];
    return t !== 'WALL' && t !== 'WATER' && t !== 'BUILDING' && t !== 'TREE' && t !== 'SECRET_WALL';
}

export function generateTown(): DungeonFloor {
    const w = 32, h = 28;
    const tiles = createGrid(w, h, 'GRASS');
    // Border of trees
    for (let x = 0; x < w; x++) { tiles[0][x] = 'TREE'; tiles[h - 1][x] = 'TREE'; }
    for (let y = 0; y < h; y++) { tiles[y][0] = 'TREE'; tiles[y][w - 1] = 'TREE'; }
    // Extra trees in corners
    for (let i = 1; i < 4; i++) { tiles[1][i] = 'TREE'; tiles[1][w - 1 - i] = 'TREE'; tiles[h - 2][i] = 'TREE'; tiles[h - 2][w - 1 - i] = 'TREE'; }
    // Main path (cross shape)
    for (let x = 4; x < w - 4; x++) { tiles[13][x] = 'PATH'; tiles[14][x] = 'PATH'; }
    for (let y = 4; y < h - 4; y++) { tiles[y][15] = 'PATH'; tiles[y][16] = 'PATH'; }
    // Entry point at bottom
    tiles[h - 2][15] = 'PATH'; tiles[h - 2][16] = 'PATH';
    tiles[h - 1][15] = 'PATH'; tiles[h - 1][16] = 'PATH';
    // Cook shop (top left building, 5x4)
    for (let y = 4; y < 8; y++) for (let x = 4; x < 9; x++) tiles[y][x] = 'BUILDING';
    tiles[7][6] = 'PATH'; // door
    // Flowers around cook
    tiles[8][4] = 'FLOWER'; tiles[8][5] = 'FLOWER'; tiles[8][8] = 'FLOWER';
    // Fish shop (top right building, 5x4)
    for (let y = 4; y < 8; y++) for (let x = 22; x < 27; x++) tiles[y][x] = 'BUILDING';
    tiles[7][24] = 'PATH'; // door
    // Fishing pond (right side, 6x4)
    for (let y = 16; y < 20; y++) for (let x = 22; x < 28; x++) tiles[y][x] = 'WATER';
    tiles[16][23] = 'FISH_SPOT'; tiles[16][25] = 'FISH_SPOT'; tiles[19][24] = 'FISH_SPOT';
    // Farm shop (left side building)
    for (let y = 17; y < 21; y++) for (let x = 4; x < 9; x++) tiles[y][x] = 'BUILDING';
    tiles[17][6] = 'PATH'; // door
    // Farm crop plots (left side, 3x4 grid of crops)
    for (let y = 22; y < 25; y++) for (let x = 4; x < 12; x++) tiles[y][x] = 'CROP';
    // Flowers and decorations
    tiles[10][8] = 'FLOWER'; tiles[10][22] = 'FLOWER';
    tiles[12][10] = 'FLOWER'; tiles[12][20] = 'FLOWER';
    // Fence around farm (with gate opening)
    for (let x = 3; x < 13; x++) tiles[21][x] = 'FENCE';
    tiles[21][7] = 'PATH'; tiles[21][8] = 'PATH'; // Farm gate
    for (let x = 3; x < 13; x++) tiles[25][x] = 'FENCE';
    for (let y = 21; y < 26; y++) { tiles[y][3] = 'FENCE'; tiles[y][12] = 'FENCE'; }
    // Path leading to farm gate
    for (let y = 14; y < 22; y++) { tiles[y][7] = 'PATH'; tiles[y][8] = 'PATH'; }

    // ===== BLACKSMITH BUILDING (bottom right, 7x5 — bigger!) =====
    for (let y = 20; y < 25; y++) for (let x = 20; x < 27; x++) tiles[y][x] = 'BUILDING';
    tiles[20][23] = 'PATH'; // door
    // Anvil marker next to building (just a path tile with anvil nearby)
    tiles[19][23] = 'PATH';
    tiles[19][22] = 'PATH'; tiles[19][24] = 'PATH';
    // Path connecting blacksmith to main road
    for (let y = 14; y < 20; y++) { tiles[y][23] = 'PATH'; tiles[y][24] = 'PATH'; }
    // Decorative fence around blacksmith
    tiles[25][20] = 'FENCE'; tiles[25][21] = 'FENCE'; tiles[25][22] = 'FENCE';
    tiles[25][24] = 'FENCE'; tiles[25][25] = 'FENCE'; tiles[25][26] = 'FENCE';

    // Stairs back to dungeon (entry point)
    const stairsUp: Position = { x: 15, y: h - 3 };
    tiles[stairsUp.y][stairsUp.x] = 'STAIRS_DOWN';
    const stairsDown: Position = { x: 16, y: h - 3 };
    // NPCs
    const npcs: NPCState[] = [
        createNPC('cook', 6, 9, 0),
        createNPC('fishmonger', 24, 9, 0),
        createNPC('farmer', 6, 16, 0),
        createNPC('healer', 14, 12, 0),
        createNPC('merchant', 18, 12, 0),
        createNPC('sage', 16, 10, 0),
        createNPC('blacksmith', 23, 18, 0),
    ];
    const explored = createBoolGrid(w, h, true);
    const visible = createBoolGrid(w, h, true);
    return {
        width: w, height: h, tiles, rooms: [], explored, visible,
        enemies: [], npcs, items: [], stairsDown, stairsUp, chests: [],
        isTown: true,
    };
}
