import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import JSZip from 'jszip'
import { buildDeck } from '../src/deck.js'
import { renderPptx, renderPptxBytes, deckFileName } from '../src/pptx.js'
import type { Song } from '../src/types.js'

// 1×1 white JPEG
const JPEG_B64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q=='
const song: Song = {
  id: 's1', title: '耶和华是我的牧者', key: 'D', pinyinOverrides: {}, defaultFlow: 'V1 C',
  sections: [
    { id: 'V1', type: 'verse', lines: [{ zh: '耶和华是我的牧者', pinyin: [] }, { zh: '我必不致缺乏', pinyin: [] }] },
    { id: 'C', type: 'chorus', lines: [{ zh: '他使我的灵魂苏醒', pinyin: [] }] },
  ],
}

const IMAGE_MEDIA_RE = /^ppt\/media\/.+\.(jpe?g|png)$/i

describe('renderPptx', () => {
  it('produces a 16:9 deck with one slide per SlideDeck slide, per-character text boxes, image backgrounds', async () => {
    const deck = buildDeck({ songs: [song], flows: { s1: 'V1 I C' }, themeId: 'night' })
    const pptx = await renderPptx(deck, { backgroundDataUrl: `data:image/jpeg;base64,${JPEG_B64}` })
    const buf = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer
    const zip = await JSZip.loadAsync(buf)
    const slideFiles = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    expect(slideFiles.length).toBe(deck.slides.length) // title, V1, blank, C

    const pres = await zip.file('ppt/presentation.xml')!.async('string')
    expect(pres).toContain('cx="9144000"') // 10in
    expect(pres).toContain('cy="5143500"') // 5.625in

    const xml2 = await zip.file('ppt/slides/slide2.xml')!.async('string')
    expect(xml2).not.toContain('<a:tbl>')
    // one text box per character: 8 + 6 = 14 cells + 1 badge
    expect((xml2.match(/<p:sp>/g) ?? []).length).toBe(15)
    expect(xml2).toContain('>huá<')
    expect(xml2).toContain('>华<')
    expect(xml2).toContain('typeface="Microsoft YaHei"')
    expect(xml2).toContain('typeface="Arial"')
    expect(xml2).toContain('wrap="none"')
    // sizes: auto-fit ≥ minimum (sz is pt*100)
    const sizes = [...xml2.matchAll(/sz="(\d+)"/g)].map((m) => Number(m[1]))
    expect(Math.max(...sizes)).toBeGreaterThanOrEqual(4500)
    expect(sizes.some((s) => s >= 0.45 * Math.max(...sizes) && s < Math.max(...sizes))).toBe(true)
    expect(xml2).toContain('VERSE 1')

    const rels2 = await zip.file('ppt/slides/_rels/slide2.xml.rels')!.async('string')
    expect(rels2).toMatch(/relationships\/image/)
  })
  it('puts the title slide pinyin above the title, like every lyric line', async () => {
    const deck = buildDeck({ songs: [song], flows: { s1: 'V1' }, themeId: 'night' })
    const pptx = await renderPptx(deck, { backgroundDataUrl: `data:image/jpeg;base64,${JPEG_B64}` })
    const buf = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer
    const zip = await JSZip.loadAsync(buf)
    const xml1 = await zip.file('ppt/slides/slide1.xml')!.async('string')

    // one {text, y} per shape on the title slide
    const shapes = xml1.split('<p:sp>').slice(1).map((chunk) => ({
      text: [...chunk.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map((m) => m[1]).join(''),
      y: Number(/<a:off [^>]*y="(\d+)"/.exec(chunk)?.[1] ?? NaN),
    }))
    // each title character is its own box with its syllable directly above it
    const ye = shapes.find((s) => s.text === 'yē耶')
    const zhe = shapes.find((s) => s.text === 'zhě者')
    expect(ye, 'title cell 耶').toBeDefined()
    expect(zhe, 'title cell 者').toBeDefined()
    const x = (chunk: string) => Number(/<a:off x="(\d+)"/.exec(chunk)?.[1] ?? NaN)
    const chunks = xml1.split('<p:sp>').slice(1)
    expect(x(chunks.find((c) => c.includes('>耶<'))!)).toBeLessThan(x(chunks.find((c) => c.includes('>者<'))!))
    expect(xml1.indexOf('>yē<')).toBeLessThan(xml1.indexOf('>耶<'))
    expect(xml1).not.toContain('KEY OF')
  })
  it('gives the pinyin the same shadow as the characters it annotates', async () => {
    const deck = buildDeck({ songs: [song], flows: { s1: 'V1' }, themeId: 'night' })
    const pptx = await renderPptx(deck, { backgroundDataUrl: `data:image/jpeg;base64,${JPEG_B64}` })
    const buf = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer
    const zip = await JSZip.loadAsync(buf)
    const xml2 = await zip.file('ppt/slides/slide2.xml')!.async('string')
    // One text box per character holds the pinyin run and the character run, and
    // the shadow lives on the box — so both rows are lifted off the background.
    // pptxgenjs silently drops `shadow` from a run's own options.
    const cells = xml2.split('<p:sp>').slice(1).filter((c) => c.includes('typeface="Microsoft YaHei"'))
    expect(cells.length).toBe(14) // 8 + 6 characters
    for (const cell of cells) {
      expect(cell).toContain('<a:outerShdw')
    }
    const withPinyin = cells.filter((c) => c.includes('typeface="Arial"'))
    expect(withPinyin.length).toBe(14)
  })
  it('writes the same shadow geometry on every shape that carries one', async () => {
    // pptxgenjs rewrites a shadow's pt values to EMU in place, so handing the
    // same object to two text boxes silently multiplies the second by 12700.
    // Every shadow in the deck must therefore read identically.
    const deck = buildDeck({ songs: [song], flows: { s1: 'V1 C' }, themeId: 'night' })
    const pptx = await renderPptx(deck, { backgroundDataUrl: `data:image/jpeg;base64,${JPEG_B64}` })
    const buf = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer
    const zip = await JSZip.loadAsync(buf)
    const shadows: string[] = []
    for (const name of Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))) {
      const xml = await zip.file(name)!.async('string')
      shadows.push(...(xml.match(/<a:outerShdw[^>]*>/g) ?? []))
    }
    expect(shadows.length).toBeGreaterThan(20)
    expect(new Set(shadows).size).toBe(1)
    expect(shadows[0]).toContain('blurRad="127000"')
    expect(shadows[0]).toContain('dist="38100"')
    expect(shadows[0]).toContain('dir="5400000"')
  })
  it('embeds one shared, auto-starting, looping, muted video for a dynamic theme', async () => {
    const mp4 = fs.readFileSync(path.resolve(__dirname, 'fixtures/tiny.mp4')).toString('base64')
    const deck = buildDeck({ songs: [song], flows: { s1: 'V1 C' }, themeId: 'flow-deep' })
    const bytes = await renderPptxBytes(deck, {
      backgroundDataUrl: `data:image/jpeg;base64,${JPEG_B64}`,
      videoDataUrl: `data:video/mp4;base64,${mp4}`,
    })
    const zip = await JSZip.loadAsync(bytes)
    const names = Object.keys(zip.files)

    // exactly one copy of the clip, however many slides embed it
    const mp4s = names.filter((n) => /^ppt\/media\/.+\.mp4$/.test(n))
    expect(mp4s.length).toBe(1)
    const keptMp4 = mp4s[0]!.slice('ppt/media/'.length)

    const slideFiles = names.filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n)).sort()
    expect(slideFiles.length).toBe(deck.slides.length)
    expect(slideFiles.length).toBeGreaterThanOrEqual(2)

    for (const slideFile of slideFiles) {
      const n = slideFile.match(/slide(\d+)\.xml$/)![1]
      const rels = await zip.file(`ppt/slides/_rels/slide${n}.xml.rels`)!.async('string')
      expect(rels, slideFile).toContain(`Target="../media/${keptMp4}"`)
      expect(rels.match(/Target="\.\.\/media\/[^"]+\.mp4"/g)!.every((t) => t.includes(keptMp4))).toBe(true)

      const xml = await zip.file(slideFile)!.async('string')
      const spid = xml.match(/<p:pic>[\s\S]*?<a:videoFile[\s\S]*?<\/p:pic>/)!
      const picId = spid[0].match(/<p:cNvPr\s+id="(\d+)"/)![1]
      expect(xml, slideFile).toContain('<p:timing>')
      expect(xml).toContain('repeatCount="indefinite"')
      expect(xml).toContain('mute="1"')
      expect(xml).toContain('showWhenStopped="0"')
      expect(xml).toContain(`<p:spTgt spid="${picId}"/>`)
      expect(xml).toContain('<p:cTn id="6" dur="24000" fill="hold"/>')
      // the timing tree is the last child of <p:sld>
      expect(xml.endsWith('</p:timing></p:sld>')).toBe(true)
    }
  })
  it('names the file with date, first title and count', () => {
    const deck = buildDeck({ songs: [song], flows: {}, themeId: 'night' })
    const name = deckFileName({ ...deck, meta: { ...deck.meta, generatedAt: '2026-09-27T09:00:00.000Z' } }, ['耶和华是我的牧者', '第二首'])
    expect(name).toBe('2026-09-27 耶和华是我的牧者 + 1 首.pptx')
  })
})

