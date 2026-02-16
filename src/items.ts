// ===== ITEM DATABASE =====

import type { ItemDef, Rarity, LootDrop } from './types';

const ITEMS: Record<string, ItemDef> = {
    // Weapons
    rusty_sword: { id: 'rusty_sword', name: 'Rusty Sword', description: 'A worn blade.', category: 'weapon', rarity: 'common', icon: 'sword', equipSlot: 'weapon', stats: { atk: 3 }, value: 10 },
    iron_sword: { id: 'iron_sword', name: 'Iron Sword', description: 'A solid iron blade.', category: 'weapon', rarity: 'common', icon: 'sword', equipSlot: 'weapon', stats: { atk: 6 }, value: 30 },
    steel_sword: { id: 'steel_sword', name: 'Steel Sword', description: 'Sharp and reliable.', category: 'weapon', rarity: 'uncommon', icon: 'sword', equipSlot: 'weapon', stats: { atk: 10 }, value: 80 },
    flame_sword: { id: 'flame_sword', name: 'Flame Sword', description: 'Burns with inner fire.', category: 'weapon', rarity: 'rare', icon: 'sword', equipSlot: 'weapon', stats: { atk: 16 }, value: 200 },
    dragon_blade: { id: 'dragon_blade', name: 'Dragon Blade', description: 'Forged from dragon bone.', category: 'weapon', rarity: 'legendary', icon: 'sword', equipSlot: 'weapon', stats: { atk: 25 }, value: 500 },

    bone_axe: { id: 'bone_axe', name: 'Bone Axe', description: 'Crude but effective.', category: 'weapon', rarity: 'common', icon: 'axe', equipSlot: 'weapon', stats: { atk: 5 }, value: 15 },
    war_axe: { id: 'war_axe', name: 'War Axe', description: 'A heavy war axe.', category: 'weapon', rarity: 'uncommon', icon: 'axe', equipSlot: 'weapon', stats: { atk: 12 }, value: 100 },
    berserker_axe: { id: 'berserker_axe', name: "Berserker's Axe", description: 'Fueled by rage.', category: 'weapon', rarity: 'rare', icon: 'axe', equipSlot: 'weapon', stats: { atk: 20, def: -3 }, value: 250 },

    oak_staff: { id: 'oak_staff', name: 'Oak Staff', description: 'A wizard\'s first staff.', category: 'weapon', rarity: 'common', icon: 'staff', equipSlot: 'weapon', stats: { atk: 4 }, value: 12 },
    arcane_staff: { id: 'arcane_staff', name: 'Arcane Staff', description: 'Hums with magic.', category: 'weapon', rarity: 'uncommon', icon: 'staff', equipSlot: 'weapon', stats: { atk: 9, maxHp: 10 }, value: 90 },
    elder_staff: { id: 'elder_staff', name: 'Elder Staff', description: 'Ancient power within.', category: 'weapon', rarity: 'rare', icon: 'staff', equipSlot: 'weapon', stats: { atk: 15, maxHp: 25 }, value: 300 },
    void_staff: { id: 'void_staff', name: 'Void Staff', description: 'Bends reality itself.', category: 'weapon', rarity: 'legendary', icon: 'staff', equipSlot: 'weapon', stats: { atk: 22, maxHp: 40 }, value: 600 },

    iron_dagger: { id: 'iron_dagger', name: 'Iron Dagger', description: 'Quick and deadly.', category: 'weapon', rarity: 'common', icon: 'dagger', equipSlot: 'weapon', stats: { atk: 4, spd: 1 }, value: 15 },
    shadow_dagger: { id: 'shadow_dagger', name: 'Shadow Dagger', description: 'Strikes from the dark.', category: 'weapon', rarity: 'rare', icon: 'dagger', equipSlot: 'weapon', stats: { atk: 13, spd: 3, critChance: 0.15 }, value: 250 },

    short_bow: { id: 'short_bow', name: 'Short Bow', description: 'A simple bow.', category: 'weapon', rarity: 'common', icon: 'bow', equipSlot: 'weapon', stats: { atk: 5 }, value: 20 },
    long_bow: { id: 'long_bow', name: 'Long Bow', description: 'Greater range & power.', category: 'weapon', rarity: 'uncommon', icon: 'bow', equipSlot: 'weapon', stats: { atk: 11 }, value: 100 },
    elven_bow: { id: 'elven_bow', name: 'Elven Bow', description: 'Elvish craftsmanship.', category: 'weapon', rarity: 'rare', icon: 'bow', equipSlot: 'weapon', stats: { atk: 18, spd: 2 }, value: 350 },

    // Armor
    leather_armor: { id: 'leather_armor', name: 'Leather Armor', description: 'Basic protection.', category: 'armor', rarity: 'common', icon: 'armor', equipSlot: 'armor', stats: { def: 3 }, value: 15 },
    chain_mail: { id: 'chain_mail', name: 'Chain Mail', description: 'Linked metal rings.', category: 'armor', rarity: 'uncommon', icon: 'armor', equipSlot: 'armor', stats: { def: 7 }, value: 60 },
    plate_armor: { id: 'plate_armor', name: 'Plate Armor', description: 'Heavy steel plates.', category: 'armor', rarity: 'rare', icon: 'armor', equipSlot: 'armor', stats: { def: 12, spd: -1 }, value: 200 },
    dragon_armor: { id: 'dragon_armor', name: 'Dragon Armor', description: 'Dragonscale protection.', category: 'armor', rarity: 'legendary', icon: 'armor', equipSlot: 'armor', stats: { def: 20, maxHp: 30 }, value: 500 },

    // Rings
    iron_ring: { id: 'iron_ring', name: 'Iron Ring', description: 'A plain ring.', category: 'ring', rarity: 'common', icon: 'ring', equipSlot: 'ring', stats: { def: 1 }, value: 10 },
    ruby_ring: { id: 'ruby_ring', name: 'Ruby Ring', description: 'Glows with warmth.', category: 'ring', rarity: 'uncommon', icon: 'ring', equipSlot: 'ring', stats: { atk: 3, maxHp: 10 }, value: 50 },
    emerald_ring: { id: 'emerald_ring', name: 'Emerald Ring', description: 'Nature\'s blessing.', category: 'ring', rarity: 'rare', icon: 'ring', equipSlot: 'ring', stats: { def: 4, maxHp: 20 }, value: 150 },
    ring_of_power: { id: 'ring_of_power', name: 'Ring of Power', description: 'Overwhelming strength.', category: 'ring', rarity: 'legendary', icon: 'ring', equipSlot: 'ring', stats: { atk: 8, def: 5, maxHp: 30 }, value: 400 },

    // Consumables (Potions)
    health_potion: { id: 'health_potion', name: 'Health Potion', description: 'Restores 30 HP.', category: 'consumable', rarity: 'common', icon: 'potion_hp', healAmount: 30, stackable: true, value: 10 },
    greater_health: { id: 'greater_health', name: 'Greater Potion', description: 'Restores 80 HP.', category: 'consumable', rarity: 'uncommon', icon: 'potion_hp', healAmount: 80, stackable: true, value: 30 },
    ultra_health: { id: 'ultra_health', name: 'Ultra Potion', description: 'Restores 200 HP.', category: 'consumable', rarity: 'rare', icon: 'potion_hp', healAmount: 200, stackable: true, value: 80 },
    mana_potion: { id: 'mana_potion', name: 'Mana Potion', description: 'Restores 20 MP.', category: 'consumable', rarity: 'common', icon: 'potion_mp', stackable: true, value: 10 },

    // Keys & scrolls
    dungeon_key: { id: 'dungeon_key', name: 'Dungeon Key', description: 'Opens locked doors.', category: 'key', rarity: 'common', icon: 'key', stackable: true, value: 5 },
    escape_scroll: { id: 'escape_scroll', name: 'Escape Scroll', description: 'Teleport to town!', category: 'scroll', rarity: 'uncommon', icon: 'scroll', stackable: true, value: 40 },
    power_scroll: { id: 'power_scroll', name: 'Power Scroll', description: '+2 ATK permanently.', category: 'scroll', rarity: 'rare', icon: 'scroll', stackable: true, value: 100 },

    // ============ FOOD ITEMS (Town Cook Shop) ============
    // Bread — basic healing
    bread: {
        id: 'bread', name: 'Fresh Bread', description: 'Warm and hearty. Heals 20 HP.', category: 'food', rarity: 'common', icon: 'food_bread', stackable: true, value: 5,
        foodEffects: [{ type: 'heal', value: 20, duration: 0 }]
    },

    // Meat Stew — ATK boost
    meat_stew: {
        id: 'meat_stew', name: 'Meat Stew', description: 'Hearty stew. +5 ATK for 60s.', category: 'food', rarity: 'uncommon', icon: 'food_stew', stackable: true, value: 25,
        foodEffects: [{ type: 'heal', value: 30, duration: 0 }, { type: 'atk_boost', value: 5, duration: 60 }]
    },

    // Iron Soup — DEF boost
    iron_soup: {
        id: 'iron_soup', name: 'Iron Soup', description: 'Fortifying soup. +4 DEF for 60s.', category: 'food', rarity: 'uncommon', icon: 'food_soup', stackable: true, value: 25,
        foodEffects: [{ type: 'heal', value: 25, duration: 0 }, { type: 'def_boost', value: 4, duration: 60 }]
    },

    // Speed Salad — SPD boost  
    speed_salad: {
        id: 'speed_salad', name: 'Speed Salad', description: 'Light and zippy. +0.3 SPD for 45s.', category: 'food', rarity: 'uncommon', icon: 'food_salad', stackable: true, value: 20,
        foodEffects: [{ type: 'heal', value: 15, duration: 0 }, { type: 'spd_boost', value: 0.3, duration: 45 }]
    },

    // Golden Pie — CRIT boost
    golden_pie: {
        id: 'golden_pie', name: 'Golden Pie', description: 'Lucky pastry. +15% CRIT for 45s.', category: 'food', rarity: 'rare', icon: 'food_pie', stackable: true, value: 50,
        foodEffects: [{ type: 'heal', value: 40, duration: 0 }, { type: 'crit_boost', value: 0.15, duration: 45 }]
    },

    // Dragon Feast — Max HP boost + heal
    dragon_feast: {
        id: 'dragon_feast', name: 'Dragon Feast', description: 'Legendary meal. +30 MaxHP for 90s, full heal.', category: 'food', rarity: 'legendary', icon: 'food_feast', stackable: true, value: 100,
        foodEffects: [{ type: 'heal', value: 999, duration: 0 }, { type: 'maxhp_boost', value: 30, duration: 90 }]
    },

    // Berry Smoothie — Regen
    berry_smoothie: {
        id: 'berry_smoothie', name: 'Berry Smoothie', description: 'Sweet berry drink. Regen 3 HP/s for 20s.', category: 'food', rarity: 'uncommon', icon: 'food_smoothie', stackable: true, value: 30,
        foodEffects: [{ type: 'regen', value: 3, duration: 20 }]
    },

    // Battle Cookie — ATK + CRIT
    battle_cookie: {
        id: 'battle_cookie', name: 'Battle Cookie', description: 'War rations! +3 ATK, +10% CRIT for 30s.', category: 'food', rarity: 'rare', icon: 'food_cookie', stackable: true, value: 40,
        foodEffects: [{ type: 'heal', value: 20, duration: 0 }, { type: 'atk_boost', value: 3, duration: 30 }, { type: 'crit_boost', value: 0.10, duration: 30 }]
    },

    // XP Tea — XP boost
    xp_tea: {
        id: 'xp_tea', name: 'Scholar\'s Tea', description: 'Enlightening! +50% XP gain for 60s.', category: 'food', rarity: 'rare', icon: 'food_tea', stackable: true, value: 60,
        foodEffects: [{ type: 'xp_boost', value: 0.5, duration: 60 }]
    },

    // ============ FISH ITEMS ============
    small_fish: {
        id: 'small_fish', name: 'Small Fish', description: 'A tiny catch. Heals 10 HP.', category: 'fish', rarity: 'common', icon: 'fish_small', stackable: true, value: 5,
        foodEffects: [{ type: 'heal', value: 10, duration: 0 }]
    },

    bass: {
        id: 'bass', name: 'Bass', description: 'A decent catch. Heals 25 HP.', category: 'fish', rarity: 'common', icon: 'fish_med', stackable: true, value: 12,
        foodEffects: [{ type: 'heal', value: 25, duration: 0 }]
    },

    golden_trout: {
        id: 'golden_trout', name: 'Golden Trout', description: 'Rare shimmering fish. Heals 50 HP, +3 ATK for 30s.', category: 'fish', rarity: 'uncommon', icon: 'fish_gold', stackable: true, value: 30,
        foodEffects: [{ type: 'heal', value: 50, duration: 0 }, { type: 'atk_boost', value: 3, duration: 30 }]
    },

    phantom_fish: {
        id: 'phantom_fish', name: 'Phantom Fish', description: 'Ghostly fish. Heals 80 HP, +5 DEF for 45s.', category: 'fish', rarity: 'rare', icon: 'fish_phantom', stackable: true, value: 60,
        foodEffects: [{ type: 'heal', value: 80, duration: 0 }, { type: 'def_boost', value: 5, duration: 45 }]
    },

    legendary_koi: {
        id: 'legendary_koi', name: 'Legendary Koi', description: 'Ancient mystical fish! Full heal, all stats +3 for 60s.', category: 'fish', rarity: 'legendary', icon: 'fish_koi', stackable: true, value: 150,
        foodEffects: [
            { type: 'heal', value: 999, duration: 0 },
            { type: 'atk_boost', value: 3, duration: 60 },
            { type: 'def_boost', value: 3, duration: 60 },
            { type: 'spd_boost', value: 0.2, duration: 60 },
        ]
    },

    // ============ SEEDS (for Farming) ============
    wheat_seed: { id: 'wheat_seed', name: 'Wheat Seed', description: 'Plant to grow wheat. Makes bread!', category: 'seed', rarity: 'common', icon: 'seed', stackable: true, value: 5 },
    berry_seed: { id: 'berry_seed', name: 'Berry Seed', description: 'Plant to grow berries. Sweet and useful!', category: 'seed', rarity: 'common', icon: 'seed', stackable: true, value: 8 },
    golden_seed: { id: 'golden_seed', name: 'Golden Seed', description: 'Rare golden plant. Valuable harvest!', category: 'seed', rarity: 'uncommon', icon: 'seed_gold', stackable: true, value: 20 },
    dragon_seed: { id: 'dragon_seed', name: 'Dragon Seed', description: 'Mythical plant. Legendary food ingredient!', category: 'seed', rarity: 'rare', icon: 'seed_dragon', stackable: true, value: 50 },

    // ============ TOOLS ============
    fishing_rod: { id: 'fishing_rod', name: 'Fishing Rod', description: 'Used to fish at ponds. Reusable!', category: 'tool', rarity: 'uncommon', icon: 'tool_rod', stackable: false, value: 50 },
    watering_can: { id: 'watering_can', name: 'Watering Can', description: 'Water your crops for faster growth!', category: 'tool', rarity: 'uncommon', icon: 'tool_can', stackable: false, value: 40 },

    // ============ HARVEST ITEMS (from farming) ============
    wheat: {
        id: 'wheat', name: 'Wheat', description: 'Fresh wheat. Can be sold or cooked.', category: 'food', rarity: 'common', icon: 'food_wheat', stackable: true, value: 8,
        foodEffects: [{ type: 'heal', value: 5, duration: 0 }]
    },
    berries: {
        id: 'berries', name: 'Fresh Berries', description: 'Sweet berries! Heals 15 HP.', category: 'food', rarity: 'common', icon: 'food_berry', stackable: true, value: 10,
        foodEffects: [{ type: 'heal', value: 15, duration: 0 }]
    },
    golden_fruit: {
        id: 'golden_fruit', name: 'Golden Fruit', description: 'Shimmering golden fruit. +20 MaxHP for 45s.', category: 'food', rarity: 'uncommon', icon: 'food_golden', stackable: true, value: 35,
        foodEffects: [{ type: 'heal', value: 40, duration: 0 }, { type: 'maxhp_boost', value: 20, duration: 45 }]
    },
    dragon_fruit: {
        id: 'dragon_fruit', name: 'Dragon Fruit', description: 'Legendary dragon fruit! +8 ATK, +5 DEF for 60s.', category: 'food', rarity: 'rare', icon: 'food_dragon', stackable: true, value: 80,
        foodEffects: [
            { type: 'heal', value: 100, duration: 0 },
            { type: 'atk_boost', value: 8, duration: 60 },
            { type: 'def_boost', value: 5, duration: 60 },
        ]
    },

    // ============ BOSS WEAPONS (dropped by bosses every 10 floors) ============
    slime_mace: { id: 'slime_mace', name: "Slime King's Mace", description: 'Drips with corrosive slime. Poisons foes.', category: 'weapon', rarity: 'rare', icon: 'axe', equipSlot: 'weapon', stats: { atk: 14, def: 2 }, value: 200, isBossWeapon: true },
    shadow_reaper: { id: 'shadow_reaper', name: 'Shadow Reaper', description: 'Harvests souls in darkness.', category: 'weapon', rarity: 'rare', icon: 'sword', equipSlot: 'weapon', stats: { atk: 18, spd: 1, critChance: 0.1 }, value: 300, isBossWeapon: true },
    thunder_hammer: { id: 'thunder_hammer', name: 'Thunder Hammer', description: 'Crackles with lightning.', category: 'weapon', rarity: 'rare', icon: 'axe', equipSlot: 'weapon', stats: { atk: 22, def: 4 }, value: 400, isBossWeapon: true },
    void_scythe: { id: 'void_scythe', name: 'Void Scythe', description: 'Cuts through reality itself.', category: 'weapon', rarity: 'legendary', icon: 'sword', equipSlot: 'weapon', stats: { atk: 28, critChance: 0.15 }, value: 500, isBossWeapon: true },
    inferno_blade: { id: 'inferno_blade', name: 'Inferno Blade', description: 'Burns with hellfire.', category: 'weapon', rarity: 'legendary', icon: 'sword', equipSlot: 'weapon', stats: { atk: 32, spd: 1 }, value: 600, isBossWeapon: true },
    frost_maul: { id: 'frost_maul', name: 'Frost Maul', description: 'Freezes enemies solid.', category: 'weapon', rarity: 'legendary', icon: 'axe', equipSlot: 'weapon', stats: { atk: 26, def: 8, maxHp: 20 }, value: 550, isBossWeapon: true },
    celestial_bow: { id: 'celestial_bow', name: 'Celestial Bow', description: 'Fires arrows of pure starlight.', category: 'weapon', rarity: 'legendary', icon: 'bow', equipSlot: 'weapon', stats: { atk: 30, spd: 2, critChance: 0.12 }, value: 650, isBossWeapon: true },
    soul_staff: { id: 'soul_staff', name: 'Soul Staff', description: 'Channels the power of fallen souls.', category: 'weapon', rarity: 'legendary', icon: 'staff', equipSlot: 'weapon', stats: { atk: 24, maxHp: 50, def: 3 }, value: 600, isBossWeapon: true },
    doom_dagger: { id: 'doom_dagger', name: 'Doom Dagger', description: 'One cut is all it takes.', category: 'weapon', rarity: 'legendary', icon: 'dagger', equipSlot: 'weapon', stats: { atk: 20, spd: 3, critChance: 0.25 }, value: 500, isBossWeapon: true },
    world_ender: { id: 'world_ender', name: 'World Ender', description: 'The final weapon. Ends everything.', category: 'weapon', rarity: 'legendary', icon: 'sword', equipSlot: 'weapon', stats: { atk: 40, def: 10, maxHp: 30, spd: 1, critChance: 0.1 }, value: 1000, isBossWeapon: true },
};

