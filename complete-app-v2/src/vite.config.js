import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Required for Electron packaged app (file:// / loadFile).
  // Without this, index.html requests /assets/... from root and the
  // screen stays blank because scripts never load.
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets',
  },
})
