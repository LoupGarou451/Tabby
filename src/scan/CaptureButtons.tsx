import { useRef, useState } from 'react'
import { Button } from '../components/ui'
import { cx } from '../lib/cx'
import { usePrefs } from '../store/prefsStore'
import { useUi, type ScanRequest } from '../store/uiStore'

const isTouch = () => matchMedia('(pointer: coarse)').matches

/**
 * "Take photo" (rear camera, touch devices only) and "Upload image" (any device). Both feed
 * the same scan pipeline. Desktop browsers ignore `capture`, so there the camera button would
 * only duplicate the file picker.
 */
export function CaptureButtons({
  purpose = 'items',
  compact = false,
}: {
  purpose?: ScanRequest['purpose']
  compact?: boolean
}) {
  const startScan = useUi((s) => s.startScan)
  const setPrefs = usePrefs((s) => s.set)
  const cameraRef = useRef<HTMLInputElement>(null)
  const uploadRef = useRef<HTMLInputElement>(null)
  const [touch] = useState(isTouch)

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow picking the same file again
    if (!file) return
    setPrefs({ lastInputMethod: 'scan' })
    startScan({ source: file, purpose })
  }

  return (
    <div className={cx('flex gap-2', compact ? 'flex-row' : 'flex-col')}>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onFile}
      />
      <input ref={uploadRef} type="file" accept="image/*" hidden onChange={onFile} />
      {touch && (
        <Button
          variant="primary"
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation()
            cameraRef.current?.click()
          }}
        >
          📷 Take photo
        </Button>
      )}
      <Button
        variant={touch ? 'secondary' : 'primary'}
        className="flex-1"
        onClick={(e) => {
          e.stopPropagation()
          uploadRef.current?.click()
        }}
      >
        ⬆️ Upload image
      </Button>
    </div>
  )
}
