// ===== GAME SYSTEMS =====
// Bestiary, Achievements, Quests, NPC Hearts, Skills, Pet, Runes, Museum, Hardcore

import type { PlayerState, EnemyType } from './types';

// ==================
// BESTIARY
// ==================
export interface BestiaryEntry {
    type: EnemyType;
    kills: number;
    firstSeen: number; // floor
}

export interface BestiaryData {
    enemies: Record<string, BestiaryEntry>;
    itemsFound: string[]; // item IDs discovered
}

export function createBestiary(): BestiaryData {
    return { enemies: {}, itemsFound: [] };
}

export function recordKill(bestiary: BestiaryData, type: EnemyType, floor: number): void {
    if (!bestiary.enemies[type]) {
        bestiary.enemies[type] = { type, kills: 0, firstSeen: floor };
    }
    bestiary.enemies[type].kills++;
}

export function recordItemFound(bestiary: BestiaryData, itemId: string): void {
    if (!bestiary.itemsFound.includes(itemId)) {
        bestiary.itemsFound.push(itemId);
    }
}

const ENEMY_LORE: Record<string, { name: string; desc: string }> = {
    slime: { name: 'Slime', desc: 'A gelatinous creature. Weak but numerous in the upper floors.' },
    bat: { name: 'Cave Bat', desc: 'Blind flyers that navigate by echolocation. Fast but fragile.' },
    skeleton: { name: 'Skeleton', desc: 'Animated bones of fallen adventurers. Armed and dangerous.' },
    goblin: { name: 'Goblin', desc: 'Cunning scavengers who steal from the unwary.' },
    spider: { name: 'Giant Spider', desc: 'Venomous arachnid lurking in dark corners.' },
    ghost: { name: 'Ghost', desc: 'Lost souls bound to the dungeon by ancient curses.' },
    orc: { name: 'Orc', desc: 'Brutal warriors making their domain in the mid-floors.' },
    wraith: { name: 'Wraith', desc: 'Ethereal terrors that drain life force with each strike.' },
    golem: { name: 'Stone Golem', desc: 'Enchanted constructs guarding deep treasures.' },
    demon: { name: 'Demon', desc: 'Hellspawn drawn to the dungeon\'s dark energy.' },
    drake: { name: 'Drake', desc: 'Young dragon cousin. Breathes scorching fire.' },
    lich: { name: 'Lich', desc: 'Undead sorcerer of immense power. Commands the dead.' },
};

export function getEnemyLore(type: string) { return ENEMY_LORE[type]; }

// ==================
// ACHIEVEMENTS
// ==================
export interface Achievement {
    id: string;
    name: string;
    desc: string;
    icon: string;
    check: (p: PlayerState, systems: GameSystems) => boolean;
}

export interface GameSystems {
    bestiary: BestiaryData;
    achievements: string[];     // unlocked achievement IDs
    quests: QuestData;
    hearts: Record<string, number>; // npcType -> heart level 0-10
    skillPoints: number;
    skills: Record<string, number>; // skillId -> level
    pet: PetState | null;
    runes: RuneSlot[];
    museum: string[];           // artifact IDs deposited
    hardcore: boolean;
}

export function createGameSystems(): GameSystems {
    return {
        bestiary: createBestiary(),
        achievements: [],
        quests: createQuestData(),
        hearts: {},
        skillPoints: 0,
        skills: {},
        pet: null,
        runes: [],
        museum: [],
        hardcore: false,
    };
}

