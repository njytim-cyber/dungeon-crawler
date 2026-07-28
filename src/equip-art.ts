// ===== EQUIPPED GEAR ON THE CHARACTER =====
// The base sprite is drawn bare-handed; whatever you have equipped is painted
// on top. Every named weapon gets its own silhouette and palette, armour
// changes the torso and shoulders, and a ring puts a stone on your hand.

import type { ItemDef, PlayerState, Element } from './types';

// -------------------------------------------------------------------
// WEAPON LOOKS
// -------------------------------------------------------------------

export type WeaponShape =
    | 'shortsword' | 'longsword' | 'greatsword' | 'sabre'
    | 'hatchet' | 'battleaxe' | 'greataxe'
    | 'knife' | 'dirk'
    | 'quarterstaff' | 'crookstaff' | 'orbstaff'
    | 'shortbow' | 'longbow' | 'recurve'
    | 'club' | 'warhammer';

export interface WeaponLook {
    shape: WeaponShape;
    /** Blade / head colour */
    metal: string;
    metalHi: string;
    /** Grip and haft */
    grip: string;
    /** Pommel, gem, glow */
    accent: string;
    /** Emissive trail, null for mundane weapons */
    glow: string | null;
}

const SHAPE_BY_ICON: Record<string, WeaponShape> = {
    sword: 'longsword', axe: 'battleaxe', dagger: 'knife',
    staff: 'quarterstaff', bow: 'shortbow', shield: 'club',
};

/**
 * Per-item appearance. Anything not listed falls back to a look derived from
 * its icon, rarity and element, so new items still look sensible.
 */
