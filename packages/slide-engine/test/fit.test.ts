import { describe, it, expect } from 'vitest'
import JSZip from 'jszip'
import { buildDeck } from '../src/deck.js'
import { layoutMeta, layoutSlide, SLIDE_H_PT, CONTENT_TOP_PT } from '../src/layout.js'
import { slideTheme, tunedTheme, getTheme } from '../src/themes.js'
import { renderPptx } from '../src/pptx.js'
import type { Slide, SlideDeck, Song } from '../src/types.js'

const JPEG_B64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q=='

const L = (zh: string) => ({ zh, pinyin: [] })
const song: Song = {
  id: 's1', title: '一颗怜悯的心', pinyinOverrides: {}, defaultFlow: 'C E',
  sections: [
    { id: 'C', type: 'chorus', lines: [L('一颗怜悯的心'), L('得着你的喜悦'), L('让我带着你的敬拜'), L('直升到你面前')] },
    { id: 'E', type: 'ending', lines: [L('直升到你面前')] },
  ],
}

const lyricSlides = (deck: SlideDeck) => deck.slides.filter((s) => s.kind === 'lyrics')
const lay = (deck: SlideDeck, s: Slide) => layoutSlide(s.lines, slideTheme(deck, s), s.fit)

describe('one type size per song', () => {
  it('a one-line ending sets as large as the full chorus, not larger', () => {
    const deck = buildDeck({ songs: [song], flows: {}, themeId: 'night' })
    const [chorus, ending] = lyricSlides(deck)
    expect(lay(deck, ending!).zhPt).toBeCloseTo(lay(deck, chorus!).zhPt, 5)
  })

  it('a slide saved without a fit still lays out on its own, as before', () => {
    const deck = buildDeck({ songs: [song], flows: {}, themeId: 'night' })
    const ending = lyricSlides(deck)[1]!
    const free = layoutSlide(ending.lines, slideTheme(deck, ending))
    expect(free.zhPt).toBeGreaterThan(lay(deck, ending).zhPt)
  })
})

describe('where the first row sits', () => {
  it('pins the first row to one height on every slide of the song', () => {
    const deck = buildDeck({ songs: [song], flows: {}, themeId: 'night' })
    const [chorus, ending] = lyricSlides(deck)
    expect(lay(deck, ending!).rows[0]!.topPt).toBeCloseTo(lay(deck, chorus!).rows[0]!.topPt!, 5)
  })

  it('centres the fullest slide on the middle of the picture', () => {
    const deck = buildDeck({ songs: [song], flows: {}, themeId: 'night' })
    const chorus = lay(deck, lyricSlides(deck)[0]!)
    expect(chorus.rows).toHaveLength(4)
    expect(chorus.topPt + chorus.blockHeightPt / 2).toBeCloseTo(SLIDE_H_PT / 2, 0)
    expect(chorus.topPt).toBeGreaterThanOrEqual(CONTENT_TOP_PT)
  })

  it('with 每页居中, centres every slide on its own', () => {
    const deck = buildDeck({ songs: [song], flows: {}, themeId: 'night', anchor: 'center' })
    const ending = lay(deck, lyricSlides(deck)[1]!)
    expect(ending.topPt + ending.blockHeightPt / 2).toBeCloseTo(SLIDE_H_PT / 2, 0)
  })
})

describe('行间距', () => {
  it('opens the gap between rows from tight to loose', () => {
    const two: Song = { ...song, sections: [{ id: 'V', type: 'verse', lines: [L('一颗'), L('怜悯')] }], defaultFlow: 'V' }
    const gap = (lineSpacing: 'tight' | 'normal' | 'loose') => {
      const deck = buildDeck({ songs: [two], flows: {}, themeId: 'night', lineSpacing })
      const l = lay(deck, lyricSlides(deck)[0]!)
      return l.rowGapPt / l.zhPt
    }
    expect(gap('tight')).toBeLessThan(gap('normal'))
    expect(gap('normal')).toBeLessThan(gap('loose'))
  })

  it('on a slide too full for 宽松, keeps as much of the gap as fits instead of closing it', () => {
    const deck = buildDeck({ songs: [song], flows: { s1: 'C' }, themeId: 'night', lineSpacing: 'loose' })
    const normal = buildDeck({ songs: [song], flows: { s1: 'C' }, themeId: 'night' })
    const l = lay(deck, lyricSlides(deck)[0]!)
    expect(l.rows).toHaveLength(4)
    expect(l.rowGapPt).toBeGreaterThanOrEqual(lay(normal, lyricSlides(normal)[0]!).rowGapPt - 1e-9)
  })
})

