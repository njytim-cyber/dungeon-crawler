// ===== WORKER ENTRY POINT =====
// Routes incoming requests to the appropriate Durable Object.
// Handles CORS and WebSocket upgrade routing.

import { type Env } from './types';

// Re-export Durable Object classes so Wrangler can find them
export { GameLobby } from './game-lobby';
export { UserRegistry } from './user-registry';

// CORS headers for cross-origin requests from the game client
const CORS_HEADERS: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

function corsJson(data: any, status = 200): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
}

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
        }

        const url = new URL(request.url);
        const path = url.pathname;

        // ===== WebSocket Connection: /ws?lobbyId=xxx&uid=yyy =====
        // Upgrade WebSocket connections directly to the GameLobby DO
        if (path === '/ws') {
            const lobbyId = url.searchParams.get('lobbyId');
            if (!lobbyId) return corsJson({ error: 'Missing lobbyId' }, 400);

            // Route to the specific GameLobby Durable Object
            const lobbyDOId = env.GAME_LOBBY.idFromName(lobbyId);
            const lobbyDO = env.GAME_LOBBY.get(lobbyDOId);

            // Forward the WebSocket upgrade to the DO
            return lobbyDO.fetch(request);
        }

        // ===== User/Auth API: /api/user/* =====
        // All user operations go to the single global UserRegistry DO
        if (path.startsWith('/api/user/')) {
            const registryId = env.USER_REGISTRY.idFromName('global');
            const registry = env.USER_REGISTRY.get(registryId);

            // Strip /api/user prefix and forward
            const subPath = path.replace('/api/user', '');
            const newUrl = new URL(request.url);
            newUrl.pathname = subPath;

            const response = await registry.fetch(new Request(newUrl.toString(), request));

            // Add CORS headers to the response
            const body = await response.text();
            return new Response(body, {
                status: response.status,
                headers: { ...Object.fromEntries(response.headers), ...CORS_HEADERS },
            });
        }

        // ===== Lobby API: /api/lobby/* =====
        if (path.startsWith('/api/lobby/')) {
            const parts = path.split('/');
            // /api/lobby/:lobbyId/:action
            const lobbyId = parts[3];
            const action = parts[4] || 'info';

            if (!lobbyId) return corsJson({ error: 'Missing lobbyId' }, 400);

            const lobbyDOId = env.GAME_LOBBY.idFromName(lobbyId);
            const lobbyDO = env.GAME_LOBBY.get(lobbyDOId);

            // Forward to the DO, including lobbyId as a query parameter
            const newUrl = new URL(request.url);
            newUrl.pathname = `/${action}`;
            newUrl.searchParams.set('lobbyId', lobbyId);

            const response = await lobbyDO.fetch(new Request(newUrl.toString(), request));
            const body = await response.text();
            return new Response(body, {
                status: response.status,
                headers: { ...Object.fromEntries(response.headers), ...CORS_HEADERS },
            });
        }

        // ===== Health Check =====
        if (path === '/' || path === '/health') {
            return corsJson({
                status: 'ok',
                service: 'dungeon-crawler-server',
                version: '2.0.0',
                minClientVersion: '1.4.2',
                runtime: 'cloudflare-workers',
            });
        }

        return corsJson({ error: 'Not found' }, 404);
    },
};
