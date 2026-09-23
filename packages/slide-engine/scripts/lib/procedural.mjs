// Shared toolkit for the procedural backgrounds (stills and video loops).
//
// Everything is composed in *linear* light and only converted to sRGB at the
// very end, because glows and light shafts add up the way light does only in
// linear space — composing in sRGB is what made the old blooms look muddy.
// Noise is gradient (simplex) noise, not value noise: value noise has a visible
// square lattice, which the old videos showed as blocky horizontal streaks.

// --- seeded RNG ---------------------------------------------------------------
export function rng(seed) {
  let state = seed >>> 0
  return () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296)
}

// --- simplex noise (Gustavson), 2D / 3D / 4D, output roughly in [-1, 1] -------
const grad3 = new Float32Array([1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1])
const grad4 = new Float32Array([
  0, 1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1, 0, -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1,
  1, 0, 1, 1, 1, 0, 1, -1, 1, 0, -1, 1, 1, 0, -1, -1, -1, 0, 1, 1, -1, 0, 1, -1, -1, 0, -1, 1, -1, 0, -1, -1,
  1, 1, 0, 1, 1, 1, 0, -1, 1, -1, 0, 1, 1, -1, 0, -1, -1, 1, 0, 1, -1, 1, 0, -1, -1, -1, 0, 1, -1, -1, 0, -1,
  1, 1, 1, 0, 1, 1, -1, 0, 1, -1, 1, 0, 1, -1, -1, 0, -1, 1, 1, 0, -1, 1, -1, 0, -1, -1, 1, 0, -1, -1, -1, 0,
])

