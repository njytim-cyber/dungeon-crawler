// ===== USER REGISTRY DURABLE OBJECT =====
// Single global instance that manages user profiles, auth, and friend lists.
// Persists user data across Worker invocations using Durable Object storage.

import {
    UserProfile, FriendRequest, FriendInfo,
    ADMIN_EMAILS, LOGIN_STARTER_GEAR, generateNameColor, generateUid,
    sanitizeUsername, isValidHexColor, INTERNAL_SECRET,
    type Env,
} from './types';

interface StoredData {
    users: Record<string, UserProfile>;       // uid -> profile
    emailToUid: Record<string, string>;       // email -> uid
    usernameToUid: Record<string, string>;    // username(lower) -> uid
}

export class UserRegistry implements DurableObject {
    private state: DurableObjectState;
    private users = new Map<string, UserProfile>();
    private emailToUid = new Map<string, string>();
    private usernameToUid = new Map<string, string>();
    private initialized = false;

    // Track which users are currently online (uid -> lobby WebSocket server name)
    private onlineUsers = new Set<string>();

    // Track active public lobbies for listing
    private activeLobbies = new Map<string, { name: string; code: string; hostUsername: string; playerCount: number; maxPlayers: number; floor: number; gameStarted: boolean; lobbyId: string; createdAt: number }>();

    // Map lobby codes to Durable Object lobby IDs so users can join by code
    private lobbyCodeToId = new Map<string, string>();

    constructor(state: DurableObjectState, env: Env) {
        this.state = state;
    }

    private async init(): Promise<void> {
        if (this.initialized) return;

        const stored = await this.state.storage.get<StoredData>('data');
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
        this.initialized = true;
    }

    private async persist(): Promise<void> {
        const data: StoredData = {
            users: Object.fromEntries(this.users),
            emailToUid: Object.fromEntries(this.emailToUid),
            usernameToUid: Object.fromEntries(this.usernameToUid),
        };
        await this.state.storage.put('data', data);
    }

