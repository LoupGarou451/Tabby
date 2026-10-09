import { useState } from 'react'
import { Avatar, Button, Card, PersonChip } from '../components/ui'
import { cx } from '../lib/cx'
import { formatMoney } from '../lib/money'
import { isAssigned, useBill } from '../store/billStore'

/**
 * "Hand the phone to Alex" → Alex taps what they had → next person → wrap-up for anything
 * nobody claimed. Writes to the same shares as normal assignment (design section 10.3).
 */
export function PassThePhone({ onExit, onDone }: { onExit: () => void; onDone: () => void }) {
  const bill = useBill((s) => s.bill)
  const toggleShare = useBill((s) => s.toggleShare)
  const splitRemainingEvenly = useBill((s) => s.splitRemainingEvenly)
  const [turn, setTurn] = useState(0)
  const [ready, setReady] = useState(false)
  const people = bill.people
  const fmt = (m: number) => formatMoney(m, bill.currency)
  const finished = turn >= people.length
  const person = people[turn]

  const next = () => {
    setReady(false)
    setTurn((t) => t + 1)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Pass the phone"
      className="fixed inset-0 z-30 overflow-y-auto bg-bg"
    >
      <div className="mx-auto flex min-h-full w-full max-w-[480px] flex-col gap-4 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">
            {finished ? 'Wrap-up' : `${turn + 1} of ${people.length}`}
          </span>
          <Button variant="ghost" onClick={onExit}>
            Exit
          </Button>
        </div>

        {!finished && !ready && (
          <div className="m-auto flex flex-col items-center gap-5 py-10 text-center">
            <Avatar name={person.name} colorIndex={person.colorIndex} size={88} />
            <p className="text-lg text-muted">Hand the phone to</p>
            <p className="text-4xl font-extrabold">{person.name}</p>
            <Button
              variant="primary"
              className="min-h-14 px-8 text-lg"
              onClick={() => setReady(true)}
            >
              I'm {person.name}
            </Button>
            <button type="button" onClick={next} className="text-sm text-muted underline">
              Skip {person.name}
            </button>
          </div>
        )}

        {!finished && ready && (
          <>
            <h2 className="text-2xl font-bold">{person.name}, tap what you had</h2>
            <Card className="flex flex-col divide-y divide-line p-0">
              {bill.items.map((item) => {
                const mine = (item.shares[person.id] ?? 0) > 0
                const others = people.filter(
                  (p) => p.id !== person.id && (item.shares[p.id] ?? 0) > 0,
                )
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
                      'flex min-h-16 items-center gap-3 px-4 text-left text-lg',
                      mine && 'bg-brand/10',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cx(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 font-bold',
                        mine ? 'border-brand bg-brand text-on-brand' : 'border-line',
                      )}
                    >
                      {mine && '✓'}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{item.name}</span>
                      {others.length > 0 && (
                        <span className="flex items-center gap-1 text-xs text-muted">
                          {others.map((o) => (
                            <Avatar key={o.id} name={o.name} colorIndex={o.colorIndex} size={18} />
                          ))}
                          {mine ? 'sharing' : '+ split'}
                        </span>
                      )}
                    </span>
                    <span className="text-base tabular-nums">{fmt(item.price)}</span>
                  </button>
                )
              })}
            </Card>
            <Button variant="primary" className="sticky bottom-4 min-h-14 text-lg" onClick={next}>
              {turn + 1 < people.length ? `Done → hand to ${people[turn + 1].name}` : 'Done'}
            </Button>
          </>
        )}

        {finished && <WrapUp onDone={onDone} splitRemainingEvenly={splitRemainingEvenly} />}
      </div>
    </div>
  )
}

function WrapUp({
  onDone,
  splitRemainingEvenly,
}: {
  onDone: () => void
  splitRemainingEvenly: () => void
}) {
  const bill = useBill((s) => s.bill)
  const toggleShare = useBill((s) => s.toggleShare)
  // Freeze the list on arrival so an item doesn't vanish after the first tap (it may be shared).
  const [ids] = useState(() =>
    bill.items.filter((i) => !isAssigned(i, bill.people)).map((i) => i.id),
  )
  const unclaimed = bill.items.filter((i) => ids.includes(i.id))
  const fmt = (m: number) => formatMoney(m, bill.currency)

  if (!unclaimed.length)
    return (
      <div className="m-auto flex flex-col items-center gap-4 py-10 text-center">
        <div className="text-5xl" aria-hidden="true">
          🎉
        </div>
        <p className="text-2xl font-bold">Everything's claimed</p>
        <Button variant="primary" className="min-h-12 px-8" onClick={onDone}>
          See who owes what →
        </Button>
      </div>
    )

  return (
    <>
      <h2 className="text-2xl font-bold">Who had these?</h2>
      {unclaimed.map((item) => (
        <Card key={item.id} className="flex flex-col gap-3">
          <div className="flex justify-between font-semibold">
            <span>{item.name}</span>
            <span className="tabular-nums">{fmt(item.price)}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {bill.people.map((p) => (
              <PersonChip
                key={p.id}
                name={p.name}
                colorIndex={p.colorIndex}
                selected={(item.shares[p.id] ?? 0) > 0}
                onClick={() => toggleShare(item.id, p.id)}
              />
            ))}
          </div>
        </Card>
      ))}
      {unclaimed.some((i) => !isAssigned(i, bill.people)) && (
        <Button onClick={splitRemainingEvenly}>➗ Split the rest evenly among everyone</Button>
      )}
      <Button variant="primary" className="min-h-12" onClick={onDone}>
        See who owes what →
      </Button>
    </>
  )
}
