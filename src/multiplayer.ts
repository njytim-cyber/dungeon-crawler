// ===== MULTIPLAYER CLIENT =====
// Cloudflare Workers + Durable Objects client
// REST API for auth/friends, WebSocket per lobby for game sync

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
let latencyMs = 0;

// Emote bubbles: uid -> { emoteId, time }
const emoteBubbles = new Map<string, { emoteId: number; time: number }>();
export const EMOTES = ['❤️', '👋', '⚔️', '❓', '😂', '👍', '🎉', '💀'] as const;

// User & social
let localProfile: UserProfile | null = null;
let friendsList: FriendInfo[] = [];
let friendRequests: FriendRequest[] = [];

// Lobby
let currentLobby: LobbyInfo | null = null;
let currentLobbyId: string | null = null;  // Durable Object name
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

// ===== SERVER URL =====
// Cloudflare Worker URL (update after deploying with `npx wrangler deploy`)
const WORKER_URL = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://127.0.0.1:8787'                                       // Local dev: Wrangler dev server
    : 'https://dungeon-crawler-server.huiling-koh.workers.dev';      // Production: Cloudflare

const WS_BASE = WORKER_URL.replace('http', 'ws');

// ===== CONNECTION =====
let hasEverConnected = false;
let connectionAttempts = 0;

// "Connect" now just pings the health endpoint to verify the server is reachable
export function connectToServer(): void {
    if (hasEverConnected) {
        emit('connected');
        return;
    }

    connectionAttempts++;
    console.log('[MP] Verifying Cloudflare Worker at', WORKER_URL, `(attempt ${connectionAttempts})`);

    fetch(`${WORKER_URL}/health`)
        .then(r => r.json())
        .then(data => {
            if (data.status === 'ok') {
                hasEverConnected = true;
                connectionAttempts = 0;
                console.log('[MP] Worker reachable!', data);
                emit('connected');
            }
        })
        .catch(err => {
            console.error('[MP] Worker unreachable:', err);
            emit('connection_error', 'Could not reach the co-op server. Is the worker running? (npm run worker:dev)');
        });
}

export function disconnect(): void {
    if (ws) ws.close();
    ws = null;
    connected = false;
    currentLobbyId = null;
    if (reconnectTimer) { clearInterval(reconnectTimer); reconnectTimer = null; }
}

