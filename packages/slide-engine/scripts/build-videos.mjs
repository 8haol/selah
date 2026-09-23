// Procedural dynamic (video) backgrounds for the five 动态 themes.
//
// Generalised from `spikes/pptx-pinyin/flow-bg.mjs`: every mode is a seamless
// 10 s loop because time travels round a circle in the last two dimensions of a
// 4D value-noise field (or, for `bokeh`, because every disc's phase wraps). We
// render small (384×216) on the CPU and let ffmpeg upscale with lanczos + a
// soft blur + film grain — these are atmospheric backdrops, not sharp footage.
//
// A radial scrim is baked in (0.72 at the centre of the text zone rising to 1.0
// at its edge) so a moving highlight can never drift unfiltered behind lyrics.
//
// usage: node scripts/build-videos.mjs [id ...]      (default: all five)
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { measureBackground, updateManifest, THEMES_DIR } from './measure.mjs'

const FFMPEG = '/opt/homebrew/bin/ffmpeg'
const RW = 384
const RH = 216
const OUT_W = 1280
const OUT_H = 720
const FPS = 24
const SECONDS = 10
const FRAMES = SECONDS * FPS
const MAX_MP4 = 2.5 * 1024 * 1024
const MAX_TOTAL = 12 * 1024 * 1024
const MAX_POSTER = 100 * 1024

const hexToRgb = (h) => [0, 2, 4].map((i) => parseInt(h.slice(1 + i, 3 + i), 16))

// --- 4D value noise (seamless in the z/w plane) -----------------------------
function hash4(x, y, z, w) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647 + w * 1597334677) | 0
  h = (h ^ (h >>> 13)) * 1274126177
  h = h ^ (h >>> 16)
  return (h >>> 0) / 4294967296
}
const fade = (t) => t * t * (3 - 2 * t)
function noise4(x, y, z, w) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), wi = Math.floor(w)
  const xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi), wf = fade(w - wi)
  let acc = 0
  for (let dw = 0; dw <= 1; dw += 1) {
    const ww = dw ? wf : 1 - wf
    for (let dz = 0; dz <= 1; dz += 1) {
      const wz = dz ? zf : 1 - zf
      for (let dy = 0; dy <= 1; dy += 1) {
        const wy = dy ? yf : 1 - yf
        for (let dx = 0; dx <= 1; dx += 1) {
          const wx = dx ? xf : 1 - xf
          acc += hash4(xi + dx, yi + dy, zi + dz, wi + dw) * wx * wy * wz * ww
        }
      }
    }
  }
  return acc
}
function fbm(x, y, z, w, oct = 4) {
  let a = 0.5, f = 1, s = 0, n = 0
  for (let i = 0; i < oct; i += 1) { s += a * noise4(x * f, y * f, z * f, w * f); n += a; a *= 0.5; f *= 2.03 }
  return s / n
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)

/** 5 stops, dark → highlight. */
const rampOf = (palette) => palette.map(hexToRgb)
function mapColor(ramp, v) {
  const t = clamp01(v) * 4
  const i = Math.min(3, Math.floor(t))
  const f = t - i
  const a = ramp[i], b = ramp[i + 1]
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]
}

/** Baked scrim: 0.72 in the middle of the text zone, 1.0 at its edge and beyond. */
const TEXT_ZONE_R = 0.95
function scrimAt(u, v) {
  const dx = (u - 0.5) * (16 / 9)
  const dy = v - 0.54
  const r = Math.min(1, Math.hypot(dx, dy) / TEXT_ZONE_R)
  return 0.72 + 0.28 * fade(r)
}

// --- modes ------------------------------------------------------------------
// Each mode returns a `(u, v, cz, cw, th) => [r, g, b]` sampler for one theme.

