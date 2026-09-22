// Renders the six themes three ways:
//   out/bg/<id>.png          — rasterised background (1920×1080)
//   out/preview/index.html   — HTML preview of title + lyric slide per theme
//   out/selah-themes.pptx    — the same slides as a PPTX (image backgrounds)
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import pptxgen from 'pptxgenjs'
import { pinyin } from 'pinyin-pro'
import { themes, layout, cssFonts } from './themes.mjs'

const OUT = path.resolve('out')
const BG = path.join(OUT, 'bg')
const PREVIEW = path.join(OUT, 'preview')
fs.mkdirSync(BG, { recursive: true })
fs.mkdirSync(PREVIEW, { recursive: true })

// --- sample content (和合本 1919, public domain) ---------------------------
const song = {
  title: '耶和华是我的牧者',
  meta: '诗篇 23 · Key of D',
  sections: [
    { id: 'V1', label: 'Verse 1', lines: ['耶和华是我的牧者', '我必不致缺乏', '他使我躺卧在青草地上', '领我在可安歇的水边'] },
    { id: 'C', label: 'Chorus', lines: ['他使我的灵魂苏醒', '为自己的名引导我走义路'] },
  ],
}
const py = (s) => pinyin(s, { type: 'array', toneType: 'symbol', nonZh: 'consecutive' })

// --- 1. backgrounds ---------------------------------------------------------
for (const t of themes) {
  const png = path.join(BG, `${t.id}.jpg`)
  await sharp(Buffer.from(t.svg())).jpeg({ quality: 82, chromaSubsampling: '4:4:4' }).toFile(png)
  t.bgPng = png
  t.bgB64 = fs.readFileSync(png).toString('base64')
  console.log('bg', t.id, `${(fs.statSync(png).size / 1024).toFixed(0)} KB`)
}

// --- 2. HTML preview ---------------------------------------------------------
// 1920×1080 canvas scaled down with CSS; sizes below are in px at 1:1 where
// 1pt = 1.333px (so 45pt → 60px, 35pt → 46.7px).
const pt = (n) => `${(n * 4) / 3}px`
const shadowCss = (t) => (t.shadow.opacity ? `text-shadow: 0 3px 14px rgba(${hex2rgb(t.shadow.color)},${t.shadow.opacity}), 0 1px 2px rgba(${hex2rgb(t.shadow.color)},${t.shadow.opacity * 0.6});` : '')
function hex2rgb(h) { const x = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16)).join(',') }

function titleSlideHtml(t) {
  return `<div class="slide" style="background-image:url(../bg/${t.id}.jpg)">
    <div class="title-wrap">
      <div class="title" style="color:${t.colors.title};${shadowCss(t)}">${song.title}</div>
      <div class="rule" style="background:${t.colors.rule}"></div>
      <div class="title-py" style="color:${t.colors.py}">${py(song.title).join(' ')}</div>
      <div class="meta" style="color:${t.colors.meta}">${song.meta}</div>
    </div>
  </div>`
}
function lyricSlideHtml(t, section) {
  const lines = section.lines.map((zh) => `
    <div class="line">
      <div class="py" style="color:${t.colors.py}">${py(zh).join(' ')}</div>
      <div class="zh" style="color:${t.colors.zh};${shadowCss(t)}">${zh}</div>
    </div>`).join('')
  return `<div class="slide" style="background-image:url(../bg/${t.id}.jpg)">
    <div class="badge" style="color:${t.colors.badgeFg};border-color:${t.colors.badgeFg}55;background:${t.colors.badgeBg}1f">${section.label.toUpperCase()}</div>
    <div class="lyrics">${lines}</div>
  </div>`
}

const html = `<!doctype html><html lang="zh"><head><meta charset="utf-8"><title>Selah themes</title>
<style>
  :root{color-scheme:dark}
  body{margin:0;background:#111;color:#ddd;font:14px/1.5 -apple-system,system-ui,sans-serif;padding:32px}
  h1{font-weight:500;letter-spacing:.02em;margin:0 0 24px}
  .theme{margin:0 0 56px}
  .theme h2{font-weight:500;margin:0 0 4px;font-size:18px}
  .theme p{margin:0 0 14px;color:#999}
  .row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
  .frame{width:100%;aspect-ratio:16/9;overflow:hidden;border-radius:8px;box-shadow:0 10px 40px rgba(0,0,0,.5)}
  .slide{width:1920px;height:1080px;transform-origin:0 0;position:relative;background-size:cover;background-position:center;
         font-family:${cssFonts.zh}}
  .title-wrap{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px}
  .title{font-family:${cssFonts.title};font-size:${pt(layout.title.size)};font-weight:700;letter-spacing:.08em}
  .rule{width:220px;height:3px;border-radius:2px;opacity:.9}
  .title-py{font-family:${cssFonts.py};font-size:${pt(layout.titlePy.size)};letter-spacing:.06em}
  .meta{font-family:${cssFonts.py};font-size:${pt(layout.meta.size)};letter-spacing:.14em;text-transform:uppercase;margin-top:26px;opacity:.85}
  .badge{position:absolute;top:56px;left:72px;font-family:${cssFonts.py};font-size:${pt(layout.badge.size)};letter-spacing:.22em;
         padding:10px 20px;border:1.5px solid;border-radius:999px}
  .lyrics{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px;padding:0 90px}
  .line{text-align:center}
  .py{font-family:${cssFonts.py};font-size:${pt(layout.py.size)};letter-spacing:.02em;line-height:1.15;opacity:.95}
  .zh{font-family:${cssFonts.zh};font-size:${pt(layout.zh.size)};letter-spacing:.06em;line-height:1.2;font-weight:600}
</style></head><body>
<h1>Selah · Worship Slides · 主题预览（歌词 黑体 45pt / 拼音 Arial 35pt）</h1>
${themes.map((t) => `<section class="theme" id="${t.id}"><h2>${t.name}</h2><p>${t.desc}</p>
  <div class="row">
    <div class="frame">${titleSlideHtml(t)}</div>
    <div class="frame">${lyricSlideHtml(t, song.sections[0])}</div>
    <div class="frame">${lyricSlideHtml(t, song.sections[1])}</div>
  </div></section>`).join('')}
<script>
  // scale each 1920×1080 slide to its frame
  const fit=()=>document.querySelectorAll('.frame').forEach(f=>{const s=f.firstElementChild;s.style.transform='scale('+(f.clientWidth/1920)+')'});
  addEventListener('resize',fit);fit();
</script></body></html>`
fs.writeFileSync(path.join(PREVIEW, 'index.html'), html)
console.log('preview', path.join(PREVIEW, 'index.html'))

