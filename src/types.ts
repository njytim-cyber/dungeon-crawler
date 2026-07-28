// ===== SHARED TYPES =====

export type GameState = 'TITLE' | 'PLAYING' | 'INVENTORY' | 'DIALOG' | 'GAME_OVER' | 'VICTORY' | 'FISHING' | 'FARMING';

export type Direction = 0 | 1 | 2 | 3; // down, up, left, right

export type TileType = 'WALL' | 'FLOOR' | 'DOOR' | 'STAIRS_DOWN' | 'STAIRS_UP' | 'CHEST' | 'TRAP'
    | 'GRASS' | 'WATER' | 'PATH' | 'BUILDING' | 'FENCE' | 'CROP' | 'FISH_SPOT' | 'FLOWER' | 'TREE'
    | 'SECRET_WALL' | 'SPIKES' | 'MOVING_TRAP'
    // Boss arenas
    | 'ARENA_FLOOR' | 'PILLAR' | 'BOSS_GATE' | 'BOSS_GATE_SEALED'
    // Town smithy
    | 'FORGE' | 'ANVIL' | 'BRIDGE'
    // World progression props
    | 'RUBBLE' | 'BRIDGE_BROKEN' | 'PORTAL' | 'PORTAL_BROKEN' | 'RUSH_GATE'
    // City
    | 'CITY_FLOOR' | 'CITY_BUILDING' | 'LAMP' | 'PLANTER';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export type EquipSlot = 'weapon' | 'armor' | 'ring';

export type ItemCategory = 'weapon' | 'armor' | 'ring' | 'consumable' | 'key' | 'scroll' | 'food' | 'fish' | 'seed' | 'tool';

export type ClassName = 'warrior' | 'mage' | 'rogue' | 'paladin' | 'ranger' | 'necromancer' | 'berserker' | 'cleric' | 'assassin';

export type EnemyType =
    // Original roster
    | 'slime' | 'skeleton' | 'bat' | 'ghost' | 'goblin' | 'spider' | 'orc' | 'demon' | 'wraith' | 'golem' | 'drake' | 'lich'
    // Expanded roster
    | 'rat' | 'kobold' | 'zombie' | 'cultist' | 'harpy' | 'gargoyle' | 'mimic' | 'banshee'
    | 'minotaur' | 'basilisk' | 'revenant' | 'hellhound' | 'shade' | 'troll' | 'wisp' | 'devourer';

export type NPCType = 'merchant' | 'healer' | 'sage' | 'cook' | 'fishmonger' | 'farmer' | 'blacksmith';

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

// ===== ELEMENTS & STATUS EFFECTS =====

export type Element = 'physical' | 'fire' | 'ice' | 'poison' | 'shadow' | 'holy' | 'lightning';

export type StatusKind = 'burn' | 'freeze' | 'poison' | 'bleed' | 'stun' | 'weaken';

export interface StatusEffect {
    kind: StatusKind;
    /** Seconds left */
    remaining: number;
    /** Damage per tick, or slow fraction for freeze */
    power: number;
    /** Seconds until the next tick */
    tick: number;
    /** Who applied it, for kill credit */
    fromPlayer: boolean;
}

export interface StatusDef {
    label: string;
    icon: string;
    color: string;
    /** Seconds between damage ticks (0 = no damage) */
    interval: number;
}

export const STATUS_DEFS: Record<StatusKind, StatusDef> = {
    burn: { label: 'Burning', icon: '🔥', color: '#ff7a33', interval: 0.7 },
    poison: { label: 'Poisoned', icon: '🧪', color: '#7ac74f', interval: 1.0 },
    bleed: { label: 'Bleeding', icon: '🩸', color: '#d23b3b', interval: 0.85 },
    freeze: { label: 'Frozen', icon: '❄️', color: '#7fd8ff', interval: 0 },
    stun: { label: 'Stunned', icon: '💫', color: '#ffd54f', interval: 0 },
    weaken: { label: 'Weakened', icon: '💀', color: '#a58ad0', interval: 0 },
};

export const ELEMENT_COLOR: Record<Element, string> = {
    physical: '#d8dee3',
    fire: '#ff7a33',
    ice: '#7fd8ff',
    poison: '#7ac74f',
    shadow: '#a97bff',
    holy: '#ffe9a8',
    lightning: '#ffe066',
};