export function makeNoise(seed = 1) {
  const random = rng(seed)
  const p = new Uint8Array(256)
  for (let i = 0; i < 256; i += 1) p[i] = i
  for (let i = 255; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    const t = p[i]; p[i] = p[j]; p[j] = t
  }
  const perm = new Uint8Array(512)
  const perm12 = new Uint8Array(512)
  for (let i = 0; i < 512; i += 1) { perm[i] = p[i & 255]; perm12[i] = perm[i] % 12 }

  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6
  function n2(xin, yin) {
    const s = (xin + yin) * F2
    const i = Math.floor(xin + s), j = Math.floor(yin + s)
    const t = (i + j) * G2
    const x0 = xin - (i - t), y0 = yin - (j - t)
    const i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2
    const ii = i & 255, jj = j & 255
    let n = 0
    let t0 = 0.5 - x0 * x0 - y0 * y0
    if (t0 > 0) { const g = perm12[ii + perm[jj]] * 3; t0 *= t0; n += t0 * t0 * (grad3[g] * x0 + grad3[g + 1] * y0) }
    let t1 = 0.5 - x1 * x1 - y1 * y1
    if (t1 > 0) { const g = perm12[ii + i1 + perm[jj + j1]] * 3; t1 *= t1; n += t1 * t1 * (grad3[g] * x1 + grad3[g + 1] * y1) }
    let t2 = 0.5 - x2 * x2 - y2 * y2
    if (t2 > 0) { const g = perm12[ii + 1 + perm[jj + 1]] * 3; t2 *= t2; n += t2 * t2 * (grad3[g] * x2 + grad3[g + 1] * y2) }
    return 70 * n
  }

  const F3 = 1 / 3, G3 = 1 / 6
  function n3(xin, yin, zin) {
    const s = (xin + yin + zin) * F3
    const i = Math.floor(xin + s), j = Math.floor(yin + s), k = Math.floor(zin + s)
    const t = (i + j + k) * G3
    const x0 = xin - (i - t), y0 = yin - (j - t), z0 = zin - (k - t)
    let i1, j1, k1, i2, j2, k2
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0 }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1 }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1 }
    } else if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1 }
    else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1 }
    else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0 }
    const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3
    const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3
    const x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3
    const ii = i & 255, jj = j & 255, kk = k & 255
    let n = 0
    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0
    if (t0 > 0) { const g = perm12[ii + perm[jj + perm[kk]]] * 3; t0 *= t0; n += t0 * t0 * (grad3[g] * x0 + grad3[g + 1] * y0 + grad3[g + 2] * z0) }
    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1
    if (t1 > 0) { const g = perm12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3; t1 *= t1; n += t1 * t1 * (grad3[g] * x1 + grad3[g + 1] * y1 + grad3[g + 2] * z1) }
    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2
    if (t2 > 0) { const g = perm12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3; t2 *= t2; n += t2 * t2 * (grad3[g] * x2 + grad3[g + 1] * y2 + grad3[g + 2] * z2) }
    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3
    if (t3 > 0) { const g = perm12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3; t3 *= t3; n += t3 * t3 * (grad3[g] * x3 + grad3[g + 1] * y3 + grad3[g + 2] * z3) }
    return 32 * n
  }

  const F4 = (Math.sqrt(5) - 1) / 4, G4 = (5 - Math.sqrt(5)) / 20
  function n4(x, y, z, w) {
    const s = (x + y + z + w) * F4
    const i = Math.floor(x + s), j = Math.floor(y + s), k = Math.floor(z + s), l = Math.floor(w + s)
    const t = (i + j + k + l) * G4
    const x0 = x - (i - t), y0 = y - (j - t), z0 = z - (k - t), w0 = w - (l - t)
    let rx = 0, ry = 0, rz = 0, rw = 0
    if (x0 > y0) rx++; else ry++
    if (x0 > z0) rx++; else rz++
    if (x0 > w0) rx++; else rw++
    if (y0 > z0) ry++; else rz++
    if (y0 > w0) ry++; else rw++
    if (z0 > w0) rz++; else rw++
    const i1 = rx >= 3 ? 1 : 0, j1 = ry >= 3 ? 1 : 0, k1 = rz >= 3 ? 1 : 0, l1 = rw >= 3 ? 1 : 0
    const i2 = rx >= 2 ? 1 : 0, j2 = ry >= 2 ? 1 : 0, k2 = rz >= 2 ? 1 : 0, l2 = rw >= 2 ? 1 : 0
    const i3 = rx >= 1 ? 1 : 0, j3 = ry >= 1 ? 1 : 0, k3 = rz >= 1 ? 1 : 0, l3 = rw >= 1 ? 1 : 0
    const x1 = x0 - i1 + G4, y1 = y0 - j1 + G4, z1 = z0 - k1 + G4, w1 = w0 - l1 + G4
    const x2 = x0 - i2 + 2 * G4, y2 = y0 - j2 + 2 * G4, z2 = z0 - k2 + 2 * G4, w2 = w0 - l2 + 2 * G4
    const x3 = x0 - i3 + 3 * G4, y3 = y0 - j3 + 3 * G4, z3 = z0 - k3 + 3 * G4, w3 = w0 - l3 + 3 * G4
    const x4 = x0 - 1 + 4 * G4, y4 = y0 - 1 + 4 * G4, z4 = z0 - 1 + 4 * G4, w4 = w0 - 1 + 4 * G4
    const ii = i & 255, jj = j & 255, kk = k & 255, ll = l & 255
    let n = 0
    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0 - w0 * w0
    if (t0 > 0) { const g = (perm[ii + perm[jj + perm[kk + perm[ll]]]] % 32) * 4; t0 *= t0; n += t0 * t0 * (grad4[g] * x0 + grad4[g + 1] * y0 + grad4[g + 2] * z0 + grad4[g + 3] * w0) }
    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1 - w1 * w1
    if (t1 > 0) { const g = (perm[ii + i1 + perm[jj + j1 + perm[kk + k1 + perm[ll + l1]]]] % 32) * 4; t1 *= t1; n += t1 * t1 * (grad4[g] * x1 + grad4[g + 1] * y1 + grad4[g + 2] * z1 + grad4[g + 3] * w1) }
    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2 - w2 * w2
    if (t2 > 0) { const g = (perm[ii + i2 + perm[jj + j2 + perm[kk + k2 + perm[ll + l2]]]] % 32) * 4; t2 *= t2; n += t2 * t2 * (grad4[g] * x2 + grad4[g + 1] * y2 + grad4[g + 2] * z2 + grad4[g + 3] * w2) }
    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3 - w3 * w3
    if (t3 > 0) { const g = (perm[ii + i3 + perm[jj + j3 + perm[kk + k3 + perm[ll + l3]]]] % 32) * 4; t3 *= t3; n += t3 * t3 * (grad4[g] * x3 + grad4[g + 1] * y3 + grad4[g + 2] * z3 + grad4[g + 3] * w3) }
    let t4 = 0.6 - x4 * x4 - y4 * y4 - z4 * z4 - w4 * w4
    if (t4 > 0) { const g = (perm[ii + 1 + perm[jj + 1 + perm[kk + 1 + perm[ll + 1]]]] % 32) * 4; t4 *= t4; n += t4 * t4 * (grad4[g] * x4 + grad4[g + 1] * y4 + grad4[g + 2] * z4 + grad4[g + 3] * w4) }
    return 27 * n
  }

  /** fbm in [0, 1]-ish (centred on 0.5). */
  const fbm2 = (x, y, oct = 5, lac = 2.02, gain = 0.5) => {
    let a = 0.5, f = 1, s = 0, norm = 0
    for (let i = 0; i < oct; i += 1) { s += a * n2(x * f + i * 17.3, y * f - i * 9.1); norm += a; a *= gain; f *= lac }
    return 0.5 + 0.5 * (s / norm)
  }
  const fbm3 = (x, y, z, oct = 5, lac = 2.02, gain = 0.5) => {
    let a = 0.5, f = 1, s = 0, norm = 0
    for (let i = 0; i < oct; i += 1) { s += a * n3(x * f + i * 17.3, y * f - i * 9.1, z * f + i * 5.7); norm += a; a *= gain; f *= lac }
    return 0.5 + 0.5 * (s / norm)
  }
  const fbm4 = (x, y, z, w, oct = 4, lac = 2.02, gain = 0.5) => {
    let a = 0.5, f = 1, s = 0, norm = 0
    for (let i = 0; i < oct; i += 1) { s += a * n4(x * f + i * 17.3, y * f - i * 9.1, z * f, w * f); norm += a; a *= gain; f *= lac }
    return 0.5 + 0.5 * (s / norm)
  }
  return { n2, n3, n4, fbm2, fbm3, fbm4 }
}

