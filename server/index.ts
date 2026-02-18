// ===== MULTIPLAYER SERVER =====
// WebSocket server for co-op dungeon crawling
// Run with: node server/index.js

import { WebSocketServer, WebSocket } from 'ws';

// ===== TYPES (duplicated from client for standalone server) =====
interface UserProfile {
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

interface FriendRequest {
    fromUid: string;
    fromUsername: string;
    fromAvatar: number;
    timestamp: number;
}

interface LobbyInfo {
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

interface LobbyPlayer {
    uid: string;
    username: string;
    avatar: number;
    className: string;
    ready: boolean;
    isHost: boolean;
    nameColor?: string;
}

interface ConnectedClient {
    ws: WebSocket;
    uid: string;
    profile: UserProfile | null;
    lobbyCode: string | null;
    // Game position for sync
    x: number;
    y: number;
    px: number;
    py: number;
    dir: number;
    animFrame: number;
}

// ===== IN-MEMORY STORES =====
const users = new Map<string, UserProfile>();       // uid -> profile
const emailToUid = new Map<string, string>();       // email -> uid
const usernameToUid = new Map<string, string>();    // username -> uid
const clients = new Map<WebSocket, ConnectedClient>();
const uidToClient = new Map<string, ConnectedClient>();
const lobbies = new Map<string, LobbyInfo>();       // code -> lobby

let uidCounter = 0;

// ===== ADMIN SYSTEM =====
// Add admin emails here — admins get +1 level & skill point per player login
const ADMIN_EMAILS = new Set<string>([
    'evanngjianen@gmail.com',
    'ethanngjianheng@gmail.com',
]);

function rewardAdminsForLogin(loginUsername: string): void {
    // Notify all online admins with a reward
    for (const [uid, client] of uidToClient) {
        if (client.profile?.isAdmin && client.ws.readyState === WebSocket.OPEN) {
            send(client.ws, {
                type: 'admin_reward',
                reason: 'player_login',
                levelUp: 1,
                skillPoints: 1,
                message: `${loginUsername} logged in! +1 Level, +1 Skill Point`,
            });
            console.log(`  Admin reward: ${client.profile.username} gets +1 level/skill (${loginUsername} logged in)`);
        }
    }
}

// ===== HELPERS =====
function generateUid(): string {
    return `user_${Date.now()}_${++uidCounter}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateLobbyCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

function generateNameColor(): string {
    const colors = [
        '#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#54a0ff',
        '#5f27cd', '#01a3a4', '#f368e0', '#ff6348', '#7bed9f',
        '#e056fd', '#686de0', '#30336b', '#22a6b3', '#eb4d4b',
    ];
    return colors[Math.floor(Math.random() * colors.length)];
}

function send(ws: WebSocket, msg: any): void {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
    }
}

function broadcastToLobby(lobbyCode: string, msg: any, excludeUid?: string): void {
    const lobby = lobbies.get(lobbyCode);
    if (!lobby) return;
    for (const p of lobby.players) {
        if (p.uid === excludeUid) continue;
        const c = uidToClient.get(p.uid);
        if (c) send(c.ws, msg);
    }
}

function getFriendInfoList(profile: UserProfile): any[] {
    return profile.friends.map(fid => {
        const friend = users.get(fid);
        if (!friend) return null;
        const fClient = uidToClient.get(fid);
        const online = !!fClient;
        let currentLobby: string | undefined;
        let lobbyFull = false;
        if (fClient?.lobbyCode) {
            currentLobby = fClient.lobbyCode;
            const lobby = lobbies.get(currentLobby);
            if (lobby) lobbyFull = lobby.players.length >= 7;
        }
        return {
            uid: fid,
            username: friend.username,
            avatar: friend.avatar,
            online,
            currentLobby,
            lobbyFull,
        };
    }).filter(Boolean);
}

function removeLobbyPlayer(lobbyCode: string, uid: string): void {
    const lobby = lobbies.get(lobbyCode);
    if (!lobby) return;
    lobby.players = lobby.players.filter(p => p.uid !== uid);

    if (lobby.players.length === 0) {
        lobbies.delete(lobbyCode);
        console.log(`  Lobby ${lobbyCode} deleted (empty)`);
    } else {
        // Assign new host if host left
        if (lobby.hostUid === uid) {
            lobby.hostUid = lobby.players[0].uid;
            lobby.hostUsername = lobby.players[0].username;
            lobby.players[0].isHost = true;
        }
        broadcastToLobby(lobbyCode, { type: 'lobby_updated', lobby });
    }
}

// ===== LOGIN BONUS ITEMS =====
const loginStarterGear = [
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

// ===== MESSAGE HANDLER =====
function handleMessage(client: ConnectedClient, data: string): void {
    let msg: any;
    try { msg = JSON.parse(data); } catch { return; }

    switch (msg.type) {
        // ===== AUTH =====
        case 'auth': {
            const email = (msg.email || '').trim().toLowerCase();
            const requestedUsername = (msg.username || '').trim();
            if (!email || !requestedUsername) {
                send(client.ws, { type: 'auth_error', message: 'Email and username required.' });
                return;
            }
            let uid = emailToUid.get(email);
            let profile: UserProfile;
            let starterGear: any[] | undefined;

            if (uid) {
                // Existing user
                profile = users.get(uid)!;
                profile.isLoggedIn = true;
            } else {
                // New user
                uid = generateUid();
                // Ensure unique username
                let username = requestedUsername;
                let suffix = 1;
                while (usernameToUid.has(username.toLowerCase())) {
                    username = `${requestedUsername}${suffix++}`;
                }
                profile = {
                    uid,
                    email,
                    username,
                    avatar: Math.floor(Math.random() * 12),
                    isLoggedIn: true,
                    isAdmin: ADMIN_EMAILS.has(email),
                    friends: [],
                    friendRequests: [],
                    nameColor: generateNameColor(),
                    createdAt: Date.now(),
                };
                users.set(uid, profile);
                emailToUid.set(email, uid);
                usernameToUid.set(username.toLowerCase(), uid);
                starterGear = loginStarterGear;
                console.log(`  New user: ${username} (${email})${profile.isAdmin ? ' [ADMIN]' : ''}`);
            }

            client.uid = uid;
            client.profile = profile;
            uidToClient.set(uid, client);

            send(client.ws, { type: 'auth_ok', profile, starterGear });
            // Send friend list
            send(client.ws, { type: 'friend_list', friends: getFriendInfoList(profile) });
            // Notify friends that this user is online
            for (const fid of profile.friends) {
                const fc = uidToClient.get(fid);
                if (fc?.profile) {
                    send(fc.ws, { type: 'friend_list', friends: getFriendInfoList(fc.profile) });
                }
            }
            // Reward admins when ANY player logs in
            rewardAdminsForLogin(profile.username);
            break;
        }

        case 'set_username': {
            if (!client.profile) return;
            const newName = (msg.username || '').trim();
            if (!newName || newName.length > 20) {
                send(client.ws, { type: 'auth_error', message: 'Username must be 1-20 characters.' });
                return;
            }
            if (usernameToUid.has(newName.toLowerCase()) && usernameToUid.get(newName.toLowerCase()) !== client.uid) {
                send(client.ws, { type: 'auth_error', message: 'Username already taken.' });
                return;
            }
            usernameToUid.delete(client.profile.username.toLowerCase());
            client.profile.username = newName;
            usernameToUid.set(newName.toLowerCase(), client.uid);
            send(client.ws, { type: 'profile_updated', profile: { username: newName } });
            break;
        }

        case 'set_avatar': {
            if (!client.profile) return;
            client.profile.avatar = msg.avatar;
            send(client.ws, { type: 'profile_updated', profile: { avatar: msg.avatar } });
            break;
        }

        // ===== FRIENDS =====
        case 'friend_request': {
            if (!client.profile) return;
            const targetName = (msg.targetUsername || '').trim().toLowerCase();
            const targetUid = usernameToUid.get(targetName);
            if (!targetUid) {
                send(client.ws, { type: 'friend_request_error', message: `User "${msg.targetUsername}" not found.` });
                return;
            }
            if (targetUid === client.uid) {
                send(client.ws, { type: 'friend_request_error', message: "Can't friend yourself!" });
                return;
            }
            if (client.profile.friends.includes(targetUid)) {
                send(client.ws, { type: 'friend_request_error', message: 'Already friends!' });
                return;
            }
            const target = users.get(targetUid)!;
            // Check if already requested
            if (target.friendRequests.some(r => r.fromUid === client.uid)) {
                send(client.ws, { type: 'friend_request_error', message: 'Request already sent.' });
                return;
            }
            const req: FriendRequest = {
                fromUid: client.uid,
                fromUsername: client.profile.username,
                fromAvatar: client.profile.avatar,
                timestamp: Date.now(),
            };
            target.friendRequests.push(req);
            send(client.ws, { type: 'friend_request_sent', targetUsername: target.username });
            // If target is online, notify
            const tc = uidToClient.get(targetUid);
            if (tc) send(tc.ws, { type: 'friend_request_received', request: req });
            break;
        }

        case 'friend_accept': {
            if (!client.profile) return;
            const fromUid = msg.fromUid;
            const idx = client.profile.friendRequests.findIndex(r => r.fromUid === fromUid);
            if (idx === -1) return;
            client.profile.friendRequests.splice(idx, 1);
            // Add mutual friends
            client.profile.friends.push(fromUid);
            const other = users.get(fromUid);
            if (other) {
                other.friends.push(client.uid);
                const oc = uidToClient.get(fromUid);
                if (oc) send(oc.ws, { type: 'friend_list', friends: getFriendInfoList(other) });
            }
            send(client.ws, { type: 'friend_list', friends: getFriendInfoList(client.profile) });
            break;
        }

        case 'friend_decline': {
            if (!client.profile) return;
            client.profile.friendRequests = client.profile.friendRequests.filter(r => r.fromUid !== msg.fromUid);
            send(client.ws, { type: 'profile_updated', profile: { friendRequests: client.profile.friendRequests } });
            break;
        }

        // ===== LOBBIES =====
        case 'create_lobby': {
            if (!client.profile) return;
            if (client.lobbyCode) {
                send(client.ws, { type: 'lobby_error', message: 'Already in a lobby. Leave first.' });
                return;
            }
            const code = generateLobbyCode();
            const lobby: LobbyInfo = {
                code,
                name: msg.name || `${client.profile.username}'s Lobby`,
                hostUid: client.uid,
                hostUsername: client.profile.username,
                visibility: msg.visibility || 'public',
                players: [{
                    uid: client.uid,
                    username: client.profile.username,
                    avatar: client.profile.avatar,
                    className: 'warrior',
                    ready: false,
                    isHost: true,
                    nameColor: client.profile.nameColor,
                }],
                maxPlayers: 7,
                minPlayers: 2,
                gameStarted: false,
                floor: 1,
                createdAt: Date.now(),
            };
            lobbies.set(code, lobby);
            client.lobbyCode = code;
            send(client.ws, { type: 'lobby_created', lobby });
            console.log(`  Lobby created: ${code} (${lobby.visibility}) by ${client.profile.username}`);
            break;
        }

