import { describe, expect, it } from 'vitest'
import { createBill, makeItem, makePerson } from '../src/lib/bill'
import { canReach, stepBlocker } from '../src/lib/steps'

describe('step validation', () => {
  it('requires an item, then a person, then every item assigned', () => {
    const bill = createBill()
    expect(stepBlocker(bill, 'receipt')).toMatch(/at least one item/)
    expect(canReach(bill, 'people')).toBe(false)

    bill.items = [makeItem('Fries', 600), makeItem('Soda', 300)]
    expect(stepBlocker(bill, 'receipt')).toBeNull()
    expect(stepBlocker(bill, 'people')).toMatch(/at least one person/)
    expect(canReach(bill, 'people')).toBe(true)
    expect(canReach(bill, 'assign')).toBe(false)

    const ann = makePerson('Ann', 0)
    bill.people = [ann]
    expect(stepBlocker(bill, 'assign')).toBe('Assign every item to continue (2 left)')
    expect(canReach(bill, 'tip')).toBe(false)

    bill.items[0].shares = { [ann.id]: 1 }
    expect(stepBlocker(bill, 'assign')).toMatch(/1 left/)
    bill.items[1].shares = { [ann.id]: 1 }
    expect(stepBlocker(bill, 'assign')).toBeNull()
    expect(canReach(bill, 'summary')).toBe(true)
  })

  it('needs no assignments when splitting evenly', () => {
    const bill = createBill()
    bill.items = [makeItem('Fries', 600)]
    bill.people = [makePerson('Ann', 0)]
    bill.splitMode = 'even'
    expect(stepBlocker(bill, 'assign')).toBeNull()
    expect(canReach(bill, 'summary')).toBe(true)
  })

  it('ignores shares belonging to people who were removed', () => {
    const bill = createBill()
    bill.items = [makeItem('Fries', 600)]
    bill.items[0].shares = { ghost: 1 }
    bill.people = [makePerson('Ann', 0)]
    expect(stepBlocker(bill, 'assign')).toMatch(/1 left/)
  })
})