const modes = {
  // The spike algorithm: domain-warped, horizontally stretched fbm with bright ribbons.
  flow(theme) {
    const ramp = rampOf(theme.palette)
    return (u, v, cz, cw) => {
      const qx = fbm(u * 1.6 + 3.1, v * 2.2, cz, cw, 3)
      const qy = fbm(u * 1.6 - 1.7, v * 2.2 + 5.3, cz + 2.1, cw - 1.3, 3)
      const nx = u * 1.1 + (qx - 0.5) * 1.4
      const ny = v * 3.6 + (qy - 0.5) * 1.1
      let n = fbm(nx, ny, cz * 1.3 + 7.7, cw * 1.3 + 4.2, 4)
      n = (n - 0.5) * 1.7 + 0.5
      const sx = u * 0.7 + (qx - 0.5) * 0.9 + 11.3
      const sy = v * 7.5 + (qy - 0.5) * 2.4 + 2.9
      const rib = fbm(sx, sy, cz * 0.9 - 3.3, cw * 0.9 + 6.1, 3)
      const streak = Math.max(0, (rib - 0.52) / 0.48) ** 2.2 * 0.9
      const band = Math.exp(-(((v - 0.58) / 0.45) ** 2))
      const glow = Math.min(1, Math.max(0, n) ** 1.5 * (0.5 + 0.5 * band) * 0.85 + streak * band)
      return mapColor(ramp, glow)
    }
  },

  // Two layers of thresholded fbm cloud drifting sideways at different speeds,
  // over a night gradient, with a faint moon bloom top-right.
  clouds(theme) {
    const ramp = rampOf(theme.palette)
    const puff = (n) => Math.max(0, (n - 0.42) / 0.58) ** 1.4
    return (u, v, cz, cw, th) => {
      const d1 = u * 2.6 + 0.30 * Math.sin(th)
      const d2 = u * 4.4 - 0.18 * Math.sin(th) + 9.1
      const c1 = puff(fbm(d1, v * 2.6, cz, cw, 4))
      const c2 = puff(fbm(d2, v * 4.4 + 4.4, cz * 1.2 + 3.3, cw * 1.2 - 2.7, 4))
      // soft-light style combine: the thin high layer lifts the thick low one
      const cloud = clamp01(c1 + c2 * (1 - c1) * 0.8)
      const moon = Math.exp(-((Math.hypot((u - 0.80) * (16 / 9), v - 0.17) / 0.34) ** 2)) * 0.42
      const base = 0.10 + 0.10 * (1 - v)
      return mapColor(ramp, base + cloud * 0.62 + moon)
    }
  },

  // Angular fbm around an off-canvas pivot → god-rays that sway as the loop turns.
  rays(theme) {
    const ramp = rampOf(theme.palette)
    const px = 0.55
    const py = -0.3
    return (u, v, cz, cw) => {
      const dx = (u - px) * (16 / 9)
      const dy = v - py
      const angle = Math.atan2(dy, dx)
      const r = Math.min(1, Math.hypot(dx, dy) / 1.65)
      const n = fbm(angle * 6, r * 0.5, cz, cw, 4)
      const beam = Math.max(0, (n - 0.45) / 0.55) ** 1.6 * (1 - r) ** 1.5
      const base = 0.09 + 0.09 * (1 - v)
      return mapColor(ramp, base + beam * 1.25)
    }
  },

  // 40 soft discs drifting upward on looped phases, additive over a flat gradient.
  bokeh(theme) {
    const top = hexToRgb('#0B1020')
    const bottom = hexToRgb('#1A1F45')
    const tints = ['#FFD27A', '#FFB4A2', '#FFFFFF'].map(hexToRgb)
    let seed = 20260923
    const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296)
    const discs = []
    for (let i = 0; i < 40; i += 1) {
      discs.push({
        x: random(),
        y0: random(),
        // radius 30–140 px of the 1280-wide output, expressed in u units
        r: (30 + random() * 110) / OUT_W,
        speed: 0.10 + random() * 0.35,
        tint: tints[i % tints.length],
        op: 0.12 + random() * 0.18,
      })
    }
    void theme
    return (u, v, cz, cw, th) => {
      const t = th / (Math.PI * 2)
      const g = v
      let r = top[0] + (bottom[0] - top[0]) * g
      let gr = top[1] + (bottom[1] - top[1]) * g
      let b = top[2] + (bottom[2] - top[2]) * g
      for (const d of discs) {
        let dy = v - (((d.y0 - t * d.speed) % 1) + 1) % 1
        if (dy > 0.5) dy -= 1
        else if (dy < -0.5) dy += 1
        // radii are in u units, so the vertical delta is scaled into them
        const dist = Math.hypot(u - d.x, dy * (OUT_H / OUT_W))
        if (dist > d.r * 2.2) continue
        const falloff = Math.exp(-((dist / d.r) ** 2) * 1.6)
        const a = d.op * falloff
        r += d.tint[0] * a
        gr += d.tint[1] * a
        b += d.tint[2] * a
      }
      return [r, gr, b]
    }
  },
}

// --- themes -----------------------------------------------------------------
const themes = [
  { id: 'flow-deep', mode: 'flow', palette: ['#04101F', '#0A2E4C', '#0E5F7A', '#22B3BF', '#B8F5F2'] },
  { id: 'flow-sanctuary', mode: 'flow', palette: ['#150818', '#3A1638', '#7A2E5A', '#D98A4F', '#FFE3A8'] },
  { id: 'clouds', mode: 'clouds', palette: ['#050814', '#0C1530', '#23305E', '#6F7FB0', '#DDE3F5'] },
  { id: 'rays-motion', mode: 'rays', palette: ['#111A24', '#1F3140', '#6A5B3E', '#E9C877', '#FFF3D0'] },
  { id: 'bokeh', mode: 'bokeh', palette: ['#0B1020', '#121730', '#1A1F45', '#FFD27A', '#FFF3D0'] },
]