        case 'join_lobby': {
            if (!client.profile) return;
            if (client.lobbyCode) {
                send(client.ws, { type: 'lobby_error', message: 'Already in a lobby. Leave first.' });
                return;
            }
            const lobby = lobbies.get(msg.code);
            if (!lobby) {
                send(client.ws, { type: 'lobby_error', message: 'Lobby not found.' });
                return;
            }
            if (lobby.gameStarted) {
                send(client.ws, { type: 'lobby_error', message: 'Game already in progress.' });
                return;
            }
            if (lobby.players.length >= 7) {
                send(client.ws, { type: 'lobby_full', code: msg.code });
                return;
            }
            // For private lobbies, check friendship
            if (lobby.visibility === 'private') {
                const host = users.get(lobby.hostUid);
                if (host && !host.friends.includes(client.uid) && lobby.hostUid !== client.uid) {
                    send(client.ws, { type: 'lobby_error', message: 'This is a private lobby. Only friends of the host can join.' });
                    return;
                }
            }
            lobby.players.push({
                uid: client.uid,
                username: client.profile.username,
                avatar: client.profile.avatar,
                className: 'warrior',
                ready: false,
                isHost: false,
                nameColor: client.profile.nameColor,
            });
            client.lobbyCode = msg.code;
            send(client.ws, { type: 'lobby_joined', lobby });
            broadcastToLobby(msg.code, { type: 'lobby_updated', lobby }, client.uid);
            console.log(`  ${client.profile.username} joined lobby ${msg.code}`);
            break;
        }