describe('renderPptxBytes for image themes', () => {
  it('keeps one shared copy of the background image across every slide', async () => {
    const deck = buildDeck({ songs: [song], flows: { s1: 'V1 C V1 C V1 C V1 C' }, themeId: 'night' })
    expect(deck.slides.length).toBe(9)

    // pptxgenjs writes one private copy of the background per slide before dedupe
    const raw = await renderPptx(deck, { backgroundDataUrl: `data:image/jpeg;base64,${JPEG_B64}` })
    const rawZip = await JSZip.loadAsync((await raw.write({ outputType: 'nodebuffer' })) as Buffer)
    expect(Object.keys(rawZip.files).filter((n) => IMAGE_MEDIA_RE.test(n)).length).toBeGreaterThan(1)

    const bytes = await renderPptxBytes(deck, { backgroundDataUrl: `data:image/jpeg;base64,${JPEG_B64}` })
    const zip = await JSZip.loadAsync(bytes)
    const images = Object.keys(zip.files).filter((n) => IMAGE_MEDIA_RE.test(n))
    expect(images).toHaveLength(1)

    const kept = images[0]!.slice('ppt/media/'.length)
    for (let n = 1; n <= deck.slides.length; n += 1) {
      const rels = await zip.file(`ppt/slides/_rels/slide${n}.xml.rels`)!.async('string')
      expect(rels, `slide${n}`).toContain(`Target="../media/${kept}"`)
    }
  })

  it('keeps a row wider than the content box from starting off the left edge', async () => {
    const wide: Song = { ...song, sections: [{ id: 'V1', type: 'verse', lines: [{ zh: 'Hallelujah'.repeat(24), pinyin: [] }] }] }
    const deck = buildDeck({ songs: [wide], flows: { s1: 'V1' }, themeId: 'night' })
    const pptx = await renderPptx(deck, { backgroundDataUrl: `data:image/jpeg;base64,${JPEG_B64}` })
    const zip = await JSZip.loadAsync((await pptx.write({ outputType: 'nodebuffer' })) as Buffer)
    const xml = await zip.file('ppt/slides/slide2.xml')!.async('string')

    expect(xml).toContain('Hallelujah')
    expect(xml).not.toMatch(/<a:off x="-/)
  })
})
