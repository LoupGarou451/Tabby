import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createBill, makeItem, makePerson, newId } from '../lib/bill'
import { allocate, minorDigits } from '../lib/money'
import { parseBill } from '../lib/schema'
import type { Adjustments, Bill, Item, Person } from '../lib/types'
import { usePrefs } from './prefsStore'

const HISTORY_MAX = 20

interface Undo {
  message: string
  bill: Bill
  history: Bill[]
}

interface BillState {
  bill: Bill
  history: Bill[]
  undo: Undo | null
}

interface BillActions {
  /** Archives the current bill (if it has items) and starts a fresh one. */
  newBill: (undoMessage?: string) => void
  setSplitMode: (mode: Bill['splitMode']) => void
  setRoundUp: (on: boolean) => void
  setTitle: (title: string) => void
  setCurrency: (currency: string) => void
  addItem: (name: string, price: number, quantity?: number) => void
  updateItem: (id: string, patch: Partial<Omit<Item, 'id'>>) => void
  removeItem: (id: string) => void
  expandItem: (id: string) => void
  addItems: (items: Item[], mode: 'append' | 'replace') => void
  addPerson: (name: string) => void
  updatePerson: (id: string, patch: Partial<Omit<Person, 'id'>>) => void
  removePerson: (id: string) => void
  toggleShare: (itemId: string, personId: string) => void
  setShareWeight: (itemId: string, personId: string, weight: number) => void
  assignToEveryone: (itemId: string) => void
  splitRemainingEvenly: () => void
  setAdjustments: (patch: Partial<Adjustments>) => void
  setPrintedTotal: (value: number | undefined) => void
  setPayer: (personId: string | undefined) => void
  toggleTreat: (personId: string) => void
  togglePaid: (personId: string) => void
  openFromHistory: (id: string) => void
  deleteFromHistory: (id: string) => void
  importSharedBill: (bill: Bill) => void
  applyUndo: () => void
  clearUndo: () => void
  clearAll: () => void
}

const freshBill = () => {
  const { currency, defaultTipBps } = usePrefs.getState()
  return createBill({ currency, tipBps: defaultTipBps })
}

const isWorthKeeping = (b: Bill) => b.items.length > 0

const archive = (bill: Bill, history: Bill[]) =>
  isWorthKeeping(bill)
    ? [bill, ...history.filter((h) => h.id !== bill.id)].slice(0, HISTORY_MAX)
    : history

/** "Sam" → "Sam (2)" when a Sam is already on the bill, so chips stay distinguishable. */
function uniqueName(name: string, people: Person[]): string {
  const taken = new Set(people.map((p) => p.name.toLowerCase()))
  if (!taken.has(name.toLowerCase())) return name
  let n = 2
  while (taken.has(`${name} (${n})`.toLowerCase())) n++
  return `${name} (${n})`
}

/** Item is assigned when at least one current person has weight > 0. */
export const isAssigned = (item: Item, people: Person[]) =>
  people.some((p) => (item.shares[p.id] ?? 0) > 0)

