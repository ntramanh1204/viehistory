import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'public/index.html'),
                // blog: resolve(__dirname, 'public/blog.html'),
                // forum: resolve(__dirname, 'public/forum.html'),
                // login: resolve(__dirname, 'public/login.html')
            }
        }
    },
    server: {
        port: 3000,
        open: 'index.html'
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
            // '@components': resolve(__dirname, 'src/components'),
            // '@services': resolve(__dirname, 'src/services'),
            // '@styles': resolve(__dirname, 'src/styles')
        }
    },
    publicDir: 'public'
});