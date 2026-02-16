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

    // Consumables
    health_potion: { id: 'health_potion', name: 'Health Potion', description: 'Restores 30 HP.', category: 'consumable', rarity: 'common', icon: 'potion_hp', healAmount: 30, stackable: true, value: 10 },
    greater_health: { id: 'greater_health', name: 'Greater Potion', description: 'Restores 80 HP.', category: 'consumable', rarity: 'uncommon', icon: 'potion_hp', healAmount: 80, stackable: true, value: 30 },
    ultra_health: { id: 'ultra_health', name: 'Ultra Potion', description: 'Restores 200 HP.', category: 'consumable', rarity: 'rare', icon: 'potion_hp', healAmount: 200, stackable: true, value: 80 },
    mana_potion: { id: 'mana_potion', name: 'Mana Potion', description: 'Restores 20 MP.', category: 'consumable', rarity: 'common', icon: 'potion_mp', stackable: true, value: 10 },

    // Keys & scrolls
    dungeon_key: { id: 'dungeon_key', name: 'Dungeon Key', description: 'Opens locked doors.', category: 'key', rarity: 'common', icon: 'key', stackable: true, value: 5 },
    escape_scroll: { id: 'escape_scroll', name: 'Escape Scroll', description: 'Teleport to stairs.', category: 'scroll', rarity: 'uncommon', icon: 'scroll', stackable: true, value: 40 },
    power_scroll: { id: 'power_scroll', name: 'Power Scroll', description: '+2 ATK permanently.', category: 'scroll', rarity: 'rare', icon: 'scroll', stackable: true, value: 100 },
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
