import { useState } from 'react'
import { Button, Segmented, Sheet } from '../components/ui'
import { useBill } from '../store/billStore'
import { usePrefs, type Theme } from '../store/prefsStore'
import { useUi } from '../store/uiStore'

export function SettingsSheet() {
  const open = useUi((s) => s.sheet === 'settings')
  const openSheet = useUi((s) => s.openSheet)
  const prefs = usePrefs()
  const clearAll = useBill((s) => s.clearAll)
  const [confirmClear, setConfirmClear] = useState(false)
  const [tipText, setTipText] = useState(String(prefs.defaultTipBps / 100))

  const field =
    'min-h-11 w-full rounded-xl border border-line bg-surface px-3 outline-none focus:border-brand'

  return (
    <Sheet
      open={open}
      onClose={() => {
        openSheet(null)
        setConfirmClear(false)
      }}
      title="Settings"
    >
      <div className="flex flex-col gap-5">
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-muted">Theme</h3>
          <Segmented<Theme>
            label="Theme"
            value={prefs.theme}
            onChange={(theme) => prefs.set({ theme })}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-muted">Suggested tip</h3>
          <label className="flex items-center gap-2">
            <input
              aria-label="Default tip percent"
              inputMode="decimal"
              value={tipText}
              onChange={(e) => setTipText(e.target.value.replace(/[^\d.]/g, ''))}
              onBlur={() => {
                const n = Math.min(100, Math.max(0, Number(tipText) || 0))
                setTipText(String(n))
                prefs.set({ defaultTipBps: Math.round(n * 100) })
              }}
              className={`${field} w-24 text-right`}
            />
            <span>%</span>
          </label>
          <p className="text-xs text-muted">
            Highlighted on the Tax &amp; tip step. Bills start with no tip until you pick one.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-muted">Your payment handles</h3>
          <div className="flex gap-2">
            <input
              aria-label="Venmo username"
              placeholder="@venmo"
              value={prefs.payHandles.venmo ?? ''}
              onChange={(e) =>
                prefs.set({
                  payHandles: { ...prefs.payHandles, venmo: e.target.value || undefined },
                })
              }
              className={field}
            />
            <input
              aria-label="Cash App cashtag"
              placeholder="$cashtag"
              value={prefs.payHandles.cashtag ?? ''}
              onChange={(e) =>
                prefs.set({
                  payHandles: { ...prefs.payHandles, cashtag: e.target.value || undefined },
                })
              }
              className={field}
            />
          </div>
          <p className="text-xs text-muted">Used for "Pay" buttons when you paid the bill.</p>
        </section>

        <section className="flex flex-col gap-2">
          <Button onClick={() => prefs.set({ hintsSeen: [] })}>💡 Show tips again</Button>
          {!confirmClear ? (
            <Button variant="danger" onClick={() => setConfirmClear(true)}>
              Clear all data…
            </Button>
          ) : (
            <div className="flex flex-col gap-2 rounded-xl bg-bad/10 p-3">
              <p className="text-sm">
                This deletes the current bill and all history on this device. It can't be undone.
              </p>
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => setConfirmClear(false)}>
                  Keep my data
                </Button>
                <Button
                  className="flex-1 border-bad text-bad"
                  onClick={() => {
                    clearAll()
                    prefs.set({ recentNames: [], payHandles: {}, hintsSeen: [] })
                    setConfirmClear(false)
                    openSheet(null)
                  }}
                >
                  Delete everything
                </Button>
              </div>
            </div>
          )}
        </section>

        <button
          type="button"
          onClick={() => openSheet('about')}
          className="text-sm text-muted underline"
        >
          About Tabby · v{__APP_VERSION__} · MIT
        </button>
      </div>
    </Sheet>
  )
}
