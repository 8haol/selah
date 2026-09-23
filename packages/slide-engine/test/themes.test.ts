import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { BUILTIN_THEMES, getTheme } from '../src/themes.js'
import { assertThemeContrast, type MeasuredBackground } from '../src/contrast.js'

const IDS = ['night', 'sanctuary', 'deep', 'meadow', 'dawn', 'paper', 'cross-dawn', 'cross-glow', 'rays', 'stained-glass', 'dove', 'candle']
const manifestPath = path.resolve(__dirname, '../../../apps/web/public/themes/manifest.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Record<string, Omit<MeasuredBackground, 'id'>>

describe('BUILTIN_THEMES', () => {
  it('has the twelve themes in order', () => { expect(BUILTIN_THEMES.map((t) => t.id)).toEqual(IDS) })
  it('every theme has a measured background and passes the contrast rules', () => {
    for (const t of BUILTIN_THEMES) {
      const m = manifest[t.id]
      expect(m, `manifest entry for ${t.id}`).toBeDefined()
      expect(() => assertThemeContrast(t, { id: t.id, ...m! })).not.toThrow()
      expect(fs.statSync(path.resolve(__dirname, '../../../apps/web/public', t.background.src.slice(1))).size).toBeLessThanOrEqual(100 * 1024)
    }
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
