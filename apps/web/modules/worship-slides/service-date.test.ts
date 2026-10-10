import { describe, expect, it } from 'vitest'
import { churchToday, nextSunday } from './service-date'

describe('service dates', () => {
  it('counts down to the coming Sunday', () => {
    expect(nextSunday(new Date('2026-10-10T09:00:00Z'))).toBe('2026-10-11') // Saturday
    expect(nextSunday(new Date('2026-10-12T09:00:00Z'))).toBe('2026-10-18') // Monday
  })

  it('stays on Sunday all through Sunday', () => {
    expect(nextSunday(new Date('2026-10-11T00:30:00Z'))).toBe('2026-10-11')
    expect(nextSunday(new Date('2026-10-11T21:00:00Z'))).toBe('2026-10-11')
  })

  it('turns the day over at London midnight, not UTC midnight', () => {
    // 23:30 UTC on Sunday is already Monday in London during summer time
    expect(churchToday(new Date('2026-07-05T23:30:00Z'))).toBe('2026-07-06')
    expect(nextSunday(new Date('2026-07-05T23:30:00Z'))).toBe('2026-07-12')
    // and still Sunday in winter, when London is on UTC
    expect(nextSunday(new Date('2026-12-06T23:30:00Z'))).toBe('2026-12-06')
  })
})
