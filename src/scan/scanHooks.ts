import { useEffect, useState } from 'react'
import { useUi } from '../store/uiStore'

/** Desktop extras: paste an image anywhere (⌘/Ctrl+V) to scan it. */
export function usePasteToScan(enabled: boolean) {
  const startScan = useUi((s) => s.startScan)
  useEffect(() => {
    if (!enabled) return
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'))
      if (file) {
        e.preventDefault()
        startScan({ source: file })
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [enabled, startScan])
}

/** Props for a drag-and-drop target that starts a scan. */
export function useDropToScan() {
  const startScan = useUi((s) => s.startScan)
  const [over, setOver] = useState(false)
  return {
    over,
    props: {
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault()
        setOver(true)
      },
      onDragLeave: () => setOver(false),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault()
        setOver(false)
        const file = [...e.dataTransfer.files].find((f) => f.type.startsWith('image/'))
        if (file) startScan({ source: file })
      },
    },
  }
}
