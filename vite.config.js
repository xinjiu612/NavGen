import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Raw capture directories hold ~1.6 GB of source media. They are inputs to
// tools/build_assets.py only, never served, so keep them out of the watcher.
const RAW = [
  'html/**',
  'realworld_benchmark_v5/**',
  'icra_2027 (1)/**',
  'step_6000/**',
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
    rollupOptions: {
      output: {
        // Deliberately unhashed. GitHub Pages serves index.html with
        // `cache-control: max-age=600` and drops the previous deployment's
        // files, so a content-hashed bundle means anyone holding a cached
        // index.html requests a file that no longer exists and gets a blank
        // page for up to ten minutes after every deploy. Stable names keep
        // that worst case down to "slightly stale", never broken.
        entryFileNames: 'assets/app.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
})
