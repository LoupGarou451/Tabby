import { Button, Card, EmptyState, PersonChip } from '../components/ui'
import { cx } from '../lib/cx'
import { formatMoney } from '../lib/money'
import type { Item, Person } from '../lib/types'
import { isAssigned, useBill } from '../store/billStore'
import { useUi } from '../store/uiStore'

export function AssignStep() {
  const items = useBill((s) => s.bill.items)
  const people = useBill((s) => s.bill.people)
  const setStep = useUi((s) => s.setStep)

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

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold">Who had what?</h2>
        <p className="text-muted">Tap people to assign. Tap more than one to share an item.</p>
      </div>
      {items.map((item) => (
        <ItemCard key={item.id} item={item} people={people} />
      ))}
    </div>
  )
}

function ItemCard({ item, people }: { item: Item; people: Person[] }) {
  const currency = useBill((s) => s.bill.currency)
  const toggleShare = useBill((s) => s.toggleShare)
  const assignToEveryone = useBill((s) => s.assignToEveryone)
  const assigned = isAssigned(item, people)
  const everyone = people.every((p) => (item.shares[p.id] ?? 0) > 0)

  return (
    <Card className={cx('flex flex-col gap-3', !assigned && 'border-warn/60')}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold">
          {item.quantity > 1 && <span className="text-muted">{item.quantity} × </span>}
          {item.name}
        </span>
        <span className="font-semibold tabular-nums">{formatMoney(item.price, currency)}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {people.map((p) => (
          <PersonChip
            key={p.id}
            name={p.name}
            colorIndex={p.colorIndex}
            selected={(item.shares[p.id] ?? 0) > 0}
            onClick={() => toggleShare(item.id, p.id)}
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
    </Card>
  )
}
