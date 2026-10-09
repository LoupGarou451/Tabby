import { useState } from 'react'
import { copyText } from '../lib/clipboard'
import { Avatar, Button, Card, EmptyState, Switch } from '../components/ui'
import { Hint } from '../components/Hint'
import { cx } from '../lib/cx'
import { formatMoney } from '../lib/money'
import { computeSplit, type PersonSplit } from '../lib/split'
import { summaryText } from '../lib/summaryText'
import { PayButtons, PayHandlesForm } from '../features/PayButtons'
import { useBill } from '../store/billStore'
import { usePrefs } from '../store/prefsStore'
import { useSplit } from '../store/useSplit'
import { useUi } from '../store/uiStore'

export function SummaryStep() {
  const bill = useBill((s) => s.bill)
  const splitRemainingEvenly = useBill((s) => s.splitRemainingEvenly)
  const setRoundUp = useBill((s) => s.setRoundUp)
  const setTitle = useBill((s) => s.setTitle)
  const newBill = useBill((s) => s.newBill)
  const setStep = useUi((s) => s.setStep)
  const setEditing = useUi((s) => s.setEditingItems)
  const openSheet = useUi((s) => s.openSheet)
  const mode = bill.splitMode
  const handles = usePrefs((s) => s.payHandles)
  const split = useSplit()
  // In Even mode, compare with a by-item split — but only once every item is assigned.
  const byItem = computeSplit(bill, 'fair')
  const compare = mode === 'even' && byItem.unassigned.total === 0 ? byItem : null
  const [editHandles, setEditHandles] = useState(false)
  const fmt = (m: number) => formatMoney(m, bill.currency)

  if (!bill.items.length)
    return (
      <EmptyState icon="🧾" title="Nothing to split yet">
        <Button variant="primary" onClick={() => setStep('receipt')}>
          Add items
        </Button>
      </EmptyState>
    )
  if (!bill.people.length)
    return (
      <EmptyState icon="👥" title="Add people to see who owes what">
        <Button variant="primary" onClick={() => setStep('people')}>
          Add people
        </Button>
      </EmptyState>
    )

  const hasUnassigned = mode === 'fair' && split.unassigned.total > 0
  const payer = bill.people.find((p) => p.id === bill.payerId)
  const noHandles = !handles.venmo && !handles.cashtag

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold">Who owes what</h2>
        <TitleInput title={bill.title} onSave={setTitle} />
        <p className="text-sm text-muted">
          {mode === 'fair' ? 'Split by what each person had' : 'Split evenly'} ·{' '}
          <button
            type="button"
            onClick={() => setStep('assign')}
            className="font-medium text-brand-strong underline-offset-2 hover:underline"
          >
            Change
          </button>
        </p>
      </div>

      {hasUnassigned && (
        <Card className="flex flex-col gap-3 border-warn bg-warn/10">
          <p className="font-semibold">
            {fmt(split.unassigned.subtotal)} still unassigned
            <span className="block text-sm font-normal text-muted">
              Totals below are “so far” until every item has someone.
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setStep('assign')}>Assign items</Button>
            <Button onClick={splitRemainingEvenly}>Split evenly among everyone</Button>
          </div>
        </Card>
      )}

      {split.people.map((p) => (
        <PersonCard
          key={p.personId}
          split={p}
          compareTo={compare?.people.find((o) => o.personId === p.personId)?.total}
          soFar={hasUnassigned}
        />
      ))}

      {payer && (noHandles || editHandles) && bill.people.length > 1 && (
        <Card>
          <PayHandlesForm payerName={payer.name} onDone={() => setEditHandles(false)} />
        </Card>
      )}

      <Card className="flex flex-col gap-1">
        <Switch checked={bill.roundUp} onChange={setRoundUp} label="Round everyone up" />
        <p className="text-xs text-muted">
          Each total rounds up to a whole amount; the extra goes to the tip.
        </p>
      </Card>

      <div className="flex flex-col items-center gap-1 py-2 text-center">
        <span className="text-sm text-muted">Bill total</span>
        <span className="text-3xl font-bold tabular-nums">{fmt(split.billTotal)}</span>
        {split.roundUpTotal > 0 && (
          <span className="text-sm text-muted">
            Tip {fmt(split.tip - split.roundUpTotal)} + {fmt(split.roundUpTotal)} from rounding
          </span>
        )}
        {split.reconciles && !hasUnassigned && (
          <span className="text-sm font-medium text-good">
            ✓ Adds up to {fmt(split.billTotal)} exactly
          </span>
        )}
        {payer && !noHandles && !editHandles && (
          <button
            type="button"
            onClick={() => setEditHandles(true)}
            className="mt-1 text-xs text-muted underline"
          >
            Edit {payer.name}'s payment handles
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Hint id="share" />
        <Button variant="primary" className="min-h-12 text-base" onClick={() => openSheet('share')}>
          🔗 Share link &amp; QR code
        </Button>
        <ShareSummaryButton />
        <Button
          variant="secondary"
          className="mt-2 min-h-12 border-good text-base font-semibold text-good"
          onClick={() => {
            newBill('Saved to history')
            setEditing(false)
            setStep('receipt')
          }}
        >
          ✓ Done — save to history
        </Button>
      </div>
    </div>
  )
}

