// ===== MULTIPLAYER UI =====
// Login, Lobby, Friends sidebar, Co-op menu

import * as MP from './multiplayer';
import type { LobbyInfo, FriendRequest } from './multiplayer-types';
import { AVATARS } from './multiplayer-types';
import type { ClassName } from './types';

// ===== DOM SETUP =====
let coopOverlay: HTMLDivElement;
let friendsSidebar: HTMLDivElement;

const CLASS_OPTIONS: { name: ClassName; label: string; icon: string }[] = [
    { name: 'warrior', label: 'Warrior', icon: '⚔️' },
    { name: 'mage', label: 'Mage', icon: '🔮' },
    { name: 'rogue', label: 'Rogue', icon: '🗡️' },
    { name: 'paladin', label: 'Paladin', icon: '🛡️' },
    { name: 'ranger', label: 'Ranger', icon: '🏹' },
    { name: 'necromancer', label: 'Necromancer', icon: '💀' },
    { name: 'berserker', label: 'Berserker', icon: '🪓' },
    { name: 'cleric', label: 'Cleric', icon: '✨' },
    { name: 'assassin', label: 'Assassin', icon: '🌑' },
];

// Current view state
type CoopView = 'main' | 'login' | 'create_lobby' | 'join_lobby' | 'lobby' | 'public_list';
let currentView: CoopView = 'main';
let onStartCallback: ((floor: number, seed: number) => void) | null = null;

// ===== INITIALIZATION =====
export function initMultiplayerUI(onGameStart: (floor: number, seed: number) => void): void {
    onStartCallback = onGameStart;

    // Create overlay
    coopOverlay = document.createElement('div');
    coopOverlay.id = 'coop-overlay';
    coopOverlay.className = 'hidden';
    document.body.appendChild(coopOverlay);

    // Create friends sidebar
    friendsSidebar = document.createElement('div');
    friendsSidebar.id = 'friends-sidebar';
    friendsSidebar.className = 'hidden';
    document.body.appendChild(friendsSidebar);

    // Register event handlers
    MP.on('auth_ok', (_profile: any, starterGear: any) => {
        renderFriendsSidebar();
        if (starterGear) {
            // Emit event so main.ts can add starter gear
            window.dispatchEvent(new CustomEvent('mp-starter-gear', { detail: starterGear }));
        }
        showCoopMain();
    });

    MP.on('auth_error', (message: string) => {
        showNotification(`⚠️ ${message}`);
    });

    MP.on('connection_error', (message: string) => {
        showNotification(`⚠️ ${message}`);
    });

    MP.on('connected', () => {
        showNotification('✅ Connected to co-op server!');
    });

    MP.on('disconnected', () => {
        showNotification('⚠️ Disconnected from server. Reconnecting...');
    });

    MP.on('friends_updated', () => {
        renderFriendsSidebar();
    });

    MP.on('friend_request', (req: FriendRequest) => {
        renderFriendsSidebar();
        showNotification(`📨 Friend request from ${req.fromUsername}!`);
    });

    MP.on('friend_request_sent', (username: string) => {
        showNotification(`✅ Friend request sent to ${username}`);
    });

    MP.on('friend_request_error', (message: string) => {
        showNotification(`❌ ${message}`);
    });

    MP.on('lobby_created', (lobby: LobbyInfo) => {
        currentView = 'lobby';
        renderLobbyView(lobby);
    });

    MP.on('lobby_joined', (lobby: LobbyInfo) => {
        currentView = 'lobby';
        renderLobbyView(lobby);
    });

    MP.on('lobby_updated', (lobby: LobbyInfo) => {
        if (currentView === 'lobby') renderLobbyView(lobby);
    });

    MP.on('lobby_left', () => {
        showCoopMain();
    });

    MP.on('lobby_error', (message: string) => {
        showNotification(`❌ ${message}`);
    });

    MP.on('lobby_full', (code: string) => {
        showNotification(`🚫 Lobby ${code} is full!`);
    });

    MP.on('public_lobbies', (lobbies: LobbyInfo[]) => {
        renderPublicLobbiesList(lobbies);
    });

    MP.on('game_start', (floor: number, seed: number) => {
        hideCoopOverlay();
        if (onStartCallback) onStartCallback(floor, seed);
    });
}

