import QRCode from 'qrcode'
import { useEffect, useMemo, useState } from 'react'
import { Button, Segmented, Sheet } from '../components/ui'
import { encodeShare, shareBase, shareUrl } from '../lib/share'
import { useBill } from '../store/billStore'
import { usePrefs } from '../store/prefsStore'
import { useUi } from '../store/uiStore'

// Beyond this, QR codes get too dense for phone cameras to read reliably.
const QR_MAX_CHARS = 2000

export function ShareSheet() {
  const open = useUi((s) => s.sheet === 'share')
  const openSheet = useUi((s) => s.openSheet)
  const splitMode = useUi((s) => s.splitMode)
  const bill = useBill((s) => s.bill)
  const handles = usePrefs((s) => s.payHandles)
  const target = usePrefs((s) => s.shareTarget)
  const setPrefs = usePrefs((s) => s.set)
  const [qr, setQr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const base = shareBase(target)
  const url = useMemo(
    () => (open ? shareUrl(base.url, encodeShare(bill, splitMode, handles)) : ''),
    [open, base.url, bill, splitMode, handles],
  )
  const tooBig = url.length > QR_MAX_CHARS

  useEffect(() => {
    if (!url || tooBig) return
    let live = true
    QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'L' }).then((svg) => {
      if (live) setQr(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`)
    })
    return () => {
      live = false
    }
  }, [url, tooBig])

  const copy = async () => {
    await navigator.clipboard?.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  const share = async () => {
    try {
      await navigator.share({ title: bill.title, text: `Your share of ${bill.title}`, url })
    } catch {
      // cancelled — nothing to do
    }
  }

  return (
    <Sheet open={open} onClose={() => openSheet(null)} title="Share with the table">
      <div className="flex flex-col items-center gap-4">
        <p className="text-center text-sm text-muted">
          Friends open the link, tap their name, and see what they owe. No app or account needed.
        </p>

        {base.choice && (
          <div className="w-full">
            <Segmented
              label="Who can open the link"
              value={target}
              onChange={(shareTarget) => setPrefs({ shareTarget })}
              options={[
                { value: 'public', label: 'Anyone (public link)' },
                { value: 'local', label: 'Same Wi-Fi only' },
              ]}
            />
            {target === 'local' && !__LAN_URL__ && (
              <p className="mt-2 text-xs text-warn">
                This computer isn't on a network right now, so the public link is used instead.
              </p>
            )}
          </div>
        )}

        {tooBig ? (
          <p className="rounded-xl bg-surface-2 p-3 text-center text-sm">
            This bill is too big for a QR code — share the link instead.
          </p>
        ) : (
          qr && (
            <img
              src={qr}
              alt="QR code for the share link"
              className="h-56 w-56 rounded-xl bg-white p-2"
            />
          )
        )}

        <div className="flex w-full gap-2">
          <Button className="flex-1" onClick={copy}>
            {copied ? '✓ Copied' : '🔗 Copy link'}
          </Button>
          {'share' in navigator && (
            <Button variant="primary" className="flex-1" onClick={share}>
              📤 Share
            </Button>
          )}
        </div>
        <p className="text-center text-xs text-muted">
          The bill lives inside the link itself — it's never uploaded anywhere.
        </p>
      </div>
    </Sheet>
  )
}
