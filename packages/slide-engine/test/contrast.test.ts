import { describe, it, expect } from 'vitest'
import { contrastRatio } from '../src/contrast.js'

describe('contrastRatio', () => {
  it('white on black is 21', () => { expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 0) })
  it('is symmetric and accepts no-hash hex', () => {
    expect(contrastRatio('0B1B2B', 'FFFFFF')).toBeCloseTo(contrastRatio('#FFFFFF', '#0B1B2B'), 5)
  })
  it('white on deep navy is above 15', () => { expect(contrastRatio('#FFFFFF', '#0B1B2B')).toBeGreaterThan(15) })
})
