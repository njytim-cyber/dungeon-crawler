// ===== GAME LOBBY DURABLE OBJECT =====
// Each lobby gets its own Durable Object instance with WebSocket hibernation.
// Handles real-time game sync: player positions, stats, combat, and chat.

import {
    LobbyInfo, LobbyPlayer, ConnectedPlayer, UserProfile,
    generateLobbyCode, type Env,
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
            const username = url.searchParams.get('username') || '';
            const avatar = parseInt(url.searchParams.get('avatar') || '0');
            const nameColor = url.searchParams.get('nameColor') || undefined;
            const isAdmin = url.searchParams.get('isAdmin') === 'true';

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
                name: body.name || `${body.hostUsername}'s Lobby`,
                hostUid: body.hostUid,
                hostUsername: body.hostUsername,
                visibility: body.visibility || 'public',
                players: [{
                    uid: body.hostUid,
                    username: body.hostUsername,
                    avatar: body.hostAvatar,
                    className: 'warrior',
                    ready: false,
                    isHost: true,
                    nameColor: body.hostNameColor,
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
                username: body.username,
                avatar: body.avatar,
                className: 'warrior',
                ready: false,
                isHost: false,
                nameColor: body.nameColor,
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

    // ===== WEBSOCKET HANDLERS (Hibernation API) =====
    async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
        const data = typeof message === 'string' ? message : new TextDecoder().decode(message);
        let msg: any;
        try { msg = JSON.parse(data); } catch { return; }

        const uid = this.sessions.get(ws);
        if (!uid) return;

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
                this.broadcastExcept(uid, {
                    type: 'player_update',
                    uid,
                    x: msg.x, y: msg.y,
                    dir: msg.dir,
                    px: msg.px, py: msg.py,
                    animFrame: msg.animFrame,
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
                const meta = this.getWebSocketMeta(ws);
                this.broadcastAll({
                    type: 'chat_msg',
                    fromUid: uid,
                    fromUsername: meta?.username || 'Unknown',
                    message: msg.message,
                    nameColor: meta?.nameColor,
                });
                break;
            }

            case 'set_class': {
                if (!this.lobby) break;
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
                if (this.lobby.players.length < 2) {
                    this.sendTo(ws, { type: 'lobby_error', message: 'Need at least 2 players to start.' });
                    break;
                }
                this.lobby.gameStarted = true;
                const seed = Math.floor(Math.random() * 999999);
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
                this.broadcastAll({ type: 'lobby_updated', lobby: this.lobby });
            }

            this.broadcastAll({ type: 'player_left', uid });
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
                headers: { 'Content-Type': 'application/json' },
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
                headers: { 'Content-Type': 'application/json' },
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
