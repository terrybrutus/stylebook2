import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'StyleBook',
        short_name: 'StyleBook',
        theme_color: '#222831',
        background_color: '#222831',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/stylebook-pwa-icon.png', sizes: '192x192', type: 'image/png' },
          { src: '/stylebook-pwa-icon.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
