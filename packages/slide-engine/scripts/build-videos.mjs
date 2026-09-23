// Procedural dynamic (video) backgrounds for the five 动态 themes.
//
// Every mode is a seamless loop: time travels round a circle in the last two
// dimensions of a 4D simplex-noise field (see lib/procedural.mjs), and anything
// that moves linearly (bokeh drift, twinkle) moves a whole number of cycles
// per loop. The first cut used 4D *value* noise, whose square lattice showed
// up as blocky horizontal streaks once the clip was upscaled; gradient noise
// has no lattice to show.
//
// Frames are shaded in linear light at 640x360 on worker threads (one per
// core) and ffmpeg upscales to 1080p with lanczos, a light blur and film grain.
// The sampler's highest frequency is well under the 360-row Nyquist limit, so
// the upscale interpolates a band-limited signal rather than inventing detail.
//
// A radial scrim is baked in (≈0.7 at the centre of the text zone rising to 1.0
// at its edge) so a moving highlight never drifts unfiltered behind lyrics.
//
// How fast the field drifts decides whether a background reads as "breathing"
// or as "busy". The loop radius comes from the speed and the loop length:
// circumference 2πR covered in SECONDS  =>  R = speed * SECONDS / 2π.
//
// usage: node scripts/build-videos.mjs [id ...]      (default: all five)
//        OUT_DIR=/tmp/x SECONDS=6 node scripts/build-videos.mjs bokeh   (preview, no manifest)
import { spawn } from 'node:child_process'
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads'
import { fileURLToPath } from 'node:url'
import os from 'node:os'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import { makeNoise, rng, lin, mixc, ramp, clamp01, smoothstep, gauss, scrim } from './lib/procedural.mjs'

const RW = Number(process.env.RW ?? 640)
const RH = Number(process.env.RH ?? 360)
const OUT_W = Number(process.env.OUT_W ?? 1920)
const OUT_H = Number(process.env.OUT_H ?? 1080)
const FPS = 24
export const SECONDS = Number(process.env.SECONDS ?? 24)
const FRAMES = SECONDS * FPS
const CRF = '23'
const BLUR = process.env.BLUR ?? '1.4'
const GRAIN = process.env.GRAIN ?? '2'
const MAX_MP4 = 2.5 * 1024 * 1024
const MAX_TOTAL = 12 * 1024 * 1024
const MAX_POSTER = 100 * 1024
const A = 16 / 9

const add = (c, col, k) => { c[0] += col[0] * k; c[1] += col[1] * k; c[2] += col[2] * k; return c }

// --- modes ------------------------------------------------------------------
// Each mode returns `(u, v, cz, cw, th) => [r, g, b]` in linear light, where
// (cz, cw) is the point on the time circle and th the loop phase in radians.
// `speed` is noise units per second; the circle radius follows from it.