    async fetch(request: Request): Promise<Response> {
        await this.init();

        const url = new URL(request.url);
        const path = url.pathname;

        // Helper to check internal-only endpoints
        const isInternal = request.headers.get('X-Internal-Secret') === INTERNAL_SECRET;

        // Stale lobby cleanup (remove lobbies older than 15 minutes)
        const LOBBY_TTL = 15 * 60 * 1000;
        const now = Date.now();
        for (const [id, lobby] of this.activeLobbies) {
            if (now - lobby.createdAt > LOBBY_TTL) {
                this.activeLobbies.delete(id);
                this.lobbyCodeToId.delete(lobby.code?.toUpperCase());
            }
        }

        // POST /auth — authenticate or register user
        if (path === '/auth' && request.method === 'POST') {
            const body = await request.json<{ email: string; username: string }>();
            return this.handleAuth(body.email, body.username);
        }

        // POST /set-username
        if (path === '/set-username' && request.method === 'POST') {
            const body = await request.json<{ uid: string; username: string }>();
            return this.handleSetUsername(body.uid, body.username);
        }

        // POST /set-avatar
        if (path === '/set-avatar' && request.method === 'POST') {
            const body = await request.json<{ uid: string; avatar: number }>();
            return this.handleSetAvatar(body.uid, body.avatar);
        }

        // POST /friend-request
        if (path === '/friend-request' && request.method === 'POST') {
            const body = await request.json<{ uid: string; targetUsername: string }>();
            return this.handleFriendRequest(body.uid, body.targetUsername);
        }

        // POST /friend-accept
        if (path === '/friend-accept' && request.method === 'POST') {
            const body = await request.json<{ uid: string; fromUid: string }>();
            return this.handleFriendAccept(body.uid, body.fromUid);
        }

        // POST /friend-decline
        if (path === '/friend-decline' && request.method === 'POST') {
            const body = await request.json<{ uid: string; fromUid: string }>();
            return this.handleFriendDecline(body.uid, body.fromUid);
        }

        // GET /friends?uid=xxx
        if (path === '/friends' && request.method === 'GET') {
            const uid = url.searchParams.get('uid');
            if (!uid) return json({ error: 'Missing uid' }, 400);
            return this.handleGetFriends(uid);
        }

        // GET /profile?uid=xxx
        if (path === '/profile' && request.method === 'GET') {
            const uid = url.searchParams.get('uid');
            if (!uid) return json({ error: 'Missing uid' }, 400);
            const profile = this.users.get(uid);
            if (!profile) return json({ error: 'User not found' }, 404);
            return json({ profile });
        }

        // POST /set-online — requires valid uid
        if (path === '/set-online' && request.method === 'POST') {
            const body = await request.json<{ uid: string; online: boolean }>();
            // Only allow if the uid actually exists
            if (!this.users.has(body.uid)) return json({ error: 'Invalid uid' }, 403);
            if (body.online) {
                this.onlineUsers.add(body.uid);
            } else {
                this.onlineUsers.delete(body.uid);
            }
            return json({ ok: true });
        }

        // GET /online-admins
        if (path === '/online-admins' && request.method === 'GET') {
            const admins: string[] = [];
            for (const uid of this.onlineUsers) {
                const profile = this.users.get(uid);
                if (profile?.isAdmin) admins.push(uid);
            }
            return json({ admins });
        }

        // POST /register-lobby — INTERNAL ONLY (from GameLobby DO)
        if (path === '/register-lobby' && request.method === 'POST') {
            if (!isInternal) return json({ error: 'Forbidden' }, 403);
            const body = await request.json<{ lobbyId: string; name: string; code: string; hostUsername: string; playerCount: number; maxPlayers: number; floor: number; gameStarted: boolean; visibility: string }>();
            if (body.visibility === 'public' && !body.gameStarted) {
                this.activeLobbies.set(body.lobbyId, {
                    name: body.name,
                    code: body.code,
                    hostUsername: body.hostUsername,
                    playerCount: body.playerCount,
                    maxPlayers: body.maxPlayers,
                    floor: body.floor,
                    gameStarted: body.gameStarted,
                    lobbyId: body.lobbyId,
                    createdAt: Date.now(),
                });
            }
            return json({ ok: true });
        }

        // POST /unregister-lobby — INTERNAL ONLY
        if (path === '/unregister-lobby' && request.method === 'POST') {
            if (!isInternal) return json({ error: 'Forbidden' }, 403);
            const body = await request.json<{ lobbyId: string }>();
            this.activeLobbies.delete(body.lobbyId);
            return json({ ok: true });
        }

        // GET /public-lobbies — list joinable public lobbies
        if (path === '/public-lobbies' && request.method === 'GET') {
            const lobbies = Array.from(this.activeLobbies.values())
                .filter(l => !l.gameStarted && l.playerCount < l.maxPlayers)
                .sort((a, b) => b.createdAt - a.createdAt)
                .slice(0, 20);
            return json({ lobbies });
        }

        // POST /map-lobby-code — INTERNAL ONLY
        if (path === '/map-lobby-code' && request.method === 'POST') {
            if (!isInternal) return json({ error: 'Forbidden' }, 403);
            const body = await request.json<{ code: string; lobbyId: string }>();
            if (body.code && body.lobbyId) {
                this.lobbyCodeToId.set(body.code.toUpperCase(), body.lobbyId);
            }
            return json({ ok: true });
        }

        // GET /resolve-lobby?code=XYZ — resolve a lobby code to its Durable Object ID
        if (path === '/resolve-lobby' && request.method === 'GET') {
            const code = url.searchParams.get('code')?.toUpperCase() || '';
            const lobbyId = this.lobbyCodeToId.get(code);
            return json({ lobbyId: lobbyId || null });
        }

        return json({ error: 'Not found' }, 404);
    }

