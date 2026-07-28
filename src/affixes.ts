// ===== ITEM AFFIXES =====
// Every drop rolls modifiers, so "Iron Sword" stops being one item and starts
// being a family of them: Vicious Iron Sword of the Bear, Blazing Iron Sword
// of Haste, and so on. Rarity drives how many affixes and how strong.

import type { ItemDef, Affix, Rarity, Element, Stats } from './types';

const PREFIXES: Affix[] = [
    // --- damage ---
    { id: 'vicious', kind: 'prefix', label: 'Vicious', stats: { atk: 3 }, value: 1.25 },
    { id: 'brutal', kind: 'prefix', label: 'Brutal', stats: { atk: 6 }, value: 1.5 },
    { id: 'savage', kind: 'prefix', label: 'Savage', stats: { atk: 9, spd: -0.3 }, value: 1.7 },
    { id: 'keen', kind: 'prefix', label: 'Keen', stats: { critChance: 0.06 }, value: 1.3 },
    { id: 'murderous', kind: 'prefix', label: 'Murderous', stats: { critChance: 0.12, atk: 2 }, value: 1.75 },
    // --- defence ---
    { id: 'sturdy', kind: 'prefix', label: 'Sturdy', stats: { def: 3 }, value: 1.2 },
    { id: 'ironbound', kind: 'prefix', label: 'Ironbound', stats: { def: 6, spd: -0.2 }, value: 1.45 },
    { id: 'hardy', kind: 'prefix', label: 'Hardy', stats: { maxHp: 20 }, value: 1.3 },
    // --- speed ---
    { id: 'swift', kind: 'prefix', label: 'Swift', stats: { spd: 0.5 }, value: 1.3 },
    { id: 'flickering', kind: 'prefix', label: 'Flickering', stats: { spd: 1, critChance: 0.04 }, value: 1.6 },
    // --- elemental ---
    { id: 'blazing', kind: 'prefix', label: 'Blazing', element: 'fire', procChance: 0.3, procStatus: 'burn', procPower: 1, procDuration: 1, stats: { atk: 2 }, value: 1.5 },
    { id: 'frostbound', kind: 'prefix', label: 'Frostbound', element: 'ice', procChance: 0.25, procStatus: 'freeze', procDuration: 1, stats: { atk: 1 }, value: 1.5 },
    { id: 'venomous', kind: 'prefix', label: 'Venomous', element: 'poison', procChance: 0.35, procStatus: 'poison', procPower: 1, procDuration: 1.2, value: 1.45 },
    { id: 'shadowed', kind: 'prefix', label: 'Shadowed', element: 'shadow', procChance: 0.25, procStatus: 'weaken', procDuration: 1, stats: { critChance: 0.05 }, value: 1.55 },
    { id: 'storming', kind: 'prefix', label: 'Storming', element: 'lightning', procChance: 0.18, procStatus: 'stun', procDuration: 1, stats: { atk: 3 }, value: 1.65 },
    { id: 'serrated', kind: 'prefix', label: 'Serrated', procChance: 0.3, procStatus: 'bleed', procPower: 1, procDuration: 1, stats: { atk: 2 }, value: 1.45 },
];

const SUFFIXES: Affix[] = [
    { id: 'bear', kind: 'suffix', label: 'of the Bear', stats: { maxHp: 30, def: 2 }, value: 1.35 },
    { id: 'wolf', kind: 'suffix', label: 'of the Wolf', stats: { spd: 0.6, atk: 2 }, value: 1.35 },
    { id: 'fox', kind: 'suffix', label: 'of the Fox', stats: { critChance: 0.08, spd: 0.3 }, value: 1.4 },
    { id: 'ox', kind: 'suffix', label: 'of the Ox', stats: { maxHp: 45, spd: -0.2 }, value: 1.4 },
    { id: 'hawk', kind: 'suffix', label: 'of the Hawk', stats: { critChance: 0.1 }, value: 1.35 },
    { id: 'mountain', kind: 'suffix', label: 'of the Mountain', stats: { def: 8, maxHp: 15, spd: -0.3 }, value: 1.5 },
    { id: 'haste', kind: 'suffix', label: 'of Haste', stats: { spd: 0.9 }, value: 1.45 },
    { id: 'ruin', kind: 'suffix', label: 'of Ruin', stats: { atk: 7, def: -2 }, value: 1.5 },
    { id: 'the_depths', kind: 'suffix', label: 'of the Depths', stats: { atk: 4, maxHp: 25 }, value: 1.55 },
    { id: 'the_forgotten', kind: 'suffix', label: 'of the Forgotten', stats: { atk: 5, def: 4, maxHp: 20 }, value: 1.7 },
    { id: 'embers', kind: 'suffix', label: 'of Embers', element: 'fire', procChance: 0.2, procStatus: 'burn', procPower: 1.4, procDuration: 1.2, value: 1.5 },
    { id: 'the_grave', kind: 'suffix', label: 'of the Grave', element: 'shadow', procChance: 0.2, procStatus: 'weaken', procDuration: 1.3, stats: { atk: 3 }, value: 1.55 },
];