const modes = {
  // Silk: a sheet of broad ribbons — contour bands of a slowly warped height
  // field — with a narrow sheen along each fold, the way light catches satin.
  flow(theme) {
    const { fbm4 } = makeNoise(theme.seed)
    const tone = ramp(theme.palette)
    const hi = mixc(lin(theme.palette[3]), lin(theme.palette[4]), 0.5)
    return (u, v, cz, cw) => {
      const x = u * A, y = v
      const w1 = fbm4(x * 0.55 + 3.1, y * 0.7, cz, cw, 3)
      const w2 = fbm4(x * 0.9 - 1.7, y * 1.1 + 5.3, cz * 1.3 + 2.1, cw * 1.3 - 1.3, 3)
      // a gently tilted sheet whose height is bent by the two warps
      const h = y * 1.35 - x * 0.18 + (w1 - 0.5) * 1.3 + (w2 - 0.5) * 0.35
      const phase = h * Math.PI * 2 * 2.4
      const fold = 0.5 + 0.5 * Math.sin(phase)
      const body = fold ** 2.2
      const sheen = Math.max(0, Math.sin(phase + 0.7)) ** 24
      // the fabric crosses the lower-middle of the frame and fades out at the top
      const band = gauss(y - (0.7 + 0.1 * (w1 - 0.5)), 0.3)
      const col = [...tone(clamp01((0.1 + body * 0.48) * band))]
      add(col, hi, sheen * band * band * 0.1)
      return col
    }
  },

  // Two decks of cloud drifting at different speeds, lit from a moon at the
  // top right: brightness comes from how much thinner the cloud is toward the
  // light, which gives lit rims and shadowed bellies instead of flat puffs.
  clouds(theme) {
    const { fbm4 } = makeNoise(theme.seed)
    const tone = ramp(theme.palette)
    const moonC = lin('#E4EAFF')
    const mx = 0.8 * A, my = 0.17
    const density = (x, y, cz, cw, th, k) => {
      const drift = k === 0 ? 0.3 * Math.sin(th) : -0.2 * Math.sin(th)
      const f = k === 0 ? 0.95 : 1.7
      const n = fbm4(x * f * 0.8 + drift + k * 9.1, y * f * 2.6 + k * 4.4, cz * (1 + k * 0.2), cw * (1 + k * 0.2) + k * 3, 4)
      return Math.max(0, (n - 0.44) / 0.56)
    }
    return (u, v, cz, cw, th) => {
      const x = u * A, y = v
      const ldx = mx - x, ldy = my - y
      const ll = Math.hypot(ldx, ldy) || 1
      const ex = (ldx / ll) * 0.05, ey = (ldy / ll) * 0.05
      const moonD = Math.hypot(x - mx, y - my)
      const col = [...tone(0.08 + 0.1 * (1 - v))]
      add(col, moonC, gauss(moonD, 0.3) * 0.07)
      let cover = 0
      for (let k = 1; k >= 0; k -= 1) {
        const d = density(x, y, cz, cw, th, k)
        if (d <= 0) continue
        const lit = clamp01((d - density(x + ex, y + ey, cz, cw, th, k)) * 3 + 0.35)
        const a = clamp01(d * 1.8) * (k === 0 ? 0.9 : 0.55)
        const glow = gauss(moonD, 0.55)
        const c = tone(clamp01(0.22 + lit * (0.3 + 0.5 * glow)))
        for (let i = 0; i < 3; i += 1) col[i] = col[i] * (1 - a) + c[i] * a
        cover = Math.max(cover, a)
      }
      // the moon glows through thin cloud rather than being cut out by it
      add(col, moonC, gauss(moonD, 0.045) * 0.55 * (1 - cover * 0.5) + gauss(moonD, 0.16) * 0.06)
      return col
    }
  },

  // Angular noise round an off-canvas pivot → god-rays that sway and breathe,
  // with haze between them.
  rays(theme) {
    const { fbm4, fbm2 } = makeNoise(theme.seed)
    const tone = ramp(theme.palette)
    const warm = lin(theme.palette[3])
    const px = 0.55 * A, py = -0.35
    return (u, v, cz, cw) => {
      const x = u * A, y = v
      const dx = x - px, dy = y - py
      const ang = Math.atan2(dx, dy)
      const r = Math.hypot(dx, dy)
      const n = fbm4(ang * 5, r * 0.35, cz, cw, 4)
      const beam = smoothstep(0.45, 0.8, n) * gauss(ang, 0.62) * Math.exp(-r * 0.75)
      const haze = fbm2(x * 1.4, y * 2, 4)
      const col = [...tone(0.08 + 0.1 * (1 - v) + haze * 0.05)]
      add(col, warm, beam * (0.55 + 0.6 * haze) * 0.22)
      add(col, warm, gauss(Math.hypot(x - px, y + 0.02), 0.4) * 0.3)
      return col
    }
  },

  // Out-of-focus lights on three depth planes: the near plane is larger,
  // softer and drifts faster (parallax); every disc twinkles gently. Drift is a
  // whole number of screen heights per loop and twinkle a whole number of
  // cycles, so the last frame meets the first exactly.
  bokeh(theme) {
    const top = lin(theme.palette[0])
    const bottom = lin(theme.palette[2])
    const tints = ['#FFCF70', '#FFB070', '#FFE9C2', '#A8C0FF'].map(lin)
    const random = rng(20260923)
    const discs = []
    const planes = [
      { n: 34, r: [8, 22], speed: 1, op: [0.08, 0.2], soft: 0.3 },
      { n: 22, r: [26, 60], speed: 1, op: [0.05, 0.1], soft: 0.14 },
      { n: 8, r: [60, 120], speed: 2, op: [0.025, 0.05], soft: 0.1 },
    ]
    for (const pl of planes) {
      for (let i = 0; i < pl.n; i += 1) {
        discs.push({
          x: random(), y0: random(),
          r: (pl.r[0] + random() * (pl.r[1] - pl.r[0])) / OUT_W,
          speed: pl.speed,
          sway: 0.01 + random() * 0.02, swayPhase: random() * Math.PI * 2,
          tint: tints[Math.floor(random() * (random() < 0.15 ? 4 : 3))],
          op: pl.op[0] + random() * (pl.op[1] - pl.op[0]),
          soft: pl.soft,
          tw: 1 + Math.floor(random() * 3), twPhase: random() * Math.PI * 2,
        })
      }
    }
    return (u, v, cz, cw, th) => {
      const t = th / (Math.PI * 2)
      const col = mixc(top, bottom, v)
      for (const d of discs) {
        let dy = v - ((((d.y0 - t * d.speed) % 1) + 1) % 1)
        if (dy > 0.5) dy -= 1
        else if (dy < -0.5) dy += 1
        const dx = u - d.x - d.sway * Math.sin(th + d.swayPhase)
        const dist = Math.hypot(dx, dy * (OUT_H / OUT_W)) / d.r
        if (dist > 1 + d.soft * 2) continue
        const edge = 1 - smoothstep(1 - d.soft, 1 + d.soft, dist)
        const rim = 0.8 + 0.2 * smoothstep(0.55, 0.97, dist)
        const twinkle = 0.75 + 0.25 * Math.sin(th * d.tw + d.twPhase)
        add(col, d.tint, d.op * edge * rim * twinkle)
      }
      return col
    }
  },
}

