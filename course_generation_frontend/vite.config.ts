import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    // Pre-bundle deps added after dev server first started (avoids 504 Outdated Optimize Dep)
    include: ['use-debounce', 'idb-keyval'],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // SSE endpoint — no timeout; connection lives up to 30 minutes
      '/api/jobs': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        timeout: 0,
        proxyTimeout: 0,
      },
      // All other /api routes. Large source-document uploads can exceed two
      // minutes on slower machines / networks, so keep the proxy tolerant.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        timeout: 10 * 60 * 1_000,
        proxyTimeout: 10 * 60 * 1_000,
      },
    },
  },
})
