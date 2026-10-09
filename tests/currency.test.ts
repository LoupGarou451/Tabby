import { beforeEach, describe, expect, it } from 'vitest'
import { searchCurrencies } from '../src/lib/currencies'
import { useBill } from '../src/store/billStore'
import { usePrefs } from '../src/store/prefsStore'

describe('searchCurrencies', () => {
  it('matches by code, name, or symbol', () => {
    expect(searchCurrencies('eur').some((c) => c.code === 'EUR')).toBe(true)
    expect(searchCurrencies('yen').some((c) => c.code === 'JPY')).toBe(true)
    expect(searchCurrencies('€').some((c) => c.code === 'EUR')).toBe(true)
  })
})

describe('changing currency', () => {
  beforeEach(() => {
    usePrefs.getState().set({ currency: 'USD' })
    useBill.getState().clearAll()
  })

  it('keeps displayed numbers and rounds to the new precision', () => {
    const s = useBill.getState()
    s.addItem('Ramen', 1250)
    s.addItem('Tea', 40)
    s.setAdjustments({ tax: { mode: 'amount', value: 199 }, discount: 0 })
    useBill.getState().setCurrency('JPY')
    const bill = useBill.getState().bill
    expect(bill.currency).toBe('JPY')
    expect(bill.items.map((i) => i.price)).toEqual([13, 1]) // 12.50 → ¥13, 0.40 → ¥1 (never 0)
    expect(bill.adjustments.tax).toEqual({ mode: 'amount', value: 2 })
    expect(useBill.getState().undo?.message).toMatch(/rounded/i)
  })

  it('scales up without rounding for 3-decimal currencies', () => {
    useBill.getState().addItem('Mezze', 1250)
    useBill.getState().setCurrency('BHD')
    expect(useBill.getState().bill.items[0].price).toBe(12500)
    expect(useBill.getState().undo).toBeNull()
  })
})
