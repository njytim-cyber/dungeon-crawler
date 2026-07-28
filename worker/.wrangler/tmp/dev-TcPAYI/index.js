var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/types.ts
var ADMIN_EMAILS = /* @__PURE__ */ new Set([
  // Stored as hashes in production; for this game, acceptable as-is
  "evanngjianen@gmail.com",
  "ethanngjianheng@gmail.com"
]);
var INTERNAL_SECRET = "dc-internal-k9x7m2p4";
var LOGIN_STARTER_GEAR = [
  {
    id: "iron_sword_login",
    name: "Iron Sword \u2605",
    description: "A sturdy iron sword, reward for logging in.",
    category: "weapon",
    rarity: "uncommon",
    icon: "sword",
    equipSlot: "weapon",
    stats: { atk: 5 },
    value: 50,
    stackable: false
  },
  {
    id: "leather_armor_login",
    name: "Leather Armor \u2605",
    description: "Supple leather armor, reward for logging in.",
    category: "armor",
    rarity: "uncommon",
    icon: "armor",
    equipSlot: "armor",
    stats: { def: 4, maxHp: 10 },
    value: 40,
    stackable: false
  },
  {
    id: "ruby_ring_login",
    name: "Ruby Ring \u2605",
    description: "A glowing ruby ring, reward for logging in.",
    category: "ring",
    rarity: "rare",
    icon: "ring",
    equipSlot: "ring",
    stats: { critChance: 0.08, atk: 2 },
    value: 80,
    stackable: false
  }
];
function generateNameColor() {
  const colors = [
    "#ff6b6b",
    "#feca57",
    "#48dbfb",
    "#ff9ff3",
    "#54a0ff",
    "#5f27cd",
    "#01a3a4",
    "#f368e0",
    "#ff6348",
    "#7bed9f",
    "#e056fd",
    "#686de0",
    "#30336b",
    "#22a6b3",
    "#eb4d4b"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
__name(generateNameColor, "generateNameColor");
function generateLobbyCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let code = "";
  for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
__name(generateLobbyCode, "generateLobbyCode");
function generateUid() {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
__name(generateUid, "generateUid");
function isValidHexColor(color) {
  return /^#[0-9a-fA-F]{3,8}$/.test(color);
}
__name(isValidHexColor, "isValidHexColor");
function sanitizeUsername(name) {
  return name.replace(/[<>&"'/\\]/g, "").replace(/[\x00-\x1f\x7f]/g, "").trim().slice(0, 20);
}
__name(sanitizeUsername, "sanitizeUsername");
function sanitizeLobbyName(name) {
  return name.replace(/[<>&"'/\\]/g, "").replace(/[\x00-\x1f\x7f]/g, "").trim().slice(0, 30);
}
__name(sanitizeLobbyName, "sanitizeLobbyName");
function sanitizeChatMessage(msg) {
  return msg.replace(/[<>&"']/g, (c) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;",
    "'": "&#39;"
  })[c] || c).trim().slice(0, 200);
}
__name(sanitizeChatMessage, "sanitizeChatMessage");

// src/game-lobby.ts
var GameLobby = class _GameLobby {
  static {
    __name(this, "GameLobby");
  }
  state;
  env;
  // Lobby info
  lobby = null;
  // Connected players mapped by uid
  players = /* @__PURE__ */ new Map();
  // WebSocket -> uid mapping
  sessions = /* @__PURE__ */ new Map();
  // Track our lobby ID for registry
  lobbyId = null;
  // Rate limiting: uid -> { count, resetTime }
  rateLimits = /* @__PURE__ */ new Map();
  static MAX_MESSAGES_PER_SECOND = 10;
  static MAX_WS_MESSAGE_SIZE = 4096;
  // 4KB
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.get("lobby");
      if (stored) this.lobby = stored;
    });
  }
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/ws") {
      const upgradeHeader = request.headers.get("Upgrade");
      if (!upgradeHeader || upgradeHeader !== "websocket") {
        return new Response("Expected Upgrade: websocket", { status: 426 });
      }
      const uid = url.searchParams.get("uid") || "";
      const username = sanitizeUsername(url.searchParams.get("username") || "");
      const avatar = Math.max(0, Math.min(11, parseInt(url.searchParams.get("avatar") || "0")));
      const rawColor = url.searchParams.get("nameColor") || "";
      const nameColor = isValidHexColor(rawColor) ? rawColor : void 0;
      const isAdmin = false;
      const pair = new WebSocketPair();
      const [client, server] = Object.values(pair);
      const meta = { uid, username, avatar, nameColor, isAdmin };
      this.state.acceptWebSocket(server, [JSON.stringify(meta)]);
      this.sessions.set(server, uid);
      this.players.set(uid, {
        uid,
        profile: null,
        x: 0,
        y: 0,
        px: 0,
        py: 0,
        dir: 0,
        animFrame: 0
      });
      console.log(`+ Player ${username} (${uid}) connected to lobby`);
      return new Response(null, { status: 101, webSocket: client });
    }
    if (url.pathname === "/create" && request.method === "POST") {
      const body = await request.json();
      const code = generateLobbyCode();
      this.lobby = {
        code,
        name: sanitizeLobbyName(body.name || `${sanitizeUsername(body.hostUsername)}'s Lobby`),
        hostUid: body.hostUid,
        hostUsername: sanitizeUsername(body.hostUsername),
        visibility: body.visibility === "private" ? "private" : "public",
        players: [{
          uid: body.hostUid,
          username: sanitizeUsername(body.hostUsername),
          avatar: Math.max(0, Math.min(11, body.hostAvatar || 0)),
          className: "warrior",
          ready: false,
          isHost: true,
          nameColor: isValidHexColor(body.hostNameColor || "") ? body.hostNameColor : void 0
        }],
        maxPlayers: 7,
        minPlayers: 2,
        gameStarted: false,
        floor: 1,
        createdAt: Date.now()
      };
      await this.state.storage.put("lobby", this.lobby);
      this.lobbyId = url.searchParams.get("lobbyId") || url.pathname.split("/")[1] || "unknown";
      console.log(`  Lobby created: ${code} (${this.lobby.visibility}) by ${body.hostUsername}`);
      if (this.lobby.visibility === "public") {
        this.registerLobby();
      }
      return json({ type: "lobby_created", lobby: this.lobby });
    }
    if (url.pathname === "/join" && request.method === "POST") {
      const body = await request.json();
      if (!this.lobby) return json({ type: "lobby_error", message: "Lobby not found." }, 404);
      if (this.lobby.gameStarted) return json({ type: "lobby_error", message: "Game already in progress." });
      if (this.lobby.players.length >= 7) return json({ type: "lobby_full", code: this.lobby.code });
      this.lobby.players.push({
        uid: body.uid,
        username: sanitizeUsername(body.username),
        avatar: Math.max(0, Math.min(11, body.avatar)),
        className: "warrior",
        ready: false,
        isHost: false,
        nameColor: isValidHexColor(body.nameColor || "") ? body.nameColor : void 0
      });
      await this.state.storage.put("lobby", this.lobby);
      this.broadcastAll({ type: "lobby_updated", lobby: this.lobby });
      console.log(`  ${body.username} joined lobby ${this.lobby.code}`);
      return json({ type: "lobby_joined", lobby: this.lobby });
    }
    if (url.pathname === "/info" && request.method === "GET") {
      if (!this.lobby) return json({ type: "lobby_error", message: "Lobby not found." }, 404);
      return json({ lobby: this.lobby });
    }
    return json({ error: "Not found" }, 404);
  }
  // Valid class names for set_class validation
  static VALID_CLASSES = /* @__PURE__ */ new Set([
    "warrior",
    "mage",
    "rogue",
    "paladin",
    "ranger",
    "necromancer",
    "berserker",
    "cleric",
    "assassin"
  ]);
  // ===== WEBSOCKET HANDLERS (Hibernation API) =====
  async webSocketOpen(ws) {
    const uid = this.sessions.get(ws);
    if (!uid) return;
    const meta = this.getWebSocketMeta(ws);
    if (!meta || !this.lobby) return;
    const lobbyPlayer = this.lobby.players.find((p) => p.uid === uid);
    const className = lobbyPlayer?.className || "warrior";
    const newRemote = {
      uid,
      username: meta.username,
      avatar: meta.avatar,
      className,
      x: 0,
      y: 0,
      px: 0,
      py: 0,
      dir: 0,
      animFrame: 0,
      stats: { hp: 100, maxHp: 100, atk: 10, def: 5, spd: 1, critChance: 0.05 },
      equipment: {},
      alive: true,
      level: 1,
      nameColor: meta.nameColor
    };
    this.broadcastExcept(uid, { type: "player_joined", player: newRemote });
    for (const existingWs of this.state.getWebSockets()) {
      const existingUid = this.sessions.get(existingWs);
      if (!existingUid || existingUid === uid) continue;
      const existingMeta = this.getWebSocketMeta(existingWs);
      if (!existingMeta) continue;
      const existingLobbyPlayer = this.lobby.players.find((p) => p.uid === existingUid);
      const existingPlayer = this.players.get(existingUid);
      this.sendTo(ws, {
        type: "player_joined",
        player: {
          uid: existingUid,
          username: existingMeta.username,
          avatar: existingMeta.avatar,
          className: existingLobbyPlayer?.className || "warrior",
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
          nameColor: existingMeta.nameColor
        }
      });
    }
    console.log(`  WebSocket open for ${meta.username} (${uid})`);
  }
  async webSocketMessage(ws, message) {
    const data = typeof message === "string" ? message : new TextDecoder().decode(message);
    if (data.length > _GameLobby.MAX_WS_MESSAGE_SIZE) return;
    let msg;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    const uid = this.sessions.get(ws);
    if (!uid) return;
    const now = Date.now();
    let rl = this.rateLimits.get(uid);
    if (!rl || now > rl.resetTime) {
      rl = { count: 0, resetTime: now + 1e3 };
      this.rateLimits.set(uid, rl);
    }
    rl.count++;
    if (rl.count > _GameLobby.MAX_MESSAGES_PER_SECOND) return;
    switch (msg.type) {
      case "player_move": {
        const player = this.players.get(uid);
        if (player) {
          player.x = msg.x;
          player.y = msg.y;
          player.px = msg.px;
          player.py = msg.py;
          player.dir = msg.dir;
          player.animFrame = msg.animFrame;
        }
        const moveMeta = this.getWebSocketMeta(ws);
        const lobbyPlayer = this.lobby?.players.find((p) => p.uid === uid);
        this.broadcastExcept(uid, {
          type: "player_update",
          uid,
          username: moveMeta?.username || "Player",
          className: lobbyPlayer?.className || "warrior",
          avatar: moveMeta?.avatar ?? 0,
          nameColor: moveMeta?.nameColor || "",
          x: msg.x,
          y: msg.y,
          dir: msg.dir,
          px: msg.px,
          py: msg.py,
          animFrame: msg.animFrame,
          floor: msg.floor
        });
        break;
      }
      case "player_stats": {
        this.broadcastExcept(uid, {
          type: "player_stats_update",
          uid,
          stats: msg.stats,
          level: msg.level,
          equipment: msg.equipment,
          alive: msg.alive
        });
        break;
      }
      case "player_attack": {
        this.broadcastExcept(uid, {
          type: "enemy_damage",
          enemyIndex: msg.enemyIndex,
          damage: msg.damage,
          fromUid: uid
        });
        if (msg.killed) {
          this.broadcastExcept(uid, {
            type: "enemy_killed",
            enemyIndex: msg.enemyIndex,
            killerUid: uid
          });
        }
        break;
      }
      case "floor_change": {
        const meta = this.getWebSocketMeta(ws);
        this.broadcastExcept(uid, {
          type: "floor_change",
          floor: msg.floor,
          seed: msg.seed,
          fromUid: uid,
          fromUsername: meta?.username || "Player"
        });
        if (this.lobby) {
          this.lobby.floor = msg.floor;
          await this.state.storage.put("lobby", this.lobby);
        }
        console.log(`  ${meta?.username || uid} moved party to floor ${msg.floor}`);
        break;
      }
      case "share_loot": {
        const meta = this.getWebSocketMeta(ws);
        this.broadcastExcept(uid, {
          type: "shared_loot",
          xp: msg.xp,
          gold: msg.gold,
          enemyType: msg.enemyType,
          killerUsername: meta?.username || "Unknown"
        });
        break;
      }
      case "revive_request": {
        const meta = this.getWebSocketMeta(ws);
        this.broadcastAll({
          type: "revive_player",
          targetUid: msg.targetUid,
          fromUid: uid,
          fromUsername: meta?.username || "Unknown"
        });
        break;
      }
      case "chat": {
        const chatMsg = sanitizeChatMessage(String(msg.message || ""));
        if (!chatMsg) break;
        const meta = this.getWebSocketMeta(ws);
        this.broadcastAll({
          type: "chat_msg",
          fromUid: uid,
          fromUsername: meta?.username || "Unknown",
          message: chatMsg,
          nameColor: meta?.nameColor
        });
        break;
      }
      case "set_class": {
        if (!this.lobby) break;
        if (!_GameLobby.VALID_CLASSES.has(msg.className)) break;
        const p = this.lobby.players.find((p2) => p2.uid === uid);
        if (p) p.className = msg.className;
        await this.state.storage.put("lobby", this.lobby);
        this.broadcastAll({ type: "lobby_updated", lobby: this.lobby });
        break;
      }
      case "toggle_ready": {
        if (!this.lobby) break;
        const p = this.lobby.players.find((p2) => p2.uid === uid);
        if (p) p.ready = !p.ready;
        await this.state.storage.put("lobby", this.lobby);
        this.broadcastAll({ type: "lobby_updated", lobby: this.lobby });
        break;
      }
      case "start_game": {
        if (!this.lobby || this.lobby.hostUid !== uid) break;
        if (this.lobby.players.length < 1) {
          this.sendTo(ws, { type: "lobby_error", message: "Need at least 1 player to start." });
          break;
        }
        this.lobby.gameStarted = true;
        const seed = Math.floor(Math.random() * 999999);
        this.lobby.currentSeed = seed;
        await this.state.storage.put("lobby", this.lobby);
        this.broadcastAll({ type: "game_start", floor: this.lobby.floor, seed });
        console.log(`  Game started in lobby ${this.lobby.code} with ${this.lobby.players.length} players`);
        break;
      }
      case "leave_lobby": {
        this.handlePlayerLeave(uid, ws);
        break;
      }
      case "emote": {
        const meta = this.getWebSocketMeta(ws);
        this.broadcastAll({
          type: "emote",
          fromUid: uid,
          fromUsername: meta?.username || "Unknown",
          emoteId: msg.emoteId
        });
        break;
      }
      case "teleport_request": {
        if (this.lobby) {
          const hostUid = this.lobby.hostUid;
          const hostPlayer = this.players.get(hostUid);
          if (hostPlayer) {
            this.sendTo(ws, {
              type: "teleport_info",
              hostUid,
              hostX: hostPlayer.x,
              hostY: hostPlayer.y
            });
          }
        }
        break;
      }
      case "ping": {
        this.sendTo(ws, { type: "pong", timestamp: msg.timestamp || 0 });
        break;
      }
    }
  }
  async webSocketClose(ws, code, reason, wasClean) {
    const uid = this.sessions.get(ws);
    if (uid) {
      console.log(`- Player ${uid} disconnected from lobby`);
      this.handlePlayerLeave(uid, ws);
    }
  }
  async webSocketError(ws, error) {
    const uid = this.sessions.get(ws);
    if (uid) {
      console.error(`WebSocket error for ${uid}:`, error);
      this.handlePlayerLeave(uid, ws);
    }
  }
  // ===== HELPERS =====
  handlePlayerLeave(uid, ws) {
    this.sessions.delete(ws);
    this.players.delete(uid);
    if (this.lobby) {
      this.lobby.players = this.lobby.players.filter((p) => p.uid !== uid);
      if (this.lobby.players.length === 0) {
        this.unregisterLobby();
        this.state.storage.delete("lobby");
        this.lobby = null;
        console.log(`  Lobby deleted (empty)`);
      } else {
        if (this.lobby.hostUid === uid) {
          this.lobby.hostUid = this.lobby.players[0].uid;
          this.lobby.hostUsername = this.lobby.players[0].username;
          this.lobby.players[0].isHost = true;
        }
        this.state.storage.put("lobby", this.lobby);
        this.broadcastAll({ type: "player_left", uid });
        this.broadcastAll({ type: "lobby_updated", lobby: this.lobby });
      }
    }
    this.sendTo(ws, { type: "lobby_left" });
    try {
      ws.close(1e3, "Left lobby");
    } catch {
    }
  }
  getWebSocketMeta(ws) {
    const tags = this.state.getTags(ws);
    if (tags && tags.length > 0) {
      try {
        return JSON.parse(tags[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
  sendTo(ws, msg) {
    try {
      ws.send(JSON.stringify(msg));
    } catch {
    }
  }
  broadcastAll(msg) {
    const data = JSON.stringify(msg);
    for (const ws of this.state.getWebSockets()) {
      try {
        ws.send(data);
      } catch {
      }
    }
  }
  broadcastExcept(excludeUid, msg) {
    const data = JSON.stringify(msg);
    for (const ws of this.state.getWebSockets()) {
      const wsUid = this.sessions.get(ws);
      if (wsUid !== excludeUid) {
        try {
          ws.send(data);
        } catch {
        }
      }
    }
  }
  // Register/unregister with UserRegistry for public lobby listing
  async registerLobby() {
    if (!this.lobby || !this.lobbyId) return;
    try {
      const registryId = this.env.USER_REGISTRY.idFromName("global");
      const registry = this.env.USER_REGISTRY.get(registryId);
      await registry.fetch(new Request("http://internal/register-lobby", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Secret": INTERNAL_SECRET
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
          visibility: this.lobby.visibility
        })
      }));
      await registry.fetch(new Request("http://internal/map-lobby-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Secret": INTERNAL_SECRET
        },
        body: JSON.stringify({
          code: this.lobby.code,
          lobbyId: this.lobbyId
        })
      }));
    } catch (e) {
      console.error("Failed to register lobby:", e);
    }
  }
  async unregisterLobby() {
    if (!this.lobbyId) return;
    try {
      const registryId = this.env.USER_REGISTRY.idFromName("global");
      const registry = this.env.USER_REGISTRY.get(registryId);
      await registry.fetch(new Request("http://internal/unregister-lobby", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Secret": INTERNAL_SECRET
        },
        body: JSON.stringify({ lobbyId: this.lobbyId })
      }));
    } catch (e) {
      console.error("Failed to unregister lobby:", e);
    }
  }
};
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(json, "json");

