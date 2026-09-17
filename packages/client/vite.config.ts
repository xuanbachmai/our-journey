import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { host: true, port: 5174, strictPort: true },
  build: { target: 'es2022' },
});