const ALL_ACHIEVEMENTS: Achievement[] = [
    {
        id: 'first_blood', name: 'First Blood', desc: 'Defeat your first enemy.', icon: '⚔️',
        check: (p) => p.totalKills >= 1
    },
    {
        id: 'slayer_10', name: 'Slayer', desc: 'Defeat 10 enemies.', icon: '💀',
        check: (p) => p.totalKills >= 10
    },
    {
        id: 'slayer_100', name: 'Centurion', desc: 'Defeat 100 enemies.', icon: '🏆',
        check: (p) => p.totalKills >= 100
    },
    {
        id: 'slayer_500', name: 'Warlord', desc: 'Defeat 500 enemies.', icon: '👑',
        check: (p) => p.totalKills >= 500
    },
    {
        id: 'floor_10', name: 'Delver', desc: 'Reach Floor 10.', icon: '⬇️',
        check: (p) => p.maxReachedFloor >= 10
    },
    {
        id: 'floor_25', name: 'Deep Explorer', desc: 'Reach Floor 25.', icon: '🗺️',
        check: (p) => p.maxReachedFloor >= 25
    },
    {
        id: 'floor_50', name: 'Abyssal Diver', desc: 'Reach Floor 50.', icon: '🌊',
        check: (p) => p.maxReachedFloor >= 50
    },
    {
        id: 'floor_100', name: 'Dungeon Master', desc: 'Reach Floor 100.', icon: '🎖️',
        check: (p) => p.maxReachedFloor >= 100
    },
    {
        id: 'level_10', name: 'Seasoned', desc: 'Reach Level 10.', icon: '⭐',
        check: (p) => p.level >= 10
    },
    {
        id: 'level_25', name: 'Veteran', desc: 'Reach Level 25.', icon: '🌟',
        check: (p) => p.level >= 25
    },
    {
        id: 'gold_500', name: 'Moneybags', desc: 'Accumulate 500 gold.', icon: '💰',
        check: (p) => p.gold >= 500
    },
    {
        id: 'gold_5000', name: 'Tycoon', desc: 'Accumulate 5000 gold.', icon: '💎',
        check: (p) => p.gold >= 5000
    },
    {
        id: 'fish_5', name: 'Angler', desc: 'Catch 5 fish.', icon: '🎣',
        check: (p) => p.fishCaught >= 5
    },
    {
        id: 'fish_20', name: 'Master Fisher', desc: 'Catch 20 fish.', icon: '🐟',
        check: (p) => p.fishCaught >= 20
    },
    {
        id: 'crops_5', name: 'Green Thumb', desc: 'Harvest 5 crops.', icon: '🌱',
        check: (p) => p.cropsHarvested >= 5
    },
    {
        id: 'crops_20', name: 'Master Farmer', desc: 'Harvest 20 crops.', icon: '🌾',
        check: (p) => p.cropsHarvested >= 20
    },
    {
        id: 'bestiary_6', name: 'Monster Scholar', desc: 'Discover 6 enemy types.', icon: '📖',
        check: (_p, s) => Object.keys(s.bestiary.enemies).length >= 6
    },
    {
        id: 'bestiary_12', name: 'Encyclopedist', desc: 'Discover all 12 enemy types.', icon: '📚',
        check: (_p, s) => Object.keys(s.bestiary.enemies).length >= 12
    },
    {
        id: 'museum_5', name: 'Curator', desc: 'Donate 5 artifacts to the Museum.', icon: '🏛️',
        check: (_p, s) => s.museum.length >= 5
    },
    {
        id: 'pet_owner', name: 'Best Friend', desc: 'Adopt a pet companion.', icon: '🐾',
        check: (_p, s) => s.pet !== null
    },
    {
        id: 'day_7', name: 'Week Survivor', desc: 'Survive 7 days.', icon: '📅',
        check: (p) => p.day >= 7
    },
    {
        id: 'forger', name: 'Blacksmith\'s Apprentice', desc: 'Forge a weapon.', icon: '🔨',
        check: (p) => p.inventory.some(i => i.def.isForged)
    },
    {
        id: 'heart_5', name: 'Beloved', desc: 'Reach 5 hearts with any NPC.', icon: '❤️',
        check: (_p, s) => Object.values(s.hearts).some(h => h >= 5)
    },
    {
        id: 'rune_3', name: 'Enchanter', desc: 'Socket 3 runes.', icon: '💫',
        check: (_p, s) => s.runes.filter(r => r.active).length >= 3
    },
];

export function checkAchievements(player: PlayerState, systems: GameSystems): Achievement[] {
    const newlyUnlocked: Achievement[] = [];
    for (const ach of ALL_ACHIEVEMENTS) {
        if (!systems.achievements.includes(ach.id) && ach.check(player, systems)) {
            systems.achievements.push(ach.id);
            newlyUnlocked.push(ach);
        }
    }
    return newlyUnlocked;
}

export function getAllAchievements(): Achievement[] { return ALL_ACHIEVEMENTS; }

