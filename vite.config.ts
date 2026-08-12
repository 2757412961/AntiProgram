import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 3000,
    open: mode !== 'middleware',
    proxy: {
      '/api/master-duel-banlist': {
        target: 'https://dawnbrandbots.github.io',
        changeOrigin: true,
        rewrite: () => '/yaml-yugi-limit-regulation/master-duel/current.vector.json'
      },
      '/api/ygoprodeck': {
        target: 'https://db.ygoprodeck.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/ygoprodeck/, '/api/v7')
      },
      '/card-images': {
        target: 'https://images.ygoprodeck.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/card-images/, '')
      },
      '/api/yaml-yugi-cards': {
        target: 'https://cdn.jsdelivr.net',
        changeOrigin: true,
        rewrite: path => path.replace(
          /^\/api\/yaml-yugi-cards/,
          '/gh/DawnbrandBots/yaml-yugi/data/cards'
        )
      },
      '/api/ygocdb': {
        target: 'https://ygocdb.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/ygocdb/, '/api/v0')
      },
      '/chinese-card-images': {
        target: 'https://cdn.233.momobako.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/chinese-card-images/, '')
      }
    }
  }
}));
