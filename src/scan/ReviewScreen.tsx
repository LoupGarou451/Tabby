import { useState } from 'react'
import { Button, Card, MoneyInput, Sheet } from '../components/ui'
import { cx } from '../lib/cx'
import { formatMoney, type Money } from '../lib/money'
import { useBill } from '../store/billStore'
import { useUi } from '../store/uiStore'
import type { DraftItem, ReceiptDraft } from './parseReceipt'
import { draftToItems } from './schema'

const LOW_CONFIDENCE = 70

/** Always shown after a scan; nothing reaches the bill until the user confirms. */
export function ReviewScreen({
  draft,
  thumbnail,
  onDone,
}: {
  draft: ReceiptDraft
  thumbnail: string
  onDone: () => void
}) {
  const bill = useBill((s) => s.bill)
  const addItems = useBill((s) => s.addItems)
  const setAdjustments = useBill((s) => s.setAdjustments)
  const setPrintedTotal = useBill((s) => s.setPrintedTotal)
  const setStep = useUi((s) => s.setStep)
  const setEditing = useUi((s) => s.setEditingItems)
  const [items, setItems] = useState<(DraftItem & { key: number })[]>(() =>
    draft.items.map((d, key) => ({ ...d, key })),
  )
  const [zoom, setZoom] = useState(false)
  const fmt = (m: Money) => formatMoney(m, bill.currency)

  const sum = items.reduce((s, i) => s + i.price, 0)
  const expectedTotal =
    sum - (draft.discount ?? 0) + (draft.tax ?? 0) + (draft.serviceCharge ?? 0) + (draft.tip ?? 0)
  const subtotalDiff = draft.subtotal !== undefined ? draft.subtotal - sum : undefined
  const totalDiff = draft.total !== undefined ? draft.total - expectedTotal : undefined
  const matches = subtotalDiff === 0 || (subtotalDiff === undefined && totalDiff === 0)
  const missing = subtotalDiff ?? totalDiff ?? 0
  const flagged = items.filter((i) => i.confidence < LOW_CONFIDENCE).length

  const update = (key: number, patch: Partial<DraftItem>) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)))
  const remove = (key: number) => setItems((list) => list.filter((i) => i.key !== key))
  const addUnlisted = () =>
    setItems((list) => [
      ...list,
      { key: Date.now(), name: 'Unlisted item', quantity: 1, price: missing, confidence: 0 },
    ])

  const commit = (mode: 'append' | 'replace') => {
    const valid = items.filter((i) => i.price > 0)
    addItems(draftToItems({ items: valid }), mode)
    const patch: Parameters<typeof setAdjustments>[0] = {}
    if (draft.tax !== undefined) patch.tax = { mode: 'amount', value: draft.tax }
    if (draft.serviceCharge !== undefined) {
      patch.serviceCharge = draft.serviceCharge
      patch.tip = { mode: 'percent', bps: 0 } // gratuity is already on the receipt
    } else if (draft.tip !== undefined) {
      patch.tip = { mode: 'amount', value: draft.tip }
    }
    if (draft.discount !== undefined) patch.discount = draft.discount
    setAdjustments(patch)
    if (draft.total !== undefined) setPrintedTotal(draft.total - (draft.tip ?? 0))
    setEditing(false)
    setStep(bill.people.length ? 'assign' : 'people')
    onDone()
  }

  const totals: [string, Money | undefined][] = [
    ['Subtotal', draft.subtotal],
    ['Discount', draft.discount],
    ['Tax', draft.tax],
    ['Service charge', draft.serviceCharge],
    ['Tip', draft.tip],
    ['Total', draft.total],
  ]

  return (
    <div className="mx-auto flex w-full max-w-[480px] flex-col gap-4 p-4 pb-8">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => setZoom(true)}
          aria-label="Zoom receipt photo"
          className="shrink-0 overflow-hidden rounded-lg border border-line"
        >
          <img src={thumbnail} alt="" className="h-24 w-20 object-cover" />
        </button>
        <div>
          <h2 className="text-xl font-bold">Check the items</h2>
          <p className="text-sm text-muted">
            Found {items.length} {items.length === 1 ? 'item' : 'items'}.
            {flagged > 0 && ` ${flagged} highlighted — worth a quick look.`} Tap anything to fix it.
          </p>
        </div>
      </div>

      <div
        className={cx(
          'rounded-xl p-3 text-sm',
          matches ? 'bg-good/15 text-ink' : 'bg-warn/15 text-ink',
        )}
        role="status"
      >
        {matches ? (
          <span className="font-medium">✓ Items add up to the receipt</span>
        ) : subtotalDiff === undefined && totalDiff === undefined ? (
          <span>No printed total found — double-check the list against your receipt.</span>
        ) : (
          <div className="flex flex-col gap-2">
            <span>
              {missing > 0
                ? `Items are ${fmt(missing)} short of the receipt.`
                : `Items are ${fmt(-missing)} over the receipt.`}
            </span>
            {missing > 0 && (
              <Button onClick={addUnlisted} className="self-start">
                + Add {fmt(missing)} as "Unlisted item"
              </Button>
            )}
          </div>
        )}
      </div>

      <Card className="flex flex-col gap-2 p-3">
        {items.map((i) => (
          <div
            key={i.key}
            className={cx(
              'grid grid-cols-[1fr_3rem_6rem_2.75rem] items-center gap-2 rounded-xl',
              i.confidence < LOW_CONFIDENCE && 'bg-warn/20 p-1',
            )}
          >
            <input
              aria-label="Item name"
              value={i.name}
              onChange={(e) => update(i.key, { name: e.target.value })}
              className="min-h-11 min-w-0 rounded-xl border border-line bg-surface px-3 outline-none focus:border-brand"
            />
            <input
              aria-label="Quantity"
              inputMode="numeric"
              value={i.quantity}
              onChange={(e) =>
                update(i.key, { quantity: Math.min(99, Math.max(1, Number(e.target.value) || 1)) })
              }
              className="min-h-11 w-full rounded-xl border border-line bg-surface text-center outline-none focus:border-brand"
            />
            <MoneyInput
              aria-label={`Price of ${i.name}`}
              value={i.price}
              currency={bill.currency}
              onCommit={(v) => v && update(i.key, { price: v })}
              className="w-full"
            />
            <Button
              variant="ghost"
              aria-label={`Remove ${i.name}`}
              onClick={() => remove(i.key)}
              className="px-0 text-muted"
            >
              ✕
            </Button>
          </div>
        ))}
      </Card>

      {totals.some(([, v]) => v !== undefined) && (
        <Card className="flex flex-col gap-1 text-sm">
          <h3 className="mb-1 font-semibold">Also found</h3>
          {totals.map(
            ([label, v]) =>
              v !== undefined && (
                <div key={label} className="flex justify-between">
                  <span className="text-muted">{label}</span>
                  <span className="tabular-nums">{fmt(v)}</span>
                </div>
              ),
          )}
        </Card>
      )}

      {bill.items.length > 0 ? (
        <div className="flex flex-col gap-2">
          <Button variant="primary" className="min-h-12" onClick={() => commit('append')}>
            Add to current items →
          </Button>
          <Button onClick={() => commit('replace')}>Replace current items</Button>
        </div>
      ) : (
        <Button variant="primary" className="min-h-12" onClick={() => commit('replace')}>
          Looks good →
        </Button>
      )}
      <Button variant="ghost" onClick={onDone}>
        Discard scan
      </Button>

      <Sheet open={zoom} onClose={() => setZoom(false)} title="Receipt">
        <img src={thumbnail} alt="Receipt photo" className="w-full rounded-lg" />
      </Sheet>
    </div>
  )
}
