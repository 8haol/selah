// Build a sample .pptx straight from the engine, the way the browser button does,
// so a change to the slide geometry can be opened and looked at in PowerPoint.
//
// usage: npx tsx scripts/sample-pptx.mjs <themeId> <outFile>
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildDeck, getTheme, renderPptxBytes } from '../src/index.ts'

const here = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC = path.resolve(here, '../../../apps/web/public')
const themeId = process.argv[2] ?? 'night'
const outFile = process.argv[3] ?? `sample-${themeId}.pptx`

const song = {
  id: 'sample', title: '我要爱慕祢', artist: '敬拜队', key: 'G', pinyinOverrides: {},
  defaultFlow: 'V1 C',
  sections: [
    { id: 'V1', type: 'verse', lines: [
      { zh: '主啊 我渴慕尋求祢', pinyin: [] },
      { zh: '我要愛慕祢', pinyin: [] },
      { zh: '數算主恩 應許不改變', pinyin: [] },
    ] },
    { id: 'C', type: 'chorus', lines: [
      { zh: '祢是我的一切', pinyin: [] },
      { zh: '我心讚美祢', pinyin: [] },
    ] },
  ],
}

const dataUrl = (file, mime) => `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`
const theme = getTheme(themeId)
const bg = theme.background
const deck = buildDeck({ songs: [song], flows: { sample: 'V1 C' }, themeId })
const assets = { backgroundDataUrl: dataUrl(path.join(PUBLIC, (bg.kind === 'video' ? bg.poster : bg.src).slice(1)), 'image/jpeg') }
if (bg.kind === 'video') assets.videoDataUrl = dataUrl(path.join(PUBLIC, bg.src.slice(1)), 'video/mp4')

const bytes = await renderPptxBytes(deck, assets)
fs.writeFileSync(outFile, bytes)
console.log(`${outFile}  ${(fs.statSync(outFile).size / 1024 / 1024).toFixed(2)} MB  ${deck.slides.length} slides  theme=${themeId}`)
