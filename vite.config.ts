/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages base path is configured here so dev, preview and build agree.
// Deployed to GitHub Pages by the workflow in .github/workflows.
export default defineConfig({
  base: '/Trapline/',
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
