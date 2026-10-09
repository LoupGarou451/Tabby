import type { Money } from './money'

export interface Person {
  id: string
  name: string
  colorIndex: number // 0–9, into the avatar palette
}

export interface Item {
  id: string
  name: string
  price: Money // line total (qty × unit), > 0
  quantity: number // integer ≥ 1
  shares: Record<string, number> // personId → weight (1–10); {} = unassigned
  source: 'manual' | 'scan'
  confidence?: number // 0–100 from OCR
}

export type Amount = { mode: 'amount'; value: Money } | { mode: 'percent'; bps: number }

export interface Adjustments {
  tax: Amount
  tip: Amount
  tipBase: 'preTax' | 'postTax'
  serviceCharge: Money
  discount: Money
}

export interface Bill {
  schemaVersion: 1
  id: string
  splitMode: 'fair' | 'even' // chosen on the Assign step
  title: string
  createdAt: string
  updatedAt: string
  currency: string
  roundUp: boolean
  people: Person[]
  items: Item[]
  adjustments: Adjustments
  payerId?: string
  treatedIds: string[]
  paid: Record<string, boolean>
}
