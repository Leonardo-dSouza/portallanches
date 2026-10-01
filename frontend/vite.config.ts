import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:13000';

// O frontend fala com a API em `/api/*`; em desenvolvimento o Vite repassa ao
// backend removendo o prefixo, o que dispensa CORS.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Portas pouco usadas para não colidir com outros projetos na mesma máquina.
  server: {
    port: 15173,
    strictPort: true,
    proxy: {
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
