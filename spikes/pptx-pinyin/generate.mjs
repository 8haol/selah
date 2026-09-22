// Phase 0 spike: can pptxgenjs produce worship lyric slides that match the
// church's Google Slides template (pinyin Arial 35pt above Chinese 黑体 45pt),
// with acceptable per-character alignment, on a 16:9 slide?
//
// Produces out/spike.pptx with several variants so they can be compared in
// PowerPoint side by side. Nothing here is production code.

import fs from 'node:fs'
import path from 'node:path'
import pptxgen from 'pptxgenjs'
import { pinyin } from 'pinyin-pro'

const OUT_DIR = path.resolve('out')
fs.mkdirSync(OUT_DIR, { recursive: true })

// ---------------------------------------------------------------- test data
// 和合本 (1919) text, public domain. Psalm 23 as stand-in lyrics.
const song = {
  title: '耶和华是我的牧者',
  sections: {
    V1: ['耶和华是我的牧者', '我必不致缺乏', '他使我躺卧在青草地上', '领我在可安歇的水边'],
    C: ['他使我的灵魂苏醒', '为自己的名引导我走义路'],
    V2: ['我虽然行过死荫的幽谷', '也不怕遭害', '因为你与我同在', '你的杖你的竿都安慰我'],
  },
  // deliberately includes polyphonic characters: 长, 乐, 行, 重
  polyTest: ['长阔高深的爱', '快乐的歌唱', '行在光中', '重新得力'],
}

// ---------------------------------------------------------------- theme
// Sizes come straight from the existing Google Slides template.
const theme = {
  bg: '0B1B2B',
  zh: { font: 'SimHei', size: 45, color: 'FFFFFF' },
  py: { font: 'Arial', size: 35, color: 'D9E2EC' },
  maxLines: 4,
}

// ---------------------------------------------------------------- helpers
function toPinyinSyllables(line) {
  // one syllable per Chinese character; non-Chinese chars pass through
  return pinyin(line, { type: 'array', toneType: 'symbol', nonZh: 'consecutive' })
}

// Rough width estimate in points for a pinyin syllable set in Arial at `size`.
// Arial average lowercase advance ≈ 0.5em; tone marks don't add width.
function estimatePinyinWidthPt(syllable, size) {
  return syllable.length * 0.52 * size
}