function PersonCard({
  split: p,
  compareTo,
  soFar,
}: {
  split: PersonSplit
  compareTo?: number
  soFar: boolean
}) {
  const bill = useBill((s) => s.bill)
  const togglePaid = useBill((s) => s.togglePaid)
  const toggleTreat = useBill((s) => s.toggleTreat)
  const mode = bill.splitMode
  const handles = usePrefs((s) => s.payHandles)
  const [open, setOpen] = useState(false)
  const person = bill.people.find((x) => x.id === p.personId)
  const payer = bill.people.find((x) => x.id === bill.payerId)
  const fmt = (m: number) => formatMoney(m, bill.currency)
  const itemName = (id: string) => bill.items.find((i) => i.id === id)?.name ?? ''
  const paid = !!bill.paid[p.personId]
  const isPayer = bill.payerId === p.personId
  const treated = bill.treatedIds.includes(p.personId)
  // Someone else must be left to cover a treat.
  const canTreat = treated || bill.people.length - bill.treatedIds.length > 1
  // In Even mode, show how this compares with a by-item split (+ pays more, − saves).
  const delta = compareTo !== undefined ? p.total - compareTo : 0

  const line = (label: string, value: number, negative = false) =>
    value !== 0 && (
      <div className="flex justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums">
          {negative || value < 0 ? '−' : ''}
          {fmt(Math.abs(value))}
        </span>
      </div>
    )

  return (
    <Card className={cx('flex flex-col gap-3', paid && !isPayer && 'opacity-60')}>
      <div className="flex items-center gap-3">
        {person && <Avatar name={person.name} colorIndex={person.colorIndex} size={40} />}
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">
            {p.label}
            {isPayer && (
              <span className="ml-2 text-xs font-medium text-muted">💳 paid the bill</span>
            )}
          </div>
          {treated ? (
            <span className="text-sm text-muted">🎂 On us!</span>
          ) : mode === 'even' ? (
            <span className="text-sm text-muted">Equal share</span>
          ) : (
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen(!open)}
              className="text-sm text-muted underline-offset-2 hover:underline"
            >
              {p.items.length} {p.items.length === 1 ? 'item' : 'items'} ·{' '}
              {open ? 'hide' : 'details'}
            </button>
          )}
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tabular-nums">{fmt(p.total)}</div>
          {soFar && <div className="text-xs text-muted">so far</div>}
          {delta !== 0 && (
            <div className={cx('text-xs font-medium', delta > 0 ? 'text-bad' : 'text-good')}>
              {delta > 0 ? '+' : '−'}
              {fmt(Math.abs(delta))} vs by item
            </div>
          )}
        </div>
      </div>

      {open && !treated && (
        <div className="flex flex-col gap-1 border-t border-line pt-3">
          {mode === 'fair' &&
            p.items.map((i) => (
              <div key={i.itemId} className="flex justify-between text-sm">
                <span>
                  {i.fraction[0] !== i.fraction[1] && (
                    <span className="text-muted">
                      {i.fraction[0]}/{i.fraction[1]}{' '}
                    </span>
                  )}
                  {itemName(i.itemId)}
                </span>
                <span className="tabular-nums">{fmt(i.share)}</span>
              </div>
            ))}
          {mode === 'fair' && <div className="my-1 border-t border-dashed border-line" />}
          {line('Subtotal', p.subtotal)}
          {line('Discount', p.discount, true)}
          {line('Tax', p.tax)}
          {line('Tip', p.tip - p.roundUpExtra)}
          {line('Rounded up → tip', p.roundUpExtra)}
          {line('Gratuity', p.service)}
          {p.treatAdjustment > 0 && line('🎂 Covering a treat', p.treatAdjustment)}
          {mode === 'even' && <p className="text-sm text-muted">An equal share of the bill.</p>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {canTreat && bill.people.length > 1 && (
          <button
            type="button"
            aria-pressed={treated}
            onClick={() => toggleTreat(p.personId)}
            className={cx(
              'min-h-11 rounded-full px-3 text-sm',
              treated ? 'bg-brand/20 font-medium' : 'text-muted hover:bg-surface-2',
            )}
          >
            🎂 {treated ? 'Treated' : 'Treat'}
          </button>
        )}
        {!isPayer && payer && !treated && (
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={paid}
              onChange={() => togglePaid(p.personId)}
              className="h-5 w-5 accent-[var(--good)]"
            />
            Paid back
          </label>
        )}
      </div>

      {!isPayer && payer && !treated && !paid && p.total > 0 && (
        <PayButtons
          payerName={payer.name}
          personName={p.label}
          amount={p.total}
          currency={bill.currency}
          title={bill.title}
          handles={handles}
        />
      )}
    </Card>
  )
}

function ShareSummaryButton() {
  const bill = useBill((s) => s.bill)
  const split = useSplit()
  const [copied, setCopied] = useState(false)

  const share = async () => {
    const text = summaryText(bill, split)
    if (navigator.share) {
      try {
        await navigator.share({ title: bill.title, text })
        return
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
      }
    }
    if (!(await copyText(text))) return
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return <Button onClick={share}>{copied ? '✓ Copied to clipboard' : '📋 Share as text'}</Button>
}

/** Bill name, editable in place (it names the bill in history, share links, and payment notes). */
function TitleInput({ title, onSave }: { title: string; onSave: (t: string) => void }) {
  const [text, setText] = useState(title)
  const [focused, setFocused] = useState(false)
  if (!focused && text !== title) setText(title)
  return (
    <input
      aria-label="Bill name"
      value={text}
      onFocus={(e) => {
        setFocused(true)
        e.currentTarget.select()
      }}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        setFocused(false)
        onSave(text.trim() || title)
      }}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      className="-ml-2 min-h-10 rounded-lg bg-transparent px-2 text-lg text-muted outline-none hover:bg-surface-2 focus:bg-surface-2 focus:text-ink"
    />
  )
}
