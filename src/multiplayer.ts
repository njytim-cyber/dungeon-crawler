// ===== MULTIPLAYER CLIENT =====
// WebSocket client for co-op game sync

import type {
    UserProfile, FriendInfo, FriendRequest, LobbyInfo,
    RemotePlayerState, ClientMessage, ServerMessage, LobbyVisibility
} from './multiplayer-types';
import type { ClassName, Stats, Equipment } from './types';
import { AVATARS } from './multiplayer-types';

// ===== STATE =====
let ws: WebSocket | null = null;
let connected = false;
let reconnectTimer: number | null = null;

// User & social
let localProfile: UserProfile | null = null;
let friendsList: FriendInfo[] = [];
let friendRequests: FriendRequest[] = [];

// Lobby
let currentLobby: LobbyInfo | null = null;
let publicLobbies: LobbyInfo[] = [];

// In-game remote players
const remotePlayers = new Map<string, RemotePlayerState>();

// Event callbacks
type EventCallback = (...args: any[]) => void;
const eventHandlers = new Map<string, EventCallback[]>();

function emit(event: string, ...args: any[]): void {
    const handlers = eventHandlers.get(event);
    if (handlers) for (const h of handlers) h(...args);
}

export function on(event: string, cb: EventCallback): void {
    if (!eventHandlers.has(event)) eventHandlers.set(event, []);
    eventHandlers.get(event)!.push(cb);
}

export function off(event: string, cb: EventCallback): void {
    const handlers = eventHandlers.get(event);
    if (handlers) {
        const idx = handlers.indexOf(cb);
        if (idx !== -1) handlers.splice(idx, 1);
    }
}

// ===== CONNECTION =====
const SERVER_URL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? `ws://${location.host}/ws`
    : `wss://${location.hostname}/ws`; // Production URL

let hasEverConnected = false;
let connectionAttempts = 0;

export function connectToServer(): void {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

    connectionAttempts++;
    console.log('[MP] Connecting to', SERVER_URL, `(attempt ${connectionAttempts})`);
    ws = new WebSocket(SERVER_URL);

    ws.onopen = () => {
        connected = true;
        hasEverConnected = true;
        connectionAttempts = 0;
        console.log('[MP] Connected!');
        emit('connected');
        if (reconnectTimer) { clearInterval(reconnectTimer); reconnectTimer = null; }
    };

    ws.onclose = () => {
        const wasConnected = connected;
        connected = false;
        console.log('[MP] Disconnected');
        if (wasConnected) {
            emit('disconnected');
        } else if (!hasEverConnected) {
            emit('connection_error', 'Could not connect to the co-op server. Make sure the server is running (npm run server:dev).');
        }
        // Auto-reconnect (but slower if never connected)
        if (!reconnectTimer) {
            const delay = hasEverConnected ? 3000 : 8000;
            reconnectTimer = window.setInterval(() => {
                if (!connected) connectToServer();
            }, delay);
        }
    };

    ws.onerror = (_e) => {
        console.error('[MP] Connection error');
        emit('connection_error', 'Server connection failed. Is the server running?');
    };

    ws.onmessage = (event) => {
        let msg: ServerMessage;
        try { msg = JSON.parse(event.data); } catch { return; }
        handleServerMessage(msg);
    };
}

export function disconnect(): void {
    if (ws) ws.close();
    ws = null;
    connected = false;
    if (reconnectTimer) { clearInterval(reconnectTimer); reconnectTimer = null; }
}

function sendMsg(msg: ClientMessage): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
    } else {
        emit('connection_error', 'Not connected to server. Please wait...');
    }
}