// --- maths ----------------------------------------------------------------
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
export const mix = (a, b, t) => a + (b - a) * t
export const smoothstep = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t) }
export const gauss = (d, r) => Math.exp(-((d / r) ** 2))

// --- colour -------------------------------------------------------------------
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const toSrgb = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055)
/** '#RRGGBB' → linear [r, g, b] in 0..1 */
export const lin = (hex) => [0, 2, 4].map((i) => toLinear(parseInt(hex.slice(1 + i, 3 + i), 16) / 255))
export const mixc = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
/** Piecewise-linear ramp over evenly spaced (or explicitly placed) stops. */
export function ramp(stops, positions) {
  const cols = stops.map((s) => (typeof s === 'string' ? lin(s) : s))
  const pos = positions ?? cols.map((_, i) => i / (cols.length - 1))
  return (t) => {
    if (t <= pos[0]) return cols[0]
    for (let i = 1; i < pos.length; i += 1) {
      if (t <= pos[i]) return mixc(cols[i - 1], cols[i], smoothstep(0, 1, (t - pos[i - 1]) / (pos[i] - pos[i - 1])))
    }
    return cols[cols.length - 1]
  }
}

/**
 * A linear-light float canvas. `shade(fn)` fills every pixel from
 * `fn(u, v, x, y) → [r, g, b]` where u/v are 0..1 and x is aspect-corrected
 * (0..W/H) so noise and distances are isotropic.
 */