    // ===== AUTH =====
    private async handleAuth(email: string, requestedUsername: string): Promise<Response> {
        email = email.trim().toLowerCase();
        requestedUsername = sanitizeUsername(requestedUsername);
        if (!email || !requestedUsername) {
            return json({ type: 'auth_error', message: 'Email and username required.' });
        }

        let uid = this.emailToUid.get(email);
        let starterGear: any[] | undefined;

        if (uid) {
            // Existing user
            const profile = this.users.get(uid)!;
            profile.isLoggedIn = true;
            await this.persist();
            return json({ type: 'auth_ok', profile, uid });
        }

        // New user
        uid = generateUid();
        let username = requestedUsername;
        let suffix = 1;
        while (this.usernameToUid.has(username.toLowerCase())) {
            username = `${requestedUsername}${suffix++}`;
        }

        const profile: UserProfile = {
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

        this.users.set(uid, profile);
        this.emailToUid.set(email, uid);
        this.usernameToUid.set(username.toLowerCase(), uid);
        starterGear = LOGIN_STARTER_GEAR;
        await this.persist();

        console.log(`  New user: ${username} (${email})${profile.isAdmin ? ' [ADMIN]' : ''}`);
        return json({ type: 'auth_ok', profile, uid, starterGear });
    }

    // ===== USERNAME =====
    private async handleSetUsername(uid: string, newName: string): Promise<Response> {
        const profile = this.users.get(uid);
        if (!profile) return json({ type: 'auth_error', message: 'Not logged in.' });

        newName = sanitizeUsername(newName);
        if (!newName || newName.length > 20) {
            return json({ type: 'auth_error', message: 'Username must be 1-20 characters.' });
        }
        if (this.usernameToUid.has(newName.toLowerCase()) && this.usernameToUid.get(newName.toLowerCase()) !== uid) {
            return json({ type: 'auth_error', message: 'Username already taken.' });
        }

        this.usernameToUid.delete(profile.username.toLowerCase());
        profile.username = newName;
        this.usernameToUid.set(newName.toLowerCase(), uid);
        await this.persist();

        return json({ type: 'profile_updated', profile: { username: newName } });
    }

    // ===== AVATAR =====
    private async handleSetAvatar(uid: string, avatar: number): Promise<Response> {
        const profile = this.users.get(uid);
        if (!profile) return json({ type: 'auth_error', message: 'Not logged in.' });

        // Bounds-check avatar (0-11)
        const safeAvatar = Math.max(0, Math.min(11, Math.floor(avatar)));
        profile.avatar = safeAvatar;
        await this.persist();

        return json({ type: 'profile_updated', profile: { avatar } });
    }

    // ===== FRIENDS =====
    private async handleFriendRequest(uid: string, targetUsername: string): Promise<Response> {
        const profile = this.users.get(uid);
        if (!profile) return json({ type: 'friend_request_error', message: 'Not logged in.' });

        const targetName = targetUsername.trim().toLowerCase();
        const targetUid = this.usernameToUid.get(targetName);
        if (!targetUid) {
            return json({ type: 'friend_request_error', message: `User "${targetUsername}" not found.` });
        }
        if (targetUid === uid) {
            return json({ type: 'friend_request_error', message: "Can't friend yourself!" });
        }
        if (profile.friends.includes(targetUid)) {
            return json({ type: 'friend_request_error', message: 'Already friends!' });
        }

        const target = this.users.get(targetUid)!;
        if (target.friendRequests.some(r => r.fromUid === uid)) {
            return json({ type: 'friend_request_error', message: 'Request already sent.' });
        }

        const req: FriendRequest = {
            fromUid: uid,
            fromUsername: profile.username,
            fromAvatar: profile.avatar,
            timestamp: Date.now(),
        };
        target.friendRequests.push(req);
        await this.persist();

        return json({
            type: 'friend_request_sent',
            targetUsername: target.username,
            targetUid,
            request: req,
        });
    }

    private async handleFriendAccept(uid: string, fromUid: string): Promise<Response> {
        const profile = this.users.get(uid);
        if (!profile) return json({ type: 'auth_error', message: 'Not logged in.' });

        const idx = profile.friendRequests.findIndex(r => r.fromUid === fromUid);
        if (idx === -1) return json({ type: 'auth_error', message: 'Request not found.' });

        profile.friendRequests.splice(idx, 1);
        profile.friends.push(fromUid);

        const other = this.users.get(fromUid);
        if (other) {
            other.friends.push(uid);
        }
        await this.persist();

        return json({
            type: 'friend_accepted',
            friends: this.getFriendInfoList(profile),
            otherUid: fromUid,
            otherFriends: other ? this.getFriendInfoList(other) : [],
        });
    }

    private async handleFriendDecline(uid: string, fromUid: string): Promise<Response> {
        const profile = this.users.get(uid);
        if (!profile) return json({ type: 'auth_error', message: 'Not logged in.' });

        profile.friendRequests = profile.friendRequests.filter(r => r.fromUid !== fromUid);
        await this.persist();

        return json({ type: 'profile_updated', profile: { friendRequests: profile.friendRequests } });
    }

    private handleGetFriends(uid: string): Response {
        const profile = this.users.get(uid);
        if (!profile) return json({ friends: [] });
        return json({ friends: this.getFriendInfoList(profile) });
    }

    private getFriendInfoList(profile: UserProfile): FriendInfo[] {
        return profile.friends.map(fid => {
            const friend = this.users.get(fid);
            if (!friend) return null;
            const online = this.onlineUsers.has(fid);
            return {
                uid: fid,
                username: friend.username,
                avatar: friend.avatar,
                online,
                lobbyFull: false,
            } as FriendInfo;
        }).filter(Boolean) as FriendInfo[];
    }
}

// Helper for JSON responses
function json(data: any, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}
