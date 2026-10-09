import { z } from 'zod'
import { makeItem } from '../lib/bill'
import type { Item } from '../lib/types'
import type { ReceiptDraft } from './parseReceipt'

const minor = z.number().int().nonnegative()

const draftSchema = z.object({
  items: z.array(
    z.object({
      name: z.string().min(1),
      quantity: z.number().int().min(1).max(99),
      price: z.number().int().positive(),
      confidence: z.number().min(0).max(100),
    }),
  ),
  subtotal: minor.optional(),
  tax: minor.optional(),
  tip: minor.optional(),
  serviceCharge: minor.optional(),
  discount: minor.optional(),
  total: minor.optional(),
})

/** Drops anything malformed (out-of-range quantities, zero prices) before it reaches the bill. */
export function validateDraft(draft: ReceiptDraft): ReceiptDraft {
  const items = draft.items.filter((i) => draftSchema.shape.items.element.safeParse(i).success)
  const parsed = draftSchema.safeParse({ ...draft, items })
  return parsed.success ? parsed.data : { items }
}

export function draftToItems(draft: ReceiptDraft): Item[] {
  return draft.items.map((d) => ({
    ...makeItem(d.name, d.price, d.quantity, 'scan'),
    confidence: Math.round(d.confidence),
  }))
}
