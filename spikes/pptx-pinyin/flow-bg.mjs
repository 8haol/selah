// Procedural "flowing light" (流光 / aurora) background renderer.
//
// Renders a seamless loop: 4D value-noise fbm where time moves along a circle
// in the last two dimensions, so frame N wraps perfectly to frame 0. Domain
// warping + horizontal stretching gives the flowing-band look. Frames are
// streamed to ffmpeg as raw RGB and upscaled with a soft blur (the background
// is meant to be atmospheric, not sharp).
//
// usage: node flow-bg.mjs [theme=deep] [seconds=8] [fps=24]
import { spawn } from 'node:child_process'
import path from 'node:path'
import fs from 'node:fs'

const themeId = process.argv[2] ?? 'deep'
const SECONDS = Number(process.argv[3] ?? 8)
const FPS = Number(process.argv[4] ?? 24)
const RW = 384, RH = 216           // render size; upscaled by ffmpeg to 1280×720
const OUT_W = 1280, OUT_H = 720
const FRAMES = SECONDS * FPS

// Palettes: 4 stops from dark to highlight, matching themes.mjs colours.
const palettes = {
  deep:      ['#04101F', '#0A2E4C', '#0E5F7A', '#22B3BF', '#B8F5F2'],
  night:     ['#04060E', '#0A1030', '#22307A', '#7E6BE0', '#D7CCFF'],
  sanctuary: ['#150818', '#3A1638', '#7A2E5A', '#D98A4F', '#FFE3A8'],
  meadow:    ['#06261B', '#1B6B47', '#3E9B62', '#B9DE6A', '#FFF6C2'],
}
const pal = (palettes[themeId] ?? palettes.deep).map((h) => [0, 2, 4].map((i) => parseInt(h.slice(1 + i, 3 + i), 16)))

// --- 4D value noise ---------------------------------------------------------
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
  for (let dw = 0; dw <= 1; dw++) {
    const ww = dw ? wf : 1 - wf
    for (let dz = 0; dz <= 1; dz++) {
      const wz = dz ? zf : 1 - zf
      for (let dy = 0; dy <= 1; dy++) {
        const wy = dy ? yf : 1 - yf
        for (let dx = 0; dx <= 1; dx++) {
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
  for (let i = 0; i < oct; i++) { s += a * noise4(x * f, y * f, z * f, w * f); n += a; a *= 0.5; f *= 2.03 }
  return s / n
}

// --- colour mapping -----------------------------------------------------------
function mapColor(v) {
  // v in [0,1] → 4-stop gradient, slightly gamma-lifted for glow
  v = Math.min(1, Math.max(0, v))
  const t = v * 4, i = Math.min(3, Math.floor(t)), f = t - i
  const a = pal[i], b = pal[i + 1]
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]
}

// --- render -----------------------------------------------------------------
const outDir = path.resolve('out/video')
fs.mkdirSync(outDir, { recursive: true })
const outFile = path.join(outDir, `flow-${themeId}.mp4`)

const ff = spawn('ffmpeg', [
  '-v', 'error', '-y',
  '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${RW}x${RH}`, '-r', String(FPS), '-i', '-',
  '-vf', `scale=${OUT_W}:${OUT_H}:flags=lanczos,gblur=sigma=6,noise=alls=4:allf=t,format=yuv420p`,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '23', '-movflags', '+faststart', '-an',
  outFile,
])
ff.stderr.on('data', (d) => process.stderr.write(d))

const frame = Buffer.alloc(RW * RH * 3)
const R = 0.9 // loop radius in noise space
const t0 = Date.now()
for (let fIdx = 0; fIdx < FRAMES; fIdx++) {
  const th = (fIdx / FRAMES) * Math.PI * 2
  const cz = R * Math.cos(th), cw = R * Math.sin(th)
  let p = 0
  for (let y = 0; y < RH; y++) {
    const v = y / RH
    for (let x = 0; x < RW; x++) {
      const u = x / RW
      // domain warp: two low-frequency fields push the sampling point around
      const qx = fbm(u * 1.6 + 3.1, v * 2.2, cz, cw, 3)
      const qy = fbm(u * 1.6 - 1.7, v * 2.2 + 5.3, cz + 2.1, cw - 1.3, 3)
      // stretched horizontally → flowing bands
      const nx = u * 1.1 + (qx - 0.5) * 1.4
      const ny = v * 3.6 + (qy - 0.5) * 1.1
      let n = fbm(nx, ny, cz * 1.3 + 7.7, cw * 1.3 + 4.2, 4)
      n = (n - 0.5) * 1.7 + 0.5
      // light ribbons: very stretched field, thresholded into soft bright streaks
      const sx = u * 0.7 + (qx - 0.5) * 0.9 + 11.3
      const sy = v * 7.5 + (qy - 0.5) * 2.4 + 2.9
      const rib = fbm(sx, sy, cz * 0.9 - 3.3, cw * 0.9 + 6.1, 3)
      const streak = Math.pow(Math.max(0, (rib - 0.52) / 0.48), 2.2) * 0.9
      // vertical vignette: brighter around the lower-middle, calmer at top/bottom
      const band = Math.exp(-Math.pow((v - 0.58) / 0.45, 2))
      const glow = Math.min(1, Math.pow(Math.max(0, n), 1.5) * (0.5 + 0.5 * band) * 0.85 + streak * band)
      const [r, g, b] = mapColor(glow)
      frame[p++] = r; frame[p++] = g; frame[p++] = b
    }
  }
  if (!ff.stdin.write(frame)) await new Promise((res) => ff.stdin.once('drain', res))
  if (fIdx % FPS === 0) process.stdout.write(`\rframe ${fIdx}/${FRAMES}  ${((Date.now() - t0) / 1000).toFixed(1)}s`)
}
ff.stdin.end()
await new Promise((res) => ff.on('close', res))
console.log(`\nwrote ${outFile} ${(fs.statSync(outFile).size / 1024).toFixed(0)} KB`)
