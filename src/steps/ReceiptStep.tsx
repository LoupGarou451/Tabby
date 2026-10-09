import { useRef, useState } from 'react'
import { Button, Card, MoneyInput } from '../components/ui'
import { cx } from '../lib/cx'
import { formatMoney, formatPlain, type Money } from '../lib/money'
import type { Item } from '../lib/types'
import { useBill } from '../store/billStore'
import { usePrefs } from '../store/prefsStore'
import { useUi } from '../store/uiStore'
import { renderSampleReceipt } from '../sample/renderReceipt'
import { CaptureButtons } from '../scan/CaptureButtons'
import { useDropToScan, usePasteToScan } from '../scan/scanHooks'

export function ReceiptStep() {
  const items = useBill((s) => s.bill.items)
  const editing = useUi((s) => s.editingItems)
  usePasteToScan(true)
  return items.length || editing ? <ItemsEditor /> : <ChooseInput />
}

function ChooseInput() {
  const lastMethod = usePrefs((s) => s.lastInputMethod)
  const setPrefs = usePrefs((s) => s.set)
  const setEditing = useUi((s) => s.setEditingItems)
  const loadSample = useBill((s) => s.loadSample)
  const startScan = useUi((s) => s.startScan)
  const currency = useBill((s) => s.bill.currency)
  const setCurrency = useBill((s) => s.setCurrency)
  const drop = useDropToScan()

  const manual = (
    <button
      key="manual"
      type="button"
      onClick={() => {
        setPrefs({ lastInputMethod: 'manual' })
        setEditing(true)
      }}
      className="flex min-h-40 flex-col items-start gap-2 rounded-2xl border border-line bg-surface p-4 text-left shadow-sm transition hover:border-brand"
    >
      <span className="text-3xl" aria-hidden="true">
        ✏️
      </span>
      <span className="font-bold">Enter manually</span>
      <span className="text-sm text-muted">Type items and prices</span>
    </button>
  )
  const scan = (
    <div
      key="scan"
      {...drop.props}
      className={cx(
        'flex min-h-40 flex-col items-start gap-2 rounded-2xl border bg-surface p-4 shadow-sm transition',
        drop.over ? 'border-brand ring-2 ring-brand/30' : 'border-line',
      )}
    >
      <span className="text-3xl" aria-hidden="true">
        📷
      </span>
      <span className="font-bold">Scan a receipt</span>
      <span className="text-sm text-muted">Photo → items in seconds</span>
      <div className="mt-auto w-full">
        <CaptureButtons />
      </div>
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold">What's on the receipt?</h2>
        <p className="text-muted">Pick how you'd like to add items.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {lastMethod === 'scan' ? [scan, manual] : [manual, scan]}
      </div>
      <button
        type="button"
        onClick={loadSample}
        className="mx-auto min-h-11 px-3 font-medium text-brand-strong underline-offset-4 hover:underline"
      >
        Try a sample receipt →
      </button>
      <button
        type="button"
        onClick={() => {
          if (currency !== 'USD') setCurrency('USD') // the sample receipt is in dollars
          startScan({ source: renderSampleReceipt(), purpose: 'items' })
        }}
        className="mx-auto -mt-3 min-h-11 px-3 text-sm text-muted underline-offset-4 hover:underline"
      >
        or try scanning a sample photo
      </button>
      <p className="hidden text-center text-xs text-muted sm:block">
        Tip: drop a photo on the scan card, or paste one with ⌘/Ctrl+V.
      </p>
    </div>
  )
}

function ItemsEditor() {
  const items = useBill((s) => s.bill.items)
  const currency = useBill((s) => s.bill.currency)
  const subtotal = items.reduce((s, i) => s + i.price, 0)
  const newNameRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold">Items</h2>
          <p className="text-muted">
            {items.length} {items.length === 1 ? 'item' : 'items'} ·{' '}
            {formatMoney(subtotal, currency)}
          </p>
        </div>
      </div>

      <Card className="flex flex-col gap-2 p-3">
        <div className="grid grid-cols-[1fr_3.5rem_6.5rem_2.75rem] gap-2 px-1 text-xs font-medium text-muted">
          <span>Item</span>
          <span className="text-center">Qty</span>
          <span className="text-right">Price</span>
          <span />
        </div>
        {items.map((item) => (
          <ItemRow key={item.id} item={item} currency={currency} />
        ))}
        <NewItemRow currency={currency} nameRef={newNameRef} autoFocus={items.length === 0} />
      </Card>

      <div className="flex flex-col gap-2">
        <Button onClick={() => newNameRef.current?.focus()}>+ Add item</Button>
        <CaptureButtons compact />
      </div>

      <ReceiptTotals />
    </div>
  )
}