// ===== REST API HELPERS =====
async function apiPost<T = any>(path: string, body: any): Promise<T> {
    const res = await fetch(`${WORKER_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    return res.json();
}

async function apiGet<T = any>(path: string): Promise<T> {
    const res = await fetch(`${WORKER_URL}${path}`);
    return res.json();
}

// ===== WEBSOCKET (per-lobby) =====
function connectLobbyWS(lobbyId: string): void {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
    }

    if (!localProfile) return;

    const params = new URLSearchParams({
        lobbyId,
        uid: localProfile.uid,
        username: localProfile.username,
        avatar: String(localProfile.avatar),
        nameColor: localProfile.nameColor || '',
        isAdmin: String(localProfile.isAdmin),
    });

    const wsUrl = `${WS_BASE}/ws?${params.toString()}`;
    console.log('[MP] Connecting WebSocket to lobby', lobbyId);
    ws = new WebSocket(wsUrl);
    currentLobbyId = lobbyId;

    ws.onopen = () => {
        connected = true;
        console.log('[MP] WebSocket connected to lobby', lobbyId);
    };

    ws.onclose = () => {
        const wasConnected = connected;
        connected = false;
        console.log('[MP] WebSocket disconnected from lobby');
        if (wasConnected && currentLobbyId === lobbyId) {
            // Auto-reconnect to the same lobby if we were in one
            if (!reconnectTimer) {
                reconnectTimer = window.setInterval(() => {
                    if (!connected && currentLobbyId === lobbyId) {
                        connectLobbyWS(lobbyId);
                    } else if (reconnectTimer) {
                        clearInterval(reconnectTimer);
                        reconnectTimer = null;
                    }
                }, 3000);
            }
        }
    };

    ws.onerror = (_e) => {
        console.error('[MP] WebSocket error');
    };

    ws.onmessage = (event) => {
        let msg: ServerMessage;
        try { msg = JSON.parse(event.data); } catch { return; }
        handleServerMessage(msg);
    };
}

function sendWsMsg(msg: ClientMessage): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
    }
}

// ===== MESSAGE HANDLER (from lobby WebSocket) =====
function handleServerMessage(msg: ServerMessage): void {
    switch (msg.type) {
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
            currentLobbyId = null;
            if (ws) { ws.close(); ws = null; }
            connected = false;
            emit('lobby_left');
            break;

        case 'lobby_error':
            emit('lobby_error', msg.message);
            break;

        case 'lobby_full':
            emit('lobby_full', msg.code);
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

        case 'floor_change':
            emit('floor_change', msg.floor, msg.seed, msg.fromUid);
            break;

        case 'shared_loot':
            emit('shared_loot', msg.xp, msg.gold, msg.enemyType, msg.killerUsername);
            break;

        case 'revive_player':
            emit('revive_player', msg.targetUid, msg.fromUid, msg.fromUsername);
            break;

        case 'emote':
            emoteBubbles.set(msg.fromUid, { emoteId: msg.emoteId, time: Date.now() });
            emit('emote', msg.fromUid, msg.fromUsername, msg.emoteId);
            break;

        case 'teleport_info':
            emit('teleport_info', msg.hostX, msg.hostY);
            break;

        case 'pong':
            if (msg.timestamp) {
                latencyMs = Date.now() - msg.timestamp;
            }
            break;

        case 'admin_reward':
            emit('admin_reward', msg);
            break;
    }
}

// ===== API METHODS =====

// Auth — username only, device ID auto-generated
export async function login(username: string): Promise<void> {
    try {
        // Auto-generate a persistent device ID
        let deviceId = localStorage.getItem('coop-device-id');
        if (!deviceId) {
            deviceId = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
            localStorage.setItem('coop-device-id', deviceId);
        }

        const result = await apiPost('/api/user/auth', { email: deviceId, username });

        if (result.type === 'auth_ok') {
            localProfile = result.profile;
            friendRequests = result.profile.friendRequests || [];

            // Mark user as online
            await apiPost('/api/user/set-online', { uid: localProfile!.uid, online: true });

            // Fetch friend list
            const friendsResult = await apiGet(`/api/user/friends?uid=${localProfile!.uid}`);
            friendsList = friendsResult.friends || [];

            emit('auth_ok', result.profile, result.starterGear);
        } else if (result.type === 'auth_error') {
            emit('auth_error', result.message);
        }
    } catch (err) {
        console.error('[MP] Login failed:', err);
        emit('connection_error', 'Failed to connect to co-op server.');
    }
}

export async function setUsername(username: string): Promise<void> {
    if (!localProfile) return;
    try {
        const result = await apiPost('/api/user/set-username', { uid: localProfile.uid, username });
        if (result.type === 'profile_updated') {
            Object.assign(localProfile, result.profile);
            emit('profile_updated', result.profile);
        } else if (result.type === 'auth_error') {
            emit('auth_error', result.message);
        }
    } catch (err) {
        console.error('[MP] Set username failed:', err);
    }
}

export async function setAvatar(avatar: number): Promise<void> {
    if (!localProfile) return;
    try {
        const result = await apiPost('/api/user/set-avatar', { uid: localProfile.uid, avatar });
        if (result.type === 'profile_updated') {
            localProfile.avatar = avatar;
            emit('profile_updated', result.profile);
        }
    } catch (err) {
        console.error('[MP] Set avatar failed:', err);
    }
}

// Friends — REST calls to UserRegistry DO
export async function sendFriendRequest(targetUsername: string): Promise<void> {
    if (!localProfile) return;
    try {
        const result = await apiPost('/api/user/friend-request', { uid: localProfile.uid, targetUsername });
        if (result.type === 'friend_request_sent') {
            emit('friend_request_sent', result.targetUsername);
        } else if (result.type === 'friend_request_error') {
            emit('friend_request_error', result.message);
        }
    } catch (err) {
        console.error('[MP] Friend request failed:', err);
    }
}

export async function acceptFriendRequest(fromUid: string): Promise<void> {
    if (!localProfile) return;
    try {
        const result = await apiPost('/api/user/friend-accept', { uid: localProfile.uid, fromUid });
        if (result.type === 'friend_accepted') {
            friendsList = result.friends;
            friendRequests = friendRequests.filter(r => r.fromUid !== fromUid);
            emit('friends_updated', friendsList);
        }
    } catch (err) {
        console.error('[MP] Accept friend failed:', err);
    }
}

export async function declineFriendRequest(fromUid: string): Promise<void> {
    if (!localProfile) return;
    try {
        const result = await apiPost('/api/user/friend-decline', { uid: localProfile.uid, fromUid });
        if (result.type === 'profile_updated') {
            friendRequests = friendRequests.filter(r => r.fromUid !== fromUid);
            if (localProfile) Object.assign(localProfile, result.profile);
            emit('profile_updated', result.profile);
        }
    } catch (err) {
        console.error('[MP] Decline friend failed:', err);
    }
}

// Lobbies — REST to create/join, then WebSocket for real-time sync
export async function createLobby(name: string, visibility: LobbyVisibility): Promise<void> {
    if (!localProfile) return;
    if (currentLobbyId) {
        emit('lobby_error', 'Already in a lobby. Leave first.');
        return;
    }

    try {
        // Use a temp ID for creation request — the server returns the actual code
        const tempLobbyId = `lobby_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        const result = await apiPost(`/api/lobby/${tempLobbyId}/create`, {
            name,
            visibility,
            hostUid: localProfile.uid,
            hostUsername: localProfile.username,
            hostAvatar: localProfile.avatar,
            hostNameColor: localProfile.nameColor,
        });

        if (result.type === 'lobby_created') {
            currentLobby = result.lobby;
            // Use the lobby code as the canonical ID for joining
            const lobbyCode = result.lobby.code;
            currentLobbyId = tempLobbyId;
            // Connect WebSocket using same tempLobbyId (same DO instance)
            connectLobbyWS(tempLobbyId);
            emit('lobby_created', result.lobby);

            // Also register a code→lobbyId mapping so others can join by code
            try {
                await apiPost('/api/user/map-lobby-code', {
                    code: lobbyCode,
                    lobbyId: tempLobbyId,
                });
            } catch { /* non-critical */ }
        } else if (result.type === 'lobby_error') {
            emit('lobby_error', result.message);
        }
    } catch (err) {
        console.error('[MP] Create lobby failed:', err);
        emit('lobby_error', 'Failed to create lobby.');
    }
}