const LOOKS: Record<string, WeaponLook> = {
    // --- swords ---
    rusty_sword: { shape: 'shortsword', metal: '#6e6a5e', metalHi: '#938d7c', grip: '#4a3526', accent: '#7a6a4a', glow: null },
    bronze_sword: { shape: 'shortsword', metal: '#a87a3c', metalHi: '#d8a860', grip: '#5c4028', accent: '#e0b060', glow: null },
    iron_sword: { shape: 'longsword', metal: '#8a9099', metalHi: '#c2c8d0', grip: '#4a3526', accent: '#6b7280', glow: null },
    steel_sword: { shape: 'longsword', metal: '#a8b0ba', metalHi: '#e4ebf2', grip: '#3a2c20', accent: '#8a94a0', glow: null },
    knights_blade: { shape: 'longsword', metal: '#b4bcc6', metalHi: '#eef3f8', grip: '#2f4a6b', accent: '#c8a13c', glow: null },
    runed_longsword: { shape: 'longsword', metal: '#9aa4b4', metalHi: '#dfe8f4', grip: '#3a2c48', accent: '#8a6bb0', glow: '#a97bff' },
    glacier_edge: { shape: 'longsword', metal: '#9ed3ee', metalHi: '#e8f8ff', grip: '#2f4a6b', accent: '#7fd8ff', glow: '#7fd8ff' },
    flame_sword: { shape: 'sabre', metal: '#c4562a', metalHi: '#ff9a4a', grip: '#3a1c10', accent: '#ffd166', glow: '#ff7a33' },
    dragon_blade: { shape: 'greatsword', metal: '#8c2f1f', metalHi: '#e8a33d', grip: '#2c0d08', accent: '#ffb13d', glow: '#ff9a3d' },
    sunsteel_greatsword: { shape: 'greatsword', metal: '#c9a227', metalHi: '#fff0b8', grip: '#5a4014', accent: '#ffe9a8', glow: '#ffd166' },
    shadow_reaper: { shape: 'sabre', metal: '#2a2438', metalHi: '#6b5c8a', grip: '#12101a', accent: '#a97bff', glow: '#8c5cff' },
    void_scythe: { shape: 'sabre', metal: '#1a1430', metalHi: '#6b4fd0', grip: '#0a0818', accent: '#c9a4ff', glow: '#8c5cff' },
    inferno_blade: { shape: 'greatsword', metal: '#7a1c0c', metalHi: '#ff8a3d', grip: '#2a0c04', accent: '#ffd166', glow: '#ff5722' },
    world_ender: { shape: 'greatsword', metal: '#3a0d18', metalHi: '#ff4d6d', grip: '#160408', accent: '#ffdd57', glow: '#ff2d55' },
    guardsman_blade: { shape: 'longsword', metal: '#9aa6b4', metalHi: '#e0e8f2', grip: '#243040', accent: '#5c7ea6', glow: null },
    ashwalkers_edge: { shape: 'greatsword', metal: '#6b6358', metalHi: '#c8b39a', grip: '#2a231c', accent: '#e8c88a', glow: '#e8c88a' },

    // --- axes ---
    bone_axe: { shape: 'hatchet', metal: '#ddd2b4', metalHi: '#f7f0dc', grip: '#5c4028', accent: '#a8987a', glow: null },
    hatchet: { shape: 'hatchet', metal: '#8a9099', metalHi: '#c2c8d0', grip: '#6b4a2c', accent: '#6b7280', glow: null },
    war_axe: { shape: 'battleaxe', metal: '#98a0aa', metalHi: '#d8e0e8', grip: '#4a3526', accent: '#7a828c', glow: null },
    berserker_axe: { shape: 'greataxe', metal: '#8a3a2a', metalHi: '#d86a4a', grip: '#33180c', accent: '#ff6a2a', glow: '#ff5722' },
    executioner_axe: { shape: 'greataxe', metal: '#4a4a54', metalHi: '#9aa0aa', grip: '#1c1c22', accent: '#c0392b', glow: null },
    thunder_hammer: { shape: 'warhammer', metal: '#8a94a8', metalHi: '#e8f0ff', grip: '#3a3a48', accent: '#ffe066', glow: '#ffe066' },
    frost_maul: { shape: 'warhammer', metal: '#8fc4e8', metalHi: '#e8f8ff', grip: '#264a66', accent: '#7fd8ff', glow: '#6fe3ff' },
    slime_mace: { shape: 'club', metal: '#3fa96b', metalHi: '#8ef0b4', grip: '#164028', accent: '#a6ffcf', glow: '#5ddb8c' },
    saints_femur: { shape: 'club', metal: '#e8dcc0', metalHi: '#fbf6e6', grip: '#8a7a5c', accent: '#ffe9a8', glow: '#ffe9a8' },
    slag_render: { shape: 'greataxe', metal: '#5c1f10', metalHi: '#ff9a4a', grip: '#2a0e06', accent: '#ff6a2a', glow: '#ff6a2a' },
    magistrates_maul: { shape: 'warhammer', metal: '#6b7280', metalHi: '#c0c8d4', grip: '#2a3038', accent: '#a55eea', glow: null },

    // --- daggers ---
    iron_dagger: { shape: 'knife', metal: '#8a9099', metalHi: '#c8ced6', grip: '#4a3526', accent: '#6b7280', glow: null },
    hunting_knife: { shape: 'knife', metal: '#9aa0a8', metalHi: '#d4dae2', grip: '#5c4028', accent: '#8a6a3c', glow: null },
    venom_fang: { shape: 'dirk', metal: '#5b7a3a', metalHi: '#a8d86a', grip: '#2a3418', accent: '#7ac74f', glow: '#7ac74f' },
    shadow_dagger: { shape: 'dirk', metal: '#2a2438', metalHi: '#6b5c8a', grip: '#12101a', accent: '#a97bff', glow: '#8c5cff' },
    doom_dagger: { shape: 'dirk', metal: '#3a0d18', metalHi: '#c4485e', grip: '#160408', accent: '#ff4d6d', glow: '#ff2d55' },
    kingslayer: { shape: 'dirk', metal: '#c9a227', metalHi: '#fff0b8', grip: '#3a2c14', accent: '#ffe9a8', glow: '#ffd166' },
    duelist_rapier: { shape: 'knife', metal: '#b4bcc6', metalHi: '#eef3f8', grip: '#243040', accent: '#5c7ea6', glow: null },
    hollow_point: { shape: 'dirk', metal: '#12060f', metalHi: '#ff5c78', grip: '#08030a', accent: '#ff2d55', glow: '#ff2d55' },

    // --- staves ---
    oak_staff: { shape: 'quarterstaff', metal: '#6b4a2c', metalHi: '#8a6238', grip: '#4a3220', accent: '#8a6a3c', glow: null },
    apprentice_wand: { shape: 'quarterstaff', metal: '#5c4028', metalHi: '#7a5533', grip: '#3a2818', accent: '#6ba3d8', glow: null },
    arcane_staff: { shape: 'crookstaff', metal: '#4a3a5c', metalHi: '#7a6a90', grip: '#2a1c38', accent: '#8ce9ff', glow: '#6ba3d8' },
    elder_staff: { shape: 'crookstaff', metal: '#3a4a3a', metalHi: '#6a8a6a', grip: '#1c2a1c', accent: '#7ff0c6', glow: '#55efc4' },
    void_staff: { shape: 'orbstaff', metal: '#1a1430', metalHi: '#4a3a7a', grip: '#0a0818', accent: '#c9a4ff', glow: '#8c5cff' },
    stormcaller: { shape: 'orbstaff', metal: '#3a4458', metalHi: '#7a8aa8', grip: '#1c2230', accent: '#ffe066', glow: '#ffe066' },
    starfall_rod: { shape: 'orbstaff', metal: '#2a2450', metalHi: '#6b5cc4', grip: '#14102a', accent: '#e8e0ff', glow: '#a9a0ff' },
    soul_staff: { shape: 'crookstaff', metal: '#3a3444', metalHi: '#7a6c90', grip: '#1c1824', accent: '#8cf0d0', glow: '#7ef0c8' },
    lamplighters_staff: { shape: 'orbstaff', metal: '#3d424a', metalHi: '#7a828c', grip: '#23262b', accent: '#ffe9a8', glow: '#ffd88a' },
    drowned_chorus: { shape: 'orbstaff', metal: '#1d5a6b', metalHi: '#7fe0f0', grip: '#0e3340', accent: '#4fd8e8', glow: '#4fd8e8' },

    // --- bows ---
    short_bow: { shape: 'shortbow', metal: '#6b4a2c', metalHi: '#8a6238', grip: '#4a3220', accent: '#8a7350', glow: null },
    hunters_bow: { shape: 'shortbow', metal: '#5c4028', metalHi: '#8a6238', grip: '#3a2818', accent: '#8fbf5a', glow: null },
    long_bow: { shape: 'longbow', metal: '#7a5533', metalHi: '#a8804a', grip: '#4a3220', accent: '#c8a870', glow: null },
    elven_bow: { shape: 'recurve', metal: '#4a6b4a', metalHi: '#8fbf7a', grip: '#2a3a2a', accent: '#d8f0c0', glow: '#a8e08a' },
    celestial_bow: { shape: 'recurve', metal: '#5c6ba8', metalHi: '#b8c8ff', grip: '#2a3050', accent: '#e8f0ff', glow: '#8ca8ff' },
    windpiercer: { shape: 'recurve', metal: '#6b7a8a', metalHi: '#c8d8e8', grip: '#3a4450', accent: '#8ce9ff', glow: '#8ce9ff' },
    clocksprung_bow: { shape: 'longbow', metal: '#8a7a5c', metalHi: '#d8c8a0', grip: '#4a4030', accent: '#a55eea', glow: null },
};