// ===== MESSAGE HANDLER =====
function handleServerMessage(msg: ServerMessage): void {
    switch (msg.type) {
        case 'auth_ok':
            localProfile = msg.profile;
            friendRequests = msg.profile.friendRequests;
            emit('auth_ok', msg.profile, msg.starterGear);
            break;

        case 'auth_error':
            emit('auth_error', msg.message);
            break;

        case 'profile_updated':
            if (localProfile) Object.assign(localProfile, msg.profile);
            if (msg.profile.friendRequests) friendRequests = msg.profile.friendRequests;
            emit('profile_updated', msg.profile);
            break;

        case 'friend_list':
            friendsList = msg.friends;
            emit('friends_updated', friendsList);
            break;

        case 'friend_request_received':
            friendRequests.push(msg.request);
            emit('friend_request', msg.request);
            break;

        case 'friend_request_sent':
            emit('friend_request_sent', msg.targetUsername);
            break;

        case 'friend_request_error':
            emit('friend_request_error', msg.message);
            break;

        case 'lobby_created':
            currentLobby = msg.lobby;
            emit('lobby_created', msg.lobby);
            break;

        case 'lobby_joined':
            currentLobby = msg.lobby;
            emit('lobby_joined', msg.lobby);
            break;

        case 'lobby_updated':
            currentLobby = msg.lobby;
            emit('lobby_updated', msg.lobby);
            break;

        case 'lobby_left':
            currentLobby = null;
            emit('lobby_left');
            break;

        case 'lobby_error':
            emit('lobby_error', msg.message);
            break;

        case 'lobby_full':
            emit('lobby_full', msg.code);
            break;

        case 'public_lobbies':
            publicLobbies = msg.lobbies;
            emit('public_lobbies', msg.lobbies);
            break;

        case 'game_start':
            emit('game_start', msg.floor, msg.seed);
            break;

        case 'player_joined':
            remotePlayers.set(msg.player.uid, msg.player);
            emit('player_joined', msg.player);
            break;

        case 'player_left':
            remotePlayers.delete(msg.uid);
            emit('player_left', msg.uid);
            break;

        case 'player_update':
            const rp = remotePlayers.get(msg.uid);
            if (rp) {
                rp.x = msg.x; rp.y = msg.y;
                rp.px = msg.px; rp.py = msg.py;
                rp.dir = msg.dir; rp.animFrame = msg.animFrame;
            }
            break;

        case 'player_stats_update':
            const rps = remotePlayers.get(msg.uid);
            if (rps) {
                rps.stats = msg.stats;
                rps.level = msg.level;
                rps.equipment = msg.equipment;
                rps.alive = msg.alive;
            }
            break;

        case 'enemy_damage':
            emit('enemy_damage', msg.enemyIndex, msg.damage, msg.fromUid);
            break;

        case 'enemy_killed':
            emit('enemy_killed', msg.enemyIndex, msg.killerUid);
            break;

        case 'chat_msg':
            emit('chat_msg', msg.fromUid, msg.fromUsername, msg.message, msg.nameColor);
            break;

        case 'pong':
            break;

        case 'admin_reward':
            emit('admin_reward', msg);
            break;
    }
}

// ===== API METHODS =====

// Auth
export function login(email: string, username: string): void {
    sendMsg({ type: 'auth', email, username });
}

export function setUsername(username: string): void {
    sendMsg({ type: 'set_username', username });
}

export function setAvatar(avatar: number): void {
    sendMsg({ type: 'set_avatar', avatar });
}

// Friends
export function sendFriendRequest(targetUsername: string): void {
    sendMsg({ type: 'friend_request', targetUsername });
}

export function acceptFriendRequest(fromUid: string): void {
    sendMsg({ type: 'friend_accept', fromUid });
}

export function declineFriendRequest(fromUid: string): void {
    sendMsg({ type: 'friend_decline', fromUid });
}

// Lobbies
export function createLobby(name: string, visibility: LobbyVisibility): void {
    sendMsg({ type: 'create_lobby', name, visibility });
}

export function joinLobby(code: string): void {
    sendMsg({ type: 'join_lobby', code });
}

export function leaveLobby(): void {
    sendMsg({ type: 'leave_lobby' });
    currentLobby = null;
    remotePlayers.clear();
}

export function setClass(className: ClassName): void {
    sendMsg({ type: 'set_class', className });
}

export function toggleReady(): void {
    sendMsg({ type: 'toggle_ready' });
}

export function startGame(): void {
    sendMsg({ type: 'start_game' });
}

export function listPublicLobbies(): void {
    sendMsg({ type: 'list_public_lobbies' });
}

// In-game sync
export function sendPlayerMove(x: number, y: number, dir: number, px: number, py: number, animFrame: number): void {
    sendMsg({ type: 'player_move', x, y, dir: dir as 0 | 1 | 2 | 3, px, py, animFrame });
}

export function sendPlayerStats(stats: Stats, level: number, equipment: Equipment, alive: boolean): void {
    sendMsg({ type: 'player_stats', stats, level, equipment, alive });
}

export function sendChat(message: string): void {
    sendMsg({ type: 'chat', message });
}

// Ping keepalive
setInterval(() => {
    if (connected) sendMsg({ type: 'ping' });
}, 25_000);

// ===== GETTERS =====
export function isConnected(): boolean { return connected; }
export function getProfile(): UserProfile | null { return localProfile; }
export function getFriends(): FriendInfo[] { return friendsList; }
export function getFriendRequests(): FriendRequest[] { return friendRequests; }
export function getLobby(): LobbyInfo | null { return currentLobby; }
export function getPublicLobbies(): LobbyInfo[] { return publicLobbies; }
export function getRemotePlayers(): Map<string, RemotePlayerState> { return remotePlayers; }
export function isInLobby(): boolean { return currentLobby !== null; }
export function isLoggedIn(): boolean { return localProfile !== null && localProfile.isLoggedIn; }
export function getAvatars() { return AVATARS; }
