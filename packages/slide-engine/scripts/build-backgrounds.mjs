import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const W = 1920
const H = 1080
const SAMPLE_W = 480
const SAMPLE_H = 270

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
const scrim = (light, opacity) => `<defs><radialGradient id="scrim" cx="50%" cy="54%" r="62%"><stop offset="0" stop-color="${light ? '#fff' : '#000'}" stop-opacity="${opacity}"/><stop offset="0.78" stop-color="${light ? '#fff' : '#000'}" stop-opacity="0"/></radialGradient></defs><rect width="${W}" height="${H}" fill="url(#scrim)"/>`

const svg = (defs, body) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defsCommon}${defs}</defs>${body}</svg>`

function rng(seed) {
  let state = seed >>> 0
  return () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296)
}

const themes = [
  {
    id: 'night',
    svg() {
      const random = rng(7)
      let stars = ''
      for (let i = 0; i < 260; i += 1) {
        const x = random() * W
        const y = random() * H
        const radius = 0.6 + random() * 1.7
        const opacity = 0.25 + random() * 0.6
        stars += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${radius.toFixed(2)}" fill="#fff" opacity="${opacity.toFixed(2)}"/>`
      }
      return svg(
        `<linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#05070F"/><stop offset="0.55" stop-color="#0A1030"/><stop offset="1" stop-color="#101A4A"/></linearGradient>`,
        `<rect width="${W}" height="${H}" fill="url(#bg)"/>
         ${bloom(1500, 260, 420, '#3B4FD9', 0.35)}
         ${bloom(1650, 420, 260, '#7A4FD9', 0.28)}
         ${bloom(300, 950, 380, '#1B3F8A', 0.35)}
         ${stars}
         ${scrim(false, 0.30)}${grain(0.05)}${vignette()}`,
      )
    },
  },
  {
    id: 'sanctuary',
    svg() {
      let rays = ''
      for (let i = -4; i <= 4; i += 1) {
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
         ${scrim(false, 0.40)}${grain(0.06)}${vignette()}`,
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
         ${scrim(false, 0.30)}${grain(0.05)}${vignette()}`,
      )
    },
  },
  {
    id: 'meadow',
    svg() {
      return svg(
        `<linearGradient id="bg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#082C1F"/><stop offset="0.55" stop-color="#145238"/><stop offset="1" stop-color="#3E8556"/></linearGradient>`,
        `<rect width="${W}" height="${H}" fill="url(#bg)"/>
         ${bloom(1750, 120, 520, '#F5E27A', 0.10)}
         ${bloom(1400, 300, 300, '#FFF6C2', 0.22)}
         ${bloom(150, 1000, 420, '#083A2B', 0.7)}
         <path d="M0,900 C300,860 600,940 960,890 S1500,820 1920,880 L1920,1080 L0,1080 Z" fill="#052A1D" opacity="0.45" filter="url(#blur-sm)"/>
         ${scrim(false, 0.40)}${grain(0.05)}${vignette()}`,
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
         ${scrim(true, 0.45)}${grain(0.04)}`,
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
         ${scrim(true, 0.45)}${grain(0.07)}`,
      )
    },
  },
  {
    id: 'cross-dawn',
    svg() {
      let rays = ''
      const endpoints = [[930, 0], [1160, 0], [1640, 0], [1920, 180], [1920, 720], [1760, 1080]]
      for (const [x, y] of endpoints) {
        rays += `<polygon points="1380,452 ${x - 80},${y} ${x + 80},${y}" fill="#F6C86A" opacity="0.05" filter="url(#blur-lg)"/>`
      }
      return svg(
        `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0E1730"/><stop offset="0.78" stop-color="#2C2A55"/><stop offset="1" stop-color="#B86A3E"/></linearGradient>`,
        `<rect width="${W}" height="${H}" fill="url(#bg)"/>
         ${bloom(1380, 560, 520, '#F6C86A', 0.55)}
         ${rays}
         <rect x="1358" y="300" width="44" height="560" fill="#0B0F1F" opacity="0.85" filter="url(#blur-sm)"/>
         <rect x="1250" y="430" width="260" height="44" fill="#0B0F1F" opacity="0.85" filter="url(#blur-sm)"/>
         ${scrim(false, 0.40)}${grain(0.05)}${vignette()}`,
      )
    },
  },
  {
    id: 'cross-glow',
    svg() {
      const random = rng(17)
      let stars = ''
      for (let i = 0; i < 120; i += 1) {
        const x = random() * W
        const y = random() * H
        const radius = 0.5 + random() * 1.4
        const opacity = 0.18 + random() * 0.42
        stars += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${radius.toFixed(2)}" fill="#DDE8FF" opacity="${opacity.toFixed(2)}"/>`
      }
      return svg(
        `<radialGradient id="bg" cx="50%" cy="44%" r="72%"><stop offset="0" stop-color="#07101F"/><stop offset="1" stop-color="#03060D"/></radialGradient>`,
        `<rect width="${W}" height="${H}" fill="url(#bg)"/>
         ${stars}
         <rect x="945" y="-160" width="30" height="1260" fill="#FFF4D6" opacity="0.18" filter="url(#blur-lg)"/>
         <rect x="570" y="371" width="780" height="30" fill="#FFF4D6" opacity="0.18" filter="url(#blur-lg)"/>
         <rect x="955" y="260" width="10" height="420" fill="#FFF4D6" opacity="0.9"/>
         <rect x="830" y="381" width="260" height="10" fill="#FFF4D6" opacity="0.9"/>
         ${scrim(false, 0.30)}${grain(0.05)}`,
      )
    },
  },
  {
    id: 'rays',
    svg() {
      let rays = ''
      const opacities = [0.07, 0.09, 0.08, 0.11, 0.09, 0.08, 0.07]
      for (let i = 0; i < 7; i += 1) {
        const centre = 620 + i * 205
        const halfWidth = 95 + i * 18
        rays += `<polygon points="620,-200 ${centre - halfWidth},1080 ${centre + halfWidth},1080" fill="#FFE9B0" opacity="${opacities[i]}" filter="url(#blur-lg)"/>`
      }
      return svg(
        `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#111A24"/><stop offset="1" stop-color="#1F3140"/></linearGradient>`,
        `<rect width="${W}" height="${H}" fill="url(#bg)"/>
         ${rays}
         ${bloom(300, 850, 380, '#5A6E80', 0.35)}
         ${bloom(1500, 950, 460, '#5A6E80', 0.35)}
         ${scrim(false, 0.30)}${grain(0.06)}${vignette()}`,
      )
    },
  },
  {
    id: 'stained-glass',
    svg() {
      const random = rng(11)
      const fills = ['#E24B4B', '#E8A33C', '#3FA34D', '#3B7DD8', '#8E4BD8', '#F0E68C']
      let glass = ''
      for (let i = 0; i < 26; i += 1) {
        const side = i % 4
        const opacity = (0.16 + random() * 0.08).toFixed(2)
        const fill = fills[i % fills.length]
        let points
        if (side === 0) {
          const x = random() * W
          const width = 150 + random() * 260
          const depth = 100 + random() * 138
          points = `${x - width / 2},0 ${x + width / 2},0 ${x + width * 0.35},${depth} ${x - width * 0.4},${depth * 0.75}`
        } else if (side === 1) {
          const y = random() * H
          const height = 120 + random() * 220
          const depth = 180 + random() * 242
          points = `${W},${y - height / 2} ${W},${y + height / 2} ${W - depth},${y + height * 0.35} ${W - depth * 0.75},${y - height * 0.4}`
        } else if (side === 2) {
          const x = random() * W
          const width = 150 + random() * 260
          const depth = 100 + random() * 138
          points = `${x - width / 2},${H} ${x + width / 2},${H} ${x + width * 0.35},${H - depth} ${x - width * 0.4},${H - depth * 0.75}`
        } else {
          const y = random() * H
          const height = 120 + random() * 220
          const depth = 180 + random() * 242
          points = `0,${y - height / 2} 0,${y + height / 2} ${depth},${y + height * 0.35} ${depth * 0.75},${y - height * 0.4}`
        }
        glass += `<polygon points="${points}" fill="${fill}" opacity="${opacity}" stroke="#000" stroke-opacity="0.25" stroke-width="4" filter="url(#blur-sm)"/>`
      }
      return svg(
        '',
        `<rect width="${W}" height="${H}" fill="#160F22"/>
         ${glass}
         ${scrim(false, 0.38)}${grain(0.06)}${vignette()}`,
      )
    },
  },
  {
    id: 'dove',
    svg() {
      const dovePath = 'M0,40 C40,0 120,-10 160,30 C130,20 100,30 90,60 C140,70 190,60 230,20 C210,80 150,120 80,110 C60,140 20,150 0,130 C30,110 30,80 0,40 Z'
      return svg(
        `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E9F1FA"/><stop offset="0.55" stop-color="#CFE0F2"/><stop offset="1" stop-color="#B9CFE8"/></linearGradient>`,
        `<rect width="${W}" height="${H}" fill="url(#bg)"/>
         ${bloom(400, 260, 380, '#FFFFFF', 0.9)}
         ${bloom(1500, 900, 460, '#FFFFFF', 0.9)}
         <path d="${dovePath}" transform="translate(1500 260) scale(1.6)" fill="#8FB0D8" opacity="0.35" filter="url(#blur-lg)"/>
         <path d="${dovePath}" transform="translate(1500 260) scale(1.6)" fill="#FFFFFF" opacity="0.95"/>
         ${scrim(true, 0.45)}${grain(0.04)}`,
      )
    },
  },
  {
    id: 'candle',
    svg() {
      const random = rng(5)
      let embers = ''
      for (let i = 0; i < 30; i += 1) {
        const x = 180 + random() * 1560
        const y = 720 + random() * 330
        const radius = 1.5 + random() * 4
        const opacity = 0.2 + random() * 0.3
        embers += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${radius.toFixed(1)}" fill="#FFC98A" opacity="${opacity.toFixed(2)}"/>`
      }
      return svg(
        `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#120B08"/><stop offset="1" stop-color="#1E120C"/></linearGradient>`,
        `<rect width="${W}" height="${H}" fill="url(#bg)"/>
         ${bloom(960, 1120, 420, '#FF9B3D', 0.55)}
         ${bloom(960, 1040, 220, '#FFD27A', 0.45)}
         ${embers}
         ${scrim(false, 0.25)}${grain(0.07)}${vignette()}`,
      )
    },
  },
]

