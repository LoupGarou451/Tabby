import { describe, expect, it } from 'vitest'
import {
  allocate,
  formatMoney,
  minorDigits,
  parseMoney,
  percentOf,
  roundingUnit,
  toMinor,
} from '../src/lib/money'

describe('minorDigits', () => {
  it('knows 0-, 2-, and 3-decimal currencies', () => {
    expect(minorDigits('USD')).toBe(2)
    expect(minorDigits('JPY')).toBe(0)
    expect(minorDigits('BHD')).toBe(3)
  })
})

describe('allocate', () => {
  it('always sums exactly to the total', () => {
    for (const total of [0, 1, 7, 100, 1001, 99999]) {
      for (const weights of [[1], [1, 1], [1, 1, 1], [2, 1], [3, 5, 7], [1, 0, 1]]) {
        const parts = allocate(total, weights)
        expect(parts.reduce((a, b) => a + b, 0)).toBe(total)
        parts.forEach((p) => expect(Number.isInteger(p)).toBe(true))
      }
    }
  })

  it('gives leftover units to the largest remainders, ties to the earlier index', () => {
    expect(allocate(100, [1, 1, 1])).toEqual([34, 33, 33])
    expect(allocate(1000, [2, 1])).toEqual([667, 333])
  })

  it('handles negative totals and zero weights', () => {
    expect(allocate(-100, [1, 1, 1])).toEqual([-34, -33, -33])
    expect(allocate(100, [0, 0])).toEqual([0, 0])
    expect(allocate(100, [0, 1])).toEqual([0, 100])
  })
})

describe('parseMoney', () => {
  it.each([
    ['12', 1200],
    ['12.5', 1250],
    ['$12.50', 1250],
    ['12,50', 1250],
    ['1,250', 125000],
    ['1,250.75', 125075],
    ['1.250,75', 125075],
    [' 0.99 ', 99],
  ])('USD %s → %i', (text, minor) => expect(parseMoney(text, 'USD')).toBe(minor))

  it('rejects empty, invalid, and negative input', () => {
    expect(parseMoney('', 'USD')).toBeNull()
    expect(parseMoney('abc', 'USD')).toBeNull()
    expect(parseMoney('-5', 'USD')).toBeNull()
  })

  it('respects the currency decimals', () => {
    expect(parseMoney('1,234', 'JPY')).toBe(1234)
    expect(parseMoney('1234.6', 'JPY')).toBe(1235)
    expect(parseMoney('1.250', 'BHD')).toBe(1250)
  })
})

describe('helpers', () => {
  it('rounds halves away from zero when converting', () => {
    expect(toMinor(14.421875, 'USD')).toBe(1442)
    expect(toMinor(0.005, 'USD')).toBe(1)
  })

  it('computes percentages in basis points', () => {
    expect(percentOf(16250, 2000)).toBe(3250)
    expect(percentOf(16250, 1800)).toBe(2925)
  })

  it('uses a whole unit, or 10 for zero-decimal currencies, when rounding up', () => {
    expect(roundingUnit('USD')).toBe(100)
    expect(roundingUnit('BHD')).toBe(1000)
    expect(roundingUnit('JPY')).toBe(10)
  })

  it('formats with the currency symbol', () => {
    expect(formatMoney(17692, 'USD', 'en-US')).toBe('$176.92')
    expect(formatMoney(1234, 'JPY', 'en-US')).toBe('¥1,234')
  })
})