// ==================
// QUESTS (Bulletin Board)
// ==================
export interface Quest {
    id: string;
    name: string;
    desc: string;
    icon: string;
    type: 'kill' | 'collect' | 'floor' | 'fish' | 'farm';
    target: string;  // enemy type or item id
    amount: number;
    rewardGold: number;
    rewardXp: number;
    progress: number;
    completed: boolean;
    claimed: boolean;
}

export interface QuestData {
    active: Quest[];
    lastRefreshDay: number;
}

export function createQuestData(): QuestData {
    return { active: [], lastRefreshDay: 0 };
}

const QUEST_TEMPLATES = [
    { name: 'Slime Slayer', desc: 'Defeat {n} Slimes', icon: '🟢', type: 'kill' as const, target: 'slime', amount: [3, 5, 8], gold: [15, 25, 40], xp: [20, 35, 50] },
    { name: 'Bone Collector', desc: 'Defeat {n} Skeletons', icon: '💀', type: 'kill' as const, target: 'skeleton', amount: [3, 5], gold: [25, 40], xp: [30, 50] },
    { name: 'Bat Exterminator', desc: 'Defeat {n} Bats', icon: '🦇', type: 'kill' as const, target: 'bat', amount: [4, 6], gold: [20, 35], xp: [25, 40] },
    { name: 'Goblin Hunter', desc: 'Defeat {n} Goblins', icon: '👺', type: 'kill' as const, target: 'goblin', amount: [3, 5], gold: [25, 40], xp: [30, 50] },
    { name: 'Orc Slayer', desc: 'Defeat {n} Orcs', icon: '👹', type: 'kill' as const, target: 'orc', amount: [2, 4], gold: [40, 60], xp: [50, 70] },
    { name: 'Gone Fishin\'', desc: 'Catch {n} fish', icon: '🎣', type: 'fish' as const, target: '', amount: [2, 3, 5], gold: [15, 25, 40], xp: [15, 25, 40] },
    { name: 'Harvest Time', desc: 'Harvest {n} crops', icon: '🌾', type: 'farm' as const, target: '', amount: [2, 3], gold: [20, 35], xp: [20, 30] },
    { name: 'Deep Dive', desc: 'Reach floor {n}', icon: '⬇️', type: 'floor' as const, target: '', amount: [5, 10, 15, 20], gold: [30, 50, 80, 120], xp: [40, 60, 100, 150] },
];

export function refreshQuests(quests: QuestData, day: number, maxFloor: number): void {
    if (quests.lastRefreshDay >= day) return;
    quests.lastRefreshDay = day;

    // Generate 3 random quests
    quests.active = [];
    const shuffled = [...QUEST_TEMPLATES].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(3, shuffled.length); i++) {
        const t = shuffled[i];
        const tier = Math.floor(Math.random() * t.amount.length);
        let amount = t.amount[tier];
        if (t.type === 'floor') amount = Math.max(amount, maxFloor + 2);
        quests.active.push({
            id: `${t.name}_${day}_${i}`,
            name: t.name,
            desc: t.desc.replace('{n}', String(amount)),
            icon: t.icon,
            type: t.type,
            target: t.target,
            amount,
            rewardGold: t.gold[tier],
            rewardXp: t.xp[tier],
            progress: 0,
            completed: false,
            claimed: false,
        });
    }
}

export function updateQuestProgress(quests: QuestData, type: string, target: string, amount: number = 1): void {
    for (const q of quests.active) {
        if (q.completed || q.claimed) continue;
        if (q.type === type && (q.target === '' || q.target === target)) {
            q.progress += amount;
            if (q.progress >= q.amount) {
                q.completed = true;
                q.progress = q.amount;
            }
        }
    }
}