        case 'leave_lobby': {
            if (!client.lobbyCode) return;
            const code = client.lobbyCode;
            client.lobbyCode = null;
            removeLobbyPlayer(code, client.uid);
            send(client.ws, { type: 'lobby_left' });
            // Broadcast player left to in-game players
            broadcastToLobby(code, { type: 'player_left', uid: client.uid });
            break;
        }

        case 'set_class': {
            if (!client.lobbyCode || !client.profile) return;
            const lobby = lobbies.get(client.lobbyCode);
            if (!lobby) return;
            const p = lobby.players.find(p => p.uid === client.uid);
            if (p) p.className = msg.className;
            broadcastToLobby(client.lobbyCode, { type: 'lobby_updated', lobby });
            break;
        }

        case 'toggle_ready': {
            if (!client.lobbyCode || !client.profile) return;
            const lobby = lobbies.get(client.lobbyCode);
            if (!lobby) return;
            const p = lobby.players.find(p => p.uid === client.uid);
            if (p) p.ready = !p.ready;
            broadcastToLobby(client.lobbyCode, { type: 'lobby_updated', lobby });
            break;
        }

        case 'start_game': {
            if (!client.lobbyCode || !client.profile) return;
            const lobby = lobbies.get(client.lobbyCode);
            if (!lobby || lobby.hostUid !== client.uid) return;
            if (lobby.players.length < 2) {
                send(client.ws, { type: 'lobby_error', message: 'Need at least 2 players to start.' });
                return;
            }
            lobby.gameStarted = true;
            const seed = Math.floor(Math.random() * 999999);
            // broadcastToLobby sends to ALL players including host — no extra send() needed
            broadcastToLobby(client.lobbyCode, { type: 'game_start', floor: lobby.floor, seed });
            console.log(`  Game started in lobby ${client.lobbyCode} with ${lobby.players.length} players (seed=${seed})`);
            break;
        }

