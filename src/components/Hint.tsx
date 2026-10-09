import { usePrefs } from '../store/prefsStore'
import { useUi } from '../store/uiStore'

const HINTS = {
  'choose-input': 'Scan a receipt, type items in, or just split evenly — you can mix and match.',
  'tap-chips': 'Tap people to assign. Tap more than one to share an item.',
  share: "Send everyone their total — they don't need the app.",
} as const

/**
 * A one-time coach mark shown above the element it points at (design section 10.12).
 * Hidden once dismissed (remembered in preferences) and while a sheet is open.
 */
export function Hint({ id }: { id: keyof typeof HINTS }) {
  const seen = usePrefs((s) => s.hintsSeen.includes(id))
  const dismiss = usePrefs((s) => s.dismissHint)
  const sheetOpen = useUi((s) => s.sheet !== null || s.scan !== null)
  if (seen || sheetOpen) return null
  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Tip"
      onKeyDown={(e) => e.key === 'Escape' && dismiss(id)}
      className="hint-in relative flex items-start gap-3 rounded-2xl bg-ink p-3 pr-2 text-sm text-bg shadow-lg"
    >
      <span aria-hidden="true">💡</span>
      <p className="flex-1 pt-0.5">{HINTS[id]}</p>
      <button
        type="button"
        onClick={() => dismiss(id)}
        className="min-h-9 shrink-0 rounded-lg px-3 font-semibold text-ink-accent"
      >
        Got it
      </button>
      {/* Arrow pointing at the target below. */}
      <span aria-hidden="true" className="absolute -bottom-1.5 left-8 h-3 w-3 rotate-45 bg-ink" />
    </div>
  )
}
