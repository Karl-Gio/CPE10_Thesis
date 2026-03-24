import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // This creates a shortcut: any request starting with /api_python 
      // will be sent to your Raspberry Pi/Flask server.
      '/api_python': {
        target: 'http://localhost:5000', // Change 'localhost' to your Pi's IP if not on the same device
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api_python/, '')
      }
    }
  }
})