// src/user-registry.ts
var UserRegistry = class {
  static {
    __name(this, "UserRegistry");
  }
  state;
  users = /* @__PURE__ */ new Map();
  emailToUid = /* @__PURE__ */ new Map();
  usernameToUid = /* @__PURE__ */ new Map();
  initialized = false;
  // Track which users are currently online (uid -> lobby WebSocket server name)
  onlineUsers = /* @__PURE__ */ new Set();
  // Track active public lobbies for listing
  activeLobbies = /* @__PURE__ */ new Map();
  // Map lobby codes to Durable Object lobby IDs so users can join by code
  lobbyCodeToId = /* @__PURE__ */ new Map();
  constructor(state, env) {
    this.state = state;
  }
  async init() {
    if (this.initialized) return;
    const stored = await this.state.storage.get("data");
    if (stored) {
      for (const [uid, profile] of Object.entries(stored.users)) {
        this.users.set(uid, profile);
      }
      for (const [email, uid] of Object.entries(stored.emailToUid)) {
        this.emailToUid.set(email, uid);
      }
      for (const [username, uid] of Object.entries(stored.usernameToUid)) {
        this.usernameToUid.set(username, uid);
      }
    }
    const storedLobbies = await this.state.storage.get("activeLobbies");
    if (storedLobbies) {
      for (const [id, lobby] of Object.entries(storedLobbies)) {
        this.activeLobbies.set(id, lobby);
      }
    }
    const storedCodes = await this.state.storage.get("lobbyCodeToId");
    if (storedCodes) {
      for (const [code, id] of Object.entries(storedCodes)) {
        this.lobbyCodeToId.set(code, id);
      }
    }
    this.initialized = true;
  }
  async persist() {
    const data = {
      users: Object.fromEntries(this.users),
      emailToUid: Object.fromEntries(this.emailToUid),
      usernameToUid: Object.fromEntries(this.usernameToUid)
    };
    await this.state.storage.put("data", data);
  }
  async persistLobbies() {
    await this.state.storage.put("activeLobbies", Object.fromEntries(this.activeLobbies));
    await this.state.storage.put("lobbyCodeToId", Object.fromEntries(this.lobbyCodeToId));
  }
  async fetch(request) {
    await this.init();
    const url = new URL(request.url);
    const path = url.pathname;
    const isInternal = request.headers.get("X-Internal-Secret") === INTERNAL_SECRET;
    const LOBBY_TTL = 15 * 60 * 1e3;
    const now = Date.now();
    let lobbiesChanged = false;
    for (const [id, lobby] of this.activeLobbies) {
      if (now - lobby.createdAt > LOBBY_TTL) {
        this.activeLobbies.delete(id);
        this.lobbyCodeToId.delete(lobby.code?.toUpperCase());
        lobbiesChanged = true;
      }
    }
    if (lobbiesChanged) await this.persistLobbies();
    if (path === "/auth" && request.method === "POST") {
      const body = await request.json();
      return this.handleAuth(body.email, body.username);
    }
    if (path === "/set-username" && request.method === "POST") {
      const body = await request.json();
      return this.handleSetUsername(body.uid, body.username);
    }
    if (path === "/set-avatar" && request.method === "POST") {
      const body = await request.json();
      return this.handleSetAvatar(body.uid, body.avatar);
    }
    if (path === "/friend-request" && request.method === "POST") {
      const body = await request.json();
      return this.handleFriendRequest(body.uid, body.targetUsername);
    }
    if (path === "/friend-accept" && request.method === "POST") {
      const body = await request.json();
      return this.handleFriendAccept(body.uid, body.fromUid);
    }
    if (path === "/friend-decline" && request.method === "POST") {
      const body = await request.json();
      return this.handleFriendDecline(body.uid, body.fromUid);
    }
    if (path === "/friends" && request.method === "GET") {
      const uid = url.searchParams.get("uid");
      if (!uid) return json2({ error: "Missing uid" }, 400);
      return this.handleGetFriends(uid);
    }
    if (path === "/profile" && request.method === "GET") {
      const uid = url.searchParams.get("uid");
      if (!uid) return json2({ error: "Missing uid" }, 400);
      const profile = this.users.get(uid);
      if (!profile) return json2({ error: "User not found" }, 404);
      return json2({ profile });
    }
    if (path === "/set-online" && request.method === "POST") {
      const body = await request.json();
      if (!this.users.has(body.uid)) return json2({ error: "Invalid uid" }, 403);
      if (body.online) {
        this.onlineUsers.add(body.uid);
      } else {
        this.onlineUsers.delete(body.uid);
      }
      return json2({ ok: true });
    }
    if (path === "/online-admins" && request.method === "GET") {
      const admins = [];
      for (const uid of this.onlineUsers) {
        const profile = this.users.get(uid);
        if (profile?.isAdmin) admins.push(uid);
      }
      return json2({ admins });
    }
    if (path === "/register-lobby" && request.method === "POST") {
      if (!isInternal) return json2({ error: "Forbidden" }, 403);
      const body = await request.json();
      if (body.visibility === "public" && !body.gameStarted) {
        this.activeLobbies.set(body.lobbyId, {
          name: body.name,
          code: body.code,
          hostUsername: body.hostUsername,
          playerCount: body.playerCount,
          maxPlayers: body.maxPlayers,
          floor: body.floor,
          gameStarted: body.gameStarted,
          lobbyId: body.lobbyId,
          createdAt: Date.now()
        });
        await this.persistLobbies();
      }
      return json2({ ok: true });
    }
    if (path === "/unregister-lobby" && request.method === "POST") {
      if (!isInternal) return json2({ error: "Forbidden" }, 403);
      const body = await request.json();
      this.activeLobbies.delete(body.lobbyId);
      await this.persistLobbies();
      return json2({ ok: true });
    }
    if (path === "/public-lobbies" && request.method === "GET") {
      const lobbies = Array.from(this.activeLobbies.values()).filter((l) => !l.gameStarted && l.playerCount < l.maxPlayers).sort((a, b) => b.createdAt - a.createdAt).slice(0, 20);
      return json2({ lobbies });
    }
    if (path === "/map-lobby-code" && request.method === "POST") {
      if (!isInternal) return json2({ error: "Forbidden" }, 403);
      const body = await request.json();
      if (body.code && body.lobbyId) {
        this.lobbyCodeToId.set(body.code.toUpperCase(), body.lobbyId);
        await this.persistLobbies();
      }
      return json2({ ok: true });
    }
    if (path === "/resolve-lobby" && request.method === "GET") {
      const code = url.searchParams.get("code")?.toUpperCase() || "";
      const lobbyId = this.lobbyCodeToId.get(code);
      return json2({ lobbyId: lobbyId || null });
    }
    return json2({ error: "Not found" }, 404);
  }
  // ===== AUTH =====
  async handleAuth(email, requestedUsername) {
    email = email.trim().toLowerCase();
    requestedUsername = sanitizeUsername(requestedUsername);
    if (!email || !requestedUsername) {
      return json2({ type: "auth_error", message: "Email and username required." });
    }
    let uid = this.emailToUid.get(email);
    let starterGear;
    if (uid) {
      const profile2 = this.users.get(uid);
      profile2.isLoggedIn = true;
      await this.persist();
      return json2({ type: "auth_ok", profile: profile2, uid });
    }
    uid = generateUid();
    let username = requestedUsername;
    let suffix = 1;
    while (this.usernameToUid.has(username.toLowerCase())) {
      username = `${requestedUsername}${suffix++}`;
    }
    const profile = {
      uid,
      email,
      username,
      avatar: Math.floor(Math.random() * 12),
      isLoggedIn: true,
      isAdmin: ADMIN_EMAILS.has(email),
      friends: [],
      friendRequests: [],
      nameColor: generateNameColor(),
      createdAt: Date.now()
    };
    this.users.set(uid, profile);
    this.emailToUid.set(email, uid);
    this.usernameToUid.set(username.toLowerCase(), uid);
    starterGear = LOGIN_STARTER_GEAR;
    await this.persist();
    console.log(`  New user: ${username} (${email})${profile.isAdmin ? " [ADMIN]" : ""}`);
    return json2({ type: "auth_ok", profile, uid, starterGear });
  }
  // ===== USERNAME =====
  async handleSetUsername(uid, newName) {
    const profile = this.users.get(uid);
    if (!profile) return json2({ type: "auth_error", message: "Not logged in." });
    newName = sanitizeUsername(newName);
    if (!newName || newName.length > 20) {
      return json2({ type: "auth_error", message: "Username must be 1-20 characters." });
    }
    if (this.usernameToUid.has(newName.toLowerCase()) && this.usernameToUid.get(newName.toLowerCase()) !== uid) {
      return json2({ type: "auth_error", message: "Username already taken." });
    }
    this.usernameToUid.delete(profile.username.toLowerCase());
    profile.username = newName;
    this.usernameToUid.set(newName.toLowerCase(), uid);
    await this.persist();
    return json2({ type: "profile_updated", profile: { username: newName } });
  }
  // ===== AVATAR =====
  async handleSetAvatar(uid, avatar) {
    const profile = this.users.get(uid);
    if (!profile) return json2({ type: "auth_error", message: "Not logged in." });
    const safeAvatar = Math.max(0, Math.min(11, Math.floor(avatar)));
    profile.avatar = safeAvatar;
    await this.persist();
    return json2({ type: "profile_updated", profile: { avatar } });
  }
  // ===== FRIENDS =====
  async handleFriendRequest(uid, targetUsername) {
    const profile = this.users.get(uid);
    if (!profile) return json2({ type: "friend_request_error", message: "Not logged in." });
    const targetName = targetUsername.trim().toLowerCase();
    const targetUid = this.usernameToUid.get(targetName);
    if (!targetUid) {
      return json2({ type: "friend_request_error", message: `User "${targetUsername}" not found.` });
    }
    if (targetUid === uid) {
      return json2({ type: "friend_request_error", message: "Can't friend yourself!" });
    }
    if (profile.friends.includes(targetUid)) {
      return json2({ type: "friend_request_error", message: "Already friends!" });
    }
    const target = this.users.get(targetUid);
    if (target.friendRequests.some((r) => r.fromUid === uid)) {
      return json2({ type: "friend_request_error", message: "Request already sent." });
    }
    const req = {
      fromUid: uid,
      fromUsername: profile.username,
      fromAvatar: profile.avatar,
      timestamp: Date.now()
    };
    target.friendRequests.push(req);
    await this.persist();
    return json2({
      type: "friend_request_sent",
      targetUsername: target.username,
      targetUid,
      request: req
    });
  }
  async handleFriendAccept(uid, fromUid) {
    const profile = this.users.get(uid);
    if (!profile) return json2({ type: "auth_error", message: "Not logged in." });
    const idx = profile.friendRequests.findIndex((r) => r.fromUid === fromUid);
    if (idx === -1) return json2({ type: "auth_error", message: "Request not found." });
    profile.friendRequests.splice(idx, 1);
    profile.friends.push(fromUid);
    const other = this.users.get(fromUid);
    if (other) {
      other.friends.push(uid);
    }
    await this.persist();
    return json2({
      type: "friend_accepted",
      friends: this.getFriendInfoList(profile),
      otherUid: fromUid,
      otherFriends: other ? this.getFriendInfoList(other) : []
    });
  }
  async handleFriendDecline(uid, fromUid) {
    const profile = this.users.get(uid);
    if (!profile) return json2({ type: "auth_error", message: "Not logged in." });
    profile.friendRequests = profile.friendRequests.filter((r) => r.fromUid !== fromUid);
    await this.persist();
    return json2({ type: "profile_updated", profile: { friendRequests: profile.friendRequests } });
  }
  handleGetFriends(uid) {
    const profile = this.users.get(uid);
    if (!profile) return json2({ friends: [] });
    return json2({ friends: this.getFriendInfoList(profile) });
  }
  getFriendInfoList(profile) {
    return profile.friends.map((fid) => {
      const friend = this.users.get(fid);
      if (!friend) return null;
      const online = this.onlineUsers.has(fid);
      return {
        uid: fid,
        username: friend.username,
        avatar: friend.avatar,
        online,
        lobbyFull: false
      };
    }).filter(Boolean);
  }
};
function json2(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(json2, "json");

// src/index.ts
var CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};
function corsJson(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS }
  });
}
__name(corsJson, "corsJson");
var src_default = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === "/ws") {
      const lobbyId = url.searchParams.get("lobbyId");
      if (!lobbyId) return corsJson({ error: "Missing lobbyId" }, 400);
      const lobbyDOId = env.GAME_LOBBY.idFromName(lobbyId);
      const lobbyDO = env.GAME_LOBBY.get(lobbyDOId);
      return lobbyDO.fetch(request);
    }
    if (path.startsWith("/api/user/")) {
      const registryId = env.USER_REGISTRY.idFromName("global");
      const registry = env.USER_REGISTRY.get(registryId);
      const subPath = path.replace("/api/user", "");
      const newUrl = new URL(request.url);
      newUrl.pathname = subPath;
      const response = await registry.fetch(new Request(newUrl.toString(), request));
      const body = await response.text();
      return new Response(body, {
        status: response.status,
        headers: { ...Object.fromEntries(response.headers), ...CORS_HEADERS }
      });
    }
    if (path.startsWith("/api/lobby/")) {
      const parts = path.split("/");
      const lobbyId = parts[3];
      const action = parts[4] || "info";
      if (!lobbyId) return corsJson({ error: "Missing lobbyId" }, 400);
      const lobbyDOId = env.GAME_LOBBY.idFromName(lobbyId);
      const lobbyDO = env.GAME_LOBBY.get(lobbyDOId);
      const newUrl = new URL(request.url);
      newUrl.pathname = `/${action}`;
      newUrl.searchParams.set("lobbyId", lobbyId);
      const response = await lobbyDO.fetch(new Request(newUrl.toString(), request));
      const body = await response.text();
      return new Response(body, {
        status: response.status,
        headers: { ...Object.fromEntries(response.headers), ...CORS_HEADERS }
      });
    }
    if (path === "/" || path === "/health") {
      return corsJson({
        status: "ok",
        service: "dungeon-crawler-server",
        version: "2.0.0",
        minClientVersion: "1.4.2",
        runtime: "cloudflare-workers"
      });
    }
    return corsJson({ error: "Not found" }, 404);
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-FktBFT/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-FktBFT/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  GameLobby,
  UserRegistry,
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
