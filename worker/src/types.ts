// ===== SHARED TYPES =====
// Types shared between Durable Objects and the Worker entry point

export interface UserProfile {
    uid: string;
    email: string;
    username: string;
    avatar: number;
    isLoggedIn: boolean;
    isAdmin: boolean;
    friends: string[];
    friendRequests: FriendRequest[];
    nameColor?: string;
    createdAt: number;
}

export interface FriendRequest {
    fromUid: string;
    fromUsername: string;
    fromAvatar: number;
    timestamp: number;
}

export interface LobbyInfo {
    code: string;
    name: string;
    hostUid: string;
    hostUsername: string;
    visibility: 'public' | 'private';
    players: LobbyPlayer[];
    maxPlayers: 7;
    minPlayers: 2;
    gameStarted: boolean;
    floor: number;
    createdAt: number;
}

export interface LobbyPlayer {
    uid: string;
    username: string;
    avatar: number;
    className: string;
    ready: boolean;
    isHost: boolean;
    nameColor?: string;
}

export interface FriendInfo {
    uid: string;
    username: string;
    avatar: number;
    online: boolean;
    currentLobby?: string;
    lobbyFull: boolean;
}

export interface ConnectedPlayer {
    uid: string;
    profile: UserProfile | null;
    x: number;
    y: number;
    px: number;
    py: number;
    dir: number;
    animFrame: number;
}

// Admin emails — admins get +1 level & skill point per player login
export const ADMIN_EMAILS = new Set<string>([
    'evanngjianen@gmail.com',
    'ethanngjianheng@gmail.com',
]);

// Login bonus items
export const LOGIN_STARTER_GEAR = [
    {
        id: 'iron_sword_login', name: 'Iron Sword ★', description: 'A sturdy iron sword, reward for logging in.',
        category: 'weapon', rarity: 'uncommon', icon: 'sword', equipSlot: 'weapon',
        stats: { atk: 5 }, value: 50, stackable: false,
    },
    {
        id: 'leather_armor_login', name: 'Leather Armor ★', description: 'Supple leather armor, reward for logging in.',
        category: 'armor', rarity: 'uncommon', icon: 'armor', equipSlot: 'armor',
        stats: { def: 4, maxHp: 10 }, value: 40, stackable: false,
    },
    {
        id: 'ruby_ring_login', name: 'Ruby Ring ★', description: 'A glowing ruby ring, reward for logging in.',
        category: 'ring', rarity: 'rare', icon: 'ring', equipSlot: 'ring',
        stats: { critChance: 0.08, atk: 2 }, value: 80, stackable: false,
    },
];

// Helpers
export function generateNameColor(): string {
    const colors = [
        '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff',
        '#5f27cd', '#01a3a4', '#f368e0', '#ff6348', '#7bed9f',
        '#e056fd', '#686de0', '#30336b', '#22a6b3', '#eb4d4b',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

export function generateLobbyCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

export function generateUid(): string {
    return `user_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// Cloudflare env bindings
export interface Env {
    GAME_LOBBY: DurableObjectNamespace;
    USER_REGISTRY: DurableObjectNamespace;
}