// --- 3. PPTX ------------------------------------------------------------------
const pptx = new pptxgen()
pptx.layout = 'LAYOUT_16x9'
const SW = 10, SH = 5.625
const inch = (ptSize) => ptSize / 72
const shadow = (t) => (t.shadow.opacity ? { type: 'outer', color: t.shadow.color.replace('#', ''), blur: 10, offset: 3, angle: 90, opacity: t.shadow.opacity } : undefined)
const c = (hex) => hex.replace('#', '')

for (const t of themes) {
  // title slide
  {
    const s = pptx.addSlide()
    s.background = { data: `image/jpeg;base64,${t.bgB64}` }
    s.addText(song.title, { x: 0.5, y: 1.55, w: SW - 1, h: 1.35, fontFace: layout.title.font, fontSize: layout.title.size, bold: true, color: c(t.colors.title), align: 'center', valign: 'middle', charSpacing: 6, shadow: shadow(t), margin: 0 })
    s.addShape(pptx.ShapeType.rect, { x: SW / 2 - 1.15, y: 3.02, w: 2.3, h: 0.035, fill: { color: c(t.colors.rule) }, line: { color: c(t.colors.rule), width: 0 } })
    s.addText(py(song.title).join(' '), { x: 0.5, y: 3.15, w: SW - 1, h: 0.6, fontFace: layout.titlePy.font, fontSize: layout.titlePy.size, color: c(t.colors.py), align: 'center', valign: 'middle', charSpacing: 2, margin: 0 })
    s.addText(song.meta.toUpperCase(), { x: 0.5, y: 3.95, w: SW - 1, h: 0.4, fontFace: layout.meta.font, fontSize: layout.meta.size, color: c(t.colors.meta), align: 'center', valign: 'middle', charSpacing: 4, margin: 0 })
    s.addNotes(`${t.name} — title`)
  }
  // lyric slides
  for (const section of song.sections) {
    const s = pptx.addSlide()
    s.background = { data: `image/jpeg;base64,${t.bgB64}` }
    // section badge (pill)
    s.addText(section.label.toUpperCase(), {
      x: 0.5, y: 0.38, w: 1.55, h: 0.36, fontFace: layout.badge.font, fontSize: layout.badge.size, color: c(t.colors.badgeFg), align: 'center', valign: 'middle', charSpacing: 5, margin: 0,
      shape: pptx.ShapeType.roundRect, rectRadius: 0.18, fill: { color: c(t.colors.badgeBg), transparency: 88 }, line: { color: c(t.colors.badgeFg), width: 1, transparency: 60 },
    })
    const pyH = inch(layout.py.size) * 1.15
    const zhH = inch(layout.zh.size) * 1.2
    const gap = 0.18
    const lineH = pyH + zhH
    const total = section.lines.length * lineH + (section.lines.length - 1) * gap
    let y = (SH - total) / 2 + 0.05
    for (const zh of section.lines) {
      s.addText(py(zh).join(' '), { x: 0.6, y, w: SW - 1.2, h: pyH, fontFace: layout.py.font, fontSize: layout.py.size, color: c(t.colors.py), align: 'center', valign: 'bottom', charSpacing: 1, margin: 0 })
      s.addText(zh, { x: 0.6, y: y + pyH, w: SW - 1.2, h: zhH, fontFace: layout.zh.font, fontSize: layout.zh.size, bold: true, color: c(t.colors.zh), align: 'center', valign: 'top', charSpacing: 3, shadow: shadow(t), margin: 0 })
      y += lineH + gap
    }
  }
}
const outFile = path.join(OUT, 'selah-themes.pptx')
await pptx.writeFile({ fileName: outFile })
console.log('pptx', outFile, `${(fs.statSync(outFile).size / 1024).toFixed(0)} KB`)
