import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Raw capture directories hold ~1.6 GB of source media. They are inputs to
// tools/build_assets.py only, never served, so keep them out of the watcher.
const RAW = [
  'html/**',
  'realworld_benchmark_v4_step5000/**',
  'icra_2027 (1)/**',
  '_scratch/**',
  'tools/**',
]

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    watch: { ignored: RAW },
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 2048,
    chunkSizeWarningLimit: 1200,
  },
})
