import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Owned build config. Static output in dist/ — deploy to any host.
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 },
})