/** A rolled modifier on a dropped item. */
export interface Affix {
    id: string;
    /** Shown before ("Vicious Sword") or after ("Sword of the Bear") */
    kind: 'prefix' | 'suffix';
    label: string;
    stats?: Partial<Stats>;
    element?: Element;
    /** Chance 0-1 to inflict this on hit */
    procChance?: number;
    procStatus?: StatusKind;
    procPower?: number;
    procDuration?: number;
    /** Relative value multiplier */
    value: number;
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
    isBossWeapon?: boolean;  // dropped by bosses
    isForged?: boolean;      // created at the forge
    /** Forge enchantment level. Hard cap 3; Limit Breakers push it to 5. */
    enchant?: number;
    /** Damage type this weapon deals */
    element?: Element;
    /** Rolled modifiers (see affixes.ts) */
    affixes?: Affix[];
    /** On-hit status application */
    procChance?: number;
    procStatus?: StatusKind;
    procPower?: number;
    procDuration?: number;
}

/** Normal enchant ceiling, and the absolute ceiling with Limit Breakers. */
export const ENCHANT_CAP = 3;
export const ENCHANT_CAP_BROKEN = 5;
/** The City's master smith works to a higher standard. */
export const ENCHANT_CAP_CITY = 4;

/** Where the player currently is. Drives forge rules and map rendering. */
export type Region = 'hub' | 'town' | 'city' | 'dungeon' | 'underworld' | 'rush';

/** Dungeon 2 lives at floors 101-150 so all existing floor logic still works. */
export const UNDERWORLD_START = 100;
export const UNDERWORLD_FLOORS = 50;
export const UNDERWORLD_END = UNDERWORLD_START + UNDERWORLD_FLOORS;

export function isUnderworld(floor: number): boolean {
    return floor > UNDERWORLD_START;
}

/** Display depth: floor 103 reads as "Underworld 3". */
export function displayDepth(floor: number): string {
    if (isUnderworld(floor)) return `Underworld ${floor - UNDERWORLD_START}`;
    return `Floor ${floor}`;
}

/** One-off world unlocks, persisted with the save. */
export interface WorldUnlocks {
    /** Landslide cleared — the colosseum is reachable */
    landslide: boolean;
    /** Broken bridge repaired — the Underworld is open */
    bridge: boolean;
    /** Hub portal repaired — permanent town access */
    portal: boolean;
    /** The City has been reached at least once */
    city: boolean;
}

export function defaultUnlocks(): WorldUnlocks {
    return { landslide: false, bridge: false, portal: false, city: false };
}

/** Live state for a boss-rush attempt. */
export interface BossRushState {
    active: boolean;
    /** Index into the rush roster */
    index: number;
    /** Seconds until the next boss is summoned */
    spawnTimer: number;
    kills: number;
    goldEarned: boolean;
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
    gameTime: number; // 0-1440 (minutes)
    day: number;      // Day counter
    crops: CropPlot[];
    hasFishingRod: boolean;
    hasWateringCan: boolean;
    // World progression
    unlocks: WorldUnlocks;
    /** Best boss-rush streak */
    bossRushBest: number;
    /** Active debuffs on the player */
    statuses: StatusEffect[];
    /** Class ability cooldown, seconds remaining */
    abilityCooldown: number;
    /** Where the player's dropped loot is waiting, if they died */
    corpse?: CorpseState | null;
    // Systems
    systems?: import('./systems').GameSystems;
}

/** Everything you dropped where you fell. One chance to get it back. */
export interface CorpseState {
    floor: number;
    x: number;
    y: number;
    gold: number;
    items: InventoryItem[];
    equipment: Equipment;
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
    // Elite system
    isElite?: boolean;
    eliteModifier?: string;
    eliteColor?: string;
    eliteName?: string;
    eliteXpMult?: number;
    eliteGoldMult?: number;
    _eliteRGB?: number[];  // cached parsed RGB for perf
    /** Active debuffs */
    statuses?: StatusEffect[];
    /** Set while frozen/stunned so the AI skips its turn */
    disabledTimer?: number;
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
    itemId?: string; // for shop rendering
}

export type RoomKind = 'plain' | 'library' | 'vault' | 'shrine' | 'ambush' | 'hoard';

export interface Room {
    x: number;
    y: number;
    w: number;
    h: number;
    /** Special room type, if any */
    kind?: RoomKind;
    /** Set once the room's one-time reward or event has fired */
    used?: boolean;
    /** Ambush rooms track their wave here */
    waveActive?: boolean;
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
    /** Which kind of place this map is */
    region?: Region;
    biome?: string;
    hasSecretRoom?: boolean;
    isTrapRoom?: boolean;
    /** Present on boss floors — the sealed chamber the boss is fought in */
    arena?: import('./arena').ArenaData;
    /** Live boss-fight state (phases, hazards, projectiles) */
    bossFight?: import('./arena').BossFightState;
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
    /** True once the lid is up — contents may still be waiting inside */
    opened: boolean;
    /** Rolled lazily the first time the chest is opened. Max 5 entries. */
    loot?: InventoryItem[];
    /** Gold still sitting in the chest */
    gold?: number;
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