export function getItemDef(id: string): ItemDef | undefined {
    return ITEMS[id];
}

export function getAllItems(): ItemDef[] {
    return Object.values(ITEMS);
}

export function getItemsByFloor(floor: number): LootDrop[] {
    const drops: LootDrop[] = [];
    const threshold = Math.min(floor / 100, 1);

    // Always can drop health potions
    drops.push({ itemId: 'health_potion', chance: 0.3 });

    if (floor >= 5) drops.push({ itemId: 'dungeon_key', chance: 0.15 });
    if (floor >= 10) drops.push({ itemId: 'greater_health', chance: 0.15 });
    if (floor >= 30) drops.push({ itemId: 'ultra_health', chance: 0.1 });
    if (floor >= 20) drops.push({ itemId: 'escape_scroll', chance: 0.05 });
    if (floor >= 40) drops.push({ itemId: 'power_scroll', chance: 0.03 });

    // Weapons by floor range
    if (floor < 20) drops.push({ itemId: 'rusty_sword', chance: 0.08 }, { itemId: 'bone_axe', chance: 0.06 }, { itemId: 'oak_staff', chance: 0.06 }, { itemId: 'iron_dagger', chance: 0.06 }, { itemId: 'short_bow', chance: 0.06 });
    if (floor >= 10 && floor < 40) drops.push({ itemId: 'iron_sword', chance: 0.06 }, { itemId: 'long_bow', chance: 0.05 });
    if (floor >= 20 && floor < 60) drops.push({ itemId: 'steel_sword', chance: 0.05 }, { itemId: 'war_axe', chance: 0.05 }, { itemId: 'arcane_staff', chance: 0.04 });
    if (floor >= 40 && floor < 80) drops.push({ itemId: 'flame_sword', chance: 0.03 }, { itemId: 'berserker_axe', chance: 0.03 }, { itemId: 'elder_staff', chance: 0.03 }, { itemId: 'shadow_dagger', chance: 0.03 }, { itemId: 'elven_bow', chance: 0.03 });
    if (floor >= 70) drops.push({ itemId: 'dragon_blade', chance: 0.01 + threshold * 0.02 }, { itemId: 'void_staff', chance: 0.01 + threshold * 0.01 });

    // Armor
    if (floor < 25) drops.push({ itemId: 'leather_armor', chance: 0.06 });
    if (floor >= 15 && floor < 50) drops.push({ itemId: 'chain_mail', chance: 0.04 });
    if (floor >= 40 && floor < 80) drops.push({ itemId: 'plate_armor', chance: 0.03 });
    if (floor >= 70) drops.push({ itemId: 'dragon_armor', chance: 0.01 + threshold * 0.01 });

    // Rings
    if (floor < 30) drops.push({ itemId: 'iron_ring', chance: 0.05 });
    if (floor >= 20 && floor < 60) drops.push({ itemId: 'ruby_ring', chance: 0.04 });
    if (floor >= 40 && floor < 80) drops.push({ itemId: 'emerald_ring', chance: 0.03 });
    if (floor >= 60) drops.push({ itemId: 'ring_of_power', chance: 0.01 + threshold * 0.01 });

    return drops;
}

