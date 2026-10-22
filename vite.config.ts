import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/** Pages applies public/_headers. Preview sends the same /* policy so e2e runs under it. */
function pagesSecurityHeaders(): Record<string, string> {
  const text = readFileSync(new URL('./public/_headers', import.meta.url), 'utf8');
  const headers: Record<string, string> = {};
  let capture = false;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\r$/, '');
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!line.startsWith(' ') && !line.startsWith('\t')) {
      capture = line.trim() === '/*';
      continue;
    }
    if (!capture) continue;
    const trimmed = line.trim();
    const index = trimmed.indexOf(':');
    if (index === -1) continue;
    headers[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
  }
  return headers;
}

const securityHeaders = pagesSecurityHeaders();

export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', headers: securityHeaders },
  preview: { host: '127.0.0.1', headers: securityHeaders },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('maplibre-gl')) return 'maplibre';
        },
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
