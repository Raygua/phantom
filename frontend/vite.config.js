import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true,
    },
    host: true,
    port: 80,
    allowedHosts: [
      'game.rayquest.fr',
      'localhost',
      '127.0.0.1'
    ]
  },
})
