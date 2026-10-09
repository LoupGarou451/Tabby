import { createReadStream, readdirSync, readFileSync } from 'node:fs'
import { networkInterfaces } from 'node:os'
import { join } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// First non-internal IPv4 address, so share links / QR codes can point at this
// machine from phones on the same Wi-Fi. Null when offline. (The port comes from
// location.port at runtime, since Vite may pick a different one.)
function lanAddress(): string | null {
  for (const addrs of Object.values(networkInterfaces())) {
    for (const a of addrs ?? []) if (a.family === 'IPv4' && !a.internal) return a.address
  }
  return null
}

// OCR files served at <base>tesseract/… straight from node_modules — no CDN, no manual
// download, no postinstall step. Maps published path → file on disk.
function ocrAssetMap(): Map<string, string> {
  const nm = join(import.meta.dirname, 'node_modules')
  const core = join(nm, 'tesseract.js-core')
  const map = new Map([
    ['tesseract/worker.min.js', join(nm, 'tesseract.js/dist/worker.min.js')],
    [
      'tesseract/lang/eng.traineddata.gz',
      join(nm, '@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz'),
    ],
  ])
  for (const f of readdirSync(core)) {
    if (f.startsWith('tesseract-core')) map.set(`tesseract/core/${f}`, join(core, f))
  }
  return map
}

const TYPES: Record<string, string> = {
  js: 'text/javascript',
  wasm: 'application/wasm',
  gz: 'application/octet-stream', // served as-is; tesseract.js gunzips it itself
}

function ocrAssets(): Plugin {
  const assets = ocrAssetMap()
  return {
    name: 'tabby-ocr-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = (req.url ?? '').split('?')[0].slice(server.config.base.length)
        const file = assets.get(path)
        if (!file) return next()
        res.setHeader('Content-Type', TYPES[file.split('.').pop()!] ?? 'application/octet-stream')
        createReadStream(file).pipe(res)
      })
    },
    generateBundle() {
      for (const [fileName, file] of assets)
        this.emitFile({ type: 'asset', fileName, source: readFileSync(file) })
    },
  }
}

export default defineConfig({
  // GitHub Pages serves the app from /Tabby/; everywhere else it's at the root.
  base: process.env.GITHUB_ACTIONS ? '/Tabby/' : '/',
  plugins: [react(), tailwindcss(), ocrAssets()],
  define: {
    __LAN_HOST__: JSON.stringify(lanAddress()),
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
  },
  server: { host: true },
})
