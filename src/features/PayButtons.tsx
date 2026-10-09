import { useState } from 'react'
import { copyText } from '../lib/clipboard'
import { Button } from '../components/ui'
import { formatMoney, type Money } from '../lib/money'
import { paymentLinks, type PayHandles } from '../lib/share'
import { usePrefs } from '../store/prefsStore'

/** "Pay Jordan" links for one person's share, plus a copyable request. */
export function PayButtons({
  payerName,
  personName,
  amount,
  currency,
  title,
  handles,
}: {
  payerName: string
  personName: string
  amount: Money
  currency: string
  title: string
  handles: PayHandles
}) {
  const [copied, setCopied] = useState(false)
  const links = paymentLinks(currency, handles, amount, title)
  const request = `Hey ${personName}, your share of ${title} is ${formatMoney(amount, currency)} — pay ${payerName} 🙏`

  return (
    <div className="flex flex-wrap gap-2">
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-11 items-center rounded-xl bg-brand px-4 text-sm font-semibold text-on-brand"
        >
          Pay {payerName} · {l.label}
        </a>
      ))}
      <Button
        className="text-sm"
        onClick={async () => {
          if (!(await copyText(request))) return
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }}
      >
        {copied ? '✓ Copied' : 'Copy request'}
      </Button>
    </div>
  )
}

/** One-time prompt for the payer's Venmo / Cash App handles (stored on this device). */
export function PayHandlesForm({ payerName, onDone }: { payerName: string; onDone?: () => void }) {
  const handles = usePrefs((s) => s.payHandles)
  const setPrefs = usePrefs((s) => s.set)
  const [venmo, setVenmo] = useState(handles.venmo ?? '')
  const [cashtag, setCashtag] = useState(handles.cashtag ?? '')

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        setPrefs({
          payHandles: { venmo: venmo.trim() || undefined, cashtag: cashtag.trim() || undefined },
        })
        onDone?.()
      }}
    >
      <p className="text-sm font-medium">How should people pay {payerName}?</p>
      <div className="flex gap-2">
        <input
          aria-label="Venmo username"
          placeholder="@venmo"
          value={venmo}
          onChange={(e) => setVenmo(e.target.value)}
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 outline-none focus:border-brand"
        />
        <input
          aria-label="Cash App cashtag"
          placeholder="$cashtag"
          value={cashtag}
          onChange={(e) => setCashtag(e.target.value)}
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 outline-none focus:border-brand"
        />
      </div>
      <Button type="submit" variant="primary">
        Save
      </Button>
      <p className="text-xs text-muted">Saved on this device only. Leave blank to skip.</p>
    </form>
  )
}
