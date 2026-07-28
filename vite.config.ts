import { defineConfig } from 'vite';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

// GitHub Pages serves project sites from a subpath (/dungeon-crawler/), so
// assets need that prefix there. Cloudflare Pages and local dev serve from
// the root, where the prefix must NOT be applied.
const base = process.env.DEPLOY_TARGET === 'gh-pages' ? '/dungeon-crawler/' : '/';

export default defineConfig({
    base,
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version),
    },
    server: {
        proxy: {
            '/ws': {
                target: 'ws://127.0.0.1:8787',
                ws: true,
            },
            '/api': {
                target: 'http://127.0.0.1:8787',
                changeOrigin: true,
            },
        },
    },
});