// ==================
// NPC RELATIONSHIPS (Hearts)
// ==================
export const GIFT_PREFERENCES: Record<string, { loves: string[]; likes: string[]; hates: string[] }> = {
    cook: { loves: ['golden_fruit', 'dragon_fruit'], likes: ['wheat', 'berries', 'bread'], hates: ['rusty_sword'] },
    fishmonger: { loves: ['legendary_koi', 'phantom_fish'], likes: ['golden_trout', 'bass', 'small_fish'], hates: ['iron_soup'] },
    farmer: { loves: ['dragon_seed', 'golden_seed'], likes: ['wheat_seed', 'berry_seed', 'wheat'], hates: ['bone_axe'] },
    blacksmith: { loves: ['dragon_blade', 'inferno_blade'], likes: ['iron_sword', 'steel_sword', 'war_axe'], hates: ['bread'] },
    healer: { loves: ['ultra_health', 'berry_smoothie'], likes: ['health_potion', 'greater_health'], hates: ['shadow_dagger'] },
    sage: { loves: ['power_scroll', 'escape_scroll', 'xp_tea'], likes: ['mana_potion', 'dungeon_key'], hates: ['small_fish'] },
    merchant: { loves: ['ring_of_power', 'dragon_armor'], likes: ['emerald_ring', 'ruby_ring', 'chain_mail'], hates: ['wheat'] },
};

export function giveGift(hearts: Record<string, number>, npcType: string, itemId: string): { points: number; reaction: string } {
    const prefs = GIFT_PREFERENCES[npcType];
    if (!prefs) return { points: 1, reaction: 'Thanks!' };

    let points = 1;
    let reaction = 'Thanks, I suppose.';

    if (prefs.loves.includes(itemId)) {
        points = 5;
        reaction = 'Oh wow, I LOVE this! Thank you so much! ❤️❤️';
    } else if (prefs.likes.includes(itemId)) {
        points = 3;
        reaction = 'How thoughtful! I appreciate it! ❤️';
    } else if (prefs.hates.includes(itemId)) {
        points = -2;
        reaction = 'Ugh... what am I supposed to do with this? 💢';
    }

    if (!hearts[npcType]) hearts[npcType] = 0;
    hearts[npcType] = Math.max(0, Math.min(100, hearts[npcType] + points));

    return { points, reaction };
}

export function getHeartLevel(hearts: Record<string, number>, npcType: string): number {
    return Math.floor((hearts[npcType] || 0) / 10); // 0-10 hearts (each heart = 10 points)
}

export function getHeartDiscount(hearts: Record<string, number>, npcType: string): number {
    const level = getHeartLevel(hearts, npcType);
    return Math.min(0.5, level * 0.05); // Up to 50% discount at max hearts
}

// ==================
// SKILL TREES
// ==================
export interface SkillDef {
    id: string;
    name: string;
    icon: string;
    desc: string;
    maxLevel: number;
    effect: (level: number) => string;
    classes?: string[]; // restrict to these classes, or all if undefined
}

const SKILL_DEFS: SkillDef[] = [
    // Universal
    {
        id: 'vitality', name: 'Vitality', icon: '❤️', desc: '+10 Max HP per level', maxLevel: 5,
        effect: (l) => `+${l * 10} Max HP`
    },
    {
        id: 'might', name: 'Might', icon: '💪', desc: '+2 ATK per level', maxLevel: 5,
        effect: (l) => `+${l * 2} ATK`
    },
    {
        id: 'fortitude', name: 'Fortitude', icon: '🛡️', desc: '+2 DEF per level', maxLevel: 5,
        effect: (l) => `+${l * 2} DEF`
    },
    {
        id: 'swiftness', name: 'Swiftness', icon: '💨', desc: '+0.1 SPD per level', maxLevel: 3,
        effect: (l) => `+${(l * 0.1).toFixed(1)} SPD`
    },
    {
        id: 'precision', name: 'Precision', icon: '🎯', desc: '+5% CRIT per level', maxLevel: 4,
        effect: (l) => `+${l * 5}% CRIT`
    },
    {
        id: 'treasure_hunter', name: 'Treasure Hunter', icon: '🗝️', desc: '+10% loot chance per level', maxLevel: 3,
        effect: (l) => `+${l * 10}% loot`
    },
    {
        id: 'gold_sense', name: 'Gold Sense', icon: '💰', desc: '+15% gold found per level', maxLevel: 3,
        effect: (l) => `+${l * 15}% gold`
    },
    // Class-specific
    {
        id: 'rage', name: 'Berserker Rage', icon: '🔥', desc: '+5 ATK, -2 DEF per level', maxLevel: 3,
        effect: (l) => `+${l * 5} ATK, -${l * 2} DEF`, classes: ['warrior', 'berserker']
    },
    {
        id: 'arcane_mastery', name: 'Arcane Mastery', icon: '✨', desc: '+3 ATK, +5 Max HP per level', maxLevel: 3,
        effect: (l) => `+${l * 3} ATK, +${l * 5} HP`, classes: ['mage', 'necromancer']
    },
    {
        id: 'shadow_step', name: 'Shadow Step', icon: '👤', desc: '+0.2 SPD, +8% CRIT per level', maxLevel: 3,
        effect: (l) => `+${(l * 0.2).toFixed(1)} SPD, +${l * 8}% CRIT`, classes: ['rogue', 'assassin']
    },
    {
        id: 'holy_aura', name: 'Holy Aura', icon: '✝️', desc: '+15 Max HP, +3 DEF per level', maxLevel: 3,
        effect: (l) => `+${l * 15} HP, +${l * 3} DEF`, classes: ['paladin', 'cleric']
    },
    {
        id: 'eagle_eye', name: 'Eagle Eye', icon: '🦅', desc: '+4 ATK, +5% CRIT per level', maxLevel: 3,
        effect: (l) => `+${l * 4} ATK, +${l * 5}% CRIT`, classes: ['ranger']
    },
];

