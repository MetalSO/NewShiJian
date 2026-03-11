import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
    proxy: {
      '/api/caf': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/posts': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/settings': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