// ===== OVERLAY CONTROL =====
// Fun auto-generated names
const NAME_ADJECTIVES = ['Brave', 'Swift', 'Shadow', 'Iron', 'Storm', 'Frost', 'Fire', 'Dark', 'Star', 'Noble', 'Wild', 'Silent', 'Golden', 'Crimson', 'Mystic'];
const NAME_NOUNS = ['Knight', 'Mage', 'Rogue', 'Hunter', 'Wolf', 'Dragon', 'Phoenix', 'Blade', 'Arrow', 'Shield', 'Sage', 'Hawk', 'Bear', 'Fox', 'Viper'];

function generateRandomName(): string {
    const adj = NAME_ADJECTIVES[Math.floor(Math.random() * NAME_ADJECTIVES.length)];
    const noun = NAME_NOUNS[Math.floor(Math.random() * NAME_NOUNS.length)];
    const num = Math.floor(Math.random() * 99) + 1;
    return `${adj}${noun}${num}`;
}

export function showCoopMenu(): void {
    MP.connectToServer();
    coopOverlay.classList.remove('hidden');

    if (MP.isLoggedIn()) {
        showCoopMain();
        friendsSidebar.classList.remove('hidden');
        renderFriendsSidebar();
    } else {
        // Auto-login: generate name if first time, otherwise use saved name
        let username = localStorage.getItem('coop-username');
        if (!username) {
            username = generateRandomName();
            localStorage.setItem('coop-username', username);
        }
        // Show brief connecting splash
        coopOverlay.innerHTML = `
            <div class="coop-panel coop-login">
                <h2>⚔️ Entering Co-op...</h2>
                <p class="coop-subtitle">Playing as <strong style="color:#f1c40f">${username}</strong></p>
                <p class="coop-note">You can change your name in the co-op menu.</p>
            </div>
        `;
        MP.login(username);
    }
}

export function hideCoopOverlay(): void {
    coopOverlay.classList.add('hidden');
    friendsSidebar.classList.add('hidden');
}

export function isCoopOpen(): boolean {
    return !coopOverlay.classList.contains('hidden');
}

// ===== VIEWS =====



// --- MAIN CO-OP MENU ---
function showCoopMain(): void {
    currentView = 'main';
    const profile = MP.getProfile()!;
    const avatarDef = AVATARS[profile.avatar] || AVATARS[0];

    coopOverlay.innerHTML = `
        <div class="coop-panel coop-main">
            <button class="coop-back-btn" id="coop-back">← Back to Menu</button>
            <div class="coop-profile-bar">
                <div class="coop-avatar" style="background:${avatarDef.colors.body}">${avatarDef.emoji}</div>
                <div class="coop-profile-info">
                    <span class="coop-username" style="color:${profile.nameColor || '#fff'}">${profile.username}</span>
                </div>
                <button class="coop-btn coop-btn-sm" id="coop-change-avatar">🎭 Avatar</button>
                <button class="coop-btn coop-btn-sm" id="coop-change-name">✏️ Name</button>
            </div>
            <h2>⚔️ Co-op Mode</h2>
            <p class="coop-subtitle">2-7 players • Shared dungeon • Team up!</p>
            <div class="coop-menu-btns">
                <button class="coop-btn coop-btn-primary coop-btn-lg" id="coop-create">🏰 Create Lobby</button>
                <button class="coop-btn coop-btn-secondary coop-btn-lg" id="coop-join">🔗 Join Lobby</button>
                <button class="coop-btn coop-btn-secondary coop-btn-lg" id="coop-friends">👥 Friends</button>
            </div>
        </div>
    `;

    document.getElementById('coop-back')!.onclick = () => {
        hideCoopOverlay();
        window.dispatchEvent(new Event('coop-back-to-menu'));
    };

    document.getElementById('coop-create')!.onclick = () => showCreateLobby();
    document.getElementById('coop-join')!.onclick = () => showJoinLobby();
    document.getElementById('coop-friends')!.onclick = () => {
        friendsSidebar.classList.toggle('hidden');
        renderFriendsSidebar();
    };

    document.getElementById('coop-change-avatar')!.onclick = () => showAvatarPicker();
    document.getElementById('coop-change-name')!.onclick = () => showNameChanger();
}