export async function joinLobby(code: string): Promise<void> {
    if (!localProfile) return;
    if (currentLobbyId) {
        emit('lobby_error', 'Already in a lobby. Leave first.');
        return;
    }

    try {
        // First, resolve lobby code to actual lobbyId via the registry
        let lobbyId = code; // fallback: use code directly
        try {
            const mapping = await apiGet(`/api/user/resolve-lobby?code=${encodeURIComponent(code)}`);
            if (mapping.lobbyId) lobbyId = mapping.lobbyId;
        } catch { /* use code as fallback */ }

        const result = await apiPost(`/api/lobby/${lobbyId}/join`, {
            uid: localProfile.uid,
            username: localProfile.username,
            avatar: localProfile.avatar,
            nameColor: localProfile.nameColor,
        });

        if (result.type === 'lobby_joined') {
            currentLobby = result.lobby;
            currentLobbyId = lobbyId;
            connectLobbyWS(lobbyId);
            emit('lobby_joined', result.lobby);
        } else if (result.type === 'lobby_error') {
            emit('lobby_error', result.message);
        } else if (result.type === 'lobby_full') {
            emit('lobby_full', code);
        }
    } catch (err) {
        console.error('[MP] Join lobby failed:', err);
        emit('lobby_error', 'Failed to join lobby.');
    }
}

