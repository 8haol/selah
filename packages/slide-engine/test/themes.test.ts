import { describe, it, expect } from 'vitest'
import { BUILTIN_THEMES, getTheme } from '../src/themes.js'
import { assertThemeContrast } from '../src/contrast.js'

describe('BUILTIN_THEMES', () => {
  it('has the six themes', () => {
    expect(BUILTIN_THEMES.map((t) => t.id)).toEqual(['night', 'sanctuary', 'deep', 'meadow', 'dawn', 'paper'])
  })
  it('every theme meets the 7:1 contrast rule for zh and pinyin', () => {
    for (const t of BUILTIN_THEMES) expect(() => assertThemeContrast(t, 7)).not.toThrow()
  })
  it('uses the mandated lyric typography', () => {
    for (const t of BUILTIN_THEMES) {
      expect(t.fonts.zh).toBe('SimHei'); expect(t.sizes.zh).toBe(45)
      expect(t.fonts.pinyin).toBe('Arial'); expect(t.sizes.pinyin).toBe(35)
      expect(t.maxLinesPerSlide).toBe(4)
      expect(t.background.src).toBe(`/themes/${t.id}.jpg`)
    }
  })
  it('getTheme throws on unknown id', () => { expect(() => getTheme('nope')).toThrow() })
})
