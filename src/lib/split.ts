import { allocate, percentOf, roundingUnit, type Money } from './money'
import type { Amount, Bill } from './types'

export type SplitMode = 'fair' | 'even'

export interface ItemShare {
  itemId: string
  share: Money
  fraction: [number, number] // e.g. [1, 2] = ½
}

export interface PersonSplit {
  personId: string
  label: string
  items: ItemShare[]
  subtotal: Money
  discount: Money
  tax: Money
  tip: Money // includes roundUpExtra
  service: Money
  treatAdjustment: Money // + for people covering a treat, − for the treated person
  roundUpExtra: Money
  total: Money
}

export interface SplitResult {
  mode: SplitMode
  billTotal: Money // after round up
  itemsSubtotal: Money
  discount: Money
  tax: Money
  tip: Money // after round up
  service: Money
  roundUpTotal: Money
  unassigned: { subtotal: Money; total: Money; itemIds: string[] }
  people: PersonSplit[]
  reconciles: boolean
}

interface BillAmounts {
  itemsSubtotal: Money
  discount: Money
  tax: Money
  tip: Money
  service: Money
  billTotal: Money
}

function resolve(amount: Amount, base: Money): Money {
  return amount.mode === 'amount' ? amount.value : percentOf(base, amount.bps)
}

/** Bill-level amounts (section 8.1 step 4), before round up. */
export function billAmounts(bill: Bill): BillAmounts {
  const { adjustments: adj } = bill
  const itemsSubtotal = bill.items.reduce((sum, i) => sum + i.price, 0)
  const discount = Math.min(adj.discount, itemsSubtotal)
  const tax = resolve(adj.tax, itemsSubtotal - discount)
  const tip = resolve(adj.tip, adj.tipBase === 'preTax' ? itemsSubtotal : itemsSubtotal + tax)
  const service = adj.serviceCharge
  return {
    itemsSubtotal,
    discount,
    tax,
    tip,
    service,
    billTotal: itemsSubtotal - discount + tax + tip + service,
  }
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

function emptyPerson(personId: string, label: string): PersonSplit {
  return {
    personId,
    label,
    items: [],
    subtotal: 0,
    discount: 0,
    tax: 0,
    tip: 0,
    service: 0,
    treatAdjustment: 0,
    roundUpExtra: 0,
    total: 0,
  }
}

/**
 * Computes what everyone owes. Pure and deterministic; every amount is an integer in
 * minor units and Σ people + unassigned === billTotal (see TABBY_DESIGN.md section 8).
 */
export function computeSplit(bill: Bill, mode: SplitMode = bill.splitMode): SplitResult {
  const amounts = billAmounts(bill)
  const people = bill.people.map((p) => emptyPerson(p.id, p.name))
  const index = new Map(people.map((p, i) => [p.personId, i]))
  const treated = new Set(bill.treatedIds.filter((id) => index.has(id)))
  const unassigned = { subtotal: 0, total: 0, itemIds: [] as string[] }

  const fair = mode === 'fair'

  if (fair) {
    // Item shares (step 2).
    for (const item of bill.items) {
      const entries = Object.entries(item.shares).filter(([id, w]) => index.has(id) && w > 0)
      const totalWeight = entries.reduce((s, [, w]) => s + w, 0)
      if (totalWeight === 0) {
        unassigned.subtotal += item.price
        unassigned.itemIds.push(item.id)
        continue
      }
      const shares = allocate(
        item.price,
        entries.map(([, w]) => w),
      )
      entries.forEach(([id, w], k) => {
        const p = people[index.get(id)!]
        const g = gcd(w, totalWeight)
        p.items.push({ itemId: item.id, share: shares[k], fraction: [w / g, totalWeight / g] })
        p.subtotal += shares[k]
      })
    }

    // Bill-level amounts in proportion to subtotals, unassigned bucket last (step 5).
    let weights = [...people.map((p) => p.subtotal), unassigned.subtotal]
    if (weights.every((w) => w === 0)) weights = people.length ? [...people.map(() => 1), 0] : [1]
    const spread = (total: Money) => {
      const out = allocate(total, weights)
      return { people: out.slice(0, people.length), rest: out[people.length] ?? 0 }
    }
    const disc = spread(amounts.discount)
    const tax = spread(amounts.tax)
    const tip = spread(amounts.tip)
    const svc = spread(amounts.service)
    people.forEach((p, i) => {
      p.discount = disc.people[i]
      p.tax = tax.people[i]
      p.tip = tip.people[i]
      p.service = svc.people[i]
      p.total = p.subtotal - p.discount + p.tax + p.tip + p.service
    })
    unassigned.total = unassigned.subtotal - disc.rest + tax.rest + tip.rest + svc.rest

    // Treat (step 6): treated people's totals move to everyone else, proportionally.
    const covering = people.filter((p) => !treated.has(p.personId))
    if (treated.size && covering.length) {
      const owed = people.filter((p) => treated.has(p.personId))
      const pool = owed.reduce((s, p) => s + p.total, 0)
      const base = covering.map((p) => p.total)
      const extra = allocate(pool, base.some((b) => b > 0) ? base : base.map(() => 1))
      covering.forEach((p, k) => {
        p.treatAdjustment = extra[k]
        p.total += extra[k]
      })
      owed.forEach((p) => {
        p.treatAdjustment = -p.total
        p.total = 0
      })
    }
  } else {
    // Even split (8.2): equal shares among non-treated people.
    const payers = people.filter((p) => !treated.has(p.personId))
    const pool = payers.length ? payers : people
    if (pool.length) {
      const shares = allocate(
        amounts.billTotal,
        pool.map(() => 1),
      )
      pool.forEach((p, k) => (p.total = shares[k]))
    } else {
      unassigned.total = amounts.billTotal
    }
  }

  // Round up (step 8): extra goes to each person's tip.
  let roundUpTotal = 0
  if (bill.roundUp) {
    const unit = roundingUnit(bill.currency)
    for (const p of people) {
      if (treated.has(p.personId) || p.total <= 0) continue
      const extra = Math.ceil(p.total / unit) * unit - p.total
      p.roundUpExtra = extra
      p.tip += extra
      p.total += extra
      roundUpTotal += extra
    }
  }

  const billTotal = amounts.billTotal + roundUpTotal
  const sum = people.reduce((s, p) => s + p.total, 0) + unassigned.total
  return {
    mode: fair ? 'fair' : 'even',
    billTotal,
    itemsSubtotal: amounts.itemsSubtotal,
    discount: amounts.discount,
    tax: amounts.tax,
    tip: amounts.tip + roundUpTotal,
    service: amounts.service,
    roundUpTotal,
    unassigned,
    people,
    reconciles: sum === billTotal,
  }
}
