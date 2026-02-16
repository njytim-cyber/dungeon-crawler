// ===== SHARED TYPES =====

export type GameState = 'TITLE' | 'PLAYING' | 'INVENTORY' | 'DIALOG' | 'GAME_OVER' | 'VICTORY' | 'FISHING' | 'FARMING';

export type Direction = 0 | 1 | 2 | 3; // down, up, left, right

export type TileType = 'WALL' | 'FLOOR' | 'DOOR' | 'STAIRS_DOWN' | 'STAIRS_UP' | 'CHEST' | 'TRAP'
    | 'GRASS' | 'WATER' | 'PATH' | 'BUILDING' | 'FENCE' | 'CROP' | 'FISH_SPOT' | 'FLOWER' | 'TREE';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';

export type EquipSlot = 'weapon' | 'armor' | 'ring';

export type ItemCategory = 'weapon' | 'armor' | 'ring' | 'consumable' | 'key' | 'scroll' | 'food' | 'fish' | 'seed' | 'tool';

export type ClassName = 'warrior' | 'mage' | 'rogue' | 'paladin' | 'ranger' | 'necromancer' | 'berserker' | 'cleric' | 'assassin';

export type EnemyType = 'slime' | 'skeleton' | 'bat' | 'ghost' | 'goblin' | 'spider' | 'orc' | 'demon' | 'wraith' | 'golem' | 'drake' | 'lich';

export type NPCType = 'merchant' | 'healer' | 'sage' | 'cook' | 'fishmonger' | 'farmer';

export interface Position {
    x: number;
    y: number;
}

export interface Stats {
    hp: number;
    maxHp: number;
    atk: number;
    def: number;
    spd: number;
    critChance: number;
}

// Food buffs — temporary stat modifiers 
export interface FoodEffect {
    type: 'heal' | 'atk_boost' | 'def_boost' | 'spd_boost' | 'crit_boost' | 'maxhp_boost' | 'regen' | 'shield' | 'xp_boost';
    value: number;
    duration: number; // seconds, 0 = instant
}

export interface ActiveBuff {
    name: string;
    icon: string;
    effect: FoodEffect;
    remaining: number; // seconds left
}

export interface ItemDef {
    id: string;
    name: string;
    description: string;
    category: ItemCategory;
    rarity: Rarity;
    icon: string;       // key into Assets.getItem
    equipSlot?: EquipSlot;
    stats?: Partial<Stats>;
    healAmount?: number;
    foodEffects?: FoodEffect[];  // custom food effects
    stackable?: boolean;
    value: number;
}

export interface InventoryItem {
    def: ItemDef;
    count: number;
}

export interface Equipment {
    weapon: ItemDef | null;
    armor: ItemDef | null;
    ring: ItemDef | null;
}

// Farming crop state
export interface CropPlot {
    x: number;
    y: number;
    seedId: string;
    harvestId: string;       // item ID to produce when harvested
    growthStage: number;  // 0-3 (planted, sprout, growing, ready)
    growthTimer: number;  // seconds until next stage
    wateredToday: boolean;
}

export interface PlayerState {
    name: string;
    className: ClassName;
    x: number;
    y: number;
    px: number; // pixel position (lerp)
    py: number;
    dir: Direction;
    stats: Stats;
    baseStats: Stats;
    xp: number;
    xpToLevel: number;
    level: number;
    floor: number;
    gold: number;
    inventory: InventoryItem[];
    equipment: Equipment;
    hotbar: (InventoryItem | null)[];
    attackCooldown: number;
    invincibleTimer: number;
    moveTimer: number;
    animFrame: number;
    animTimer: number;
    keys: number;
    alive: boolean;
    totalKills: number;
    totalDamageDealt: number;
    totalFloorsCleared: number;
    maxReachedFloor: number;
    // Town features
    buffs: ActiveBuff[];
    fishCaught: number;
    cropsHarvested: number;
    crops: CropPlot[];
    hasFishingRod: boolean;
    hasWateringCan: boolean;
}

export interface EnemyState {
    type: EnemyType;
    x: number;
    y: number;
    px: number;
    py: number;
    hp: number;
    maxHp: number;
    atk: number;
    def: number;
    spd: number;
    moveTimer: number;
    animFrame: number;
    animTimer: number;
    alive: boolean;
    isBoss: boolean;
    bossFloor: number;
    aggroRange: number;
    dropTable: LootDrop[];
    xpReward: number;
}

export interface LootDrop {
    itemId: string;
    chance: number; // 0-1
}

export interface NPCState {
    type: NPCType;
    x: number;
    y: number;
    name: string;
    dialog: DialogNode[];
    currentDialog: number;
}

export interface DialogNode {
    text: string;
    options: DialogOption[];
}

export interface DialogOption {
    label: string;
    action: string; // 'close', 'heal', 'shop', 'next', 'hint', 'buy_*', 'fish', 'farm'
    cost?: number;
}

export interface Room {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface DungeonFloor {
    width: number;
    height: number;
    tiles: TileType[][];
    rooms: Room[];
    explored: boolean[][];
    visible: boolean[][];
    enemies: EnemyState[];
    npcs: NPCState[];
    items: DroppedItem[];
    stairsDown: Position;
    stairsUp: Position;
    chests: ChestState[];
    isTown?: boolean;
}

export interface DroppedItem {
    x: number;
    y: number;
    def: ItemDef;
    count: number;
}

export interface ChestState {
    x: number;
    y: number;
    opened: boolean;
}

export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    color: string;
    size: number;
    gravity: number;
}

export interface FloatingText {
    x: number;
    y: number;
    text: string;
    color: string;
    life: number;
    vy: number;
}

export interface SaveData {
    player: Partial<PlayerState>;
    floor: number;
    timestamp: number;
}

export interface ClassDef {
    name: ClassName;
    label: string;
    icon: string;
    description: string;
    baseStats: Stats;
}