const channelLuminance = (value) => {
  const channel = value / 255
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

const pixelLuminance = (red, green, blue) =>
  0.2126 * channelLuminance(red) + 0.7152 * channelLuminance(green) + 0.0722 * channelLuminance(blue)

const rgbToHex = (red, green, blue) =>
  `#${[red, green, blue].map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`

async function measureBackground(file) {
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

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../apps/web/public/themes')
fs.mkdirSync(outDir, { recursive: true })
const manifest = {}
const rows = []
for (const theme of themes) {
  const file = path.join(outDir, `${theme.id}.jpg`)
  let quality = theme.quality ?? 82
  await sharp(Buffer.from(theme.svg())).jpeg({ quality, chromaSubsampling: '4:4:4' }).toFile(file)
  let bytes = fs.statSync(file).size
  if (bytes > 100 * 1024 && quality > 78) {
    quality = 78
    await sharp(Buffer.from(theme.svg())).jpeg({ quality, chromaSubsampling: '4:4:4' }).toFile(file)
    bytes = fs.statSync(file).size
  }
  if (bytes > 100 * 1024) throw new Error(`${theme.id}.jpg is ${(bytes / 1024).toFixed(0)} KB (> 100 KB limit)`)
  const measured = await measureBackground(file)
  manifest[theme.id] = measured
  rows.push({ id: theme.id, ...measured, size: `${(bytes / 1024).toFixed(0)} KB` })
}
fs.writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
console.table(rows)
