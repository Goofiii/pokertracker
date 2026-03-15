import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Poker Tracker',
        short_name: 'Poker',
        description: 'Track your poker group sessions',
        theme_color: '#0a0a0f',
        background_color: '#0a0a0f',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'https://api.iconify.design/twemoji:spade-suit.svg', sizes: '192x192', type: 'image/svg+xml' },
        ]
      },
      workbox: { globPatterns: ['**/*.{js,css,html}'] }
    })
  ],
  css: {
    postcss: {
      plugins: [
        (await import('tailwindcss')).default({
          content: ['./index.html', './src/App.jsx'],
          theme: {
            extend: {
              colors: {
                bg: { primary: '#0a0a0f', secondary: '#111118', card: '#16161f', elevated: '#1e1e2a', tertiary: '#1a1a24' },
                accent: { green: '#00d68f', red: '#ff4d6d', gold: '#ffd166', blue: '#4cc9f0' },
                tx: { primary: '#f0f0f5', secondary: '#8888a0', muted: '#55556a' }
              }
            }
          }
        }),
        (await import('autoprefixer')).default()
      ]
    }
  }
})
