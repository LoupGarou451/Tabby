import { describe, expect, it } from 'vitest'
import { parseReceipt, type OcrLine } from '../src/scan/parseReceipt'

const lines = (text: string, confidence = 90): OcrLine[] =>
  text
    .trim()
    .split('\n')
    .map((t) => ({ text: t, confidence }))

describe('parseReceipt', () => {
  it('reads a clean restaurant receipt', () => {
    const r = parseReceipt(
      lines(`
THE CORNER BISTRO
123 Main St, Springfield
(555) 123-4567
Table 12   Server: Dana
10/08/2026  7:42 PM
Truffle Fries           12.00
Burrata                 16.50
Margherita Pizza        19.00
Steak Frites            34.00
Caesar Salad            14.00
House Red (bottle)      48.00
2 Sparkling Water        8.00
Tiramisu                11.00
Subtotal               162.50
Tax 8.875%              14.42
Total                  176.92
VISA ****1234          176.92
Thank you!
`),
      'USD',
    )
    expect(r.items.map((i) => [i.name, i.quantity, i.price])).toEqual([
      ['Truffle Fries', 1, 1200],
      ['Burrata', 1, 1650],
      ['Margherita Pizza', 1, 1900],
      ['Steak Frites', 1, 3400],
      ['Caesar Salad', 1, 1400],
      ['House Red (bottle)', 1, 4800],
      ['Sparkling Water', 2, 800],
      ['Tiramisu', 1, 1100],
    ])
    expect(r.subtotal).toBe(16250)
    expect(r.tax).toBe(1442)
    expect(r.total).toBe(17692)
  })

  it('tolerates common OCR mistakes', () => {
    const r = parseReceipt(
      lines(`
Burger $15.50 T
Fries .... 6.50
5ubtotal 22.00
TAX 1.98
T0TAL 23.98
`),
      'USD',
    )
    expect(r.items.map((i) => [i.name, i.price])).toEqual([
      ['Burger', 1550],
      ['Fries', 650],
    ])
    expect(r.subtotal).toBe(2200)
    expect(r.tax).toBe(198)
    expect(r.total).toBe(2398)
  })

  it('handles quantities, modifiers, discounts, and service charges', () => {
    const r = parseReceipt(
      lines(`
3 x Beer 18.00
Tacos 12.00
+ avocado 2.00
Promo -5.00
Gratuity 18% 24.00
Total 51.00
`),
      'USD',
    )
    expect(r.items).toMatchObject([
      { name: 'Beer', quantity: 3, price: 1800 },
      { name: 'Tacos + avocado', quantity: 1, price: 1400 },
    ])
    expect(r.discount).toBe(500)
    expect(r.serviceCharge).toBe(2400)
  })

  it('merges indented lines into the item above', () => {
    const r = parseReceipt(
      [
        { text: 'Burger 14.00', confidence: 90, x0: 20 },
        { text: 'Add bacon 2.50', confidence: 80, x0: 80 },
        { text: 'Soda 3.00', confidence: 90, x0: 20 },
      ],
      'USD',
    )
    expect(r.items).toMatchObject([
      { name: 'Burger + Add bacon', price: 1650, confidence: 80 },
      { name: 'Soda', price: 300 },
    ])
  })

  it('ignores suggested tips and lines after the total', () => {
    const r = parseReceipt(
      lines(`
Pasta 20.00
Total 21.80
Suggested tip 18% 3.92
Cash 30.00
Change 8.20
`),
      'USD',
    )
    expect(r.items).toHaveLength(1)
    expect(r.tip).toBeUndefined()
    expect(r.total).toBe(2180)
  })

  it('keeps a real tip line', () => {
    const r = parseReceipt(lines('Pasta 20.00\nTip 4.00\nTotal 24.00'), 'USD')
    expect(r.tip).toBe(400)
  })

  it('reads European decimal commas and thousands separators', () => {
    const r = parseReceipt(lines('Menu degustation 1.250,00\nVin 45,50'), 'EUR')
    expect(r.items.map((i) => i.price)).toEqual([125000, 4550])
  })

  it('reads zero-decimal currencies', () => {
    const r = parseReceipt(lines('Ramen ¥1,200\nGyoza 600\nTotal ¥1,800'), 'JPY')
    expect(r.items.map((i) => [i.name, i.price])).toEqual([
      ['Ramen', 1200],
      ['Gyoza', 600],
    ])
    expect(r.total).toBe(1800)
  })

  it('copies line confidence onto items', () => {
    const r = parseReceipt([{ text: 'Mystery 9.99', confidence: 41 }], 'USD')
    expect(r.items[0].confidence).toBe(41)
  })
})
