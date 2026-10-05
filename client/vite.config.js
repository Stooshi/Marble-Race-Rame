import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  // The 3D scene (Three.js) is one lazily loaded chunk of about 140 KB gzipped.
  build: { chunkSizeWarningLimit: 700 },
  test: { environment: 'node' },
});
