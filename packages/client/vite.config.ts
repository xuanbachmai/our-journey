import { defineConfig } from 'vite';

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
    alias: { phaser: new URL('./src/test/phaser-stub.ts', import.meta.url).pathname },
  },
});