export function leaveLobby(): void {
    if (ws && ws.readyState === WebSocket.OPEN) {
        sendWsMsg({ type: 'leave_lobby' } as any);
    }
    if (ws) { ws.close(); ws = null; }
    connected = false;
    currentLobby = null;
    currentLobbyId = null;
    remotePlayers.clear();
    if (reconnectTimer) { clearInterval(reconnectTimer); reconnectTimer = null; }
    emit('lobby_left');
}

export function setClass(className: ClassName): void {
    sendWsMsg({ type: 'set_class', className });
}

export function toggleReady(): void {
    sendWsMsg({ type: 'toggle_ready' });
}

export function startGame(): void {
    sendWsMsg({ type: 'start_game' });
}

export async function listPublicLobbies(): Promise<void> {
    try {
        const result = await apiGet('/api/user/public-lobbies');
        publicLobbies = result.lobbies || [];
        emit('public_lobbies', publicLobbies);
    } catch (err) {
        console.error('[MP] List public lobbies failed:', err);
        publicLobbies = [];
        emit('public_lobbies', publicLobbies);
    }
}

// In-game sync — all via WebSocket
export function sendPlayerMove(x: number, y: number, dir: number, px: number, py: number, animFrame: number): void {
    sendWsMsg({ type: 'player_move', x, y, dir: dir as 0 | 1 | 2 | 3, px, py, animFrame });
}

export function sendPlayerAttack(enemyIndex: number, damage: number, killed: boolean): void {
    sendWsMsg({ type: 'player_attack', enemyIndex, damage, killed });
}

export function sendPlayerStats(stats: Stats, level: number, equipment: Equipment, alive: boolean): void {
    sendWsMsg({ type: 'player_stats', stats, level, equipment, alive });
}

export function sendFloorChange(floor: number, seed: number): void {
    sendWsMsg({ type: 'floor_change', floor, seed });
}

export function sendShareLoot(xp: number, gold: number, enemyType: string): void {
    sendWsMsg({ type: 'share_loot', xp, gold, enemyType });
}

export function sendReviveRequest(targetUid: string): void {
    sendWsMsg({ type: 'revive_request', targetUid });
}

export function sendEmote(emoteId: number): void {
    sendWsMsg({ type: 'emote', emoteId });
    // Also show locally
    if (localProfile) {
        emoteBubbles.set(localProfile.uid, { emoteId, time: Date.now() });
    }
}

export function teleportToParty(): void {
    sendWsMsg({ type: 'teleport_request' });
}

export function sendChat(message: string): void {
    sendWsMsg({ type: 'chat', message });
}

// Ping with latency measurement (every 10s)
setInterval(() => {
    if (connected && ws && ws.readyState === WebSocket.OPEN) {
        sendWsMsg({ type: 'ping', timestamp: Date.now() });
    }
}, 10_000);

// Periodic friend list refresh (since we can't push from REST)
setInterval(async () => {
    if (localProfile) {
        try {
            const result = await apiGet(`/api/user/friends?uid=${localProfile.uid}`);
            if (result.friends) {
                friendsList = result.friends;
                emit('friends_updated', friendsList);
            }
        } catch { /* silent */ }
    }
}, 30_000);

// ===== GETTERS =====
export function isConnected(): boolean { return connected || hasEverConnected; }
export function getProfile(): UserProfile | null { return localProfile; }
export function getFriends(): FriendInfo[] { return friendsList; }
export function getFriendRequests(): FriendRequest[] { return friendRequests; }
export function getLobby(): LobbyInfo | null { return currentLobby; }
export function getPublicLobbies(): LobbyInfo[] { return publicLobbies; }
export function getRemotePlayers(): Map<string, RemotePlayerState> { return remotePlayers; }
export function isInLobby(): boolean { return currentLobby !== null; }
export function isLoggedIn(): boolean { return localProfile !== null && localProfile.isLoggedIn; }
export function getAvatars() { return AVATARS; }
export function getLatency(): number { return latencyMs; }
export function getEmoteBubbles(): Map<string, { emoteId: number; time: number }> { return emoteBubbles; }
