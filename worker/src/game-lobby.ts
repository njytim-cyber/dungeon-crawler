// ===== GAME LOBBY DURABLE OBJECT =====
// Each lobby gets its own Durable Object instance with WebSocket hibernation.
// Handles real-time game sync: player positions, stats, combat, and chat.

import {
    LobbyInfo, LobbyPlayer, ConnectedPlayer, UserProfile,
    generateLobbyCode, sanitizeUsername, sanitizeLobbyName,
    sanitizeChatMessage, isValidHexColor, INTERNAL_SECRET,
    type Env,
} from './types';

interface WebSocketMeta {
    uid: string;
    username: string;
    avatar: number;
    nameColor?: string;
    isAdmin: boolean;
}

export class GameLobby implements DurableObject {
    private state: DurableObjectState;
    private env: Env;

    // Lobby info
    private lobby: LobbyInfo | null = null;

    // Connected players mapped by uid
    private players = new Map<string, ConnectedPlayer>();

    // WebSocket -> uid mapping
    private sessions = new Map<WebSocket, string>();

    // Track our lobby ID for registry
    private lobbyId: string | null = null;

    // Rate limiting: uid -> { count, resetTime }
    private rateLimits = new Map<string, { count: number; resetTime: number }>();
    private static readonly MAX_MESSAGES_PER_SECOND = 10;
    private static readonly MAX_WS_MESSAGE_SIZE = 4096; // 4KB

    constructor(state: DurableObjectState, env: Env) {
        this.state = state;
        this.env = env;

        // Restore lobby data from storage on construction
        this.state.blockConcurrencyWhile(async () => {
            const stored = await this.state.storage.get<LobbyInfo>('lobby');
            if (stored) this.lobby = stored;
        });
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);

        // GET /ws — WebSocket upgrade for game sync
        if (url.pathname === '/ws') {
            const upgradeHeader = request.headers.get('Upgrade');
            if (!upgradeHeader || upgradeHeader !== 'websocket') {
                return new Response('Expected Upgrade: websocket', { status: 426 });
            }

            const uid = url.searchParams.get('uid') || '';
            const username = sanitizeUsername(url.searchParams.get('username') || '');
            const avatar = Math.max(0, Math.min(11, parseInt(url.searchParams.get('avatar') || '0')));
            const rawColor = url.searchParams.get('nameColor') || '';
            const nameColor = isValidHexColor(rawColor) ? rawColor : undefined;
            // isAdmin is NOT trusted from the client — always false from WS params
            const isAdmin = false;

            const pair = new WebSocketPair();
            const [client, server] = Object.values(pair);

            const meta: WebSocketMeta = { uid, username, avatar, nameColor, isAdmin };
            this.state.acceptWebSocket(server, [JSON.stringify(meta)]);

            this.sessions.set(server, uid);
            this.players.set(uid, {
                uid,
                profile: null,
                x: 0, y: 0, px: 0, py: 0, dir: 0, animFrame: 0,
            });

            console.log(`+ Player ${username} (${uid}) connected to lobby`);

            return new Response(null, { status: 101, webSocket: client });
        }

        // POST /create — create a new lobby
        if (url.pathname === '/create' && request.method === 'POST') {
            const body = await request.json<{
                name: string;
                visibility: 'public' | 'private';
                hostUid: string;
                hostUsername: string;
                hostAvatar: number;
                hostNameColor?: string;
            }>();

            const code = generateLobbyCode();
            this.lobby = {
                code,
                name: sanitizeLobbyName(body.name || `${sanitizeUsername(body.hostUsername)}'s Lobby`),
                hostUid: body.hostUid,
                hostUsername: sanitizeUsername(body.hostUsername),
                visibility: body.visibility === 'private' ? 'private' : 'public',
                players: [{
                    uid: body.hostUid,
                    username: sanitizeUsername(body.hostUsername),
                    avatar: Math.max(0, Math.min(11, body.hostAvatar || 0)),
                    className: 'warrior',
                    ready: false,
                    isHost: true,
                    nameColor: isValidHexColor(body.hostNameColor || '') ? body.hostNameColor : undefined,
                }],
                maxPlayers: 7,
                minPlayers: 2,
                gameStarted: false,
                floor: 1,
                createdAt: Date.now(),
            };

            await this.state.storage.put('lobby', this.lobby);
            this.lobbyId = url.searchParams.get('lobbyId') || url.pathname.split('/')[1] || 'unknown';
            console.log(`  Lobby created: ${code} (${this.lobby.visibility}) by ${body.hostUsername}`);

            // Register public lobby with UserRegistry for listing
            if (this.lobby.visibility === 'public') {
                this.registerLobby();
            }

            return json({ type: 'lobby_created', lobby: this.lobby });
        }