/** How many affixes a drop of this rarity rolls. */
const AFFIX_COUNT: Record<Rarity, number> = {
    common: 0,
    uncommon: 1,
    rare: 2,
    epic: 2,
    legendary: 3,
    mythic: 3,
};

/** Rarity scales affix numbers up, so a legendary roll beats a rare one. */
const AFFIX_POWER: Record<Rarity, number> = {
    common: 1, uncommon: 1, rare: 1.15, epic: 1.35, legendary: 1.6, mythic: 2,
};

function pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function scaleStats(stats: Partial<Stats> | undefined, mult: number, floorScale: number): Partial<Stats> {
    if (!stats) return {};
    const out: Partial<Stats> = {};
    for (const [k, v] of Object.entries(stats) as [keyof Stats, number][]) {
        if (k === 'critChance') {
            out[k] = Math.round(v * mult * 1000) / 1000;
        } else if (k === 'spd') {
            out[k] = Math.round(v * mult * 10) / 10;
        } else {
            // Flat stats also grow a little with depth so floor-90 drops matter
            out[k] = Math.max(1, Math.round(v * mult * floorScale));
        }
    }
    return out;
}

/**
 * Roll affixes onto a base item, returning a NEW def. The base definition in
 * items.ts is never mutated — every drop is its own object.
 */
export function rollAffixes(base: ItemDef, floor: number): ItemDef {
    // Only gear rolls affixes
    if (!base.equipSlot) return base;
    // Boss weapons and forged pieces are already bespoke
    if (base.isBossWeapon || base.isForged) return base;

    const count = AFFIX_COUNT[base.rarity] ?? 0;
    if (count === 0) return base;

    const mult = AFFIX_POWER[base.rarity] ?? 1;
    const floorScale = 1 + Math.min(1.2, floor / 90);

    const chosen: Affix[] = [];
    // One prefix, then a suffix, then a second prefix for the best rarities
    const pools = [PREFIXES, SUFFIXES, PREFIXES];
    for (let i = 0; i < count; i++) {
        for (let attempt = 0; attempt < 8; attempt++) {
            const a = pick(pools[i % pools.length]);
            if (chosen.some(c => c.id === a.id)) continue;
            // Don't stack two elements on one item
            if (a.element && chosen.some(c => c.element)) continue;
            chosen.push(a);
            break;
        }
    }
    if (chosen.length === 0) return base;

    // Merge stats
    const stats: Partial<Stats> = { ...(base.stats || {}) };
    for (const a of chosen) {
        const scaled = scaleStats(a.stats, mult, floorScale);
        for (const [k, v] of Object.entries(scaled) as [keyof Stats, number][]) {
            stats[k] = (stats[k] ?? 0) + v;
        }
    }

    // Name: prefix + base + suffix
    const prefix = chosen.find(a => a.kind === 'prefix');
    const suffix = chosen.find(a => a.kind === 'suffix');
    const name = [prefix?.label, base.name, suffix?.label].filter(Boolean).join(' ');

    // Element and proc come from whichever affix carries them
    const elemental = chosen.find(a => a.element) || chosen.find(a => a.procStatus);
    const element: Element | undefined = elemental?.element ?? base.element;

    const valueMult = chosen.reduce((m, a) => m * a.value, 1);

    return {
        ...base,
        id: `${base.id}__${chosen.map(c => c.id).join('_')}_${Math.floor(Math.random() * 1e6)}`,
        name,
        description: base.description,
        stats: stats as ItemDef['stats'],
        affixes: chosen,
        element,
        procChance: elemental?.procChance,
        procStatus: elemental?.procStatus,
        procPower: (elemental?.procPower ?? 1) * mult,
        procDuration: elemental?.procDuration ?? 1,
        value: Math.floor(base.value * valueMult),
    };
}

/** Human-readable affix lines for tooltips. */
export function describeAffixes(def: ItemDef): string[] {
    if (!def.affixes || def.affixes.length === 0) return [];
    return def.affixes.map(a => {
        const bits: string[] = [];
        if (a.stats) {
            for (const [k, v] of Object.entries(a.stats)) {
                if (k === 'critChance') bits.push(`+${Math.round((v as number) * 100)}% CRIT`);
                else bits.push(`${(v as number) > 0 ? '+' : ''}${v} ${k.toUpperCase()}`);
            }
        }
        if (a.procStatus) {
            bits.push(`${Math.round((a.procChance ?? 0) * 100)}% ${a.procStatus}`);
        }
        return `${a.label} — ${bits.join(', ')}`;
    });
}