// --- CREATE LOBBY ---
function showCreateLobby(): void {
    currentView = 'create_lobby';
    coopOverlay.innerHTML = `
        <div class="coop-panel">
            <button class="coop-back-btn" id="coop-back">← Back</button>
            <h2>🏰 Create Lobby</h2>
            <div class="coop-form">
                <label>Lobby Name</label>
                <input type="text" id="lobby-name" placeholder="My Dungeon Run" maxlength="30" />
                <label>Visibility</label>
                <div class="coop-toggle-group">
                    <button class="coop-toggle active" id="vis-public" data-vis="public">🌍 Public</button>
                    <button class="coop-toggle" id="vis-private" data-vis="private">🔒 Private (Friends Only)</button>
                </div>
                <button class="coop-btn coop-btn-primary" id="coop-create-go">🚀 Create!</button>
            </div>
        </div>
    `;

    let visibility: 'public' | 'private' = 'public';

    document.getElementById('coop-back')!.onclick = () => showCoopMain();
    document.getElementById('vis-public')!.onclick = () => {
        visibility = 'public';
        document.getElementById('vis-public')!.classList.add('active');
        document.getElementById('vis-private')!.classList.remove('active');
    };
    document.getElementById('vis-private')!.onclick = () => {
        visibility = 'private';
        document.getElementById('vis-private')!.classList.add('active');
        document.getElementById('vis-public')!.classList.remove('active');
    };
    document.getElementById('coop-create-go')!.onclick = () => {
        const name = (document.getElementById('lobby-name') as HTMLInputElement).value.trim() || 'Dungeon Run';
        MP.createLobby(name, visibility);
    };
}

// --- JOIN LOBBY ---
function showJoinLobby(): void {
    currentView = 'join_lobby';
    coopOverlay.innerHTML = `
        <div class="coop-panel">
            <button class="coop-back-btn" id="coop-back">← Back</button>
            <h2>🔗 Join Lobby</h2>
            <div class="coop-form">
                <label>Enter Lobby Code</label>
                <input type="text" id="join-code" placeholder="e.g. We3H7Ng8" maxlength="10" style="text-transform:none;font-family:monospace;font-size:18px;letter-spacing:2px;text-align:center;" />
                <button class="coop-btn coop-btn-primary" id="coop-join-code">🔑 Join by Code</button>
            </div>
            <div class="coop-divider"><span>OR</span></div>
            <button class="coop-btn coop-btn-secondary coop-btn-lg" id="coop-browse-public">🌍 Browse Public Servers</button>
        </div>
    `;

    document.getElementById('coop-back')!.onclick = () => showCoopMain();
    document.getElementById('coop-join-code')!.onclick = () => {
        const code = (document.getElementById('join-code') as HTMLInputElement).value.trim();
        if (code) MP.joinLobby(code);
    };
    document.getElementById('join-code')!.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('coop-join-code')!.click();
    });
    document.getElementById('coop-browse-public')!.onclick = () => {
        MP.listPublicLobbies();
        currentView = 'public_list';
        showNotification('Loading public lobbies...');
    };
}

