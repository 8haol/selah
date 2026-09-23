import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { BUILTIN_THEMES, getTheme } from '../src/themes.js'
import { assertThemeContrast, type MeasuredBackground } from '../src/contrast.js'

const IDS = [
  'night', 'sanctuary', 'deep', 'meadow', 'dawn', 'paper', 'cross-dawn', 'cross-glow', 'rays', 'stained-glass', 'dove', 'candle',
  'flow-deep', 'flow-sanctuary', 'clouds', 'rays-motion', 'bokeh',
]
const manifestPath = path.resolve(__dirname, '../../../apps/web/public/themes/manifest.json')
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Record<string, Omit<MeasuredBackground, 'id'>>
const publicFile = (src: string) => path.resolve(__dirname, '../../../apps/web/public', src.slice(1))

describe('BUILTIN_THEMES', () => {
  it('has the seventeen themes in order, static first then dynamic', () => {
    expect(BUILTIN_THEMES.map((t) => t.id)).toEqual(IDS)
    expect(BUILTIN_THEMES.slice(0, 12).every((t) => t.background.kind === 'image')).toBe(true)
    expect(BUILTIN_THEMES.slice(12).every((t) => t.background.kind === 'video')).toBe(true)
  })
  it('every theme has a measured background and passes the contrast rules', () => {
    for (const t of BUILTIN_THEMES) {
      const m = manifest[t.id]
      expect(m, `manifest entry for ${t.id}`).toBeDefined()
      expect(() => assertThemeContrast(t, { id: t.id, ...m! })).not.toThrow()
      const measured = t.background.kind === 'video' ? t.background.poster : t.background.src
      expect(fs.statSync(publicFile(measured)).size).toBeLessThanOrEqual(100 * 1024)
    }
  })
  it('uses the mandated lyric typography', () => {
    for (const t of BUILTIN_THEMES) {
      expect(t.fonts.zh).toBe('SimHei'); expect(t.sizes.zh).toBe(45)
      expect(t.fonts.pinyin).toBe('Arial'); expect(t.sizes.pinyin).toBe(35)
      expect(t.maxLinesPerSlide).toBe(4)
      if (t.background.kind === 'image') {
        expect(t.background.src).toBe(`/themes/${t.id}.jpg`)
      } else {
        expect(t.background.src).toBe(`/themes/video/${t.id}.mp4`)
        expect(t.background.poster).toBe(`/themes/video/${t.id}.jpg`)
        expect(t.background.durationMs).toBe(10_000)
      }
    }
  })
  it('keeps every dynamic background under 2.5 MB and the set under 12 MB', () => {
    const videos = BUILTIN_THEMES.filter((t) => t.background.kind === 'video')
    expect(videos.length).toBe(5)
    let total = 0
    for (const t of videos) {
      const bytes = fs.statSync(publicFile(t.background.src)).size
      expect(bytes, t.id).toBeLessThanOrEqual(2.5 * 1024 * 1024)
      total += bytes
    }
    expect(total).toBeLessThanOrEqual(12 * 1024 * 1024)
  })
  it('getTheme throws on unknown id', () => { expect(() => getTheme('nope')).toThrow() })
})
