// Procedural still backgrounds for the twelve 照片 themes.
//
// Each theme is painted per pixel in linear light (see lib/procedural.mjs):
// gradient noise for mist, cloud and texture, proper light falloff for glows
// and shafts, crisp anti-aliased silhouettes for the cross and dove, and a
// dither + grain finish so dark gradients never band. The old version stacked
// huge Gaussian-blurred SVG circles, which is what made every theme read as a
// muddy blur with nothing in focus.
//
// Every dark theme bakes the same text-zone scrim the video themes use, so a
// highlight can never sit at full strength behind the lyrics; the measured
// average / p95 in manifest.json are what the contrast test checks.
//
// usage: node scripts/build-backgrounds.mjs [id ...]      (default: all twelve)
//        OUT_DIR=/tmp/x SCALE=0.5 node scripts/build-backgrounds.mjs   (preview, no manifest)
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { measureBackground, updateManifest, THEMES_DIR } from './measure.mjs'
import { Canvas, makeNoise, rng, lin, mixc, ramp, mix, clamp01, smoothstep, gauss, scrim, vignette } from './lib/procedural.mjs'

const SCALE = Number(process.env.SCALE ?? 1)
const W = Math.round(1920 * SCALE)
const H = Math.round(1080 * SCALE)
const A = W / H
const MAX_BYTES = 100 * 1024

const add = (c, col, k) => { c[0] += col[0] * k; c[1] += col[1] * k; c[2] += col[2] * k; return c }
const scale3 = (c, k) => [c[0] * k, c[1] * k, c[2] * k]

/** Signed distance to a latin cross (upright + beam), in aspect space. */
function crossDist(x, y, cx, cy, height, beamY, beamHalf, thick) {
  const dUp = Math.max(Math.abs(x - cx) - thick, Math.abs(y - (cy + height / 2)) - height / 2)
  const dBeam = Math.max(Math.abs(x - cx) - beamHalf, Math.abs(y - beamY) - thick)
  return Math.min(dUp, dBeam)
}

/** Stars splatted into the canvas; `density(u, v)` in 0..1 thins them out. */
function starfield(canvas, { seed, count, density = () => 1, tint = ['#FFFFFF', '#D6E0FF', '#DCE6FF', '#FFF1DC'], bright = 1 }) {
  const random = rng(seed)
  const tints = tint.map(lin)
  for (let i = 0; i < count; i += 1) {
    const u = random(), v = random()
    if (random() > density(u, v)) continue
    const m = random() ** 4
    const r = Math.max(0.5, (0.5 + m * 1.1) * SCALE)
    const col = tints[Math.floor(random() * tints.length)]
    canvas.splat(u * W, v * H, r, col, (0.1 + m * 1.1) * bright)
    if (m > 0.9) canvas.splat(u * W, v * H, r * 6, col, 0.03 * bright)
  }
}

/** Slow drifting dust motes inside a mask. */
function motes(canvas, { seed, count, mask, color, size = [0.8, 2.6], intensity = [0.05, 0.25] }) {
  const random = rng(seed)
  const col = lin(color)
  for (let i = 0; i < count; i += 1) {
    const u = random(), v = random()
    const m = mask(u, v)
    if (random() > m) continue
    const r = mix(size[0], size[1], random() ** 2) * SCALE
    canvas.splat(u * W, v * H, r, col, mix(intensity[0], intensity[1], random()) * m)
  }
}