// --- PUBLIC LOBBIES LIST ---
function renderPublicLobbiesList(lobbies: LobbyInfo[]): void {
    currentView = 'public_list';
    let html = `
        <div class="coop-panel coop-lobby-list">
            <button class="coop-back-btn" id="coop-back">← Back</button>
            <h2>🌍 Public Lobbies</h2>
            <button class="coop-btn coop-btn-sm" id="coop-refresh" style="margin-bottom:12px">🔄 Refresh</button>
    `;

    if (lobbies.length === 0) {
        html += `<div class="coop-empty">No public lobbies available. Create one!</div>`;
    } else {
        html += `<div class="coop-lobby-grid">`;
        for (const lobby of lobbies) {
            const pCount = lobby.playerCount || (lobby.players ? lobby.players.length : 0);
            html += `
                <div class="coop-lobby-card">
                    <div class="coop-lobby-name">${lobby.name}</div>
                    <div class="coop-lobby-meta">
                        <span>👤 ${pCount}/${lobby.maxPlayers || 7}</span>
                        <span>Host: ${lobby.hostUsername}</span>
                    </div>
                    <div class="coop-lobby-code">${lobby.code}</div>
                    <button class="coop-btn coop-btn-primary coop-btn-sm" data-join="${lobby.code}">Join</button>
                </div>
            `;
        }
        html += `</div>`;
    }
    html += `</div>`;
    coopOverlay.innerHTML = html;

    document.getElementById('coop-back')!.onclick = () => showJoinLobby();
    document.getElementById('coop-refresh')!.onclick = () => MP.listPublicLobbies();
    coopOverlay.querySelectorAll('[data-join]').forEach(btn => {
        (btn as HTMLElement).onclick = () => MP.joinLobby((btn as HTMLElement).dataset.join!);
    });
}

// --- LOBBY VIEW ---
function renderLobbyView(lobby: LobbyInfo): void {
    const profile = MP.getProfile()!;
    const isHost = lobby.hostUid === profile.uid;
    const myPlayer = lobby.players.find(p => p.uid === profile.uid);

    let playersHtml = '';
    for (const p of lobby.players) {
        const av = AVATARS[p.avatar] || AVATARS[0];
        const nameStyle = p.nameColor ? `color:${p.nameColor}` : '';
        playersHtml += `
            <div class="coop-lobby-player ${p.ready ? 'ready' : ''} ${p.isHost ? 'host' : ''}">
                <div class="coop-avatar coop-avatar-sm" style="background:${av.colors.body}">${av.emoji}</div>
                <div class="coop-player-info">
                    <span class="coop-player-name" style="${nameStyle}">${p.username}</span>
                    <span class="coop-player-class">${CLASS_OPTIONS.find(c => c.name === p.className)?.icon || '⚔️'} ${p.className}</span>
                </div>
                <div class="coop-player-status">
                    ${p.isHost ? '👑' : p.ready ? '✅' : '⏳'}
                </div>
            </div>
        `;
    }

    // Class selector
    let classHtml = '';
    for (const cls of CLASS_OPTIONS) {
        const selected = myPlayer?.className === cls.name;
        classHtml += `<button class="coop-class-btn ${selected ? 'selected' : ''}" data-class="${cls.name}">${cls.icon} ${cls.label}</button>`;
    }

    coopOverlay.innerHTML = `
        <div class="coop-panel coop-lobby-view">
            <button class="coop-back-btn" id="coop-leave">← Leave Lobby</button>
            <div class="coop-lobby-header">
                <h2>${lobby.name}</h2>
                <div class="coop-lobby-info-bar">
                    <span class="coop-lobby-code-display">Code: <strong>${lobby.code}</strong></span>
                    <span class="coop-lobby-vis">${lobby.visibility === 'public' ? '🌍 Public' : '🔒 Private'}</span>
                    <span>👤 ${lobby.players.length}/7</span>
                </div>
            </div>
            <div class="coop-lobby-players">${playersHtml}</div>
            <div class="coop-class-picker">
                <h3>Choose Class</h3>
                <div class="coop-class-grid">${classHtml}</div>
            </div>
            <div class="coop-lobby-actions">
                ${!isHost ? `<button class="coop-btn ${myPlayer?.ready ? 'coop-btn-ready' : 'coop-btn-secondary'}" id="coop-ready">${myPlayer?.ready ? '✅ Ready!' : '⏳ Ready Up'}</button>` : ''}
                ${isHost ? `<button class="coop-btn coop-btn-primary coop-btn-lg" id="coop-start-game">⚔️ Start Dungeon!</button>` : ''}
            </div>
        </div>
    `;

    document.getElementById('coop-leave')!.onclick = () => MP.leaveLobby();
    const readyBtn = document.getElementById('coop-ready');
    if (readyBtn) readyBtn.onclick = () => MP.toggleReady();
    const startBtn = document.getElementById('coop-start-game');
    if (startBtn) startBtn.onclick = () => MP.startGame();

    coopOverlay.querySelectorAll('[data-class]').forEach(btn => {
        (btn as HTMLElement).onclick = () => MP.setClass((btn as HTMLElement).dataset.class as ClassName);
    });
}