        // ===== IN-GAME SYNC =====
        case 'player_move': {
            if (!client.lobbyCode) return;
            client.x = msg.x;
            client.y = msg.y;
            client.px = msg.px;
            client.py = msg.py;
            client.dir = msg.dir;
            client.animFrame = msg.animFrame;
            const lobby = lobbies.get(client.lobbyCode);
            const lobbyPlayer = lobby?.players.find(p => p.uid === client.uid);
            broadcastToLobby(client.lobbyCode, {
                type: 'player_update',
                uid: client.uid,
                username: client.profile?.username || 'Player',
                className: lobbyPlayer?.className || 'warrior',
                avatar: client.profile?.avatar ?? 0,
                nameColor: client.profile?.nameColor || '',
                x: msg.x, y: msg.y,
                dir: msg.dir,
                px: msg.px, py: msg.py,
                animFrame: msg.animFrame,
                floor: msg.floor,
            }, client.uid);
            break;
        }

        case 'floor_change': {
            if (!client.lobbyCode || !client.profile) return;
            broadcastToLobby(client.lobbyCode, {
                type: 'floor_change',
                floor: msg.floor,
                seed: msg.seed,
                fromUid: client.uid,
                fromUsername: client.profile.username || 'Player',
            }, client.uid);
            const lobby = lobbies.get(client.lobbyCode);
            if (lobby) lobby.floor = msg.floor;
            console.log(`  ${client.profile.username || client.uid} moved party to floor ${msg.floor}`);
            break;
        }