        // POST /join — join existing lobby
        if (url.pathname === '/join' && request.method === 'POST') {
            const body = await request.json<{
                uid: string;
                username: string;
                avatar: number;
                nameColor?: string;
            }>();

            if (!this.lobby) return json({ type: 'lobby_error', message: 'Lobby not found.' }, 404);
            if (this.lobby.gameStarted) return json({ type: 'lobby_error', message: 'Game already in progress.' });
            if (this.lobby.players.length >= 7) return json({ type: 'lobby_full', code: this.lobby.code });

            this.lobby.players.push({
                uid: body.uid,
                username: sanitizeUsername(body.username),
                avatar: Math.max(0, Math.min(11, body.avatar)),
                className: 'warrior',
                ready: false,
                isHost: false,
                nameColor: isValidHexColor(body.nameColor || '') ? body.nameColor : undefined,
            });

            await this.state.storage.put('lobby', this.lobby);
            this.broadcastAll({ type: 'lobby_updated', lobby: this.lobby });

            console.log(`  ${body.username} joined lobby ${this.lobby.code}`);
            return json({ type: 'lobby_joined', lobby: this.lobby });
        }

        // GET /info — get lobby info
        if (url.pathname === '/info' && request.method === 'GET') {
            if (!this.lobby) return json({ type: 'lobby_error', message: 'Lobby not found.' }, 404);
            return json({ lobby: this.lobby });
        }

