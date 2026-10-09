import type { Worker } from 'tesseract.js'
import type { OcrLine } from './parseReceipt'

// OCR assets are served by the app itself (vite.config.ts), never from a CDN.
const asset = (path: string) =>
  new URL(`${import.meta.env.BASE_URL}tesseract/${path}`, location.href).href

let worker: Promise<Worker> | null = null
let onProgress: ((p: number) => void) | null = null

/** Lazily creates one Tesseract worker per session; the library is only loaded on first scan. */
function getWorker(): Promise<Worker> {
  worker ??= (async () => {
    const { createWorker, PSM } = await import('tesseract.js')
    const w = await createWorker('eng', 1, {
      workerPath: asset('worker.min.js'),
      corePath: asset('core'),
      langPath: asset('lang'),
      gzip: true,
      logger: (m) => {
        // Loading counts for the first 30% of the bar, recognition for the rest.
        if (m.status === 'recognizing text') onProgress?.(0.3 + m.progress * 0.7)
        else onProgress?.(Math.min(0.3, m.progress * 0.3))
      },
    })
    await w.setParameters({
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
      preserve_interword_spaces: '1',
    })
    return w
  })()
  worker.catch(() => (worker = null))
  return worker
}

/** Reads text lines (with confidence and left edge) from a prepared canvas. */
export async function recognizeLines(
  canvas: HTMLCanvasElement,
  progress?: (p: number) => void,
): Promise<OcrLine[]> {
  onProgress = progress ?? null
  try {
    const w = await getWorker()
    const { data } = await w.recognize(canvas, {}, { blocks: true })
    progress?.(1)
    return (data.blocks ?? []).flatMap((b) =>
      b.paragraphs.flatMap((p) =>
        p.lines.map((l) => ({ text: l.text.trim(), confidence: l.confidence, x0: l.bbox.x0 })),
      ),
    )
  } finally {
    onProgress = null
  }
}

/** Stops a running scan. The next scan starts a fresh worker. */
export async function cancelOcr() {
  const w = worker
  worker = null
  onProgress = null
  if (w) (await w.catch(() => null))?.terminate()
}
