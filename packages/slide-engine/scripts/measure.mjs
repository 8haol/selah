// Shared background measurement: samples the text zone of a JPEG (background or
// video poster) and reports its average / p95 / p05 colours, which the contrast
// rules in `src/contrast.ts` are checked against. Also owns the manifest file so
// `build-backgrounds.mjs` and `build-videos.mjs` can each update their own rows
// without clobbering the other's.
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SAMPLE_W = 480
const SAMPLE_H = 270

export const THEMES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../apps/web/public/themes')
export const MANIFEST_FILE = path.join(THEMES_DIR, 'manifest.json')

const channelLuminance = (value) => {
  const channel = value / 255
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

const pixelLuminance = (red, green, blue) =>
  0.2126 * channelLuminance(red) + 0.7152 * channelLuminance(green) + 0.0722 * channelLuminance(blue)

const rgbToHex = (red, green, blue) =>
  `#${[red, green, blue].map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`

export async function measureBackground(file) {
  const left = Math.round(SAMPLE_W * 0.08)
  const top = Math.round(SAMPLE_H * 0.14)
  const width = Math.round(SAMPLE_W * 0.84)
  const height = Math.round(SAMPLE_H * 0.78)
  const { data, info } = await sharp(file)
    .resize(SAMPLE_W, SAMPLE_H, { fit: 'fill' })
    .extract({ left, top, width, height })
    .raw()
    .toBuffer({ resolveWithObject: true })
  const pixels = []
  let red = 0
  let green = 0
  let blue = 0
  for (let offset = 0; offset < data.length; offset += info.channels) {
    const r = data[offset]
    const g = data[offset + 1]
    const b = data[offset + 2]
    red += r
    green += g
    blue += b
    pixels.push({ luminance: pixelLuminance(r, g, b), red: r, green: g, blue: b })
  }
  pixels.sort((a, b) => a.luminance - b.luminance)
  const count = pixels.length
  const p95 = pixels[Math.floor(0.95 * (count - 1))]
  const p05 = pixels[Math.floor(0.05 * (count - 1))]
  return {
    avg: rgbToHex(red / count, green / count, blue / count),
    p95: rgbToHex(p95.red, p95.green, p95.blue),
    p05: rgbToHex(p05.red, p05.green, p05.blue),
  }
}

/** Merge the given `{ id: { avg, p95, p05 } }` rows into `manifest.json`, keeping every other theme's entry. */
export function updateManifest(entries) {
  let manifest = {}
  if (fs.existsSync(MANIFEST_FILE)) manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'))
  Object.assign(manifest, entries)
  fs.writeFileSync(MANIFEST_FILE, `${JSON.stringify(manifest, null, 2)}\n`)
}