export function getAvailableSkills(className: string): SkillDef[] {
    return SKILL_DEFS.filter(s => !s.classes || s.classes.includes(className));
}

export function getSkillLevel(skills: Record<string, number>, id: string): number {
    return skills[id] || 0;
}

export function canLearnSkill(skills: Record<string, number>, id: string, skillPoints: number): boolean {
    const def = SKILL_DEFS.find(s => s.id === id);
    if (!def) return false;
    return skillPoints > 0 && (skills[id] || 0) < def.maxLevel;
}

export function applySkillBonuses(skills: Record<string, number>): Partial<import('./types').Stats> {
    const bonus: any = { hp: 0, maxHp: 0, atk: 0, def: 0, spd: 0, critChance: 0 };
    for (const [id, level] of Object.entries(skills)) {
        if (level <= 0) continue;
        switch (id) {
            case 'vitality': bonus.maxHp += level * 10; break;
            case 'might': bonus.atk += level * 2; break;
            case 'fortitude': bonus.def += level * 2; break;
            case 'swiftness': bonus.spd += level * 0.1; break;
            case 'precision': bonus.critChance += level * 0.05; break;
            case 'rage': bonus.atk += level * 5; bonus.def -= level * 2; break;
            case 'arcane_mastery': bonus.atk += level * 3; bonus.maxHp += level * 5; break;
            case 'shadow_step': bonus.spd += level * 0.2; bonus.critChance += level * 0.08; break;
            case 'holy_aura': bonus.maxHp += level * 15; bonus.def += level * 3; break;
            case 'eagle_eye': bonus.atk += level * 4; bonus.critChance += level * 0.05; break;
        }
    }
    return bonus;
}

// ==================
// PET COMPANION
// ==================
export interface PetState {
    name: string;
    type: 'dog' | 'cat' | 'fox';
    level: number;
    xp: number;
    happiness: number;       // 0-100
    lootChanceBonus: number; // % bonus to loot
}

export function createPet(type: 'dog' | 'cat' | 'fox', name: string): PetState {
    return {
        name,
        type,
        level: 1,
        xp: 0,
        happiness: 80,
        lootChanceBonus: type === 'dog' ? 0.05 : type === 'cat' ? 0.08 : 0.03,
    };
}

export function petFetchLoot(pet: PetState): boolean {
    // Chance to auto-pick nearby loot (based on level)
    return Math.random() < 0.1 + pet.level * 0.02;
}

export function updatePet(pet: PetState, dt: number, _playerKills: number): void {
    // Slowly gains XP from being near combat
    pet.xp += dt * 0.1;
    if (pet.xp >= pet.level * 20) {
        pet.xp = 0;
        pet.level = Math.min(10, pet.level + 1);
        pet.lootChanceBonus += 0.01;
    }
    // Happiness slowly decays
    pet.happiness = Math.max(0, pet.happiness - dt * 0.005);
}

