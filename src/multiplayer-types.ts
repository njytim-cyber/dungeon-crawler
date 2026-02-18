// ===== MULTIPLAYER TYPES =====

import type { ClassName, Direction, Stats, Equipment, ItemDef } from './types';

// ===== USER / AUTH =====
export interface UserProfile {
    uid: string;           // unique user ID
    email: string;
    username: string;
    avatar: number;        // avatar index (0-11)
    isLoggedIn: boolean;
    isAdmin: boolean;
    friends: string[];     // UIDs
    friendRequests: FriendRequest[];
    nameColor?: string;    // colorful nametag for logged-in users
    createdAt: number;
}

export interface FriendRequest {
    fromUid: string;
    fromUsername: string;
    fromAvatar: number;
    timestamp: number;
}

export interface FriendInfo {
    uid: string;
    username: string;
    avatar: number;
    online: boolean;
    currentLobby?: string;     // lobby code if in one
    lobbyFull?: boolean;
}

// ===== LOBBY =====
export type LobbyVisibility = 'public' | 'private';

export interface LobbyInfo {
    code: string;          // unique lobby code (e.g. "We3H7Ng8")
    name: string;          // display name
    hostUid: string;
    hostUsername: string;
    visibility: LobbyVisibility;
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
    className: ClassName;
    ready: boolean;
    isHost: boolean;
    nameColor?: string;
}

// ===== GAME SYNC =====
export interface RemotePlayerState {
    uid: string;
    username: string;
    avatar: number;
    className: ClassName;
    x: number;
    y: number;
    px: number;
    py: number;
    dir: Direction;
    animFrame: number;
    stats: Stats;
    equipment: Equipment;
    alive: boolean;
    level: number;
    nameColor?: string;
}

// ===== NETWORK MESSAGES =====
// Client -> Server
export type ClientMessage =
    | { type: 'auth'; email: string; username: string }
    | { type: 'set_username'; username: string }
    | { type: 'set_avatar'; avatar: number }
    | { type: 'friend_request'; targetUsername: string }
    | { type: 'friend_accept'; fromUid: string }
    | { type: 'friend_decline'; fromUid: string }
    | { type: 'create_lobby'; name: string; visibility: LobbyVisibility }
    | { type: 'join_lobby'; code: string }
    | { type: 'leave_lobby' }
    | { type: 'set_class'; className: ClassName }
    | { type: 'toggle_ready' }
    | { type: 'start_game' }
    | { type: 'player_move'; x: number; y: number; dir: Direction; px: number; py: number; animFrame: number }
    | { type: 'player_attack'; enemyIndex: number; damage: number; killed: boolean }
    | { type: 'player_stats'; stats: Stats; level: number; equipment: Equipment; alive: boolean }
    | { type: 'floor_change'; floor: number; seed: number }
    | { type: 'share_loot'; xp: number; gold: number; enemyType: string }
    | { type: 'revive_request'; targetUid: string }
    | { type: 'emote'; emoteId: number }
    | { type: 'teleport_request' }
    | { type: 'chat'; message: string }
    | { type: 'list_public_lobbies' }
    | { type: 'ping'; timestamp: number };

// Server -> Client
export type ServerMessage =
    | { type: 'auth_ok'; profile: UserProfile; starterGear?: ItemDef[] }
    | { type: 'auth_error'; message: string }
    | { type: 'profile_updated'; profile: Partial<UserProfile> }
    | { type: 'friend_list'; friends: FriendInfo[] }
    | { type: 'friend_request_received'; request: FriendRequest }
    | { type: 'friend_request_sent'; targetUsername: string }
    | { type: 'friend_request_error'; message: string }
    | { type: 'lobby_created'; lobby: LobbyInfo }
    | { type: 'lobby_joined'; lobby: LobbyInfo }
    | { type: 'lobby_updated'; lobby: LobbyInfo }
    | { type: 'lobby_left' }
    | { type: 'lobby_error'; message: string }
    | { type: 'lobby_full'; code: string }
    | { type: 'public_lobbies'; lobbies: LobbyInfo[] }
    | { type: 'game_start'; floor: number; seed: number }
    | { type: 'player_joined'; player: RemotePlayerState }
    | { type: 'player_left'; uid: string }
    | { type: 'player_update'; uid: string; x: number; y: number; dir: Direction; px: number; py: number; animFrame: number }
    | { type: 'player_stats_update'; uid: string; stats: Stats; level: number; equipment: Equipment; alive: boolean }
    | { type: 'enemy_damage'; enemyIndex: number; damage: number; fromUid: string }
    | { type: 'enemy_killed'; enemyIndex: number; killerUid: string }
    | { type: 'floor_change'; floor: number; seed: number; fromUid: string }
    | { type: 'shared_loot'; xp: number; gold: number; enemyType: string; killerUsername: string }
    | { type: 'revive_player'; targetUid: string; fromUid: string; fromUsername: string }
    | { type: 'emote'; fromUid: string; fromUsername: string; emoteId: number }
    | { type: 'teleport_info'; hostUid: string; hostX: number; hostY: number }
    | { type: 'chat_msg'; fromUid: string; fromUsername: string; message: string; nameColor?: string }
    | { type: 'admin_reward'; reason: string; levelUp: number; skillPoints: number; message: string }
    | { type: 'pong'; timestamp: number };

// ===== AVATAR DEFINITIONS =====
export const AVATARS = [
    { id: 0, name: 'Knight', emoji: '🛡️', colors: { body: '#c0392b', accent: '#e74c3c' } },
    { id: 1, name: 'Wizard', emoji: '🧙', colors: { body: '#2980b9', accent: '#3498db' } },
    { id: 2, name: 'Rogue', emoji: '🗡️', colors: { body: '#2c3e50', accent: '#34495e' } },
    { id: 3, name: 'Healer', emoji: '✨', colors: { body: '#27ae60', accent: '#2ecc71' } },
    { id: 4, name: 'Archer', emoji: '🏹', colors: { body: '#d35400', accent: '#e67e22' } },
    { id: 5, name: 'Berserker', emoji: '🪓', colors: { body: '#8e44ad', accent: '#9b59b6' } },
    { id: 6, name: 'Paladin', emoji: '⚔️', colors: { body: '#f39c12', accent: '#f1c40f' } },
    { id: 7, name: 'Shadow', emoji: '🌑', colors: { body: '#1a1a2e', accent: '#16213e' } },
    { id: 8, name: 'Elemental', emoji: '🔥', colors: { body: '#e74c3c', accent: '#f39c12' } },
    { id: 9, name: 'Frost', emoji: '❄️', colors: { body: '#74b9ff', accent: '#0984e3' } },
    { id: 10, name: 'Nature', emoji: '🌿', colors: { body: '#00b894', accent: '#55efc4' } },
    { id: 11, name: 'Cosmic', emoji: '🌌', colors: { body: '#6c5ce7', accent: '#a29bfe' } },
];

// Login bonus gear IDs
export const LOGIN_STARTER_GEAR = {
    weapon: 'iron_sword_login',
    armor: 'leather_armor_login',
    ring: 'ruby_ring_login',
};

// Generate a random lobby code
export function generateLobbyCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}