const themes = [
  // 夜空 — deep blue-black, a faint diagonal milky way in the upper right, crisp stars.
  {
    id: 'night',
    paint() {
      const { fbm2, n2 } = makeNoise(7)
      const sky = ramp(['#02030A', '#060B22', '#0D1744'], [0, 0.6, 1])
      const nebA = lin('#3A4FD0'), nebB = lin('#7A48C8'), nebC = lin('#1E6FB8')
      const c = new Canvas(W, H).shade((u, v, x, y) => {
        const col = [...sky(v * 0.85 + (1 - u) * 0.15)]
        // band from lower-left-centre to the top-right corner
        const d = (y - (0.95 - 0.62 * x)) / 1.18
        const band = gauss(d, 0.2)
        const warp = fbm2(x * 1.8, y * 1.8, 4)
        const neb = fbm2(x * 2.4 + warp * 1.6, y * 2.4 - warp, 6)
        const dust = smoothstep(0.52, 0.7, fbm2(x * 5 + 3, y * 5 - 2, 5))
        const glow = Math.max(0, neb - 0.38) * 1.6 * band * (1 - dust * 0.75)
        add(col, mixc(nebA, nebB, smoothstep(0.3, 0.8, n2(x * 0.9, y * 0.9) * 0.5 + 0.5)), glow * 0.16)
        add(col, nebC, gauss(d, 0.5) * 0.012)
        return col
      })
      starfield(c, { seed: 71, count: 2600, density: (u, v) => 0.35 + 0.65 * gauss((v - (0.95 - 0.62 * u * A)) / 1.18, 0.25) })
      return c.multiply((u, v) => scrim(u, v, 0.78) * vignette(u, v, 0.3))
    },
  },

  // 圣殿 — plum sanctuary wall, a warm cone of light from a high window, dust in the beam.
  {
    id: 'sanctuary',
    paint() {
      const { fbm2, n2 } = makeNoise(11)
      const wall = ramp(['#1B0819', '#2E0F2C', '#3B1535', '#1A0816'], [0, 0.35, 0.7, 1])
      const gold = lin('#F2C478'), ember = lin('#B24A3A'), rose = lin('#7A2A55')
      const apexX = 0.5 * A, apexY = -0.35
      const beam = (x, y) => {
        const dx = x - apexX, dy = y - apexY
        const ang = Math.atan2(dx, dy)
        const cone = gauss(ang, 0.34)
        const shafts = 0.55 + 0.45 * smoothstep(0.35, 0.75, fbm2(ang * 9, 0.3, 4))
        return cone * shafts
      }
      const c = new Canvas(W, H).shade((u, v, x, y) => {
        const col = [...wall(v)]
        const mist = fbm2(x * 2.2, y * 2.6, 5)
        const b = beam(x, y) * (0.55 + 0.45 * mist) * (1 - smoothstep(0.1, 1.05, v) * 0.75)
        add(col, gold, b * 0.13)
        add(col, gold, gauss(Math.hypot(x - apexX, y + 0.05), 0.42) * 0.22)
        add(col, rose, gauss(Math.hypot(x - 0.1 * A, y - 1.05), 0.55) * 0.07 * (0.6 + 0.4 * n2(x * 2, y * 2)))
        add(col, ember, gauss(Math.hypot(x - 0.95 * A, y - 1.02), 0.45) * 0.045)
        return col
      })
      motes(c, { seed: 12, count: 900, color: '#FFE2A6', mask: (u, v) => beam(u * A, v) * (1 - v * 0.6), intensity: [0.04, 0.22] })
      return c.multiply((u, v) => scrim(u, v, 0.74) * vignette(u, v, 0.38))
    },
  },

  // 深海 — looking up from below: caustic light at the surface, shafts, marine snow.
  {
    id: 'deep',
    paint() {
      const { fbm2, n3 } = makeNoise(23)
      const water = ramp(['#0B5E78', '#08395A', '#051F38', '#030C1C'], [0, 0.3, 0.65, 1])
      const cyan = lin('#5FE3E8'), teal = lin('#1AA6B8')
      const apexX = 0.62 * A, apexY = -0.6
      const shafts = (x, y) => {
        const ang = Math.atan2(x - apexX, y - apexY)
        return smoothstep(0.42, 0.78, fbm2(ang * 14, 1.7, 3)) * gauss(ang, 0.55)
      }
      const c = new Canvas(W, H).shade((u, v, x, y) => {
        const col = [...water(v)]
        // caustics: ridged network of warped noise, strongest near the surface
        const wx = x * 3.2 + 0.6 * fbm2(x * 1.4, y * 1.4, 3), wy = y * 5.5
        const r1 = 1 - Math.abs(n3(wx, wy, 0.3)), r2 = 1 - Math.abs(n3(wx * 1.9 + 4, wy * 1.9, 2.1))
        const caustic = (r1 ** 9 * 0.7 + r2 ** 9 * 0.45) * (1 - smoothstep(0.02, 0.42, v))
        add(col, cyan, caustic * 0.35)
        add(col, teal, shafts(x, y) * (1 - smoothstep(0, 0.95, v)) * 0.12)
        add(col, teal, gauss(Math.hypot(x - 0.62 * A, y + 0.1), 0.55) * 0.12)
        return col
      })
      motes(c, { seed: 24, count: 1100, color: '#BFEFF2', mask: (u, v) => 0.25 + 0.75 * (1 - v), size: [0.6, 2.2], intensity: [0.03, 0.14] })
      return c.multiply((u, v) => scrim(u, v, 0.72) * vignette(u, v, 0.35))
    },
  },

  // 青草地 — dusk over rolling green hills: each ridge fades into the haze behind it, low sun at the right.
  {
    id: 'meadow',
    paint() {
      const { fbm2 } = makeNoise(31)
      const sky = ramp(['#081A1C', '#112B29', '#233F33', '#5C6C45', '#A8A266'], [0, 0.4, 0.72, 0.9, 1])
      const sun = lin('#FFE9A6'), hazeC = lin('#A8BE82')
      const ridges = [
        { base: 0.63, amp: 0.05, freq: 0.9, col: lin('#4F6E48'), seed: 1 },
        { base: 0.72, amp: 0.06, freq: 1.2, col: lin('#2D5236'), seed: 2 },
        { base: 0.83, amp: 0.06, freq: 1.5, col: lin('#163A25'), seed: 3 },
        { base: 0.93, amp: 0.05, freq: 1.9, col: lin('#0A2216'), seed: 4 },
      ]
      const sunX = 0.88 * A, sunY = 0.61
      const c = new Canvas(W, H).shade((u, v, x, y) => {
        const sd = Math.hypot(x - sunX, y - sunY)
        let col = [...sky(clamp01(y / 0.66) * (1 - 0.25 * smoothstep(0, 1.2, Math.abs(x - sunX))))]
        add(col, sun, gauss(sd, 0.026) * 1.6 + gauss(sd, 0.09) * 0.16 + gauss(sd, 0.3) * 0.05 + gauss(sd, 0.9) * 0.025)
        for (const [i, r] of ridges.entries()) {
          const h = r.base - r.amp * (fbm2(x * r.freq + r.seed * 7, r.seed * 3.1, 3) - 0.5) * 2.4
          const aa = 1.4 / H
          const cover = smoothstep(h - aa, h + aa, y)
          if (cover <= 0) continue
          // lit from the sun side, darker into the valley, haze strongest on far ridges
          const depth = smoothstep(h, h + 0.12, y)
          let rc = mixc(r.col, scale3(r.col, 0.7), depth)
          if (i === ridges.length - 1) rc = scale3(rc, 0.9 + 0.2 * fbm2(x * 30, y * 70, 3))
          add(rc, sun, gauss(sd, 0.6) * (1 - depth) * 0.06 * (1 - i / ridges.length))
          col = mixc(col, rc, cover)
        }
        // valley mist hanging just above each ridge line
        const mist = smoothstep(0.35, 0.75, fbm2(x * 1.2, y * 5, 4)) * gauss(y - 0.74, 0.1)
        col = mixc(col, hazeC, mist * 0.14)
        return col
      })
      return c.multiply((u, v) => scrim(u, v, 0.66) * vignette(u, v, 0.35))
    },
  },

  // 晨光 — pale peach-to-lavender sky, soft stratus wisps, sunrise glow low left. Dark text.
  {
    id: 'dawn',
    paint() {
      const { fbm2 } = makeNoise(41)
      const sky = ramp(['#C7C1F0', '#DCCCEE', '#F2D6E4', '#FCE3D2', '#FFF1E2'], [0, 0.35, 0.6, 0.85, 1])
      const warm = lin('#FFF6EA'), cloud = lin('#FFFFFF'), shade = lin('#B7AEE0')
      return new Canvas(W, H).shade((u, v, x, y) => {
        const t = clamp01(v * 0.7 + (1 - u) * 0.35)
        let col = [...sky(t)]
        const sd = Math.hypot(x - 0.18 * A, y - 0.92)
        add(col, warm, gauss(sd, 0.55) * 0.2)
        const wisps = smoothstep(0.5, 0.78, fbm2(x * 1.6, y * 6.5 + fbm2(x, y, 3), 6))
        col = mixc(col, cloud, wisps * 0.35)
        const under = smoothstep(0.52, 0.72, fbm2(x * 1.6, y * 6.5 + 0.08 + fbm2(x, y, 3), 6))
        col = mixc(col, shade, (under - wisps) * 0.1)
        // keep the lyric block evenly pale
        return mixc(col, lin('#F4E4EC'), 0.35 * (1 - smoothstep(0, 0.6, Math.hypot((u - 0.5) * A, v - 0.54))))
      })
    },
  },

  // 纸 — warm cotton paper: low mottling, fibres, faint deckle darkening at the edges.
  {
    id: 'paper',
    grain: 0.006,
    paint() {
      const { fbm2, n2 } = makeNoise(51)
      const base = lin('#F6F0E4'), deep = lin('#E7DAC2'), fibre = lin('#D9C9AC')
      return new Canvas(W, H).shade((u, v, x, y) => {
        const mottle = fbm2(x * 3, y * 3, 5)
        let col = mixc(base, deep, smoothstep(0.35, 0.85, mottle) * 0.35)
        const f1 = 1 - Math.abs(n2(x * 7, y * 160)), f2 = 1 - Math.abs(n2(x * 150 + 3, y * 9))
        col = mixc(col, fibre, (f1 ** 14 + f2 ** 14) * 0.18)
        const edge = smoothstep(0.35, 0.72, Math.hypot((u - 0.5) * 1.3, v - 0.5))
        col = mixc(col, deep, edge * 0.45)
        return col
      })
    },
  },

  // 十架晨光 — sunrise over a hill, a crisp cross on the ridge against the sun.
  {
    id: 'cross-dawn',
    paint() {
      const { fbm2 } = makeNoise(61)
      const sky = ramp(['#0B1230', '#1A1D44', '#382A55', '#7A3F44', '#B8663C', '#E3A45E'], [0, 0.35, 0.58, 0.72, 0.8, 0.84])
      const sunC = lin('#FFE3A0'), ray = lin('#F6C86A'), cloudLit = lin('#F2A266')
      const sunX = 0.79 * A, sunY = 0.76
      const hill = (x) => 0.84 - 0.1 * gauss(x - 0.79 * A, 0.45) - 0.012 * (fbm2(x * 3, 0.5, 3) - 0.5)
      const crossX = 0.79 * A, crossBase = hill(0.79 * A) + 0.005
      return new Canvas(W, H).shade((u, v, x, y) => {
        let col = [...sky(y)]
        const sd = Math.hypot(x - sunX, y - sunY)
        add(col, sunC, gauss(sd, 0.04) * 1.2 + gauss(sd, 0.16) * 0.22 + gauss(sd, 0.6) * 0.05)
        const ang = Math.atan2(y - sunY, x - sunX)
        add(col, ray, smoothstep(0.55, 0.85, fbm2(ang * 10, 0.5, 3)) * gauss(sd, 0.9) * 0.1 * (y < sunY ? 1 : 0.3))
        // thin stratus lit from below near the horizon
        const strat = smoothstep(0.55, 0.8, fbm2(x * 1.2, y * 14, 5)) * gauss(y - 0.66, 0.1)
        col = mixc(col, mixc(cloudLit, [0.05, 0.03, 0.06], smoothstep(0.5, 0.7, y) * 0), strat * 0.35 * (0.4 + gauss(sd, 0.5)))
        // hill silhouette
        const aa = 1.2 / H
        const h = hill(x)
        const land = smoothstep(h - aa, h + aa, y)
        col = mixc(col, mixc(lin('#120F1C'), lin('#07060C'), smoothstep(h, 1, y)), land)
        // the cross
        const d = crossDist(x, y, crossX, crossBase - 0.34, 0.34, crossBase - 0.26, 0.085, 0.0105)
        const cover = 1 - smoothstep(-aa, aa, d)
        col = mixc(col, lin('#07060C'), cover)
        add(col, sunC, gauss(Math.max(0, d), 0.004) * (1 - cover) * 0.25 * gauss(sd, 0.25))
        return col
      }).multiply((u, v) => scrim(u, v, 0.66) * vignette(u, v, 0.3))
    },
  },

  // 光之十架 — a thin luminous cross in a dark starry sky, with a real bloom and halo.
  {
    id: 'cross-glow',
    paint() {
      const { fbm2 } = makeNoise(71)
      const sky = ramp(['#03050B', '#060B18', '#0A1224'], [0, 0.6, 1])
      const light = lin('#FFF1D2'), cool = lin('#8FB2FF')
      const cx = 0.83 * A, top = 0.13, height = 0.42, beamY = 0.26, beamHalf = 0.1, thick = 0.0032
      const c = new Canvas(W, H).shade((u, v, x, y) => {
        const col = [...sky(v)]
        add(col, cool, smoothstep(0.45, 0.8, fbm2(x * 1.5, y * 1.5, 5)) * 0.018)
        const d = Math.max(0, crossDist(x, y, cx, top, height, beamY, beamHalf, thick))
        const core = 1 - smoothstep(0, 1.2 / H, d)
        add(col, light, core * 1.4 + Math.exp(-d / 0.006) * 0.35 + Math.exp(-d / 0.03) * 0.1 + gauss(d, 0.14) * 0.05)
        const hd = Math.hypot(x - cx, y - beamY)
        add(col, light, gauss(hd, 0.28) * 0.05)
        return col
      })
      starfield(c, { seed: 72, count: 1600, density: (u) => 0.3 + 0.7 * u, bright: 0.7 })
      return c.multiply((u, v) => scrim(u, v, 0.8))
    },
  },

  // 光束 — shafts of light falling through mist from the upper left, dust in the beams.
  {
    id: 'rays',
    paint() {
      const { fbm2 } = makeNoise(81)
      const air = ramp(['#0D1924', '#12232F', '#172D3A', '#0D1820'], [0, 0.4, 0.75, 1])
      const warm = lin('#FFE6AE'), mistC = lin('#5C7584')
      const apexX = 0.28 * A, apexY = -0.3
      const beams = (x, y) => {
        const ang = Math.atan2(x - apexX, y - apexY)
        const r = Math.hypot(x - apexX, y - apexY)
        return smoothstep(0.42, 0.85, fbm2(ang * 6.5, 0.2, 3)) * gauss(ang - 0.3, 0.5) * Math.exp(-r * 1.1)
      }
      const c = new Canvas(W, H).shade((u, v, x, y) => {
        const col = [...air(v)]
        const mist = fbm2(x * 1.6 + fbm2(x * 0.8, y * 0.8, 3), y * 2.2, 6)
        add(col, mistC, smoothstep(0.4, 0.8, mist) * 0.05)
        add(col, warm, beams(x, y) * (0.45 + 0.8 * mist) * 0.16)
        add(col, warm, gauss(Math.hypot(x - apexX, y - apexY), 0.45) * 0.5)
        return col
      })
      motes(c, { seed: 82, count: 1200, color: '#FFE9BD', mask: (u, v) => Math.min(1, beams(u * A, v) * 1.8), intensity: [0.05, 0.3] })
      return c.multiply((u, v) => scrim(u, v, 0.72) * vignette(u, v, 0.35))
    },
  },

  // 彩窗 — out-of-focus leaded glass around the frame, lit from behind, falling into a dark nave.
  {
    id: 'stained-glass',
    postBlur: 5,
    paint() {
      const { fbm2, n2 } = makeNoise(91)
      const random = rng(92)
      // a restrained jewel palette: mostly cobalt and ruby, amber and gold accents
      const palette = [['#1E3F9E', 5], ['#8E1830', 4], ['#C9821C', 2], ['#1D6B4A', 1], ['#5A2A8E', 1], ['#E0B84A', 1]]
      const bag = palette.flatMap(([hex, n]) => Array(n).fill(lin(hex)))
      const cell = 0.07
      const cols = Math.ceil(A / cell) + 2, rows = Math.ceil(1 / cell) + 2
      const pts = []
      for (let j = 0; j < rows; j += 1) {
        for (let i = 0; i < cols; i += 1) {
          pts.push({ x: (i - 0.5 + random()) * cell, y: (j - 0.5 + random()) * cell * 1.4, col: bag[Math.floor(random() * bag.length)], k: 0.5 + random() * 0.7 })
        }
      }
      const nave = lin('#0F0A16')
      return new Canvas(W, H).shade((u, v, x, y) => {
        const gi = Math.floor(x / cell + 0.5), gj = Math.floor(y / (cell * 1.4) + 0.5)
        let d1 = 9, d2 = 9, best = null
        for (let j = gj - 2; j <= gj + 2; j += 1) {
          for (let i = gi - 2; i <= gi + 2; i += 1) {
            if (i < -1 || j < -1 || i > cols - 2) continue
            const p = pts[(j + 1) * cols + (i + 1)]
            if (!p) continue
            const d = Math.hypot(x - p.x, (y - p.y) / 1.4)
            if (d < d1) { d2 = d1; d1 = d; best = p } else if (d < d2) d2 = d
          }
        }
        const lead = smoothstep(0.003, 0.008, d2 - d1)
        const backlight = 0.35 + 0.9 * smoothstep(0.3, 0.8, fbm2(x * 1.6, y * 1.6, 4))
        const textured = 0.85 + 0.25 * n2(x * 40, y * 40)
        const glass = scale3(best.col, best.k * backlight * textured * lead * 0.42)
        // glass mostly across the top and the two sides; the middle is dark nave
        const e = Math.hypot((u - 0.5) / 0.52, (v - 0.62) / 0.62)
        const m = smoothstep(0.78, 1.08, e + 0.1 * (fbm2(x * 2.5, y * 2.5, 3) - 0.5))
        const col = mixc(nave, glass, m)
        add(col, best.col, smoothstep(0.5, 1, e) * (1 - m) * 0.03)
        return col
      }).multiply((u, v) => scrim(u, v, 0.82) * vignette(u, v, 0.25))
    },
  },

  // 白鸽 — bright soft sky, cumulus, a white dove gliding in the upper right. Dark text.
  {
    id: 'dove',
    async paint() {
      const { fbm2 } = makeNoise(101)
      const sky = ramp(['#BFD4EC', '#D3E2F3', '#E6EFF8', '#F1F6FB'], [0, 0.4, 0.75, 1])
      const cloud = lin('#FFFFFF'), shade = lin('#A9C0DC'), sun = lin('#FFFBEF')
      const mask = await doveMask()
      const c = new Canvas(W, H).shade((u, v, x, y) => {
        let col = [...sky(clamp01(v * 0.8 + u * 0.25))]
        add(col, sun, gauss(Math.hypot(x - 0.55 * A, y + 0.2), 0.5) * 0.25)
        const warp = fbm2(x * 0.9, y * 0.9, 3)
        const n = fbm2(x * 1.4 + warp, y * 2.4, 6)
        const puff = smoothstep(0.5, 0.72, n)
        const under = smoothstep(0.5, 0.72, fbm2(x * 1.4 + warp, y * 2.4 - 0.04, 6))
        col = mixc(col, shade, Math.max(0, under - puff) * 0.35)
        col = mixc(col, cloud, puff * 0.75)
        // lyric block stays evenly bright
        return mixc(col, lin('#EDF3FA'), 0.45 * (1 - smoothstep(0, 0.6, Math.hypot((u - 0.5) * A, v - 0.54))))
      })
      // soft blue shadow then the white bird
      const { w, h, px } = c
      for (let i = 0; i < w * h; i += 1) {
        const s = mask.shadow[i], a = mask.alpha[i]
        if (!s && !a) continue
        const p = i * 3
        for (let k = 0; k < 3; k += 1) {
          px[p + k] = mix(px[p + k], shade[k] * 0.8, s * 0.3 * (1 - a))
          // premultiplied edge: the colour render is already faded to black at the anti-aliased rim
          px[p + k] = mix(px[p + k], a > 0 ? mask.colour[p + k] / a : 0, a)
        }
      }
      return c
    },
  },

  // 烛光 — a warm dark room, out-of-focus candle flames along the bottom, floating embers.
  {
    id: 'candle',
    paint() {
      const { fbm2 } = makeNoise(111)
      const room = ramp(['#0E0806', '#150C08', '#1F120B', '#2A170C'], [0, 0.5, 0.8, 1])
      const flame = lin('#FFB35A'), core = lin('#FFE0A0'), amber = lin('#C8621E')
      const c = new Canvas(W, H).shade((u, v, x, y) => {
        const col = [...room(v)]
        add(col, amber, gauss(Math.hypot(x - 0.5 * A, (y - 1.12) * 1.6), 0.75) * 0.14)
        add(col, amber, smoothstep(0.45, 0.8, fbm2(x * 1.3, y * 2, 5)) * gauss(y - 0.85, 0.35) * 0.02)
        return col
      })
      const random = rng(112)
      for (let i = 0; i < 26; i += 1) {
        const u = random(), v = 0.8 + random() * 0.26
        const r = (35 + random() * 85) * SCALE * (0.6 + (v - 0.8) * 2)
        c.bokeh(u * W, v * H, r, random() < 0.3 ? core : flame, 0.07 + random() * 0.12, 0.22)
      }
      for (let i = 0; i < 5; i += 1) {
        const u = 0.12 + i * 0.19 + (random() - 0.5) * 0.06
        c.splat(u * W, (0.97 + random() * 0.05) * H, 60 * SCALE, flame, 0.3)
        c.splat(u * W, (0.97 + random() * 0.05) * H, 16 * SCALE, core, 0.5)
      }
      motes(c, { seed: 113, count: 260, color: '#FFC98A', mask: (u, v) => smoothstep(0.35, 1, v), size: [0.8, 2.4], intensity: [0.08, 0.35] })
      return c.multiply((u, v) => scrim(u, v, 0.75) * vignette(u, v, 0.4))
    },
  },
]