// ==================
// RUNES & ENCHANTING
// ==================
export interface RuneDef {
    id: string;
    name: string;
    icon: string;
    desc: string;
    statBonus: Partial<import('./types').Stats>;
    rarity: import('./types').Rarity;
}

export interface RuneSlot {
    rune: RuneDef;
    active: boolean;
    equippedTo?: string; // 'weapon' | 'armor' | 'ring'
}

const RUNE_POOL: RuneDef[] = [
    { id: 'rune_fire', name: 'Fire Rune', icon: '🔥', desc: '+4 ATK', statBonus: { atk: 4 }, rarity: 'common' },
    { id: 'rune_ice', name: 'Ice Rune', icon: '❄️', desc: '+3 DEF', statBonus: { def: 3 }, rarity: 'common' },
    { id: 'rune_wind', name: 'Wind Rune', icon: '💨', desc: '+0.2 SPD', statBonus: { spd: 0.2 }, rarity: 'common' },
    { id: 'rune_life', name: 'Life Rune', icon: '💚', desc: '+15 Max HP', statBonus: { maxHp: 15 }, rarity: 'uncommon' },
    { id: 'rune_fury', name: 'Fury Rune', icon: '⚡', desc: '+8 ATK, -2 DEF', statBonus: { atk: 8, def: -2 }, rarity: 'uncommon' },
    { id: 'rune_guardian', name: 'Guardian Rune', icon: '🛡️', desc: '+6 DEF, +10 HP', statBonus: { def: 6, maxHp: 10 }, rarity: 'rare' },
    { id: 'rune_crit', name: 'Precision Rune', icon: '🎯', desc: '+10% CRIT', statBonus: { critChance: 0.1 }, rarity: 'rare' },
    { id: 'rune_titan', name: 'Titan Rune', icon: '🏔️', desc: '+30 HP, +5 DEF, +3 ATK', statBonus: { maxHp: 30, def: 5, atk: 3 }, rarity: 'legendary' },
    { id: 'rune_void', name: 'Void Rune', icon: '🌀', desc: '+12 ATK, +15% CRIT', statBonus: { atk: 12, critChance: 0.15 }, rarity: 'legendary' },
];

export function rollRune(floor: number): RuneDef | null {
    // Higher floors = better rune chance
    const rng = Math.random();
    const floorBonus = floor * 0.005;
    if (rng > 0.15 + floorBonus) return null; // ~15-65% chance to find rune

    const pool = RUNE_POOL.filter(r => {
        if (r.rarity === 'legendary') return floor >= 60;
        if (r.rarity === 'rare') return floor >= 30;
        if (r.rarity === 'uncommon') return floor >= 15;
        return true;
    });
    return pool[Math.floor(Math.random() * pool.length)] || null;
}

export function applyRuneBonuses(runes: RuneSlot[]): Partial<import('./types').Stats> {
    const bonus: any = { hp: 0, maxHp: 0, atk: 0, def: 0, spd: 0, critChance: 0 };
    for (const slot of runes) {
        if (!slot.active) continue;
        for (const [key, val] of Object.entries(slot.rune.statBonus)) {
            bonus[key] = (bonus[key] || 0) + (val as number);
        }
    }
    return bonus;
}

export function getAllRunes(): RuneDef[] { return [...RUNE_POOL]; }

// ==================
// MUSEUM COLLECTION
// ==================
export interface ArtifactDef {
    id: string;
    name: string;
    desc: string;
    icon: string;
    rarity: import('./types').Rarity;
    buffWhenComplete?: string;
}

