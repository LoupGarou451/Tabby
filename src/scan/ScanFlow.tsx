import { useEffect, useRef, useState } from 'react'
import { Button } from '../components/ui'
import { useBill } from '../store/billStore'
import { useUi, type ScanRequest } from '../store/uiStore'
import { CropView } from './CropView'
import { cancelOcr, recognizeLines } from './ocr'
import { parseReceipt, type ReceiptDraft } from './parseReceipt'
import { loadImage, preprocess, rotateImage, type Crop, type Rotation } from './preprocess'
import { ReviewScreen } from './ReviewScreen'
import { validateDraft } from './schema'

type Phase =
  | { name: 'loading' }
  | { name: 'crop'; image: CanvasImageSource & { width: number; height: number } }
  | { name: 'reading'; progress: number }
  | { name: 'review'; draft: ReceiptDraft; thumbnail: string }
  | { name: 'error'; message: string }

/** Full-screen scan flow: crop → preprocess → OCR → parse → review (design section 9). */
export function ScanFlow() {
  const scan = useUi((s) => s.scan)
  if (!scan) return null
  // Remount for each new scan so no state leaks between them.
  return <Flow key={scan.id} request={scan} />
}

function Flow({ request }: { request: ScanRequest }) {
  const endScan = useUi((s) => s.endScan)
  const setEditing = useUi((s) => s.setEditingItems)
  const currency = useBill((s) => s.bill.currency)
  const [phase, setPhase] = useState<Phase>({ name: 'loading' })
  const cancelled = useRef(false)

  useEffect(() => {
    loadImage(request.source).then(
      (image) => setPhase({ name: 'crop', image }),
      (e: Error) => setPhase({ name: 'error', message: e.message }),
    )
  }, [request])

  const run = async (
    image: CanvasImageSource & { width: number; height: number },
    crop: Crop,
    rotation: Rotation,
  ) => {
    setPhase({ name: 'reading', progress: 0 })
    // Let the progress screen paint first. (Not requestAnimationFrame: it never fires in
    // background tabs, which would stall the scan.)
    await new Promise((r) => setTimeout(r, 50))
    try {
      const { canvas, thumbnail } = preprocess(rotateImage(image, rotation), crop)
      const setProgress = (fn: (p: number) => number) =>
        setPhase((p) => (p.name === 'reading' ? { name: 'reading', progress: fn(p.progress) } : p))
      // Tesseract reports recognition only at its start and end, so ease the bar forward
      // meanwhile; it never reaches the end until recognition really finishes.
      const creep = setInterval(
        () => setProgress((p) => (p >= 0.3 ? p + (0.95 - p) * 0.04 : p)),
        250,
      )
      const lines = await recognizeLines(canvas, (progress) =>
        setProgress((p) => Math.max(p, progress)),
      ).finally(() => clearInterval(creep))
      if (cancelled.current) return
      const draft = validateDraft(parseReceipt(lines, currency))

      setPhase(
        draft.items.length
          ? { name: 'review', draft, thumbnail }
          : { name: 'error', message: "We couldn't find any items on this receipt" },
      )
    } catch (e) {
      if (!cancelled.current) {
        console.error('[tabby] scan failed', e)
        setPhase({ name: 'error', message: 'Something went wrong reading that photo' })
      }
    }
  }

  const cancel = () => {
    cancelled.current = true
    void cancelOcr()
    endScan()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Scan receipt"
      className="fixed inset-0 z-30 flex flex-col overflow-y-auto bg-bg"
    >
      {phase.name === 'loading' && <Centered>Opening photo…</Centered>}

      {phase.name === 'crop' && (
        <CropView
          image={phase.image}
          onCancel={cancel}
          onConfirm={(crop, rotation) => run(phase.image, crop, rotation)}
        />
      )}

      {phase.name === 'reading' && (
        <Centered>
          <div className="text-4xl" aria-hidden="true">
            🧾
          </div>
          <p className="font-semibold">Reading your receipt…</p>
          <div
            role="progressbar"
            aria-label="Scan progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(phase.progress * 100)}
            className="h-2.5 w-64 overflow-hidden rounded-full bg-surface-2"
          >
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${Math.max(4, phase.progress * 100)}%` }}
            />
          </div>
          <p className="text-sm text-muted">Everything stays on your device.</p>
          <Button variant="ghost" onClick={cancel}>
            Cancel
          </Button>
        </Centered>
      )}

      {phase.name === 'review' && (
        <ReviewScreen draft={phase.draft} thumbnail={phase.thumbnail} onDone={endScan} />
      )}

      {phase.name === 'error' && (
        <Centered>
          <div className="text-4xl" aria-hidden="true">
            🤔
          </div>
          <p className="font-semibold">{phase.message}</p>
          <p className="max-w-xs text-sm text-muted">
            Try a flatter, brighter photo and crop close to the receipt.
          </p>
          <div className="flex gap-2">
            <Button variant="primary" onClick={endScan}>
              Try another photo
            </Button>
            <Button
              onClick={() => {
                setEditing(true)
                endScan()
              }}
            >
              Enter manually instead
            </Button>
          </div>
        </Centered>
      )}
    </div>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="m-auto flex flex-col items-center gap-4 p-6 text-center">{children}</div>
}
