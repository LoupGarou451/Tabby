import { useState } from 'react'
import { Avatar, Button, Card, EmptyState, PersonChip, Segmented, Sheet } from '../components/ui'
import { cx } from '../lib/cx'
import { allocate, formatMoney } from '../lib/money'
import type { Item, Person } from '../lib/types'
import { isAssigned, useBill } from '../store/billStore'
import { useUi } from '../store/uiStore'

export function AssignStep() {
  const items = useBill((s) => s.bill.items)
  const people = useBill((s) => s.bill.people)
  const splitRemainingEvenly = useBill((s) => s.splitRemainingEvenly)
  const setStep = useUi((s) => s.setStep)
  const [view, setView] = useState<'item' | 'person'>('item')
  const [sharesFor, setSharesFor] = useState<string | null>(null)

  if (!items.length)
    return (
      <EmptyState icon="🧾" title="No items yet">
        <Button variant="primary" onClick={() => setStep('receipt')}>
          Add items
        </Button>
      </EmptyState>
    )
  if (!people.length)
    return (
      <EmptyState icon="👥" title="Add people before assigning items">
        <Button variant="primary" onClick={() => setStep('people')}>
          Add people
        </Button>
      </EmptyState>
    )

  const anyUnassigned = items.some((i) => !isAssigned(i, people))

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold">Who had what?</h2>
        <p className="text-muted">Tap people to assign. Tap more than one to share an item.</p>
      </div>

      <RemainingMeter />

      <div className="flex flex-col gap-2">
        <Segmented
          label="Assign by"
          value={view}
          onChange={setView}
          options={[
            { value: 'item', label: 'By item' },
            { value: 'person', label: 'By person' },
          ]}
        />
        {anyUnassigned && people.length > 1 && (
          <Button onClick={splitRemainingEvenly}>➗ Split remaining items evenly</Button>
        )}
      </div>

      {view === 'item' ? (
        items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            people={people}
            onCustomize={() => setSharesFor(item.id)}
          />
        ))
      ) : (
        <ByPerson items={items} people={people} />
      )}

      <SharesSheet itemId={sharesFor} onClose={() => setSharesFor(null)} />
    </div>
  )
}