export class Canvas {
  constructor(w, h) {
    this.w = w; this.h = h; this.aspect = w / h
    this.px = new Float32Array(w * h * 3)
  }
  shade(fn) {
    const { w, h, px, aspect } = this
    let p = 0
    for (let y = 0; y < h; y += 1) {
      const v = (y + 0.5) / h
      for (let x = 0; x < w; x += 1) {
        const u = (x + 0.5) / w
        const c = fn(u, v, u * aspect, v)
        px[p] = c[0]; px[p + 1] = c[1]; px[p + 2] = c[2]
        p += 3
      }
    }
    return this
  }
  /** Multiply every pixel by `fn(u, v, x, y)` → scalar (a scrim / vignette). */
  multiply(fn) {
    const { w, h, px, aspect } = this
    let p = 0
    for (let y = 0; y < h; y += 1) {
      const v = (y + 0.5) / h
      for (let x = 0; x < w; x += 1) {
        const u = (x + 0.5) / w
        const k = fn(u, v, u * aspect, v)
        px[p] *= k; px[p + 1] *= k; px[p + 2] *= k
        p += 3
      }
    }
    return this
  }
  /** Additive soft point light (stars, motes, bokeh cores). Radius in pixels. */
  splat(cx, cy, radius, color, intensity = 1, falloff = 'gauss') {
    const { w, h, px } = this
    const reach = falloff === 'gauss' ? radius * 3 : radius * 8
    const x0 = Math.max(0, Math.floor(cx - reach)), x1 = Math.min(w - 1, Math.ceil(cx + reach))
    const y0 = Math.max(0, Math.floor(cy - reach)), y1 = Math.min(h - 1, Math.ceil(cy + reach))
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / radius
        const k = intensity * (falloff === 'gauss' ? Math.exp(-d * d) : 1 / (1 + d * d * d))
        if (k < 1e-4) continue
        const p = (y * w + x) * 3
        px[p] += color[0] * k; px[p + 1] += color[1] * k; px[p + 2] += color[2] * k
      }
    }
  }
  /** Lens-style bokeh disc: flat body, slightly brighter rim, soft edge. */
  bokeh(cx, cy, radius, color, intensity = 1, softness = 0.18) {
    const { w, h, px } = this
    const reach = radius * (1 + softness * 2)
    const x0 = Math.max(0, Math.floor(cx - reach)), x1 = Math.min(w - 1, Math.ceil(cx + reach))
    const y0 = Math.max(0, Math.floor(cy - reach)), y1 = Math.min(h - 1, Math.ceil(cy + reach))
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / radius
        const edge = 1 - smoothstep(1 - softness, 1 + softness, d)
        if (edge <= 0) continue
        const rim = 0.78 + 0.22 * smoothstep(0.55, 0.97, d)
        const k = intensity * edge * rim
        const p = (y * w + x) * 3
        px[p] += color[0] * k; px[p + 1] += color[1] * k; px[p + 2] += color[2] * k
      }
    }
  }
  /**
   * sRGB bytes with a tiny triangular dither plus film grain — the dither is
   * what keeps a slow dark gradient from breaking into visible bands.
   */
  toBytes({ grain = 0.012, seed = 99 } = {}) {
    const { w, h, px } = this
    const out = Buffer.alloc(w * h * 3)
    const random = rng(seed)
    for (let i = 0, p = 0; i < w * h; i += 1, p += 3) {
      const g = (random() - 0.5) * 2 * grain
      const d = (random() + random() - 1) / 255
      for (let c = 0; c < 3; c += 1) {
        const s = toSrgb(clamp01(px[p + c])) + g + d
        out[p + c] = Math.max(0, Math.min(255, Math.round(s * 255)))
      }
    }
    return out
  }
}

/** Soft, filmic shoulder so bright glows roll off instead of clipping. */
export const shoulder = (c, knee = 0.8) => c.map((x) => (x < knee ? x : knee + (1 - knee) * (1 - Math.exp(-(x - knee) / (1 - knee)))))

/**
 * Text-zone scrim, the same shape the video themes bake in: `centre` at the
 * middle of the lyric block, 1.0 at its edge and beyond.
 */
export function scrim(u, v, centre, radius = 0.95) {
  const dx = (u - 0.5) * (16 / 9)
  const dy = v - 0.54
  const r = Math.min(1, Math.hypot(dx, dy) / radius)
  return centre + (1 - centre) * r * r * (3 - 2 * r)
}

/** Classic lens vignette, 1 in the middle falling to `1 - strength` in the corners. */
export function vignette(u, v, strength = 0.35) {
  const dx = (u - 0.5) * 1.25
  const dy = v - 0.5
  return 1 - strength * smoothstep(0.25, 0.85, Math.hypot(dx, dy) * 1.25)
}