// WCAG contrast ratio between two hex colours
function contrast(hexA, hexB) {
  const lum = (hex) => {
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const [l1, l2] = [lum(hexA), lum(hexB)].sort((a, b) => b - a)
  return (l1 + 0.05) / (l2 + 0.05)
}

// ---------------------------------------------------------------- deck
const ONLY = (process.env.ONLY ?? 'title,A,B,video').split(',')
const on = (k) => ONLY.includes(k)
const pptx = new pptxgen()
pptx.layout = 'LAYOUT_16x9' // 10in × 5.625in — same as Google Slides default
const W = 10
const H = 5.625

function baseSlide(label) {
  const s = pptx.addSlide()
  s.background = { color: theme.bg }
  s.addText(label, {
    x: 0.2, y: 0.1, w: 6, h: 0.3,
    fontFace: 'Arial', fontSize: 10, color: '6B7A8A',
  })
  return s
}

// Variant A — two stacked, centred text boxes per lyric line.
// Simplest; mirrors how most hand-made decks look. Alignment is approximate.
function variantA(lines, label) {
  const s = baseSlide(label)
  const rowH = (theme.py.size + theme.zh.size) * 1.25 / 72 // pt → in, with leading
  const totalH = rowH * lines.length
  let y = (H - totalH) / 2
  for (const zh of lines) {
    const py = toPinyinSyllables(zh).join(' ')
    s.addText(py, {
      x: 0.3, y, w: W - 0.6, h: (theme.py.size * 1.25) / 72,
      fontFace: theme.py.font, fontSize: theme.py.size, color: theme.py.color,
      align: 'center', valign: 'bottom', margin: 0,
    })
    s.addText(zh, {
      x: 0.3, y: y + (theme.py.size * 1.25) / 72, w: W - 0.6, h: (theme.zh.size * 1.25) / 72,
      fontFace: theme.zh.font, fontSize: theme.zh.size, color: theme.zh.color,
      align: 'center', valign: 'top', margin: 0,
    })
    y += rowH
  }
  return s
}

// Variant B — borderless table, one column per character (row 1 pinyin,
// row 2 character). Exact per-character alignment; columns widen to fit
// the pinyin so characters get spaced out.
function variantB(lines, label) {
  const s = baseSlide(label)
  const rowHIn = [(theme.py.size * 1.2) / 72, (theme.zh.size * 1.2) / 72]
  const lineHIn = rowHIn[0] + rowHIn[1]
  const gap = 0.1
  const totalH = lines.length * lineHIn + (lines.length - 1) * gap
  let y = (H - totalH) / 2
  for (const zh of lines) {
    const chars = [...zh]
    const pys = toPinyinSyllables(zh)
    const colW = chars.map((ch, i) => {
      const pyW = estimatePinyinWidthPt(pys[i] ?? '', theme.py.size)
      const zhW = theme.zh.size // CJK glyphs are ~1em wide
      return (Math.max(pyW, zhW) + 6) / 72 // +6pt breathing room
    })
    const tableW = colW.reduce((a, b) => a + b, 0)
    const x = (W - tableW) / 2
    const rows = [
      pys.map((p) => ({
        text: p,
        options: { fontFace: theme.py.font, fontSize: theme.py.size, color: theme.py.color, align: 'center', valign: 'bottom', margin: 0 },
      })),
      chars.map((c) => ({
        text: c,
        options: { fontFace: theme.zh.font, fontSize: theme.zh.size, color: theme.zh.color, align: 'center', valign: 'top', margin: 0 },
      })),
    ]
    const B = (process.env.B_OPTS ?? 'border,fill,rowh').split(',')
    const tOpts = { x, y, w: tableW, colW, autoPage: false }
    if (B.includes('rowh')) tOpts.rowH = rowHIn
    if (B.includes('border')) tOpts.border = { type: 'none' }
    if (B.includes('border0')) tOpts.border = { type: 'solid', pt: 0, color: theme.bg }
    if (B.includes('fill')) tOpts.fill = { color: theme.bg }
    if (!B.includes('margin')) for (const r of rows) for (const c of r) delete c.options.margin
    if (!B.includes('valign')) for (const r of rows) for (const c of r) delete c.options.valign
    s.addTable(rows, tOpts)
    y += lineHIn + gap
  }
  return s
}

// ---------------------------------------------------------------- slides
// Title slide
if (on('title')) {
  const s = baseSlide('title')
  s.addText(song.title, {
    x: 0.5, y: 1.6, w: W - 1, h: 1.2,
    fontFace: theme.zh.font, fontSize: 60, color: theme.zh.color, align: 'center', bold: true,
  })
  s.addText(toPinyinSyllables(song.title).join(' '), {
    x: 0.5, y: 2.9, w: W - 1, h: 0.8,
    fontFace: theme.py.font, fontSize: 28, color: theme.py.color, align: 'center',
  })
}

if (on('A')) {
  variantA(song.sections.V1, 'A · V1 · 4 lines · stacked textboxes')
  variantA(song.sections.C, 'A · C · 2 lines')
  variantA(song.sections.V2, 'A · V2 · long lines (12 chars)')
  variantA(song.polyTest, 'A · polyphonic test 长/乐/行/重')
}
if (on('B')) {
  variantB(song.sections.V1, 'B · V1 · 4 lines · per-char table')
  variantB(song.sections.C, 'B · C · 2 lines')
  variantB(song.sections.V2, 'B · V2 · long lines (12 chars) — does it overflow?')
}

// Optional: video background variant, only if a sample clip exists.
const VIDEO = path.resolve('assets/bg.mp4')
if (on('video') && fs.existsSync(VIDEO)) {
  const s = pptx.addSlide()
  s.addMedia({ type: 'video', path: VIDEO, x: 0, y: 0, w: W, h: H })
  s.addText('video background test — should autoplay + loop after XML patch', {
    x: 0.5, y: 2.4, w: W - 1, h: 0.8,
    fontFace: theme.zh.font, fontSize: 40, color: 'FFFFFF', align: 'center',
    shadow: { type: 'outer', blur: 6, offset: 2, angle: 45, color: '000000', opacity: 0.8 },
  })
  console.log('video variant included')
} else {
  console.log('no assets/bg.mp4 — skipping video variant')
}

// ---------------------------------------------------------------- report
console.log('contrast zh/bg  :', contrast(theme.zh.color, theme.bg).toFixed(2), '(WCAG AAA large text ≥ 4.5, aim ≥ 7)')
console.log('contrast py/bg  :', contrast(theme.py.color, theme.bg).toFixed(2))
console.log('pinyin samples  :')
for (const l of [...song.sections.V1.slice(0, 2), ...song.polyTest]) {
  console.log('  ', l, '→', toPinyinSyllables(l).join(' '))
}

const outFile = path.join(OUT_DIR, process.env.OUT ?? 'spike.pptx')
await pptx.writeFile({ fileName: outFile })
console.log('wrote', outFile, `${(fs.statSync(outFile).size / 1024).toFixed(0)} KB`)
