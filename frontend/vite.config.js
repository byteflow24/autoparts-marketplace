import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/auth':    'http://backend:5000',
      '/garage':  'http://backend:5000',
      '/orders':  'http://backend:5000',
      '/parts':   'http://backend:5000',
      '/search':  'http://backend:5000',
      '/vehicles':'http://backend:5000',
    }
  }
})
