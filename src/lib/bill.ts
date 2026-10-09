import type { Bill, Item, Person } from './types'

/**
 * Random id. crypto.randomUUID() only exists in secure contexts, and phones opening the dev
 * server over the LAN (http://192.168.…) aren't one; getRandomValues works everywhere.
 */
export const newId = (): string =>
  crypto.randomUUID?.() ??
  Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('')

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
