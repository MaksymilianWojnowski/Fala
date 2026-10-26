import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Fala',
        short_name: 'Fala',
        start_url: '/#/today',
        display: 'standalone',
        theme_color: '#FAFAF7',
        background_color: '#FAFAF7',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,svg}'],
        // sentences.json is a 2.4 MB lazy chunk; it must be precached too.
        maximumFileSizeToCacheInBytes: 6_000_000,
      },
    }),
  ],
  test: { environment: 'node' },
});