export const useBill = create<BillState & BillActions>()(
  persist(
    (set, get) => {
      // Applies a change to a copy of the bill. With `undoMessage`, the previous state
      // can be restored from the snackbar.
      const change = (fn: (b: Bill) => void, undoMessage?: string) => {
        const { bill, history } = get()
        const next = structuredClone(bill)
        fn(next)
        next.updatedAt = new Date().toISOString()
        set({
          bill: next,
          undo: undoMessage ? { message: undoMessage, bill, history } : get().undo,
        })
      }

      return {
        bill: freshBill(),
        history: [],
        undo: null,

        newBill: (undoMessage = 'Started a new bill') => {
          const { bill, history } = get()
          set({
            bill: freshBill(),
            history: archive(bill, history),
            undo: isWorthKeeping(bill) ? { message: undoMessage, bill, history } : null,
          })
        },
        setSplitMode: (mode) => change((b) => void (b.splitMode = mode)),

        setRoundUp: (on) => change((b) => void (b.roundUp = on)),

        setTitle: (title) => change((b) => void (b.title = title)),
        setCurrency: (currency) => {
          const { bill } = get()
          const shift = minorDigits(currency) - minorDigits(bill.currency)
          let rounded = false
          // Keep the displayed numbers (12.50 stays 12.50); rescale to the new minor unit.
          const rescale = (m: number, min = 0) => {
            const exact = m * 10 ** shift
            const next = Math.max(min, Math.round(exact))
            if (next !== exact) rounded = true
            return next
          }
          change((b) => {
            b.currency = currency
            if (shift === 0) return
            b.items.forEach((i) => (i.price = rescale(i.price, 1)))
            const a = b.adjustments
            if (a.tax.mode === 'amount') a.tax.value = rescale(a.tax.value)
            if (a.tip.mode === 'amount') a.tip.value = rescale(a.tip.value)
            a.serviceCharge = rescale(a.serviceCharge)
            a.discount = rescale(a.discount)
            if (b.printedTotal !== undefined) b.printedTotal = rescale(b.printedTotal)
          })
          if (rounded) {
            const unit =
              new Intl.DisplayNames(undefined, { type: 'currency' }).of(currency) ?? currency
            set({ undo: { message: `Amounts rounded for ${unit}`, bill, history: get().history } })
          }
          usePrefs.getState().set({ currency })
        },

        addItem: (name, price, quantity = 1) =>
          change((b) => {
            const label = name.trim() || `Item ${b.items.length + 1}`
            b.items.push(makeItem(label, price, quantity))
          }),
        updateItem: (id, patch) =>
          change((b) => {
            const item = b.items.find((i) => i.id === id)
            if (item) Object.assign(item, patch)
          }),
        removeItem: (id) => {
          const name = get().bill.items.find((i) => i.id === id)?.name ?? 'item'
          change((b) => void (b.items = b.items.filter((i) => i.id !== id)), `Removed ${name}`)
        },
        expandItem: (id) =>
          change((b) => {
            const at = b.items.findIndex((i) => i.id === id)
            const item = b.items[at]
            if (!item || item.quantity < 2) return
            const prices = allocate(
              item.price,
              Array.from({ length: item.quantity }, () => 1),
            )
            const units = prices.map((price) => ({
              ...item,
              id: newId(),
              price,
              quantity: 1,
              shares: { ...item.shares },
            }))
            b.items.splice(at, 1, ...units)
          }),
        addItems: (items, mode) =>
          change(
            (b) => {
              b.items = mode === 'replace' ? items : [...b.items, ...items]
            },
            mode === 'replace' ? 'Replaced items' : undefined,
          ),

        addPerson: (name) =>
          change((b) => {
            const used = new Set(b.people.map((p) => p.colorIndex))
            const color = [...Array(10).keys()].find((c) => !used.has(c)) ?? b.people.length % 10
            b.people.push(makePerson(uniqueName(name.trim(), b.people), color))
          }),
        updatePerson: (id, patch) =>
          change((b) => {
            const p = b.people.find((x) => x.id === id)
            if (p) Object.assign(p, patch)
          }),
        removePerson: (id) => {
          const name = get().bill.people.find((p) => p.id === id)?.name ?? 'person'
          change((b) => {
            b.people = b.people.filter((p) => p.id !== id)
            for (const item of b.items) delete item.shares[id]
            b.treatedIds = b.treatedIds.filter((t) => t !== id)
            delete b.paid[id]
            if (b.payerId === id) b.payerId = undefined
          }, `Removed ${name}`)
        },

        toggleShare: (itemId, personId) =>
          change((b) => {
            const item = b.items.find((i) => i.id === itemId)
            if (!item) return
            if (item.shares[personId]) delete item.shares[personId]
            else item.shares[personId] = 1
          }),
        setShareWeight: (itemId, personId, weight) =>
          change((b) => {
            const item = b.items.find((i) => i.id === itemId)
            if (!item) return
            if (weight > 0) item.shares[personId] = Math.min(10, Math.round(weight))
            else delete item.shares[personId]
          }),
        assignToEveryone: (itemId) =>
          change((b) => {
            const item = b.items.find((i) => i.id === itemId)
            if (item) item.shares = Object.fromEntries(b.people.map((p) => [p.id, 1]))
          }),
        splitRemainingEvenly: () =>
          change((b) => {
            for (const item of b.items) {
              if (!isAssigned(item, b.people))
                item.shares = Object.fromEntries(b.people.map((p) => [p.id, 1]))
            }
          }, 'Split remaining items evenly'),

        setAdjustments: (patch) => change((b) => void Object.assign(b.adjustments, patch)),
        setPrintedTotal: (value) => change((b) => void (b.printedTotal = value)),
        setPayer: (personId) =>
          change((b) => {
            b.payerId = personId
            if (personId) b.paid[personId] = true
          }),
        toggleTreat: (personId) =>
          change((b) => {
            b.treatedIds = b.treatedIds.includes(personId)
              ? b.treatedIds.filter((t) => t !== personId)
              : [...b.treatedIds, personId]
          }),
        togglePaid: (personId) => change((b) => void (b.paid[personId] = !b.paid[personId])),

        openFromHistory: (id) => {
          const { bill, history } = get()
          const target = history.find((h) => h.id === id)
          if (!target) return
          set({
            bill: target,
            history: archive(
              bill,
              history.filter((h) => h.id !== id),
            ),
            undo: null,
          })
        },
        deleteFromHistory: (id) => {
          const { bill, history } = get()
          set({
            history: history.filter((h) => h.id !== id),
            undo: { message: 'Deleted bill', bill, history },
          })
        },
        importSharedBill: (shared) => {
          const { bill, history } = get()
          set({ bill: { ...shared, id: newId() }, history: archive(bill, history), undo: null })
        },

        applyUndo: () => {
          const u = get().undo
          if (!u) return
          set({ bill: u.bill, history: u.history, undo: null })
          usePrefs.getState().set({ currency: u.bill.currency })
        },
        clearUndo: () => set({ undo: null }),
        clearAll: () => set({ bill: freshBill(), history: [], undo: null }),
      }
    },
    {
      name: 'tabby:bill',
      version: 1,
      partialize: (s) => ({ bill: s.bill, history: s.history }),
      // Validate what comes out of localStorage; start fresh instead of crashing.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<BillState>
        const bill = parseBill(p.bill) ?? current.bill
        const history = Array.isArray(p.history)
          ? p.history.map(parseBill).filter((b): b is Bill => b !== null)
          : []
        return { ...current, bill, history }
      },
    },
  ),
)
