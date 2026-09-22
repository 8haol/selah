import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const W = 1920
const H = 1080

const defsCommon = `
  <filter id="blur-xl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="140"/></filter>
  <filter id="blur-lg" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="80"/></filter>
  <filter id="blur-sm" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>
  <filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
  <radialGradient id="vignette" cx="50%" cy="50%" r="75%"><stop offset="55%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.45"/></radialGradient>
`
const grain = (opacity) => `<rect width="${W}" height="${H}" filter="url(#grain)" opacity="${opacity}"/>`
const vignette = () => `<rect width="${W}" height="${H}" fill="url(#vignette)"/>`
const bloom = (cx, cy, r, color, opacity, blur = 'blur-xl') =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}" opacity="${opacity}" filter="url(#${blur})"/>`

const svg = (defs, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defsCommon}${defs}</defs>${body}</svg>`

function rng(seed) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

const themes = [
  {
    id: 'night',
    svg() {
      const r = rng(7)
      let stars = ''
      for (let i = 0; i < 260; i++) {
        const x = r() * W, y = r() * H, rad = 0.6 + r() * 1.7, o = 0.25 + r() * 0.6
        stars += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(2)}" fill="#fff" opacity="${o.toFixed(2)}"/>`
      }
      return svg(
        `<linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#05070F"/><stop offset="0.55" stop-color="#0A1030"/><stop offset="1" stop-color="#101A4A"/></linearGradient>`,
        `<rect width="${W}" height="${H}" fill="url(#bg)"/>
         ${bloom(1500, 260, 420, '#3B4FD9', 0.35)}
         ${bloom(1650, 420, 260, '#7A4FD9', 0.28)}
         ${bloom(300, 950, 380, '#1B3F8A', 0.35)}
         ${stars}
         ${grain(0.05)}${vignette()}`,
      )
    },
  },
  {
    id: 'sanctuary',
    svg() {
      let rays = ''
      for (let i = -4; i <= 4; i++) {
        const x = 960 + i * 210
        rays += `<polygon points="${x - 60},-50 ${x + 60},-50 ${x + 420},${H + 50} ${x - 420},${H + 50}" fill="#F0C776" opacity="0.045" filter="url(#blur-lg)"/>`
      }
      return svg(
        `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2A1030"/><stop offset="0.6" stop-color="#3A1638"/><stop offset="1" stop-color="#1C0B22"/></linearGradient>`,
        `<rect width="${W}" height="${H}" fill="url(#bg)"/>
         ${rays}
         ${bloom(960, -120, 620, '#F0C776', 0.42)}
         ${bloom(300, 1000, 380, '#7A2E5A', 0.5)}
         ${bloom(1700, 900, 300, '#B0603E', 0.25)}
         ${grain(0.06)}${vignette()}`,
      )
    },
  },
  {
    id: 'deep',
    svg() {
      return svg(
        `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#061A31"/><stop offset="0.5" stop-color="#0A3A5C"/><stop offset="1" stop-color="#0D6B78"/></linearGradient>`,
        `<rect width="${W}" height="${H}" fill="url(#bg)"/>
         ${bloom(1600, 200, 460, '#18B8C9', 0.35)}
         ${bloom(200, 900, 420, '#0E5C9A', 0.5)}
         ${bloom(1100, 1050, 300, '#3FE0C8', 0.18)}
         <path d="M0,820 C400,760 700,900 1100,830 S1700,700 1920,780 L1920,1080 L0,1080 Z" fill="#031E33" opacity="0.35" filter="url(#blur-sm)"/>
         ${grain(0.05)}${vignette()}`,
      )
    },
  },
  {
    id: 'meadow',
    svg() {
      return svg(
        `<linearGradient id="bg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#082C1F"/><stop offset="0.55" stop-color="#145238"/><stop offset="1" stop-color="#3E8556"/></linearGradient>`,
        `<rect width="${W}" height="${H}" fill="url(#bg)"/>
         ${bloom(1750, 120, 520, '#F5E27A', 0.45)}
         ${bloom(1400, 300, 300, '#FFF6C2', 0.22)}
         ${bloom(150, 1000, 420, '#083A2B', 0.7)}
         <path d="M0,900 C300,860 600,940 960,890 S1500,820 1920,880 L1920,1080 L0,1080 Z" fill="#052A1D" opacity="0.45" filter="url(#blur-sm)"/>
         ${grain(0.05)}${vignette()}`,
      )
    },
  },
  {
    id: 'dawn',
    svg() {
      return svg(
        `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FBE3D3"/><stop offset="0.5" stop-color="#E7CDE6"/><stop offset="1" stop-color="#B9B4E8"/></linearGradient>`,
        `<rect width="${W}" height="${H}" fill="url(#bg)"/>
         ${bloom(300, 200, 520, '#FFF3E4', 0.9)}
         ${bloom(1500, 950, 480, '#9E96E6', 0.45)}
         ${bloom(1300, 150, 300, '#FFC9B0', 0.5)}
         ${grain(0.04)}`,
      )
    },
  },
  {
    id: 'paper',
    svg() {
      return svg(
        `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FBF7EF"/><stop offset="1" stop-color="#F0E7D6"/></linearGradient>`,
        `<rect width="${W}" height="${H}" fill="url(#bg)"/>
         ${bloom(1700, 900, 500, '#E9D9BC', 0.7)}
         ${bloom(200, 150, 400, '#FFFFFF', 0.8)}
         ${grain(0.07)}`,
      )
    },
  },
]

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../apps/web/public/themes')
fs.mkdirSync(outDir, { recursive: true })
for (const t of themes) {
  const file = path.join(outDir, `${t.id}.jpg`)
  await sharp(Buffer.from(t.svg())).jpeg({ quality: 82, chromaSubsampling: '4:4:4' }).toFile(file)
  const kb = fs.statSync(file).size / 1024
  if (kb > 100) throw new Error(`${t.id}.jpg is ${kb.toFixed(0)} KB (> 100 KB limit)`)
  console.log(t.id, `${kb.toFixed(0)} KB`)
}