function RemainingMeter() {
  const bill = useBill((s) => s.bill)
  const total = bill.items.reduce((s, i) => s + i.price, 0)
  const assigned = bill.items
    .filter((i) => isAssigned(i, bill.people))
    .reduce((s, i) => s + i.price, 0)
  const done = total > 0 && assigned === total
  const pct = total ? Math.round((assigned / total) * 100) : 0
  const fmt = (m: number) => formatMoney(m, bill.currency)
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between text-sm">
        <span className={cx('font-medium', done && 'text-good')}>
          {done ? '✓ Everything assigned' : `${fmt(assigned)} of ${fmt(total)} assigned`}
        </span>
        <span className="text-muted tabular-nums">{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-label="Amount assigned"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-2.5 overflow-hidden rounded-full bg-surface-2"
      >
        <div
          className={cx('h-full rounded-full transition-all', done ? 'bg-good' : 'bg-brand')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function ItemCard({
  item,
  people,
  onCustomize,
}: {
  item: Item
  people: Person[]
  onCustomize: () => void
}) {
  const currency = useBill((s) => s.bill.currency)
  const toggleShare = useBill((s) => s.toggleShare)
  const assignToEveryone = useBill((s) => s.assignToEveryone)
  const expandItem = useBill((s) => s.expandItem)
  const assigned = isAssigned(item, people)
  const everyone = people.every((p) => (item.shares[p.id] ?? 0) > 0)
  const weights = people.map((p) => item.shares[p.id] ?? 0)
  const uneven = new Set(weights.filter((w) => w > 0)).size > 1

  return (
    <Card className={cx('flex flex-col gap-3', !assigned && 'border-warn/60')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold">
            {item.quantity > 1 && <span className="text-muted">{item.quantity} × </span>}
            {item.name}
          </div>
          {uneven && <div className="text-xs text-muted">Custom shares</div>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="font-semibold tabular-nums">{formatMoney(item.price, currency)}</span>
          <Button
            variant="ghost"
            aria-label={`Custom shares for ${item.name}`}
            onClick={onCustomize}
            className="-mr-2 px-3 text-muted"
          >
            ⋯
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {people.map((p) => (
          <PersonChip
            key={p.id}
            name={p.name}
            colorIndex={p.colorIndex}
            selected={(item.shares[p.id] ?? 0) > 0}
            onClick={() => toggleShare(item.id, p.id)}
            suffix={
              uneven && item.shares[p.id] ? (
                <span className="text-xs opacity-80">×{item.shares[p.id]}</span>
              ) : undefined
            }
          />
        ))}
        {people.length > 1 && !everyone && (
          <button
            type="button"
            onClick={() => assignToEveryone(item.id)}
            className="min-h-11 rounded-full border border-dashed border-line px-3 text-sm font-medium text-muted hover:border-brand hover:text-ink"
          >
            Everyone
          </button>
        )}
      </div>
      {item.quantity > 1 && (
        <button
          type="button"
          onClick={() => expandItem(item.id)}
          className="self-start text-sm font-medium text-brand-strong underline-offset-2 hover:underline"
        >
          Split into {item.quantity} separate items
        </button>
      )}
    </Card>
  )
}

/** Pick one person, then tap everything they had. */
function ByPerson({ items, people }: { items: Item[]; people: Person[] }) {
  const currency = useBill((s) => s.bill.currency)
  const toggleShare = useBill((s) => s.toggleShare)
  const [personId, setPersonId] = useState(people[0].id)
  const person = people.find((p) => p.id === personId) ?? people[0]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {people.map((p) => (
          <PersonChip
            key={p.id}
            name={p.name}
            colorIndex={p.colorIndex}
            selected={p.id === person.id}
            onClick={() => setPersonId(p.id)}
          />
        ))}
      </div>
      <p className="text-sm text-muted">Tap everything {person.name} had.</p>
      <Card className="flex flex-col divide-y divide-line p-0">
        {items.map((item) => {
          const mine = (item.shares[person.id] ?? 0) > 0
          const others = people.filter((p) => p.id !== person.id && (item.shares[p.id] ?? 0) > 0)
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={mine}
              onClick={() => {
                navigator.vibrate?.(10)
                toggleShare(item.id, person.id)
              }}
              className={cx(
                'flex min-h-14 items-center gap-3 px-4 text-left transition',
                mine && 'bg-brand/10',
              )}
            >
              <span
                className={cx(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 text-sm font-bold',
                  mine ? 'border-brand bg-brand text-on-brand' : 'border-line',
                )}
                aria-hidden="true"
              >
                {mine && '✓'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{item.name}</span>
                {others.length > 0 && (
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                    {others.map((o) => (
                      <Avatar key={o.id} name={o.name} colorIndex={o.colorIndex} size={18} />
                    ))}
                    {mine ? 'sharing' : '+ split'}
                  </span>
                )}
              </span>
              <span className="tabular-nums">{formatMoney(item.price, currency)}</span>
            </button>
          )
        })}
      </Card>
    </div>
  )
}

/** Stepper per person (0–10 parts) with a live preview of each person's amount. */
function SharesSheet({ itemId, onClose }: { itemId: string | null; onClose: () => void }) {
  const bill = useBill((s) => s.bill)
  const setShareWeight = useBill((s) => s.setShareWeight)
  const item = bill.items.find((i) => i.id === itemId)
  const weights = bill.people.map((p) => item?.shares[p.id] ?? 0)
  const amounts = item ? allocate(item.price, weights) : []
  const fmt = (m: number) => formatMoney(m, bill.currency)

  return (
    <Sheet open={!!item} onClose={onClose} title={item ? `Shares · ${item.name}` : 'Shares'}>
      {item && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">
            Give people more parts if they had more. Example: 2 parts and 1 part splits ⅔ / ⅓.
          </p>
          {bill.people.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3 py-1">
              <Avatar name={p.name} colorIndex={p.colorIndex} size={32} />
              <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
              <span className="w-20 text-right text-sm text-muted tabular-nums">
                {weights[i] ? fmt(amounts[i]) : '—'}
              </span>
              <div className="flex items-center rounded-xl border border-line">
                <button
                  type="button"
                  aria-label={`Fewer parts for ${p.name}`}
                  disabled={weights[i] === 0}
                  onClick={() => setShareWeight(item.id, p.id, weights[i] - 1)}
                  className="h-11 w-11 text-lg disabled:opacity-30"
                >
                  −
                </button>
                <span className="w-6 text-center font-semibold tabular-nums" aria-live="polite">
                  {weights[i]}
                </span>
                <button
                  type="button"
                  aria-label={`More parts for ${p.name}`}
                  disabled={weights[i] >= 10}
                  onClick={() => setShareWeight(item.id, p.id, weights[i] + 1)}
                  className="h-11 w-11 text-lg disabled:opacity-30"
                >
                  +
                </button>
              </div>
            </div>
          ))}
          <Button variant="primary" onClick={onClose} className="mt-2">
            Done
          </Button>
        </div>
      )}
    </Sheet>
  )
}
