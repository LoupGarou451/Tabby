import { useState } from 'react'
import { Avatar, Button, Card } from '../components/ui'
import { cx } from '../lib/cx'
import type { Person } from '../lib/types'
import { useBill } from '../store/billStore'
import { usePrefs } from '../store/prefsStore'

export function PeopleStep() {
  const people = useBill((s) => s.bill.people)
  const addPerson = useBill((s) => s.addPerson)
  const addSamplePeople = useBill((s) => s.addSamplePeople)
  const usesSample = useBill((s) => s.bill.items.some((i) => i.source === 'sample'))
  const recentNames = usePrefs((s) => s.recentNames)
  const rememberNames = usePrefs((s) => s.rememberNames)
  const [name, setName] = useState('')

  const have = new Set(people.map((p) => p.name.toLowerCase()))
  const suggestions = recentNames.filter((n) => !have.has(n.toLowerCase())).slice(0, 8)
  const guestNumber = people.filter((p) => p.name.startsWith('Guest')).length + 1

  const add = (n = name) => {
    if (!n.trim()) return
    addPerson(n)
    rememberNames([n])
    setName('')
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-bold">Who's eating?</h2>
        <p className="text-muted">Add everyone on the bill.</p>
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <input
          aria-label="Name"
          placeholder="Name"
          autoFocus={people.length === 0}
          autoCapitalize="words"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="min-h-12 min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 text-lg outline-none focus:border-brand"
        />
        <Button type="submit" variant="primary" disabled={!name.trim()} className="min-h-12">
          Add
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        <QuickChip onClick={() => addPerson(`Guest ${guestNumber}`)}>+ Guest</QuickChip>
        {usesSample && people.length === 0 && (
          <QuickChip onClick={addSamplePeople}>+ Add sample people</QuickChip>
        )}
        {suggestions.map((n) => (
          <QuickChip key={n} onClick={() => add(n)}>
            + {n}
          </QuickChip>
        ))}
      </div>

      {people.length > 0 && (
        <Card className="flex flex-col divide-y divide-line p-0">
          {people.map((p) => (
            <PersonRow key={p.id} person={p} />
          ))}
        </Card>
      )}
      {people.length > 0 && (
        <p className="text-center text-sm text-muted">
          Tap 💳 to mark who paid the bill — it's used for payment requests.
        </p>
      )}
    </div>
  )
}

function QuickChip({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-10 rounded-full border border-dashed border-line px-3 text-sm font-medium text-muted hover:border-brand hover:text-ink"
    >
      {children}
    </button>
  )
}

function PersonRow({ person }: { person: Person }) {
  const updatePerson = useBill((s) => s.updatePerson)
  const removePerson = useBill((s) => s.removePerson)
  const setPayer = useBill((s) => s.setPayer)
  const isPayer = useBill((s) => s.bill.payerId === person.id)
  const [name, setName] = useState(person.name)

  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <Avatar name={person.name} colorIndex={person.colorIndex} size={36} />
      <input
        aria-label={`Name for ${person.name}`}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          const v = name.trim() || person.name
          setName(v)
          if (v !== person.name) updatePerson(person.id, { name: v })
        }}
        className="min-h-11 min-w-0 flex-1 rounded-lg bg-transparent px-2 font-medium outline-none focus:bg-surface-2"
      />
      <button
        type="button"
        aria-pressed={isPayer}
        aria-label={isPayer ? `${person.name} paid the bill` : `Mark ${person.name} as the payer`}
        title="Paid the bill"
        onClick={() => setPayer(isPayer ? undefined : person.id)}
        className={cx(
          'flex min-h-11 items-center gap-1 rounded-full px-3 text-sm transition',
          isPayer
            ? 'bg-brand font-semibold text-on-brand'
            : 'text-muted opacity-60 hover:opacity-100',
        )}
      >
        💳{isPayer && <span>Paid</span>}
      </button>
      <Button
        variant="ghost"
        aria-label={`Remove ${person.name}`}
        onClick={() => removePerson(person.id)}
        className="px-3 text-muted"
      >
        ✕
      </Button>
    </div>
  )
}
