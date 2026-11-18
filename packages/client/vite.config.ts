import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: './',
  server: { host: true, port: 5174, strictPort: true },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  test: {
    // the engine needs a browser; the map and the rules do not
    alias: { phaser: fileURLToPath(new URL('./src/test/phaser-stub.ts', import.meta.url)) },
    // Tests run against the local world store, never the real server. Without
    // this they read the live Supabase keys from .env, and every `npm test`
    // left two real worlds behind in production - 52 of them by the time
    // anyone looked.
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_ANON_KEY: '' },
  },
});