describe('字体描边', () => {
  it('outlines dark lyrics in white and light lyrics in black', () => {
    expect(tunedTheme(getTheme('night'), { outline: 'thin' }).outline?.color).toBe('#000000')
    const light = tunedTheme(getTheme('night'), { outline: 'thick' })
    expect(light.outline!.ratio).toBeGreaterThan(tunedTheme(getTheme('night'), { outline: 'thin' }).outline!.ratio)
    const darkText = { ...getTheme('night'), colors: { ...getTheme('night').colors, zh: '#1B2A44' } }
    expect(tunedTheme(darkText, { outline: 'thin' }).outline?.color).toBe('#FFFFFF')
    expect(tunedTheme(getTheme('night'), {}).outline ?? null).toBeNull()
  })

  it('carries the outline into the exported lyrics', async () => {
    const deck = buildDeck({ songs: [song], flows: { s1: 'C' }, themeId: 'night', titleSlides: false, outline: 'thick' })
    const pptx = await renderPptx(deck, { backgroundDataUrl: `data:image/jpeg;base64,${JPEG_B64}` })
    const zip = await JSZip.loadAsync((await pptx.write({ outputType: 'nodebuffer' })) as Buffer)
    const xml = await zip.file('ppt/slides/slide1.xml')!.async('string')
    expect(xml).toMatch(/<a:ln w="\d+"><a:solidFill><a:srgbClr val="000000"/)
  })

  it('draws the stroke behind the characters, never over them', async () => {
    // PowerPoint strokes on the glyph edge, half over the fill: a stroke on the
    // lyric itself eats thin strokes and hollows out the pinyin. So the stroke
    // rides on a copy underneath, and the lyric on top carries none.
    const deck = buildDeck({ songs: [song], flows: { s1: 'E' }, themeId: 'night', titleSlides: false, outline: 'thick' })
    const pptx = await renderPptx(deck, { backgroundDataUrl: `data:image/jpeg;base64,${JPEG_B64}` })
    const zip = await JSZip.loadAsync((await pptx.write({ outputType: 'nodebuffer' })) as Buffer)
    const xml = await zip.file('ppt/slides/slide1.xml')!.async('string')
    const shapes = xml.split('<p:sp>').slice(1)
    const withText = (zh: string) => shapes.filter((sp) => sp.includes(`>${zh}<`))
    const [under, over] = withText('直')
    expect(withText('直')).toHaveLength(2)
    expect(under).toMatch(/<a:ln w="\d+">/)
    expect(under).toContain('val="000000"')
    expect(over).not.toMatch(/<a:ln w="\d+">/)
    expect(over).toContain('val="FFFFFF"')
  })

  it('without 描边, sets each character once', async () => {
    const deck = buildDeck({ songs: [song], flows: { s1: 'E' }, themeId: 'night', titleSlides: false })
    const pptx = await renderPptx(deck, { backgroundDataUrl: `data:image/jpeg;base64,${JPEG_B64}` })
    const zip = await JSZip.loadAsync((await pptx.write({ outputType: 'nodebuffer' })) as Buffer)
    const xml = await zip.file('ppt/slides/slide1.xml')!.async('string')
    expect(xml.split('<p:sp>').filter((sp) => sp.includes('>直<'))).toHaveLength(1)
  })
})

describe('每页行数 3', () => {
  it('never puts more than three rows on a slide', () => {
    const deck = buildDeck({ songs: [song], flows: { s1: 'C' }, themeId: 'night', linesPerSlide: 3 })
    const slides = lyricSlides(deck)
    expect(slides).toHaveLength(2)
    for (const s of slides) expect(lay(deck, s).rows.length).toBeLessThanOrEqual(3)
  })
})

describe('the artist line under a title', () => {
  const night = getTheme('night')
  it('keeps a short artist on one line at the theme size', () => {
    expect(layoutMeta('赞美之泉 · 游智婷', night)).toEqual({ pt: night.sizes.meta, lines: ['赞美之泉 · 游智婷'] })
  })

  it('shrinks and wraps a long credit onto two lines that each fit', () => {
    const long = 'Gather Worship & 赞美之泉 · Brett Younker, Ben Fielding, Matt Redman, Kristian Stanfill, Ethan Hulse, Jason Ingram'
    const m = layoutMeta(long, night)
    expect(m.pt).toBeLessThan(night.sizes.meta)
    expect(m.lines.length).toBeLessThanOrEqual(2)
    expect(m.lines.join(' ').replace(/\s+/g, ' ')).toBe(long.toUpperCase())
  })

  it('cuts with an ellipsis only past two lines at the smallest size', () => {
    const m = layoutMeta('Brett Younker, Ben Fielding, '.repeat(12), night)
    expect(m.lines).toHaveLength(2)
    expect(m.lines[1]!.endsWith('…')).toBe(true)
  })
})
