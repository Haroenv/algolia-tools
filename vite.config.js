import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __dirname = dirname(fileURLToPath(import.meta.url));

const config = defineConfig({
  base: './',
  define: { 'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV) },
  optimizeDeps: {
    include: ['react/jsx-runtime'],
  },
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        request: resolve(__dirname, 'request-explorer/index.html'),
        character: resolve(__dirname, 'character-explorer/index.html'),
      },
    },
  },
});

export default config;
