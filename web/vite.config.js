import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// On GitHub Pages the site lives at /DaNA/, locally at /
export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/DaNA/' : '/',
  plugins: [react()],
  server: { port: 5173, host: '127.0.0.1' },
});