export function rollLoot(drops: LootDrop[]): ItemDef | null {
    for (const drop of drops) {
        if (Math.random() < drop.chance) {
            const def = getItemDef(drop.itemId);
            if (def) return def;
        }
    }
    return null;
}

export function getRarityColor(rarity: Rarity): string {
    switch (rarity) {
        case 'common': return '#aaa';
        case 'uncommon': return '#2ecc71';
        case 'rare': return '#3498db';
        case 'legendary': return '#e67e22';
    }
}

const BOSS_WEAPON_TIERS = [
    'slime_mace',       // floor 10
    'shadow_reaper',    // floor 20
    'thunder_hammer',   // floor 30
    'void_scythe',      // floor 40
    'inferno_blade',    // floor 50
    'frost_maul',       // floor 60
    'celestial_bow',    // floor 70
    'soul_staff',       // floor 80
    'doom_dagger',      // floor 90
    'world_ender',      // floor 100
];

export function getBossWeapon(floor: number): ItemDef | null {
    const tierIndex = Math.floor(floor / 10) - 1;
    const id = BOSS_WEAPON_TIERS[Math.min(tierIndex, BOSS_WEAPON_TIERS.length - 1)];
    if (!id) return null;
    return getItemDef(id) || null;
}

export function getWeaponsForForge(): ItemDef[] {
    return Object.values(ITEMS).filter(i => i.category === 'weapon');
}