// --- themes -----------------------------------------------------------------
const themes = [
  { id: 'flow-deep', mode: 'flow', seed: 3, speed: 0.05, palette: ['#030C19', '#072741', '#0B4D66', '#1E9BAA', '#A8F0EC'] },
  { id: 'flow-sanctuary', mode: 'flow', seed: 5, speed: 0.05, palette: ['#110613', '#2E1030', '#62244D', '#B8683F', '#FFDDA0'] },
  { id: 'clouds', mode: 'clouds', seed: 7, speed: 0.045, crf: '27', palette: ['#04070F', '#0A1228', '#1C2A52', '#56689C', '#C9D3F0'] },
  { id: 'rays-motion', mode: 'rays', seed: 9, speed: 0.06, palette: ['#0E1720', '#1A2A36', '#5A4D34', '#E9C877', '#FFF3D0'] },
  { id: 'bokeh', mode: 'bokeh', seed: 11, speed: 0, palette: ['#080C1A', '#10152B', '#1A1F42', '#FFD27A', '#FFF3D0'] },
]

function shadeFrame(sampler, theme, f) {
  const buf = Buffer.alloc(RW * RH * 3)
  const R = (theme.speed * SECONDS) / (2 * Math.PI)
  const th = (f / FRAMES) * Math.PI * 2
  const cz = R * Math.cos(th), cw = R * Math.sin(th)
  const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)
  let p = 0
  for (let y = 0; y < RH; y += 1) {
    const v = (y + 0.5) / RH
    for (let x = 0; x < RW; x += 1) {
      const u = (x + 0.5) / RW
      const c = sampler(u, v, cz, cw, th)
      const k = scrim(u, v, 0.7)
      for (let i = 0; i < 3; i += 1) buf[p++] = Math.max(0, Math.min(255, Math.round(toSrgb(clamp01(c[i] * k)) * 255)))
    }
  }
  return buf
}

// --- worker -------------------------------------------------------------------
if (!isMainThread) {
  const { id, lane, lanes } = workerData
  const theme = themes.find((t) => t.id === id)
  const sampler = modes[theme.mode](theme)
  for (let f = lane; f < FRAMES; f += lanes) {
    const buf = shadeFrame(sampler, theme, f)
    parentPort.postMessage({ f, buf }, [buf.buffer])
  }
  parentPort.postMessage({ done: true })
}

