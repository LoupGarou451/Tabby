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
  source: 'manual' | 'scan' | 'sample'
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

export interface QuickSplit {
  total: Money // tax included
  tax: Money // optional (0 = unknown); enables a pre-tax tip
  headcount: number // used when no people are named
}

export interface Bill {
  schemaVersion: 1
  id: string
  mode: 'itemized' | 'quick'
  title: string
  createdAt: string
  updatedAt: string
  currency: string
  quick?: QuickSplit
  roundUp: boolean
  people: Person[]
  items: Item[]
  adjustments: Adjustments
  printedTotal?: Money
  payerId?: string
  treatedIds: string[]
  paid: Record<string, boolean>
}
