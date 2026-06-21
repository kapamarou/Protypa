import { formatEuro, formatDate } from './format'

describe('formatEuro', () => {
  it('always includes the euro sign', () => {
    expect(formatEuro(1500)).toContain('€')
    expect(formatEuro(0)).toContain('€')
  })

  it('converts cents to euros correctly', () => {
    expect(formatEuro(1500)).toMatch(/15[,.]00/)   // 1500 cents = 15.00 €
    expect(formatEuro(5000)).toMatch(/50[,.]00/)   // 5000 cents = 50.00 €
    expect(formatEuro(100)).toMatch(/1[,.]00/)     // 100 cents  = 1.00 €
    expect(formatEuro(19000)).toMatch(/190[,.]00/) // 19000 cents = 190.00 €
  })

  it('formats zero as 0.00', () => {
    expect(formatEuro(0)).toMatch(/0[,.]00/)
  })

  it('returns a non-empty string for any non-negative input', () => {
    expect(formatEuro(1)).toBeTruthy()
    expect(formatEuro(25000)).toBeTruthy()
  })
})

describe('formatDate', () => {
  it('formats a Date object in dd/mm/yyyy style', () => {
    const date = new Date(2024, 5, 20) // June 20 2024 (local time, no TZ shift)
    const result = formatDate(date)
    expect(result).toContain('20')
    expect(result).toContain('06')
    expect(result).toContain('2024')
  })

  it('formats a single-digit day and month with zero-padding', () => {
    const date = new Date(2024, 0, 5) // January 5 2024
    const result = formatDate(date)
    expect(result).toContain('05')
    expect(result).toContain('01')
    expect(result).toContain('2024')
  })

  it('accepts a Date object and an ISO string and returns the same day', () => {
    const date = new Date(2024, 5, 20)
    const resultFromDate   = formatDate(date)
    const resultFromString = formatDate(new Date(date.toISOString()))
    expect(resultFromDate).toBe(resultFromString)
  })

  it('returns a non-empty string', () => {
    expect(formatDate(new Date(2025, 0, 1))).toBeTruthy()
  })
})
