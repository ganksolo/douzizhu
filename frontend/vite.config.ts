import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    proxy: {
      // Langfuse API 代理 - 解决跨域问题
      '/langfuse': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/langfuse/, ''),
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