// --- main ---------------------------------------------------------------------
async function renderTheme(theme, outDir) {
  const mp4 = path.join(outDir, `${theme.id}.mp4`)
  const ff = spawn(FFMPEG(), [
    '-v', 'error', '-y',
    '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${RW}x${RH}`, '-r', String(FPS), '-i', '-',
    '-vf', `scale=${OUT_W}:${OUT_H}:flags=lanczos,gblur=sigma=${BLUR},noise=alls=${GRAIN}:allf=t,format=yuv420p`,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', process.env.CRF ?? theme.crf ?? CRF, '-movflags', '+faststart', '-an',
    mp4,
  ])
  ff.stderr.on('data', (d) => process.stderr.write(d))

  const lanes = Math.max(1, os.cpus().length - 2)
  const pending = new Map()
  let next = 0
  const started = Date.now()
  const flush = async () => {
    while (pending.has(next)) {
      const buf = pending.get(next)
      pending.delete(next)
      if (!ff.stdin.write(buf)) await new Promise((res) => ff.stdin.once('drain', res))
      if (next % FPS === 0) process.stdout.write(`\r  ${theme.id} frame ${next}/${FRAMES}  ${((Date.now() - started) / 1000).toFixed(1)}s`)
      next += 1
    }
  }
  let writing = Promise.resolve()
  await Promise.all(Array.from({ length: lanes }, (_, lane) => new Promise((resolve, reject) => {
    const w = new Worker(fileURLToPath(import.meta.url), { workerData: { id: theme.id, lane, lanes } })
    w.on('message', (msg) => {
      if (msg.done) { resolve(); return }
      pending.set(msg.f, Buffer.from(msg.buf))
      writing = writing.then(flush)
    })
    w.on('error', reject)
  })))
  await writing
  await flush()
  ff.stdin.end()
  const code = await new Promise((res) => ff.on('close', res))
  if (code !== 0) throw new Error(`ffmpeg exited ${code} for ${theme.id}`)
  process.stdout.write(`\r  ${theme.id} rendered in ${((Date.now() - started) / 1000).toFixed(1)}s        \n`)
  return mp4
}

function FFMPEG() { return process.env.FFMPEG ?? '/opt/homebrew/bin/ffmpeg' }

async function buildPoster(theme, mp4, outDir) {
  const poster = path.join(outDir, `${theme.id}.jpg`)
  const tmp = path.join(outDir, `${theme.id}.frame0.png`)
  await new Promise((res, rej) => {
    const ff = spawn(FFMPEG(), ['-v', 'error', '-y', '-i', mp4, '-frames:v', '1', tmp])
    ff.stderr.on('data', (d) => process.stderr.write(d))
    ff.on('close', (code) => (code === 0 ? res() : rej(new Error(`poster ffmpeg exited ${code}`))))
  })
  let bytes = 0
  for (const quality of [84, 78, 72]) {
    await sharp(tmp).jpeg({ quality, mozjpeg: true, chromaSubsampling: quality >= 80 ? '4:4:4' : '4:2:0' }).toFile(poster)
    bytes = fs.statSync(poster).size
    if (bytes <= MAX_POSTER) break
  }
  fs.rmSync(tmp)
  if (bytes > MAX_POSTER) throw new Error(`${theme.id}.jpg is ${(bytes / 1024).toFixed(0)} KB (> 100 KB limit)`)
  return { poster, bytes }
}

if (isMainThread) {
  const { measureBackground, updateManifest, THEMES_DIR } = await import('./measure.mjs')
  const only = process.argv.slice(2)
  const selected = only.length ? themes.filter((t) => only.includes(t.id)) : themes
  if (!selected.length) throw new Error(`no such video theme: ${only.join(', ')}`)

  const preview = Boolean(process.env.OUT_DIR)
  const outDir = process.env.OUT_DIR ?? path.join(THEMES_DIR, 'video')
  fs.mkdirSync(outDir, { recursive: true })
  const manifest = {}
  const rows = []
  let total = 0
  for (const theme of selected) {
    const mp4 = await renderTheme(theme, outDir)
    const mp4Bytes = fs.statSync(mp4).size
    if (mp4Bytes > MAX_MP4 && !preview) throw new Error(`${theme.id}.mp4 is ${(mp4Bytes / 1024 / 1024).toFixed(2)} MB (> 2.5 MB limit)`)
    total += mp4Bytes
    const { poster, bytes } = await buildPoster(theme, mp4, outDir)
    const measured = await measureBackground(poster)
    manifest[theme.id] = measured
    rows.push({ id: theme.id, ...measured, mp4: `${(mp4Bytes / 1024 / 1024).toFixed(2)} MB`, poster: `${(bytes / 1024).toFixed(0)} KB` })
  }
  if (total > MAX_TOTAL && !preview) throw new Error(`video total is ${(total / 1024 / 1024).toFixed(2)} MB (> 12 MB limit)`)
  if (!preview) updateManifest(manifest)
  console.table(rows)
  console.log(`total mp4 ${(total / 1024 / 1024).toFixed(2)} MB`)
}