        case 'player_stats': {
            if (!client.lobbyCode) return;
            broadcastToLobby(client.lobbyCode, {
                type: 'player_stats_update',
                uid: client.uid,
                stats: msg.stats,
                level: msg.level,
                equipment: msg.equipment,
                alive: msg.alive,
            }, client.uid);
            break;
        }

        case 'player_attack': {
            if (!client.lobbyCode) return;
            broadcastToLobby(client.lobbyCode, {
                type: 'enemy_damage',
                enemyIndex: msg.enemyIndex,
                damage: msg.damage,
                fromUid: client.uid,
            }, client.uid);
            break;
        }

        case 'chat': {
            if (!client.lobbyCode || !client.profile) return;
            broadcastToLobby(client.lobbyCode, {
                type: 'chat_msg',
                fromUid: client.uid,
                fromUsername: client.profile.username,
                message: msg.message,
                nameColor: client.profile.nameColor,
            });
            break;
        }

        case 'list_public_lobbies': {
            const publicLobbies = [...lobbies.values()]
                .filter(l => l.visibility === 'public' && !l.gameStarted && l.players.length < 7);
            send(client.ws, { type: 'public_lobbies', lobbies: publicLobbies });
            break;
        }

        case 'ping': {
            send(client.ws, { type: 'pong' });
            break;
        }
    }
}

// ===== SERVER SETUP =====
const PORT = parseInt(process.env.PORT || '8787');
const wss = new WebSocketServer({ port: PORT, host: '0.0.0.0' });

console.log(`🎮 Dungeon Crawler Co-op Server`);
console.log(`   Listening on ws://localhost:${PORT}`);
console.log('');

wss.on('connection', (ws: WebSocket) => {
    const client: ConnectedClient = {
        ws,
        uid: '',
        profile: null,
        lobbyCode: null,
        x: 0, y: 0, px: 0, py: 0, dir: 0, animFrame: 0,
    };
    clients.set(ws, client);
    console.log(`+ Client connected (${clients.size} total)`);

    ws.on('message', (data: Buffer) => {
        handleMessage(client, data.toString());
    });

    ws.on('close', () => {
        console.log(`- Client disconnected: ${client.profile?.username || 'anonymous'}`);
        // Leave lobby
        if (client.lobbyCode) {
            const code = client.lobbyCode;
            removeLobbyPlayer(code, client.uid);
            broadcastToLobby(code, { type: 'player_left', uid: client.uid });
        }
        // Remove from maps
        clients.delete(ws);
        if (client.uid) {
            uidToClient.delete(client.uid);
            // Notify friends that user went offline
            if (client.profile) {
                for (const fid of client.profile.friends) {
                    const fc = uidToClient.get(fid);
                    if (fc?.profile) {
                        send(fc.ws, { type: 'friend_list', friends: getFriendInfoList(fc.profile) });
                    }
                }
            }
        }
    });

    ws.on('error', (err) => {
        console.error('WebSocket error:', err.message);
    });
});

// Periodic cleanup of stale lobbies
setInterval(() => {
    const now = Date.now();
    for (const [code, lobby] of lobbies) {
        // Delete empty lobbies or lobbies older than 4 hours
        if (lobby.players.length === 0 || (now - lobby.createdAt > 4 * 60 * 60 * 1000)) {
            lobbies.delete(code);
            console.log(`  Cleaned up stale lobby: ${code}`);
        }
    }
}, 60_000);