// --- AVATAR PICKER ---
function showAvatarPicker(): void {
    const profile = MP.getProfile()!;
    let html = `
        <div class="coop-panel">
            <button class="coop-back-btn" id="coop-back">← Back</button>
            <h2>🎭 Choose Avatar</h2>
            <div class="coop-avatar-grid">
    `;
    for (const av of AVATARS) {
        const selected = profile.avatar === av.id;
        html += `<button class="coop-avatar-pick ${selected ? 'selected' : ''}" data-avatar="${av.id}" style="background:${av.colors.body}" title="${av.name}">${av.emoji}</button>`;
    }
    html += `</div></div>`;
    coopOverlay.innerHTML = html;

    document.getElementById('coop-back')!.onclick = () => showCoopMain();
    coopOverlay.querySelectorAll('[data-avatar]').forEach(btn => {
        (btn as HTMLElement).onclick = () => {
            MP.setAvatar(parseInt((btn as HTMLElement).dataset.avatar!));
            setTimeout(() => showCoopMain(), 200);
        };
    });
}

// --- NAME CHANGER ---
function showNameChanger(): void {
    const profile = MP.getProfile()!;
    coopOverlay.innerHTML = `
        <div class="coop-panel">
            <button class="coop-back-btn" id="coop-back">← Back</button>
            <h2>✏️ Change Username</h2>
            <div class="coop-form">
                <label>Current: <strong style="color:${profile.nameColor || '#fff'}">${profile.username}</strong></label>
                <input type="text" id="new-username" placeholder="New username" maxlength="20" value="${profile.username}" />
                <button class="coop-btn coop-btn-primary" id="coop-save-name">💾 Save</button>
            </div>
        </div>
    `;
    document.getElementById('coop-back')!.onclick = () => showCoopMain();
    document.getElementById('coop-save-name')!.onclick = () => {
        const name = (document.getElementById('new-username') as HTMLInputElement).value.trim();
        if (name) { MP.setUsername(name); setTimeout(() => showCoopMain(), 300); }
    };
}