        return json({ error: 'Not found' }, 404);
    }

    // Valid class names for set_class validation
    private static readonly VALID_CLASSES = new Set([
        'warrior', 'mage', 'rogue', 'paladin', 'ranger',
        'necromancer', 'berserker', 'cleric', 'assassin',
    ]);

    // ===== WEBSOCKET HANDLERS (Hibernation API) =====
    async webSocketOpen(ws: WebSocket): Promise<void> {
        const uid = this.sessions.get(ws);
        if (!uid) return;

        const meta = this.getWebSocketMeta(ws);
        if (!meta || !this.lobby) return;

        // Find this player in the lobby
        const lobbyPlayer = this.lobby.players.find(p => p.uid === uid);
        const className = lobbyPlayer?.className || 'warrior';

        // Build RemotePlayerState for the new player
        const newRemote = {
            uid,
            username: meta.username,
            avatar: meta.avatar,
            className,
            x: 0, y: 0, px: 0, py: 0,
            dir: 0 as 0 | 1 | 2 | 3,
            animFrame: 0,
            stats: { hp: 100, maxHp: 100, atk: 10, def: 5, spd: 1, critChance: 0.05 },
            equipment: {},
            alive: true,
            level: 1,
            nameColor: meta.nameColor,
        };

        // Tell existing players about the new player
        this.broadcastExcept(uid, { type: 'player_joined', player: newRemote });

        // Send existing players to the new player
        for (const existingWs of this.state.getWebSockets()) {
            const existingUid = this.sessions.get(existingWs);
            if (!existingUid || existingUid === uid) continue;
            const existingMeta = this.getWebSocketMeta(existingWs);
            if (!existingMeta) continue;
            const existingLobbyPlayer = this.lobby.players.find(p => p.uid === existingUid);
            const existingPlayer = this.players.get(existingUid);
            this.sendTo(ws, {
                type: 'player_joined',
                player: {
                    uid: existingUid,
                    username: existingMeta.username,
                    avatar: existingMeta.avatar,
                    className: existingLobbyPlayer?.className || 'warrior',
                    x: existingPlayer?.x || 0,
                    y: existingPlayer?.y || 0,
                    px: existingPlayer?.px || 0,
                    py: existingPlayer?.py || 0,
                    dir: existingPlayer?.dir || 0,
                    animFrame: existingPlayer?.animFrame || 0,
                    stats: { hp: 100, maxHp: 100, atk: 10, def: 5, spd: 1, critChance: 0.05 },
                    equipment: {},
                    alive: true,
                    level: 1,
                    nameColor: existingMeta.nameColor,
                },
            });
        }

        console.log(`  WebSocket open for ${meta.username} (${uid})`);
    }

    async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
        const data = typeof message === 'string' ? message : new TextDecoder().decode(message);

        // Message size check
        if (data.length > GameLobby.MAX_WS_MESSAGE_SIZE) return;

        let msg: any;
        try { msg = JSON.parse(data); } catch { return; }

        const uid = this.sessions.get(ws);
        if (!uid) return;

        // Rate limiting
        const now = Date.now();
        let rl = this.rateLimits.get(uid);
        if (!rl || now > rl.resetTime) {
            rl = { count: 0, resetTime: now + 1000 };
            this.rateLimits.set(uid, rl);
        }
        rl.count++;
        if (rl.count > GameLobby.MAX_MESSAGES_PER_SECOND) return; // silently drop

        switch (msg.type) {
            case 'player_move': {
                const player = this.players.get(uid);
                if (player) {
                    player.x = msg.x;
                    player.y = msg.y;
                    player.px = msg.px;
                    player.py = msg.py;
                    player.dir = msg.dir;
                    player.animFrame = msg.animFrame;
                }
                // Use the ws parameter directly (don't shadow it!)
                const moveMeta = this.getWebSocketMeta(ws);
                const lobbyPlayer = this.lobby?.players.find(p => p.uid === uid);
                this.broadcastExcept(uid, {
                    type: 'player_update',
                    uid,
                    username: moveMeta?.username || 'Player',
                    className: lobbyPlayer?.className || 'warrior',
                    avatar: moveMeta?.avatar ?? 0,
                    nameColor: moveMeta?.nameColor || '',
                    x: msg.x, y: msg.y,
                    dir: msg.dir,
                    px: msg.px, py: msg.py,
                    animFrame: msg.animFrame,
                    floor: msg.floor,
                });
                break;
            }

            case 'player_stats': {
                this.broadcastExcept(uid, {
                    type: 'player_stats_update',
                    uid,
                    stats: msg.stats,
                    level: msg.level,
                    equipment: msg.equipment,
                    alive: msg.alive,
                });
                break;
            }

            case 'player_attack': {
                this.broadcastExcept(uid, {
                    type: 'enemy_damage',
                    enemyIndex: msg.enemyIndex,
                    damage: msg.damage,
                    fromUid: uid,
                });
                if (msg.killed) {
                    this.broadcastExcept(uid, {
                        type: 'enemy_killed',
                        enemyIndex: msg.enemyIndex,
                        killerUid: uid,
                    });
                }
                break;
            }

            case 'floor_change': {
                const meta = this.getWebSocketMeta(ws);
                this.broadcastExcept(uid, {
                    type: 'floor_change',
                    floor: msg.floor,
                    seed: msg.seed,
                    fromUid: uid,
                    fromUsername: meta?.username || 'Player',
                });
                if (this.lobby) {
                    this.lobby.floor = msg.floor;
                    await this.state.storage.put('lobby', this.lobby);
                }
                console.log(`  ${meta?.username || uid} moved party to floor ${msg.floor}`);
                break;
            }

            case 'share_loot': {
                const meta = this.getWebSocketMeta(ws);
                this.broadcastExcept(uid, {
                    type: 'shared_loot',
                    xp: msg.xp,
                    gold: msg.gold,
                    enemyType: msg.enemyType,
                    killerUsername: meta?.username || 'Unknown',
                });
                break;
            }

            case 'revive_request': {
                const meta = this.getWebSocketMeta(ws);
                this.broadcastAll({
                    type: 'revive_player',
                    targetUid: msg.targetUid,
                    fromUid: uid,
                    fromUsername: meta?.username || 'Unknown',
                });
                break;
            }

            case 'chat': {
                const chatMsg = sanitizeChatMessage(String(msg.message || ''));
                if (!chatMsg) break; // empty after sanitization
                const meta = this.getWebSocketMeta(ws);
                this.broadcastAll({
                    type: 'chat_msg',
                    fromUid: uid,
                    fromUsername: meta?.username || 'Unknown',
                    message: chatMsg,
                    nameColor: meta?.nameColor,
                });
                break;
            }

            case 'set_class': {
                if (!this.lobby) break;
                // Validate class name
                if (!GameLobby.VALID_CLASSES.has(msg.className)) break;
                const p = this.lobby.players.find(p => p.uid === uid);
                if (p) p.className = msg.className;
                await this.state.storage.put('lobby', this.lobby);
                this.broadcastAll({ type: 'lobby_updated', lobby: this.lobby });
                break;
            }

            case 'toggle_ready': {
                if (!this.lobby) break;
                const p = this.lobby.players.find(p => p.uid === uid);
                if (p) p.ready = !p.ready;
                await this.state.storage.put('lobby', this.lobby);
                this.broadcastAll({ type: 'lobby_updated', lobby: this.lobby });
                break;
            }

            case 'start_game': {
                if (!this.lobby || this.lobby.hostUid !== uid) break;
                if (this.lobby.players.length < 1) {
                    this.sendTo(ws, { type: 'lobby_error', message: 'Need at least 1 player to start.' });
                    break;
                }
                this.lobby.gameStarted = true;
                const seed = Math.floor(Math.random() * 999999);
                (this.lobby as any).currentSeed = seed; // persist so late joiners get same seed
                await this.state.storage.put('lobby', this.lobby);
                this.broadcastAll({ type: 'game_start', floor: this.lobby.floor, seed });
                console.log(`  Game started in lobby ${this.lobby.code} with ${this.lobby.players.length} players`);
                break;
            }

            case 'leave_lobby': {
                this.handlePlayerLeave(uid, ws);
                break;
            }

            case 'emote': {
                const meta = this.getWebSocketMeta(ws);
                this.broadcastAll({
                    type: 'emote',
                    fromUid: uid,
                    fromUsername: meta?.username || 'Unknown',
                    emoteId: msg.emoteId,
                });
                break;
            }

            case 'teleport_request': {
                // Find the host player's position
                if (this.lobby) {
                    const hostUid = this.lobby.hostUid;
                    const hostPlayer = this.players.get(hostUid);
                    if (hostPlayer) {
                        this.sendTo(ws, {
                            type: 'teleport_info',
                            hostUid,
                            hostX: hostPlayer.x,
                            hostY: hostPlayer.y,
                        });
                    }
                }
                break;
            }

            case 'ping': {
                this.sendTo(ws, { type: 'pong', timestamp: msg.timestamp || 0 });
                break;
            }
        }
    }

    async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
        const uid = this.sessions.get(ws);
        if (uid) {
            console.log(`- Player ${uid} disconnected from lobby`);
            this.handlePlayerLeave(uid, ws);
        }
    }

    async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
        const uid = this.sessions.get(ws);
        if (uid) {
            console.error(`WebSocket error for ${uid}:`, error);
            this.handlePlayerLeave(uid, ws);
        }
    }

    // ===== HELPERS =====
    private handlePlayerLeave(uid: string, ws: WebSocket): void {
        this.sessions.delete(ws);
        this.players.delete(uid);

        if (this.lobby) {
            this.lobby.players = this.lobby.players.filter(p => p.uid !== uid);

            if (this.lobby.players.length === 0) {
                // Delete lobby when empty
                this.unregisterLobby();
                this.state.storage.delete('lobby');
                this.lobby = null;
                console.log(`  Lobby deleted (empty)`);
            } else {
                // Assign new host if host left
                if (this.lobby.hostUid === uid) {
                    this.lobby.hostUid = this.lobby.players[0].uid;
                    this.lobby.hostUsername = this.lobby.players[0].username;
                    this.lobby.players[0].isHost = true;
                }
                this.state.storage.put('lobby', this.lobby);
                this.broadcastAll({ type: 'player_left', uid });
                this.broadcastAll({ type: 'lobby_updated', lobby: this.lobby });
            }
        }

        this.sendTo(ws, { type: 'lobby_left' });

        // Notify UserRegistry that this user is offline
        try {
            ws.close(1000, 'Left lobby');
        } catch { /* already closed */ }
    }

    private getWebSocketMeta(ws: WebSocket): WebSocketMeta | null {
        const tags = this.state.getWebSocketTags(ws);
        if (tags && tags.length > 0) {
            try { return JSON.parse(tags[0]); } catch { return null; }
        }
        return null;
    }

    private sendTo(ws: WebSocket, msg: any): void {
        try {
            ws.send(JSON.stringify(msg));
        } catch { /* ignore closed */ }
    }

    private broadcastAll(msg: any): void {
        const data = JSON.stringify(msg);
        for (const ws of this.state.getWebSockets()) {
            try { ws.send(data); } catch { /* ignore */ }
        }
    }

    private broadcastExcept(excludeUid: string, msg: any): void {
        const data = JSON.stringify(msg);
        for (const ws of this.state.getWebSockets()) {
            const wsUid = this.sessions.get(ws);
            if (wsUid !== excludeUid) {
                try { ws.send(data); } catch { /* ignore */ }
            }
        }
    }

    // Register/unregister with UserRegistry for public lobby listing
    private async registerLobby(): Promise<void> {
        if (!this.lobby || !this.lobbyId) return;
        try {
            const registryId = this.env.USER_REGISTRY.idFromName('global');
            const registry = this.env.USER_REGISTRY.get(registryId);
            await registry.fetch(new Request('http://internal/register-lobby', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Internal-Secret': INTERNAL_SECRET,
                },
                body: JSON.stringify({
                    lobbyId: this.lobbyId,
                    name: this.lobby.name,
                    code: this.lobby.code,
                    hostUsername: this.lobby.hostUsername,
                    playerCount: this.lobby.players.length,
                    maxPlayers: this.lobby.maxPlayers,
                    floor: this.lobby.floor,
                    gameStarted: this.lobby.gameStarted,
                    visibility: this.lobby.visibility,
                }),
            }));

            // Also register the code→lobbyId mapping so players can join by code
            await registry.fetch(new Request('http://internal/map-lobby-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Internal-Secret': INTERNAL_SECRET,
                },
                body: JSON.stringify({
                    code: this.lobby.code,
                    lobbyId: this.lobbyId,
                }),
            }));
        } catch (e) {
            console.error('Failed to register lobby:', e);
        }
    }

    private async unregisterLobby(): Promise<void> {
        if (!this.lobbyId) return;
        try {
            const registryId = this.env.USER_REGISTRY.idFromName('global');
            const registry = this.env.USER_REGISTRY.get(registryId);
            await registry.fetch(new Request('http://internal/unregister-lobby', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Internal-Secret': INTERNAL_SECRET,
                },
                body: JSON.stringify({ lobbyId: this.lobbyId }),
            }));
        } catch (e) {
            console.error('Failed to unregister lobby:', e);
        }
    }
}

function json(data: any, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
