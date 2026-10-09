import { useState } from 'react'
import { Avatar, Button, Card, EmptyState } from '../components/ui'
import { cx } from '../lib/cx'
import { formatMoney } from '../lib/money'
import type { PersonSplit } from '../lib/split'
import { summaryText } from '../lib/summaryText'
import { useBill } from '../store/billStore'
import { useSplit } from '../store/useSplit'
import { useUi } from '../store/uiStore'

export function SummaryStep() {
  const bill = useBill((s) => s.bill)
  const splitRemainingEvenly = useBill((s) => s.splitRemainingEvenly)
  const setStep = useUi((s) => s.setStep)
  const split = useSplit()
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

  const hasUnassigned = split.unassigned.total > 0
  const printedDiff =
    bill.printedTotal !== undefined ? bill.printedTotal - (split.billTotal - split.tip) : 0

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold">Who owes what</h2>
        <p className="text-muted">{bill.title}</p>
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
        <PersonCard key={p.personId} split={p} soFar={hasUnassigned} />
      ))}

      <div className="flex flex-col items-center gap-1 py-2 text-center">
        <span className="text-sm text-muted">Bill total</span>
        <span className="text-3xl font-bold tabular-nums">{fmt(split.billTotal)}</span>
        {split.reconciles && !hasUnassigned && (
          <span className="text-sm font-medium text-good">
            ✓ Adds up to {fmt(split.billTotal)} exactly
          </span>
        )}
        {bill.printedTotal !== undefined && printedDiff !== 0 && (
          <span className="text-sm text-warn">
            Receipt says {fmt(bill.printedTotal)} before tip — {fmt(Math.abs(printedDiff))}{' '}
            difference.{' '}
            <button type="button" className="underline" onClick={() => setStep('receipt')}>
              Fix
            </button>
          </span>
        )}
      </div>

      <ShareSummaryButton />
    </div>
  )
}

function PersonCard({ split: p, soFar }: { split: PersonSplit; soFar: boolean }) {
  const bill = useBill((s) => s.bill)
  const togglePaid = useBill((s) => s.togglePaid)
  const [open, setOpen] = useState(false)
  const person = bill.people.find((x) => x.id === p.personId)
  const fmt = (m: number) => formatMoney(m, bill.currency)
  const itemName = (id: string) => bill.items.find((i) => i.id === id)?.name ?? ''
  const paid = !!bill.paid[p.personId]
  const isPayer = bill.payerId === p.personId

  const line = (label: string, value: number, negative = false) =>
    value !== 0 && (
      <div className="flex justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums">
          {negative ? '−' : ''}
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
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="text-sm text-muted underline-offset-2 hover:underline"
          >
            {p.items.length} {p.items.length === 1 ? 'item' : 'items'} · {open ? 'hide' : 'details'}
          </button>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold tabular-nums">{fmt(p.total)}</div>
          {soFar && <div className="text-xs text-muted">so far</div>}
        </div>
      </div>

      {open && (
        <div className="flex flex-col gap-1 border-t border-line pt-3">
          {p.items.map((i) => (
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
          <div className="my-1 border-t border-dashed border-line" />
          {line('Subtotal', p.subtotal)}
          {line('Discount', p.discount, true)}
          {line('Tax', p.tax)}
          {line('Tip', p.tip)}
          {line('Service charge', p.service)}
        </div>
      )}

      {!isPayer && bill.payerId && (
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
    await navigator.clipboard?.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant="primary" onClick={share} className="min-h-12 text-base">
      {copied ? '✓ Copied to clipboard' : '📤 Share summary'}
    </Button>
  )
}
