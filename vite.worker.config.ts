import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const workerProxy = {
  target: 'http://127.0.0.1:8787',
  changeOrigin: true,
};

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 3000,
    strictPort: true,
    open: false,
    proxy: {
      '/api': workerProxy,
      '/card-images': workerProxy,
      '/chinese-card-images': workerProxy,
    },
  },
});
