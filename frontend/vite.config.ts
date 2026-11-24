import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// The dev server listens only on this computer. A taken port fails instead of
// moving, so the address printed by `npm run dev` is always right.
const webPort = Number(process.env.ACCOUNTABLE_WEB_PORT ?? 5173)
const apiPort = Number(process.env.ACCOUNTABLE_API_PORT ?? 8000)

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: webPort,
    strictPort: true,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${apiPort}`,
        configure(proxy) {
          // When the backend is down, answer 503 with a marker the frontend
          // reads as "can't reach the server" (UI-5), instead of Vite's 500.
          proxy.on('error', (_error, _request, response) => {
            if (!('writeHead' in response) || response.headersSent) return
            response.writeHead(503, {
              'Content-Type': 'application/json',
              'X-Accountable-Offline': '1',
            })
            response.end(JSON.stringify({ detail: 'backend unreachable' }))
          })
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    // A leftover it.only would skip the rest of its file and still pass.
    allowOnly: false,
    setupFiles: ['./src/test/setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
})