const RARITY_GLOW: Record<string, string | null> = {
    common: null, uncommon: null, rare: null,
    epic: '#a55eea', legendary: '#ffb13d', mythic: '#ff2d55',
};

const ELEMENT_GLOW: Partial<Record<Element, string>> = {
    fire: '#ff7a33', ice: '#7fd8ff', poison: '#7ac74f',
    shadow: '#a97bff', lightning: '#ffe066', holy: '#ffe9a8',
};

/** Resolve a look for any weapon, listed or not. */
export function getWeaponLook(def: ItemDef | null): WeaponLook | null {
    if (!def) return null;
    // Forged and affixed items carry their base id as a prefix
    const baseId = def.id.split('__')[0];
    const listed = LOOKS[def.id] || LOOKS[baseId];
    if (listed) {
        // An elemental affix recolours the glow even on a known weapon
        const elemGlow = def.element ? ELEMENT_GLOW[def.element] : undefined;
        return elemGlow ? { ...listed, glow: elemGlow, accent: elemGlow } : listed;
    }

    // Fallback: derive from icon + rarity + element
    const shape = SHAPE_BY_ICON[def.icon] ?? 'longsword';
    const glow = (def.element && ELEMENT_GLOW[def.element]) || RARITY_GLOW[def.rarity] || null;
    const metalByRarity: Record<string, [string, string]> = {
        common: ['#7d858e', '#a9b1b8'],
        uncommon: ['#8fa197', '#bccdc2'],
        rare: ['#5c7ea6', '#93b6d8'],
        epic: ['#6b4a9e', '#b28fe0'],
        legendary: ['#a06a22', '#e0a94a'],
        mythic: ['#7a1028', '#ff5c78'],
    };
    const [metal, metalHi] = metalByRarity[def.rarity] ?? metalByRarity.common;
    return { shape, metal, metalHi, grip: '#4a3526', accent: glow ?? '#8a8f98', glow };
}

