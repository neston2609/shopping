import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Served under /admin/ behind nginx in production.
  base: '/admin/',
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY || 'http://localhost:9000',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.VITE_API_PROXY || 'http://localhost:9000',
        changeOrigin: true,
      },
    },
  },
});