async function renderTheme(theme, outDir) {
  const mp4 = path.join(outDir, `${theme.id}.mp4`)
  const sampler = modes[theme.mode](theme)
  const ff = spawn(FFMPEG, [
    '-v', 'error', '-y',
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${RW}x${RH}`, '-r', String(FPS), '-i', '-',
    '-vf', `scale=${OUT_W}:${OUT_H}:flags=lanczos,gblur=sigma=6,noise=alls=4:allf=t,format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '26', '-movflags', '+faststart', '-an',
    mp4,
  ])
  ff.stderr.on('data', (d) => process.stderr.write(d))

  const frame = Buffer.alloc(RW * RH * 3)
  const R = 0.9 // loop radius in noise space
  const started = Date.now()
  for (let f = 0; f < FRAMES; f += 1) {
    const th = (f / FRAMES) * Math.PI * 2
    const cz = R * Math.cos(th)
    const cw = R * Math.sin(th)
    let p = 0
    for (let y = 0; y < RH; y += 1) {
      const v = y / RH
      for (let x = 0; x < RW; x += 1) {
        const u = x / RW
        const [r, g, b] = sampler(u, v, cz, cw, th)
        const k = scrimAt(u, v)
        frame[p] = Math.min(255, Math.max(0, r * k)); p += 1
        frame[p] = Math.min(255, Math.max(0, g * k)); p += 1
        frame[p] = Math.min(255, Math.max(0, b * k)); p += 1
      }
    }
    if (!ff.stdin.write(frame)) await new Promise((res) => ff.stdin.once('drain', res))
    if (f % FPS === 0) process.stdout.write(`\r  ${theme.id} frame ${f}/${FRAMES}  ${((Date.now() - started) / 1000).toFixed(1)}s`)
  }
  ff.stdin.end()
  const code = await new Promise((res) => ff.on('close', res))
  if (code !== 0) throw new Error(`ffmpeg exited ${code} for ${theme.id}`)
  process.stdout.write(`\r  ${theme.id} rendered in ${((Date.now() - started) / 1000).toFixed(1)}s\n`)
  return mp4
}

async function buildPoster(theme, mp4, outDir) {
  const poster = path.join(outDir, `${theme.id}.jpg`)
  const tmp = path.join(outDir, `${theme.id}.frame0.jpg`)
  await new Promise((res, rej) => {
    const ff = spawn(FFMPEG, ['-v', 'error', '-y', '-i', mp4, '-frames:v', '1', '-q:v', '3', tmp])
    ff.stderr.on('data', (d) => process.stderr.write(d))
    ff.on('close', (code) => (code === 0 ? res() : rej(new Error(`poster ffmpeg exited ${code}`))))
  })
  let quality = 82
  await sharp(tmp).jpeg({ quality, chromaSubsampling: '4:4:4' }).toFile(poster)
  let bytes = fs.statSync(poster).size
  if (bytes > MAX_POSTER) {
    quality = 74
    await sharp(tmp).jpeg({ quality, chromaSubsampling: '4:2:0' }).toFile(poster)
    bytes = fs.statSync(poster).size
  }
  fs.rmSync(tmp)
  if (bytes > MAX_POSTER) throw new Error(`${theme.id}.jpg is ${(bytes / 1024).toFixed(0)} KB (> 100 KB limit)`)
  return { poster, bytes }
}

const only = process.argv.slice(2)
const selected = only.length ? themes.filter((t) => only.includes(t.id)) : themes
if (!selected.length) throw new Error(`no such video theme: ${only.join(', ')}`)

const outDir = path.join(THEMES_DIR, 'video')
fs.mkdirSync(outDir, { recursive: true })
const manifest = {}
const rows = []
let total = 0
for (const theme of selected) {
  const mp4 = await renderTheme(theme, outDir)
  const mp4Bytes = fs.statSync(mp4).size
  if (mp4Bytes > MAX_MP4) throw new Error(`${theme.id}.mp4 is ${(mp4Bytes / 1024 / 1024).toFixed(2)} MB (> 2.5 MB limit)`)
  total += mp4Bytes
  const { poster, bytes } = await buildPoster(theme, mp4, outDir)
  const measured = await measureBackground(poster)
  manifest[theme.id] = measured
  rows.push({
    id: theme.id,
    ...measured,
    mp4: `${(mp4Bytes / 1024 / 1024).toFixed(2)} MB`,
    poster: `${(bytes / 1024).toFixed(0)} KB`,
  })
}
if (total > MAX_TOTAL) throw new Error(`video total is ${(total / 1024 / 1024).toFixed(2)} MB (> 12 MB limit)`)
updateManifest(manifest)
console.table(rows)
console.log(`total mp4 ${(total / 1024 / 1024).toFixed(2)} MB`)
