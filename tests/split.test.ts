import { describe, expect, it } from 'vitest'
import { createBill, makeItem, makePerson } from '../src/lib/bill'
import { computeSplit, type SplitResult } from '../src/lib/split'
import type { Bill } from '../src/lib/types'
import { SAMPLE_TAX, sampleItems } from './fixtures/sampleBill'

function sum(r: SplitResult) {
  return r.people.reduce((s, p) => s + p.total, 0) + r.unassigned.total
}

function expectInvariants(r: SplitResult) {
  expect(sum(r)).toBe(r.billTotal)
  expect(r.reconciles).toBe(true)
  for (const p of r.people) {
    for (const k of ['subtotal', 'discount', 'tax', 'tip', 'service', 'total'] as const) {
      expect(Number.isInteger(p[k])).toBe(true)
      expect(p[k]).toBeGreaterThanOrEqual(0)
    }
  }
}

/** Sample receipt with four people and a realistic set of assignments. */
function dinner(): Bill {
  const bill = createBill()
  bill.items = sampleItems()
  bill.adjustments.tax = { mode: 'amount', value: SAMPLE_TAX }
  bill.adjustments.tip = { mode: 'percent', bps: 2000 }
  const [alex, sam, priya, jordan] = ['Alex', 'Sam', 'Priya', 'Jordan'].map(makePerson)
  bill.people = [alex, sam, priya, jordan]
  const [fries, burrata, pizza, steak, salad, wine, water, tiramisu] = bill.items
  fries.shares = { [alex.id]: 1, [sam.id]: 1, [priya.id]: 1, [jordan.id]: 1 }
  burrata.shares = { [alex.id]: 1, [sam.id]: 1 }
  pizza.shares = { [sam.id]: 1 }
  steak.shares = { [jordan.id]: 1 }
  salad.shares = { [priya.id]: 1 } // the friend who only had a salad
  wine.shares = { [alex.id]: 1, [sam.id]: 1, [jordan.id]: 1 }
  water.shares = { [priya.id]: 1, [alex.id]: 1 }
  tiramisu.shares = { [jordan.id]: 2, [alex.id]: 1 }
  return bill
}

describe('computeSplit — fair', () => {
  it('reconciles the sample receipt to the cent', () => {
    const r = computeSplit(dinner())
    expect(r.itemsSubtotal).toBe(16250)
    expect(r.tax).toBe(1442)
    expect(r.tip).toBe(3250) // 20% pre-tax
    expect(r.billTotal).toBe(16250 + 1442 + 3250)
    expect(r.unassigned.total).toBe(0)
    expectInvariants(r)
  })

  it('splits shared items by weight and reports fractions', () => {
    const r = computeSplit(dinner())
    const jordan = r.people[3]
    const tiramisu = jordan.items.find((i) => i.share === 733)
    expect(tiramisu?.fraction).toEqual([2, 3])
    expect(r.people[0].items.some((i) => i.share === 367)).toBe(true) // Alex ⅓ of 11.00
  })

  it('charges tax and tip in proportion, so the salad friend pays less than an even split', () => {
    const fair = computeSplit(dinner())
    const even = computeSplit(dinner(), 'even')
    const priyaFair = fair.people[2].total
    const priyaEven = even.people[2].total
    expect(priyaFair).toBeLessThan(priyaEven)
    expect(fair.people[2].tax).toBeLessThan(fair.people[3].tax)
  })

  it('keeps unassigned items in their own bucket, carrying their share of tax and tip', () => {
    const bill = dinner()
    bill.items[3].shares = {} // steak unassigned
    const r = computeSplit(bill)
    expect(r.unassigned.itemIds).toEqual([bill.items[3].id])
    expect(r.unassigned.subtotal).toBe(3400)
    expect(r.unassigned.total).toBeGreaterThan(3400)
    expectInvariants(r)
  })

  it('handles a bill with no people', () => {
    const bill = dinner()
    bill.people = []
    const r = computeSplit(bill)
    expect(r.people).toEqual([])
    expect(r.unassigned.total).toBe(r.billTotal)
    expectInvariants(r)
  })

  it('caps a discount at the items subtotal and spreads it proportionally', () => {
    const bill = dinner()
    bill.adjustments.discount = 1000
    let r = computeSplit(bill)
    expect(r.discount).toBe(1000)
    expect(r.people.reduce((s, p) => s + p.discount, 0)).toBe(1000)
    expectInvariants(r)
    bill.adjustments.discount = 999999
    r = computeSplit(bill)
    expect(r.discount).toBe(16250)
  })

  it('supports post-tax tips, percent tax, and service charges', () => {
    const bill = dinner()
    bill.adjustments.tax = { mode: 'percent', bps: 888 } // 8.88%
    bill.adjustments.tipBase = 'postTax'
    bill.adjustments.serviceCharge = 500
    const r = computeSplit(bill)
    expect(r.tax).toBe(1443)
    expect(r.tip).toBe(Math.round((16250 + 1443) * 0.2))
    expect(r.service).toBe(500)
    expectInvariants(r)
  })

  it('a person with no items pays nothing', () => {
    const bill = dinner()
    bill.people.push(makePerson('Late arrival', 4))
    const r = computeSplit(bill)
    expect(r.people[4].total).toBe(0)
    expectInvariants(r)
  })

  it('is deterministic', () => {
    const bill = dinner()
    expect(computeSplit(bill)).toEqual(computeSplit(bill))
  })
})

