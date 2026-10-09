import { networkInterfaces } from 'node:os'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

const PORT = 5173

// First non-internal IPv4 address, so share links / QR codes can point at this
// machine from phones on the same Wi-Fi. Null when offline.
function lanUrl(): string | null {
  for (const addrs of Object.values(networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family === 'IPv4' && !a.internal) return `http://${a.address}:${PORT}/`
    }
  }
  return null
}

// OCR assets are served from node_modules (no CDN, no manual download).
const ocrAssets = [
  { src: 'node_modules/tesseract.js/dist/worker.min.js', dest: 'tesseract' },
  { src: 'node_modules/tesseract.js-core/tesseract-core*', dest: 'tesseract/core' },
  {
    src: 'node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz',
    dest: 'tesseract/lang',
  },
].map((t) => ({ ...t, rename: { stripBase: true as const } }))

export default defineConfig({
  // GitHub Pages serves the app from /Tabby/; everywhere else it's at the root.
  base: process.env.GITHUB_ACTIONS ? '/Tabby/' : '/',
  plugins: [react(), tailwindcss(), viteStaticCopy({ targets: ocrAssets })],
  define: {
    __LAN_URL__: JSON.stringify(lanUrl()),
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
  },
  server: { host: true, port: PORT },
})