const ARTIFACTS: ArtifactDef[] = [
    { id: 'ancient_coin', name: 'Ancient Coin', desc: 'A coin from a forgotten kingdom.', icon: '🪙', rarity: 'common' },
    { id: 'crystal_shard', name: 'Crystal Shard', desc: 'Glows with inner light.', icon: '💠', rarity: 'common' },
    { id: 'fossil_bone', name: 'Fossil Bone', desc: 'Petrified remains of a creature.', icon: '🦴', rarity: 'common' },
    { id: 'old_map', name: 'Old Map', desc: 'A tattered dungeon map.', icon: '🗺️', rarity: 'uncommon' },
    { id: 'magic_orb', name: 'Magic Orb', desc: 'Pulses with arcane energy.', icon: '🔮', rarity: 'uncommon' },
    { id: 'dragon_scale', name: 'Dragon Scale', desc: 'Iridescent and nearly indestructible.', icon: '🐉', rarity: 'rare' },
    { id: 'void_gem', name: 'Void Gem', desc: 'Contains a pocket dimension.', icon: '🌌', rarity: 'rare' },
    { id: 'celestial_fragment', name: 'Celestial Fragment', desc: 'A piece of a fallen star.', icon: '⭐', rarity: 'legendary' },
    { id: 'ark_shard', name: 'Shard of the Ark', desc: 'Part of an ancient divine weapon.', icon: '✨', rarity: 'legendary' },
    { id: 'phoenix_feather', name: 'Phoenix Feather', desc: 'Burns eternally without consuming.', icon: '🔥', rarity: 'legendary' },
];

export function rollArtifact(floor: number): ArtifactDef | null {
    if (Math.random() > 0.08 + floor * 0.002) return null;
    const pool = ARTIFACTS.filter(a => {
        if (a.rarity === 'legendary') return floor >= 50;
        if (a.rarity === 'rare') return floor >= 25;
        if (a.rarity === 'uncommon') return floor >= 10;
        return true;
    });
    return pool[Math.floor(Math.random() * pool.length)] || null;
}

export function getMuseumReward(count: number): { atk: number; def: number; maxHp: number } {
    return {
        atk: Math.floor(count * 0.5),
        def: Math.floor(count * 0.3),
        maxHp: count * 2,
    };
}

export function getAllArtifacts(): ArtifactDef[] { return [...ARTIFACTS]; }

// ==================
// ELITE ENEMIES
// ==================
export type EliteModifier = 'fast' | 'giant' | 'explosive' | 'vampiric' | 'shielded' | 'enraged';

export interface EliteData {
    modifier: EliteModifier;
    name: string;
    color: string;
    statMult: { hp: number; atk: number; def: number; spd: number };
    xpMult: number;
    goldMult: number;
}

const ELITE_MODIFIERS: Record<EliteModifier, EliteData> = {
    fast: {
        modifier: 'fast', name: '⚡ Swift', color: '#74b9ff',
        statMult: { hp: 1.0, atk: 1.0, def: 0.8, spd: 2.0 }, xpMult: 1.5, goldMult: 1.5
    },
    giant: {
        modifier: 'giant', name: '🗿 Giant', color: '#fdcb6e',
        statMult: { hp: 2.5, atk: 1.5, def: 1.5, spd: 0.6 }, xpMult: 2.0, goldMult: 2.0
    },
    explosive: {
        modifier: 'explosive', name: '💥 Explosive', color: '#e17055',
        statMult: { hp: 0.8, atk: 2.0, def: 0.5, spd: 1.0 }, xpMult: 1.8, goldMult: 1.5
    },
    vampiric: {
        modifier: 'vampiric', name: '🧛 Vampiric', color: '#e74c3c',
        statMult: { hp: 1.5, atk: 1.3, def: 1.0, spd: 1.0 }, xpMult: 2.0, goldMult: 1.8
    },
    shielded: {
        modifier: 'shielded', name: '🛡️ Shielded', color: '#3498db',
        statMult: { hp: 1.2, atk: 0.9, def: 3.0, spd: 0.8 }, xpMult: 1.5, goldMult: 1.5
    },
    enraged: {
        modifier: 'enraged', name: '😡 Enraged', color: '#d63031',
        statMult: { hp: 1.3, atk: 2.0, def: 0.7, spd: 1.3 }, xpMult: 2.0, goldMult: 2.0
    },
};

export function rollEliteModifier(floor: number): EliteData | null {
    // Chance increases with floor depth
    const chance = 0.05 + floor * 0.005; // 5% at floor 1, 55% at floor 100
    if (Math.random() > chance) return null;
    const mods = Object.values(ELITE_MODIFIERS);
    return mods[Math.floor(Math.random() * mods.length)];
}

export function getEliteData(modifier: EliteModifier): EliteData {
    return ELITE_MODIFIERS[modifier];
}