describe('computeSplit — treat', () => {
  it("moves the treated person's total to everyone else", () => {
    const bill = dinner()
    const before = computeSplit(bill)
    bill.treatedIds = [bill.people[2].id]
    const r = computeSplit(bill)
    expect(r.people[2].total).toBe(0)
    expect(r.people[2].treatAdjustment).toBe(-before.people[2].total)
    const covered = r.people.reduce((s, p) => s + Math.max(0, p.treatAdjustment), 0)
    expect(covered).toBe(before.people[2].total)
    expectInvariants(r)
  })

  it('ignores the treat when everyone is treated', () => {
    const bill = dinner()
    bill.treatedIds = bill.people.map((p) => p.id)
    expectInvariants(computeSplit(bill))
  })
})

describe('defaults', () => {
  it('new bills add no tip until one is chosen', () => {
    const bill = createBill()
    bill.items = [makeItem('Item', 500)]
    bill.people = ['A', 'B', 'C'].map(makePerson)
    bill.people.forEach((p) => (bill.items[0].shares[p.id] = 1))
    const r = computeSplit(bill)
    expect(r.billTotal).toBe(500)
    expect(r.people.map((p) => p.total)).toEqual([167, 167, 166])
  })
})

describe('computeSplit — even', () => {
  it("uses the bill's own split mode by default", () => {
    const bill = dinner()
    bill.splitMode = 'even'
    expect(computeSplit(bill).mode).toBe('even')
    expect(computeSplit(bill)).toEqual(computeSplit(bill, 'even'))
  })

  it('splits the bill total equally, differing by at most one cent', () => {
    const r = computeSplit(dinner(), 'even')
    const totals = r.people.map((p) => p.total)
    expect(Math.max(...totals) - Math.min(...totals)).toBeLessThanOrEqual(1)
    expectInvariants(r)
  })

  it('treated people pay nothing in even mode', () => {
    const bill = dinner()
    bill.treatedIds = [bill.people[0].id]
    const r = computeSplit(bill, 'even')
    expect(r.people[0].total).toBe(0)
    expectInvariants(r)
  })
})

describe('computeSplit — round up', () => {
  it.each(['USD', 'JPY', 'BHD'])('rounds each total up to the unit in %s', (currency) => {
    const bill = dinner()
    bill.currency = currency
    bill.roundUp = true
    const unit = currency === 'USD' ? 100 : currency === 'JPY' ? 10 : 1000
    for (const mode of ['fair', 'even'] as const) {
      const r = computeSplit(bill, mode)
      for (const p of r.people) {
        expect(p.total % unit).toBe(0)
        expect(p.roundUpExtra).toBeGreaterThanOrEqual(0)
        expect(p.roundUpExtra).toBeLessThan(unit)
      }
      expectInvariants(r)
    }
  })

  it('adds the extra to the tip', () => {
    const bill = dinner()
    const plain = computeSplit(bill)
    bill.roundUp = true
    const r = computeSplit(bill)
    expect(r.tip).toBe(plain.tip + r.roundUpTotal)
    expect(r.billTotal).toBe(plain.billTotal + r.roundUpTotal)
  })
})

describe('computeSplit — fuzz', () => {
  it('holds the invariants for random bills', () => {
    let seed = 42
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2 ** 31
      return seed % n
    }
    for (let run = 0; run < 300; run++) {
      const bill = createBill({ currency: ['USD', 'JPY', 'BHD'][rand(3)] })
      bill.people = Array.from({ length: rand(6) }, (_, i) => makePerson(`P${i}`, i))
      bill.items = Array.from({ length: rand(8) }, (_, i) => {
        const item = makeItem(`I${i}`, 1 + rand(10000))
        for (const p of bill.people) if (rand(3) === 0) item.shares[p.id] = 1 + rand(3)
        return item
      })
      bill.adjustments.tax = rand(2)
        ? { mode: 'amount', value: rand(2000) }
        : { mode: 'percent', bps: rand(1500) }
      bill.adjustments.tip = rand(2)
        ? { mode: 'amount', value: rand(3000) }
        : { mode: 'percent', bps: rand(3000) }
      bill.adjustments.tipBase = rand(2) ? 'preTax' : 'postTax'
      bill.adjustments.discount = rand(4) === 0 ? rand(3000) : 0
      bill.adjustments.serviceCharge = rand(4) === 0 ? rand(2000) : 0
      bill.roundUp = rand(2) === 0
      if (bill.people.length && rand(3) === 0) bill.treatedIds = [bill.people[0].id]
      expectInvariants(computeSplit(bill, rand(2) ? 'fair' : 'even'))
    }
  })
})
