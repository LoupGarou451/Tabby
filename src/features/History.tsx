import { Button, EmptyState, Sheet } from '../components/ui'
import { formatMoney } from '../lib/money'
import { computeSplit } from '../lib/split'
import { useBill } from '../store/billStore'
import { useUi } from '../store/uiStore'

export function HistorySheet() {
  const open = useUi((s) => s.sheet === 'history')
  const openSheet = useUi((s) => s.openSheet)
  const setStep = useUi((s) => s.setStep)
  const history = useBill((s) => s.history)
  const openFromHistory = useBill((s) => s.openFromHistory)
  const deleteFromHistory = useBill((s) => s.deleteFromHistory)

  return (
    <Sheet open={open} onClose={() => openSheet(null)} title="Bill history">
      {history.length === 0 ? (
        <EmptyState icon="🗂️" title="No past bills yet">
          <p className="text-sm text-muted">Bills move here when you start a new one.</p>
        </EmptyState>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {history.map((b) => {
            const total = computeSplit(b, 'even').billTotal
            const people = b.people.length
            const date = new Date(b.updatedAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })
            return (
              <li key={b.id} className="flex items-center gap-2 py-1">
                <button
                  type="button"
                  onClick={() => {
                    openFromHistory(b.id)
                    setStep('summary')
                    openSheet(null)
                  }}
                  className="flex min-h-14 min-w-0 flex-1 flex-col items-start justify-center rounded-xl px-2 text-left hover:bg-surface-2"
                >
                  <span className="truncate font-medium">{b.title}</span>
                  <span className="text-sm text-muted">
                    {formatMoney(total, b.currency)} · {people} {people === 1 ? 'person' : 'people'}{' '}
                    · {date}
                  </span>
                </button>
                <Button
                  variant="ghost"
                  aria-label={`Delete ${b.title}`}
                  onClick={() => deleteFromHistory(b.id)}
                  className="px-3 text-muted"
                >
                  ✕
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </Sheet>
  )
}
