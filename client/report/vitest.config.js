// The track report's view checks (run by scripts/track-report.js, never with the ordinary tests).
import { defineConfig } from 'vite';

export default defineConfig({
  test: { environment: 'node', include: ['report/**/*.report.js'], testTimeout: 1_800_000 },
});