function ItemRow({ item, currency }: { item: Item; currency: string }) {
  const updateItem = useBill((s) => s.updateItem)
  const removeItem = useBill((s) => s.removeItem)
  const [name, setName] = useState(item.name)
  const flagged = item.confidence !== undefined && item.confidence < 70

  return (
    <div
      className={cx(
        'grid grid-cols-[1fr_3.5rem_6.5rem_2.75rem] items-center gap-2 rounded-xl',
        flagged && 'bg-warn/15 p-1',
      )}
    >
      <input
        aria-label="Item name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          const v = name.trim() || item.name
          setName(v)
          if (v !== item.name) updateItem(item.id, { name: v })
        }}
        className="min-h-11 min-w-0 rounded-xl border border-line bg-surface px-3 outline-none focus:border-brand"
      />
      <QtyInput value={item.quantity} onChange={(q) => updateItem(item.id, { quantity: q })} />
      <MoneyInput
        aria-label={`Price of ${item.name}`}
        value={item.price}
        currency={currency}
        onCommit={(v) => v && v > 0 && updateItem(item.id, { price: v })}
        className="w-full"
      />
      <Button
        variant="ghost"
        aria-label={`Remove ${item.name}`}
        onClick={() => removeItem(item.id)}
        className="px-0 text-muted"
      >
        ✕
      </Button>
    </div>
  )
}

function QtyInput({ value, onChange }: { value: number; onChange: (q: number) => void }) {
  const [text, setText] = useState(String(value))
  return (
    <input
      aria-label="Quantity"
      inputMode="numeric"
      value={text}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setText(e.target.value.replace(/\D/g, ''))}
      onBlur={() => {
        const q = Math.min(99, Math.max(1, Number(text) || 1))
        setText(String(q))
        if (q !== value) onChange(q)
      }}
      className="min-h-11 w-full rounded-xl border border-line bg-surface px-2 text-center outline-none focus:border-brand"
    />
  )
}

/** Blank row for fast entry: Enter in the price field adds the item and starts a new row. */
function NewItemRow({
  currency,
  nameRef,
  autoFocus,
}: {
  currency: string
  nameRef: React.RefObject<HTMLInputElement | null>
  autoFocus: boolean
}) {
  const addItem = useBill((s) => s.addItem)
  const [name, setName] = useState('')
  const [qty, setQty] = useState('1')
  const [price, setPrice] = useState<Money | null>(null)
  const priceRef = useRef<HTMLInputElement>(null)
  const latestPrice = useRef<Money | null>(null)

  const add = () => {
    const p = latestPrice.current
    if (!p || p <= 0) return
    addItem(name, p, Math.min(99, Math.max(1, Number(qty) || 1)))
    // Move focus first: blurring the price field re-commits its value, so reset after.
    nameRef.current?.focus()
    setName('')
    setQty('1')
    setPrice(null)
    latestPrice.current = null
  }

  return (
    <div className="grid grid-cols-[1fr_3.5rem_6.5rem_2.75rem] items-center gap-2">
      <input
        ref={nameRef}
        aria-label="New item name"
        placeholder="Add an item…"
        autoFocus={autoFocus}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && priceRef.current?.focus()}
        className="min-h-11 min-w-0 rounded-xl border border-dashed border-line bg-transparent px-3 outline-none focus:border-brand"
      />
      <input
        aria-label="New item quantity"
        inputMode="numeric"
        value={qty}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setQty(e.target.value.replace(/\D/g, ''))}
        className="min-h-11 w-full rounded-xl border border-dashed border-line bg-transparent px-2 text-center outline-none focus:border-brand"
      />
      <MoneyInput
        ref={priceRef}
        aria-label="New item price"
        placeholder={formatPlain(0, currency)}
        value={price}
        allowEmpty
        currency={currency}
        onCommit={(v) => {
          latestPrice.current = v
          setPrice(v)
        }}
        onEnter={add}
        className="w-full border-dashed bg-transparent"
      />
      <Button
        variant="primary"
        aria-label="Add item"
        onClick={add}
        disabled={!price}
        className="px-0"
      >
        +
      </Button>
    </div>
  )
}

function ReceiptTotals() {
  const bill = useBill((s) => s.bill)
  const setAdjustments = useBill((s) => s.setAdjustments)
  const setPrintedTotal = useBill((s) => s.setPrintedTotal)
  const { adjustments: adj, currency } = bill
  const hasAny =
    (adj.tax.mode === 'amount' && adj.tax.value > 0) ||
    adj.serviceCharge > 0 ||
    adj.discount > 0 ||
    bill.printedTotal !== undefined
  const [open, setOpen] = useState(hasAny)

  const row = (label: string, value: Money | null, onCommit: (v: Money | null) => void) => (
    <label className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <MoneyInput
        value={value}
        currency={currency}
        allowEmpty
        placeholder="—"
        onCommit={onCommit}
        className="w-32"
      />
    </label>
  )

  return (
    <Card className="p-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex min-h-12 w-full items-center justify-between px-4 font-medium"
      >
        Receipt totals <span className="text-sm text-muted">{open ? 'Hide' : 'Optional ▾'}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-2 px-4 pb-4">
          {row('Tax', adj.tax.mode === 'amount' ? adj.tax.value || null : null, (v) =>
            setAdjustments({ tax: { mode: 'amount', value: v ?? 0 } }),
          )}
          {row('Service charge / auto-gratuity', adj.serviceCharge || null, (v) =>
            setAdjustments({ serviceCharge: v ?? 0 }),
          )}
          {row('Discount', adj.discount || null, (v) => setAdjustments({ discount: v ?? 0 }))}
          {row('Printed total', bill.printedTotal ?? null, (v) => setPrintedTotal(v ?? undefined))}
          <p className="text-xs text-muted">
            The printed total is only used to check that everything adds up.
          </p>
        </div>
      )}
    </Card>
  )
}