// -------------------------------------------------------------------
// DRAWING
// -------------------------------------------------------------------

/**
 * Paint the equipped weapon in the character's hand.
 * Coordinates are in the sprite's own 32x64 space; the caller has already
 * translated and scaled.
 */
export function drawWeapon(
    ctx: CanvasRenderingContext2D,
    look: WeaponLook,
    handX: number,
    handY: number,
    facingSide: boolean,
    swing: number,      // 0 = idle, >0 = mid-swing
): void {
    ctx.save();
    ctx.translate(handX, handY);
    // A swing rotates the weapon forward through ~100 degrees
    if (swing > 0) ctx.rotate(-0.9 + swing * 1.8);
    if (look.glow) {
        ctx.shadowColor = look.glow;
        ctx.shadowBlur = 6;
    }

    const blade = (len: number, wide: number, taper = 0.5) => {
        ctx.fillStyle = look.metal;
        ctx.beginPath();
        ctx.moveTo(0, -len);
        ctx.lineTo(wide, -len * taper);
        ctx.lineTo(wide * 0.8, 2);
        ctx.lineTo(-wide * 0.8, 2);
        ctx.lineTo(-wide, -len * taper);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = look.metalHi;
        ctx.fillRect(-wide * 0.35, -len * 0.9, wide * 0.5, len * 0.85);
    };

    switch (look.shape) {
        case 'shortsword': blade(13, 2); break;
        case 'longsword': blade(18, 2.4); break;
        case 'greatsword': blade(24, 3.4); break;
        case 'sabre': {
            ctx.strokeStyle = look.metal; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(0, 2); ctx.quadraticCurveTo(6, -10, 3, -20); ctx.stroke();
            ctx.strokeStyle = look.metalHi; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(1, 0); ctx.quadraticCurveTo(6, -10, 3.5, -19); ctx.stroke();
            break;
        }
        case 'knife': blade(9, 1.8); break;
        case 'dirk': blade(12, 2); break;

        case 'hatchet':
        case 'battleaxe':
        case 'greataxe': {
            const L = look.shape === 'hatchet' ? 14 : look.shape === 'battleaxe' ? 18 : 22;
            const H = look.shape === 'greataxe' ? 9 : 7;
            ctx.fillStyle = look.grip;
            ctx.fillRect(-1, -L, 2, L + 4);
            ctx.fillStyle = look.metal;
            ctx.beginPath();
            ctx.moveTo(1, -L);
            ctx.quadraticCurveTo(H, -L + 2, H - 1, -L + H);
            ctx.lineTo(1, -L + H * 0.7);
            ctx.closePath(); ctx.fill();
            if (look.shape === 'greataxe') {
                ctx.beginPath();
                ctx.moveTo(-1, -L);
                ctx.quadraticCurveTo(-H, -L + 2, -H + 1, -L + H);
                ctx.lineTo(-1, -L + H * 0.7);
                ctx.closePath(); ctx.fill();
            }
            ctx.fillStyle = look.metalHi;
            ctx.fillRect(H - 2.4, -L + 1.5, 1.2, H - 2);
            break;
        }

        case 'club':
        case 'warhammer': {
            const L = 16;
            ctx.fillStyle = look.grip;
            ctx.fillRect(-1, -L, 2, L + 4);
            ctx.fillStyle = look.metal;
            if (look.shape === 'club') {
                ctx.beginPath(); ctx.ellipse(0, -L - 1, 4.5, 5.5, 0, 0, Math.PI * 2); ctx.fill();
            } else {
                ctx.fillRect(-5, -L - 5, 10, 7);
            }
            ctx.fillStyle = look.metalHi;
            ctx.beginPath(); ctx.arc(-1.5, -L - 2.5, 1.6, 0, Math.PI * 2); ctx.fill();
            break;
        }

        case 'quarterstaff':
        case 'crookstaff':
        case 'orbstaff': {
            ctx.fillStyle = look.grip;
            ctx.fillRect(-1, -22, 2, 30);
            ctx.fillStyle = look.metal;
            ctx.fillRect(-1.2, -22, 1, 30);
            if (look.shape === 'crookstaff') {
                ctx.strokeStyle = look.metal; ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(0, -22); ctx.quadraticCurveTo(-6, -27, -1, -30);
                ctx.stroke();
            }
            if (look.shape === 'orbstaff' || look.shape === 'crookstaff') {
                ctx.fillStyle = look.accent;
                ctx.beginPath(); ctx.arc(0, -25, 3.4, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.75)';
                ctx.beginPath(); ctx.arc(-1, -26, 1.2, 0, Math.PI * 2); ctx.fill();
            }
            break;
        }

        case 'shortbow':
        case 'longbow':
        case 'recurve': {
            const L = look.shape === 'shortbow' ? 12 : look.shape === 'longbow' ? 18 : 15;
            ctx.strokeStyle = look.metal;
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            if (look.shape === 'recurve') {
                ctx.moveTo(0, -L);
                ctx.quadraticCurveTo(9, -L * 0.4, 4, 0);
                ctx.quadraticCurveTo(9, L * 0.4, 0, L);
            } else {
                ctx.moveTo(0, -L);
                ctx.quadraticCurveTo(8, 0, 0, L);
            }
            ctx.stroke();
            ctx.strokeStyle = 'rgba(240,240,230,0.8)';
            ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.moveTo(0, -L); ctx.lineTo(0, L); ctx.stroke();
            ctx.fillStyle = look.accent;
            ctx.fillRect(-1, -2, 2, 4);
            break;
        }
    }

    // Hilt furniture for bladed weapons
    if (['shortsword', 'longsword', 'greatsword', 'sabre', 'knife', 'dirk'].includes(look.shape)) {
        const guardW = look.shape === 'greatsword' ? 7 : look.shape === 'knife' ? 3.5 : 5;
        ctx.fillStyle = look.accent;
        ctx.fillRect(-guardW, 1, guardW * 2, 2);
        ctx.fillStyle = look.grip;
        ctx.fillRect(-1.2, 3, 2.4, 5);
        ctx.fillStyle = look.accent;
        ctx.beginPath(); ctx.arc(0, 8.5, 1.6, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
    void facingSide;
}

// -------------------------------------------------------------------
// ARMOUR
// -------------------------------------------------------------------

export interface ArmorLook {
    plate: string;
    plateHi: string;
    trim: string;
    /** 'plate' = rigid segments, 'mail' = ring texture, 'robe' = cloth */
    style: 'plate' | 'mail' | 'robe' | 'leather';
    glow: string | null;
}

const ARMOR_LOOKS: Record<string, ArmorLook> = {
    padded_jerkin: { plate: '#6b5c48', plateHi: '#8a7a62', trim: '#4a3f30', style: 'leather', glow: null },
    leather_armor: { plate: '#7a5533', plateHi: '#a8804a', trim: '#4a3220', style: 'leather', glow: null },
    chain_mail: { plate: '#8a939e', plateHi: '#c4ccd6', trim: '#5c646e', style: 'mail', glow: null },
    scale_mail: { plate: '#7a8a76', plateHi: '#b0c0aa', trim: '#4a5648', style: 'mail', glow: null },
    plate_armor: { plate: '#98a2ae', plateHi: '#dde4ec', trim: '#6b7280', style: 'plate', glow: null },
    warden_plate: { plate: '#8fc4e8', plateHi: '#e0f2ff', trim: '#5d94c4', style: 'plate', glow: '#7fd8ff' },
    dragon_armor: { plate: '#8c2f1f', plateHi: '#d86a4a', trim: '#e8a33d', style: 'plate', glow: '#ff9a3d' },
    voidweave_shroud: { plate: '#2a2438', plateHi: '#5c4f7a', trim: '#a97bff', style: 'robe', glow: '#8c5cff' },
    abyssal_carapace: { plate: '#3a0d18', plateHi: '#8a2438', trim: '#ff4d6d', style: 'plate', glow: '#ff2d55' },
    civic_plate: { plate: '#6b7280', plateHi: '#b4bcc8', trim: '#a55eea', style: 'plate', glow: null },
};

export function getArmorLook(def: ItemDef | null): ArmorLook | null {
    if (!def) return null;
    const baseId = def.id.split('__')[0];
    const listed = ARMOR_LOOKS[def.id] || ARMOR_LOOKS[baseId];
    if (listed) return listed;
    const byRarity: Record<string, ArmorLook> = {
        common: { plate: '#7a6a58', plateHi: '#9a8a72', trim: '#4a3f30', style: 'leather', glow: null },
        uncommon: { plate: '#7a8a76', plateHi: '#b0c0aa', trim: '#4a5648', style: 'mail', glow: null },
        rare: { plate: '#7a8aa8', plateHi: '#c0cde0', trim: '#4a5a78', style: 'plate', glow: null },
        epic: { plate: '#6b4a9e', plateHi: '#b28fe0', trim: '#a55eea', style: 'plate', glow: '#a55eea' },
        legendary: { plate: '#a06a22', plateHi: '#e0a94a', trim: '#ffd166', style: 'plate', glow: '#ffb13d' },
        mythic: { plate: '#7a1028', plateHi: '#ff5c78', trim: '#ff2d55', style: 'plate', glow: '#ff2d55' },
    };
    return byRarity[def.rarity] ?? byRarity.common;
}

/** Paint armour over the torso and shoulders of the base sprite. */
export function drawArmor(
    ctx: CanvasRenderingContext2D,
    look: ArmorLook,
    cx: number,
    torsoTop: number,
    torsoH: number,
): void {
    ctx.save();
    if (look.glow) { ctx.shadowColor = look.glow; ctx.shadowBlur = 4; }

    const top = torsoTop;
    const bot = torsoTop + torsoH;

    // Cuirass / robe body
    ctx.fillStyle = look.plate;
    ctx.beginPath();
    ctx.moveTo(cx - 8, top);
    ctx.lineTo(cx + 8, top);
    ctx.lineTo(cx + 6.5, bot);
    ctx.lineTo(cx - 6.5, bot);
    ctx.closePath();
    ctx.fill();

    // Lit edge
    ctx.fillStyle = look.plateHi;
    ctx.fillRect(cx - 8, top, 3.5, torsoH);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(cx + 4, top, 3.5, torsoH);

    switch (look.style) {
        case 'plate':
            // Rigid lames across the belly
            ctx.strokeStyle = 'rgba(0,0,0,0.4)';
            for (let i = 1; i <= 3; i++) {
                const y = top + (torsoH / 4) * i;
                ctx.beginPath(); ctx.moveTo(cx - 7, y); ctx.quadraticCurveTo(cx, y + 1.6, cx + 6, y); ctx.stroke();
            }
            ctx.fillStyle = look.plateHi;
            ctx.fillRect(cx - 1, top + 1, 1.5, torsoH - 2);   // centre ridge
            break;
        case 'mail':
            // Ring texture
            ctx.fillStyle = 'rgba(0,0,0,0.28)';
            for (let y = top + 2; y < bot - 1; y += 2) {
                for (let x = cx - 7; x < cx + 6; x += 2) {
                    ctx.fillRect(x + ((y % 4 === 0) ? 0 : 1), y, 1, 1);
                }
            }
            break;
        case 'robe':
            // Hanging folds
            ctx.fillStyle = 'rgba(0,0,0,0.32)';
            ctx.fillRect(cx - 4, top + 2, 1, torsoH - 3);
            ctx.fillRect(cx + 2, top + 3, 1, torsoH - 4);
            break;
        case 'leather':
            // Straps and a buckle
            ctx.fillStyle = look.trim;
            ctx.fillRect(cx - 8, top + torsoH * 0.35, 16, 1.6);
            ctx.fillRect(cx - 8, top + torsoH * 0.65, 16, 1.6);
            break;
    }

    // Pauldrons
    ctx.fillStyle = look.plate;
    ctx.beginPath(); ctx.ellipse(cx - 8.5, top + 3, 4.4, 3.4, -0.25, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 8.5, top + 3, 4.4, 3.4, 0.25, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = look.plateHi;
    ctx.beginPath(); ctx.ellipse(cx - 8.5, top + 2, 3.2, 1.5, -0.25, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 8.5, top + 2, 3.2, 1.5, 0.25, 0, Math.PI * 2); ctx.fill();

    // Collar trim
    ctx.fillStyle = look.trim;
    ctx.fillRect(cx - 6, top - 1, 12, 2);

    ctx.restore();
}

// -------------------------------------------------------------------
// RINGS
// -------------------------------------------------------------------

const RING_STONE: Record<string, string> = {
    iron_ring: '#9aa0a8',
    band_of_vigor: '#e0736b',
    ruby_ring: '#e74c3c',
    sapphire_ring: '#3fa9f5',
    emerald_ring: '#2ecc71',
    swiftstep_ring: '#8ce9ff',
    ring_of_power: '#f1c40f',
    ring_of_the_archon: '#a55eea',
    abyssal_signet: '#ff2d55',
    signet_of_office: '#a55eea',
};

export function getRingColor(def: ItemDef | null): string | null {
    if (!def) return null;
    const baseId = def.id.split('__')[0];
    return RING_STONE[def.id] || RING_STONE[baseId] || '#c8ccd4';
}

/** A band and a stone on the hand, plus a faint aura on high rarities. */
export function drawRing(
    ctx: CanvasRenderingContext2D,
    color: string,
    handX: number,
    handY: number,
    strong: boolean,
    time: number,
): void {
    ctx.save();
    // Band
    ctx.strokeStyle = '#c9b57a';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(handX, handY, 1.8, 0, Math.PI * 2); ctx.stroke();
    // Stone
    ctx.shadowColor = color;
    ctx.shadowBlur = strong ? 7 : 3;
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(handX, handY - 1.6, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.arc(handX - 0.4, handY - 2, 0.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    if (strong) {
        const pulse = 0.25 + Math.sin(time * 0.005) * 0.15;
        ctx.save();
        ctx.globalAlpha = pulse;
        const g = ctx.createRadialGradient(handX, handY, 0, handX, handY, 7);
        g.addColorStop(0, color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(handX - 7, handY - 7, 14, 14);
        ctx.restore();
    }
}

/** Where the weapon hand sits in sprite space for a given facing. */
export function getHandAnchor(dir: number): { x: number; y: number } {
    // Sprite is 32 wide; the off-hand is drawn at x = 16 +/- 9
    switch (dir) {
        case 2: return { x: 7, y: 30 };    // left
        case 3: return { x: 25, y: 30 };   // right
        case 1: return { x: 24, y: 30 };   // up (behind the body)
        default: return { x: 25, y: 31 };  // down
    }
}

/** Convenience: is this piece flashy enough to deserve an aura? */
export function isStrongRarity(def: ItemDef | null): boolean {
    return !!def && (def.rarity === 'epic' || def.rarity === 'legendary' || def.rarity === 'mythic');
}

export function playerHasRangedWeapon(player: PlayerState): boolean {
    const icon = player.equipment.weapon?.icon;
    return icon === 'bow' || icon === 'staff';
}
