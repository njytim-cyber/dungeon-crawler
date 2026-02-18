import { defineConfig } from 'vite';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
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
