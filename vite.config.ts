import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['sample-words.csv', 'pet-words.csv', 'icon.svg'],
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png,csv}'] },
      manifest: {
        name: 'Hulu PET',
        short_name: 'Hulu PET',
        description: 'PET 自学小工具：今日任务与单词间隔复习',
        lang: 'en',
        display: 'standalone',
        start_url: '.',
        background_color: '#fbf6ec',
        theme_color: '#1f7a6d',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: { environment: 'node' },
})
