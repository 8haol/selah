// Renders full-resolution (1920×1080) PNG snapshots of each theme's title and
// lyric slides by compositing SVG text over the background, plus a contact
// sheet. Uses system fonts through librsvg/fontconfig (Mac: Heiti/PingFang,
// Kaiti SC, Arial) — close to what Windows shows with SimHei/KaiTi/Arial.
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { pinyin } from 'pinyin-pro'
import { themes, layout } from './themes.mjs'

const OUT = path.resolve('out')
const SHOTS = path.join(OUT, 'shots')
fs.mkdirSync(SHOTS, { recursive: true })
const { W, H } = layout
const px = (pt) => (pt * 4) / 3 // 1pt = 1.333px at 1920×1080 (10in wide)

const song = {
  title: '耶和华是我的牧者',
  meta: '诗篇 23 · KEY OF D',
  sections: [
    { label: 'VERSE 1', lines: ['耶和华是我的牧者', '我必不致缺乏', '他使我躺卧在青草地上', '领我在可安歇的水边'] },
    { label: 'CHORUS', lines: ['他使我的灵魂苏醒', '为自己的名引导我走义路'] },
  ],
}
const py = (s) => pinyin(s, { type: 'array', toneType: 'symbol', nonZh: 'consecutive' }).join(' ')
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

const F = {
  zh: `'SimHei','Heiti SC','PingFang SC','Microsoft YaHei',sans-serif`,
  title: `'KaiTi','Kaiti SC','STKaiti',serif`,
  py: `Arial,Helvetica,sans-serif`,
}
const hex2rgb = (h) => { const x = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16)).join(',') }

function shadowDefs(t) {
  if (!t.shadow.opacity) return ''
  return `<filter id="sh" x="-20%" y="-50%" width="140%" height="200%">
    <feDropShadow dx="0" dy="4" stdDeviation="9" flood-color="${t.shadow.color}" flood-opacity="${t.shadow.opacity}"/>
  </filter>`
}
const shf = (t) => (t.shadow.opacity ? 'filter="url(#sh)"' : '')

function titleSvg(t) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${shadowDefs(t)}</defs>
    <text x="960" y="470" text-anchor="middle" font-family="${F.title}" font-size="${px(layout.title.size)}" font-weight="700" letter-spacing="8" fill="${t.colors.title}" ${shf(t)}>${esc(song.title)}</text>
    <rect x="850" y="520" width="220" height="4" rx="2" fill="${t.colors.rule}" opacity=".9"/>
    <text x="960" y="600" text-anchor="middle" font-family="${F.py}" font-size="${px(layout.titlePy.size)}" letter-spacing="2" fill="${t.colors.py}">${esc(py(song.title))}</text>
    <text x="960" y="680" text-anchor="middle" font-family="${F.py}" font-size="${px(layout.meta.size)}" letter-spacing="4" fill="${t.colors.meta}" opacity=".85">${esc(song.meta)}</text>
  </svg>`
}

function lyricSvg(t, section) {
  const pyH = px(layout.py.size) * 1.15
  const zhH = px(layout.zh.size) * 1.2
  const gap = 34
  const lineH = pyH + zhH
  const total = section.lines.length * lineH + (section.lines.length - 1) * gap
  let y = (H - total) / 2
  let body = ''
  for (const zh of section.lines) {
    body += `<text x="960" y="${(y + pyH * 0.8).toFixed(1)}" text-anchor="middle" font-family="${F.py}" font-size="${px(layout.py.size)}" letter-spacing="1" fill="${t.colors.py}" opacity=".95">${esc(py(zh))}</text>`
    body += `<text x="960" y="${(y + pyH + zhH * 0.8).toFixed(1)}" text-anchor="middle" font-family="${F.zh}" font-size="${px(layout.zh.size)}" font-weight="600" letter-spacing="4" fill="${t.colors.zh}" ${shf(t)}>${esc(zh)}</text>`
    y += lineH + gap
  }
  const badgeW = 40 + section.label.length * 15
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${shadowDefs(t)}</defs>
    <rect x="72" y="56" width="${badgeW}" height="44" rx="22" fill="${t.colors.badgeBg}" fill-opacity=".12" stroke="${t.colors.badgeFg}" stroke-opacity=".35" stroke-width="1.5"/>
    <text x="${72 + badgeW / 2}" y="85" text-anchor="middle" font-family="${F.py}" font-size="${px(layout.badge.size)}" letter-spacing="4" fill="${t.colors.badgeFg}">${section.label}</text>
    ${body}
  </svg>`
}

const tiles = []
for (const t of themes) {
  const bg = path.join(OUT, 'bg', `${t.id}.jpg`)
  const slides = [['title', titleSvg(t)], ['v1', lyricSvg(t, song.sections[0])], ['c', lyricSvg(t, song.sections[1])]]
  for (const [name, overlay] of slides) {
    const file = path.join(SHOTS, `${t.id}-${name}.png`)
    await sharp(bg).composite([{ input: Buffer.from(overlay) }]).png().toFile(file)
    tiles.push(file)
  }
  console.log('shots', t.id)
}

// contact sheet: 6 rows × 3 columns, each tile 640×360
const TW = 640, TH = 360, PAD = 16
const cols = 3, rows = themes.length
const sheet = sharp({ create: { width: cols * TW + (cols + 1) * PAD, height: rows * TH + (rows + 1) * PAD, channels: 3, background: '#141414' } })
const comps = []
for (let i = 0; i < tiles.length; i++) {
  const r = Math.floor(i / cols), c = i % cols
  comps.push({ input: await sharp(tiles[i]).resize(TW, TH).toBuffer(), left: PAD + c * (TW + PAD), top: PAD + r * (TH + PAD) })
}
await sheet.composite(comps).jpeg({ quality: 88 }).toFile(path.join(SHOTS, 'contact-sheet.jpg'))
console.log('contact sheet', path.join(SHOTS, 'contact-sheet.jpg'))
