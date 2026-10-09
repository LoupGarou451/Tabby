import { useMemo, useRef, useState } from 'react'
import { Button } from '../components/ui'
import { FULL_CROP, rotateImage, type Crop, type Rotation } from './preprocess'

type Corner = 'tl' | 'tr' | 'bl' | 'br'
const MIN = 0.1 // smallest crop, as a fraction of each side

/** Shows the photo with a draggable crop rectangle and a rotate button. */
export function CropView({
  image,
  onConfirm,
  onCancel,
}: {
  image: CanvasImageSource & { width: number; height: number }
  onConfirm: (crop: Crop, rotation: Rotation) => void
  onCancel: () => void
}) {
  const [rotation, setRotation] = useState<Rotation>(0)
  const [crop, setCrop] = useState<Crop>(FULL_CROP)
  const frameRef = useRef<HTMLDivElement>(null)
  const preview = useMemo(() => {
    const c = rotateImage(image, rotation, 1200)
    return { url: c.toDataURL('image/jpeg', 0.85), ratio: c.width / c.height }
  }, [image, rotation])

  const drag = (corner: Corner) => (e: React.PointerEvent) => {
    e.preventDefault()
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
    const move = (ev: PointerEvent) => {
      const box = frameRef.current!.getBoundingClientRect()
      const px = Math.min(1, Math.max(0, (ev.clientX - box.left) / box.width))
      const py = Math.min(1, Math.max(0, (ev.clientY - box.top) / box.height))
      setCrop((c) => {
        let { x, y, w, h } = c
        const right = x + w
        const bottom = y + h
        if (corner === 'tl' || corner === 'bl') {
          x = Math.min(px, right - MIN)
          w = right - x
        } else {
          w = Math.max(MIN, px - x)
        }
        if (corner === 'tl' || corner === 'tr') {
          y = Math.min(py, bottom - MIN)
          h = bottom - y
        } else {
          h = Math.max(MIN, py - y)
        }
        return { x, y, w, h }
      })
    }
    const up = () => {
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', up)
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', up)
  }

  const handle = (corner: Corner, left: number, top: number) => (
    <div
      role="presentation"
      onPointerDown={drag(corner)}
      className="absolute -mt-[22px] -ml-[22px] flex h-11 w-11 cursor-grab touch-none items-center justify-center"
      style={{ left: `${left * 100}%`, top: `${top * 100}%` }}
    >
      <span className="h-5 w-5 rounded-full border-[3px] border-white bg-brand shadow-md" />
    </div>
  )

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[480px] flex-col gap-4 p-4">
      <div>
        <h2 className="text-xl font-bold">Crop to the receipt</h2>
        <p className="text-sm text-muted">
          Drag the corners close to the paper — it really helps accuracy.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center">
        {preview && (
          <div
            ref={frameRef}
            className="relative touch-none select-none"
            style={{
              aspectRatio: preview.ratio,
              maxHeight: '60dvh',
              width: '100%',
              maxWidth: `calc(60dvh * ${preview.ratio})`,
            }}
          >
            {/* Clipped layer: photo plus a shadow that dims everything outside the crop. */}
            <div className="absolute inset-0 overflow-hidden rounded-lg">
              <img
                src={preview.url}
                alt="Your receipt photo"
                draggable={false}
                className="h-full w-full object-contain"
              />
              <div
                className="pointer-events-none absolute outline-2 outline-white"
                style={{
                  left: `${crop.x * 100}%`,
                  top: `${crop.y * 100}%`,
                  width: `${crop.w * 100}%`,
                  height: `${crop.h * 100}%`,
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                }}
              />
            </div>
            {handle('tl', crop.x, crop.y)}
            {handle('tr', crop.x + crop.w, crop.y)}
            {handle('bl', crop.x, crop.y + crop.h)}
            {handle('br', crop.x + crop.w, crop.y + crop.h)}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={() => {
              setRotation((r) => ((r + 90) % 360) as Rotation)
              setCrop(FULL_CROP)
            }}
          >
            ↻ Rotate
          </Button>
          <Button className="flex-1" onClick={() => onConfirm(FULL_CROP, rotation)}>
            Use whole image
          </Button>
        </div>
        <Button variant="primary" className="min-h-12" onClick={() => onConfirm(crop, rotation)}>
          Scan this area →
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
