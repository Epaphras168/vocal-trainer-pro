/// <reference types="vitest/config" />
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const version = (JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }).version;

/** Short commit id for the footer and bug reports: Vercel's, else git's, else "local". */
function commit(): string {
  const fromHost = process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA;
  if (fromHost) return fromHost.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'local';
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  // The development mock signs anyone in with any password. It must never ship.
  if (mode === 'production' && env.VITE_CLOUD_MOCK === 'true') {
    throw new Error('VITE_CLOUD_MOCK=true in a production build: the mock backend accepts any login. Unset it (Vercel: Project Settings > Environment Variables).');
  }
  return {
    plugins: [react()],
    define: {
      __APP_VERSION__: JSON.stringify(version),
      __APP_COMMIT__: JSON.stringify(commit()),
      __APP_BUILT__: JSON.stringify(new Date().toISOString().slice(0, 10)),
    },
    build: {
      rollupOptions: {
        output: {
          // Long-lived libraries get their own files so a deploy doesn't evict them from caches.
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            motion: ['motion/react'],
          },
        },
      },
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
      setupFiles: ['src/test-setup.ts'],
    },
  };
});