// ===== FRIENDS SIDEBAR =====
function renderFriendsSidebar(): void {
    if (!MP.isLoggedIn()) return;
    const friends = MP.getFriends();
    const requests = MP.getFriendRequests();

    let html = `
        <div class="friends-header">
            <h3>👥 Friends</h3>
            <div style="display:flex;gap:6px;align-items:center">
                <button class="friends-add-btn" id="friends-add-btn" title="Add friend">+</button>
                <button class="friends-add-btn" id="friends-close-btn" title="Close">✕</button>
            </div>
        </div>
    `;

    // Friend requests
    if (requests.length > 0) {
        html += `<div class="friends-section"><h4>📨 Requests (${requests.length})</h4>`;
        for (const req of requests) {
            const av = AVATARS[req.fromAvatar] || AVATARS[0];
            html += `
                <div class="friend-request-item">
                    <div class="friend-avatar" style="background:${av.colors.body}">${av.emoji}</div>
                    <span class="friend-name">${req.fromUsername}</span>
                    <button class="friend-accept-btn" data-accept="${req.fromUid}">✓</button>
                    <button class="friend-decline-btn" data-decline="${req.fromUid}">✕</button>
                </div>
            `;
        }
        html += `</div>`;
    }

    // Online friends first, then offline
    const online = friends.filter(f => f.online);
    const offline = friends.filter(f => !f.online);

    if (friends.length === 0 && requests.length === 0) {
        html += `<div class="friends-empty">No friends yet.<br>Click + to add friends!</div>`;
    }

    if (online.length > 0) {
        html += `<div class="friends-section"><h4>🟢 Online (${online.length})</h4>`;
        for (const f of online) {
            const av = AVATARS[f.avatar] || AVATARS[0];
            html += `
                <div class="friend-item online">
                    <div class="friend-avatar-wrap">
                        <div class="friend-avatar" style="background:${av.colors.body}">${av.emoji}</div>
                        <div class="friend-online-dot"></div>
                    </div>
                    <div class="friend-info">
                        <span class="friend-name">${f.username}</span>
                        ${f.currentLobby ? `<span class="friend-lobby">🎮 ${f.currentLobby}</span>` : '<span class="friend-status">Online</span>'}
                    </div>
                    ${f.currentLobby && !f.lobbyFull ? `<button class="friend-join-btn" data-join-lobby="${f.currentLobby}">Join</button>` : ''}
                    ${f.currentLobby && f.lobbyFull ? `<span class="friend-full">Full</span>` : ''}
                </div>
            `;
        }
        html += `</div>`;
    }

    if (offline.length > 0) {
        html += `<div class="friends-section"><h4>⚫ Offline (${offline.length})</h4>`;
        for (const f of offline) {
            const av = AVATARS[f.avatar] || AVATARS[0];
            html += `
                <div class="friend-item offline">
                    <div class="friend-avatar-wrap">
                        <div class="friend-avatar" style="background:${av.colors.body};opacity:0.5">${av.emoji}</div>
                    </div>
                    <div class="friend-info">
                        <span class="friend-name" style="opacity:0.5">${f.username}</span>
                        <span class="friend-status">Offline</span>
                    </div>
                </div>
            `;
        }
        html += `</div>`;
    }

    friendsSidebar.innerHTML = html;

    // Event listeners
    document.getElementById('friends-add-btn')?.addEventListener('click', showAddFriendDialog);
    document.getElementById('friends-close-btn')?.addEventListener('click', () => {
        friendsSidebar.classList.add('hidden');
    });
    friendsSidebar.querySelectorAll('[data-accept]').forEach(btn => {
        (btn as HTMLElement).onclick = () => MP.acceptFriendRequest((btn as HTMLElement).dataset.accept!);
    });
    friendsSidebar.querySelectorAll('[data-decline]').forEach(btn => {
        (btn as HTMLElement).onclick = () => MP.declineFriendRequest((btn as HTMLElement).dataset.decline!);
    });
    friendsSidebar.querySelectorAll('[data-join-lobby]').forEach(btn => {
        (btn as HTMLElement).onclick = () => MP.joinLobby((btn as HTMLElement).dataset.joinLobby!);
    });
}

function showAddFriendDialog(): void {
    const existing = document.getElementById('add-friend-dialog');
    if (existing) existing.remove();

    const dialog = document.createElement('div');
    dialog.id = 'add-friend-dialog';
    dialog.innerHTML = `
        <div class="add-friend-content">
            <h4>Add Friend</h4>
            <input type="text" id="friend-username-input" placeholder="Enter username" maxlength="20" />
            <div class="add-friend-btns">
                <button class="coop-btn coop-btn-primary coop-btn-sm" id="send-friend-req">Send</button>
                <button class="coop-btn coop-btn-sm" id="cancel-friend-req">Cancel</button>
            </div>
        </div>
    `;
    friendsSidebar.appendChild(dialog);

    document.getElementById('send-friend-req')!.onclick = () => {
        const name = (document.getElementById('friend-username-input') as HTMLInputElement).value.trim();
        if (name) MP.sendFriendRequest(name);
        dialog.remove();
    };
    document.getElementById('cancel-friend-req')!.onclick = () => dialog.remove();
    document.getElementById('friend-username-input')!.focus();
    (document.getElementById('friend-username-input') as HTMLInputElement).addEventListener('keydown', (e) => {
        if (e.key === 'Enter') document.getElementById('send-friend-req')!.click();
    });
}

// ===== NOTIFICATIONS =====
function showNotification(msg: string): void {
    const notif = document.createElement('div');
    notif.className = 'coop-notification';
    notif.textContent = msg;
    document.body.appendChild(notif);
    setTimeout(() => notif.classList.add('show'), 10);
    setTimeout(() => {
        notif.classList.remove('show');
        setTimeout(() => notif.remove(), 300);
    }, 3000);
}

// ===== EXPORTS =====
export function isMultiplayerActive(): boolean {
    return MP.isInLobby() && MP.getLobby()?.gameStarted === true;
}