/** The dove as an SVG silhouette, rasterised to an alpha mask plus a soft shadow mask. */
async function doveMask() {
  // drawn in a 400×220 box, facing left, wing raised mid-glide
  const d = [
    'M 66 146 C 66 132 78 124 90 126 C 100 127 106 132 110 138 C 140 134 190 140 238 158 C 262 150 300 142 338 138 C 326 150 316 158 304 164 C 322 166 338 172 350 180 C 326 184 300 184 276 180 C 250 190 212 196 176 194 C 140 192 112 180 96 164 C 86 162 78 158 72 154 L 50 156 L 66 146 Z',
    'M 128 142 C 146 104 176 66 214 38 C 236 22 262 12 288 8 C 272 24 258 40 250 56 C 270 44 296 36 322 34 C 302 50 284 66 272 84 C 290 78 312 76 332 78 C 312 90 292 104 278 118 C 292 118 306 122 318 128 C 290 136 250 146 212 152 C 184 150 154 146 128 142 Z',
  ].join(' ')
  const bw = Math.round(400 * 0.95 * SCALE), bh = Math.round(220 * 0.95 * SCALE)
  const left = Math.round(0.7 * W), top = Math.round(0.06 * H)
  const g = `translate(${left} ${top}) scale(${bw / 400} ${bh / 220})`
  const doc = (fill, defs = '') => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><defs>${defs}</defs><rect width="${W}" height="${H}" fill="#000"/><g transform="${g}"><path d="${d}" fill="${fill}"/></g></svg>`)
  // white on top, a cool blue-grey underside so the bird reads against a pale sky
  const shading = '<linearGradient id="s" x1="0" y1="0" x2="0.15" y2="1"><stop offset="0.35" stop-color="#FFFFFF"/><stop offset="1" stop-color="#A4BBDB"/></linearGradient>'
  const grey = async (buf, blur) => {
    let img = sharp(buf)
    if (blur) img = img.blur(blur)
    const raw = await img.removeAlpha().raw().toBuffer()
    const out = new Float32Array(W * H)
    for (let i = 0; i < W * H; i += 1) out[i] = raw[i * 3] / 255
    return out
  }
  const alpha = await grey(doc('#fff'))
  const shadow = await grey(doc('#fff'), 26 * SCALE)
  const colourRaw = await sharp(doc('url(#s)', shading)).removeAlpha().raw().toBuffer()
  const colour = new Float32Array(W * H * 3)
  for (let i = 0; i < W * H * 3; i += 1) colour[i] = ((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))(colourRaw[i] / 255)
  // shadow falls down and to the left of the bird
  const off = Math.round(24 * SCALE)
  const shifted = new Float32Array(W * H)
  for (let y = off; y < H; y += 1) for (let x = 0; x < W - off; x += 1) shifted[y * W + x] = shadow[(y - off) * W + x + off]
  return { alpha, shadow: shifted, colour }
}

const outDir = process.env.OUT_DIR ?? THEMES_DIR
const preview = Boolean(process.env.OUT_DIR)
const only = process.argv.slice(2)
const selected = only.length ? themes.filter((t) => only.includes(t.id)) : themes
if (!selected.length) throw new Error(`no such still theme: ${only.join(', ')}`)
fs.mkdirSync(outDir, { recursive: true })
const manifest = {}
const rows = []
for (const theme of selected) {
  const started = Date.now()
  const canvas = await theme.paint()
  let img = sharp(canvas.toBytes({ grain: theme.grain ?? 0.01, seed: theme.id.length * 31 }), { raw: { width: W, height: H, channels: 3 } })
  if (theme.postBlur) img = sharp(await img.blur(theme.postBlur * SCALE).png().toBuffer())
  const file = path.join(outDir, `${theme.id}.jpg`)
  let bytes = 0
  for (const quality of [84, 80, 76, 72, 68]) {
    await img.clone().jpeg({ quality, mozjpeg: true, chromaSubsampling: quality >= 80 ? '4:4:4' : '4:2:0' }).toFile(file)
    bytes = fs.statSync(file).size
    if (bytes <= MAX_BYTES) break
  }
  if (bytes > MAX_BYTES && !preview) throw new Error(`${theme.id}.jpg is ${(bytes / 1024).toFixed(0)} KB (> 100 KB limit)`)
  const measured = await measureBackground(file)
  manifest[theme.id] = measured
  rows.push({ id: theme.id, ...measured, size: `${(bytes / 1024).toFixed(0)} KB`, secs: ((Date.now() - started) / 1000).toFixed(1) })
}
if (!preview) updateManifest(manifest)
console.table(rows)
