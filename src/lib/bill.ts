import type { Bill, Item, Person } from './types'

export const newId = () => crypto.randomUUID()

/** "Friday dinner": breakfast before 11:00, lunch before 16:00, dinner otherwise. */
export function defaultTitle(date = new Date()): string {
  const day = date.toLocaleDateString('en-US', { weekday: 'long' })
  const h = date.getHours()
  return `${day} ${h < 11 ? 'breakfast' : h < 16 ? 'lunch' : 'dinner'}`
}

export function createBill(opts: { currency?: string; tipBps?: number; now?: Date } = {}): Bill {
  const now = (opts.now ?? new Date()).toISOString()
  return {
    schemaVersion: 1,
    id: newId(),
    mode: 'itemized',
    title: defaultTitle(opts.now),
    createdAt: now,
    updatedAt: now,
    currency: opts.currency ?? 'USD',
    roundUp: false,
    people: [],
    items: [],
    adjustments: {
      tax: { mode: 'amount', value: 0 },
      tip: { mode: 'percent', bps: opts.tipBps ?? 2000 },
      tipBase: 'preTax',
      serviceCharge: 0,
      discount: 0,
    },
    treatedIds: [],
    paid: {},
  }
}

export function makeItem(
  name: string,
  price: number,
  quantity = 1,
  source: Item['source'] = 'manual',
): Item {
  return { id: newId(), name, price, quantity, shares: {}, source }
}

export function makePerson(name: string, colorIndex: number): Person {
  return { id: newId(), name, colorIndex: colorIndex % 10 }
}
