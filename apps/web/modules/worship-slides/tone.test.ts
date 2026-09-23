import { describe, it, expect } from 'vitest'
import { spotKey } from '@selah/slide-engine'
import { spotChar, withToneMark } from './tone'

describe('withToneMark', () => {
  it('puts the mark where pinyin does', () => {
    expect(withToneMark('zhao2')).toBe('zháo')
    expect(withToneMark('lv4')).toBe('lǜ')
    expect(withToneMark('gui4')).toBe('guì')
    expect(withToneMark('liu2')).toBe('liú')
    expect(withToneMark('dou1')).toBe('dōu')
    expect(withToneMark('de5')).toBe('de')
    expect(withToneMark('zháo')).toBe('zháo')
  })
})

describe('spotChar', () => {
  it('reads the character back out of a spot key', () => {
    expect(spotChar(spotKey('我得著能力', 2))).toBe('著')
    expect(spotChar('著')).toBeNull()
  })
})
