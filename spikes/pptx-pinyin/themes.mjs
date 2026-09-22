// Six visual themes for worship lyric slides. Each theme is a set of colour
// tokens plus an SVG background (1920×1080) that gets rasterised to PNG and
// used as the slide background in both the HTML preview and the PPTX.
//
// Design intent: backgrounds are atmospheric but low-detail behind the text
// zone, so 45pt lyrics stay legible from the back row. Text always sits on a
// dimmed area and carries a soft shadow.

const W = 1920
const H = 1080

// --- shared SVG fragments ---------------------------------------------------
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

// deterministic pseudo-random for star fields
function rng(seed) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

// --- themes -----------------------------------------------------------------
export const themes = [
  {
    id: 'night',
    name: '夜空 · Night',
    desc: '深夜蓝黑，细星点与一团蓝紫星云。最稳妥的投影底色。',
    colors: { zh: '#FFFFFF', py: '#B9C6FF', accent: '#8FA3FF', badgeBg: '#FFFFFF', badgeFg: '#DCE3FF', rule: '#8FA3FF', title: '#FFFFFF', meta: '#AAB4E6' },
    shadow: { color: '#000000', opacity: 0.55 },
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
    name: '圣殿 · Sanctuary',
    desc: '深紫红底，金色光晕自上方洒下，庄重温暖。',
    colors: { zh: '#FFF8EC', py: '#F2D28C', accent: '#E3B762', badgeBg: '#F2D28C', badgeFg: '#F7E3B0', rule: '#E3B762', title: '#FFF8EC', meta: '#D9C39A' },
    shadow: { color: '#1A0A1E', opacity: 0.6 },
    svg() {
      // soft light rays from the top centre
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
    name: '深海 · Deep',
    desc: '海军蓝到青绿的渐变，青色光斑，清爽现代。',
    colors: { zh: '#FFFFFF', py: '#A6EFF7', accent: '#5FD6E3', badgeBg: '#A6EFF7', badgeFg: '#D9FAFD', rule: '#5FD6E3', title: '#FFFFFF', meta: '#9ED3DA' },
    shadow: { color: '#031521', opacity: 0.6 },
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
    name: '青草地 · Meadow',
    desc: '深绿到嫩绿的清晨草地，一束暖黄光从右上漏进来。',
    colors: { zh: '#FFFFFF', py: '#DCF6C4', accent: '#BFE79A', badgeBg: '#DCF6C4', badgeFg: '#EEFBE2', rule: '#BFE79A', title: '#FFFFFF', meta: '#C4DDB0' },
    shadow: { color: '#062516', opacity: 0.6 },
    svg() {
      return svg(
        `<linearGradient id="bg" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#0B3A28"/><stop offset="0.55" stop-color="#1B6B47"/><stop offset="1" stop-color="#4F9C6A"/></linearGradient>`,
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
    name: '晨光 · Dawn',
    desc: '桃色到薰衣草紫的清晨天空，深色文字。适合灯光较亮的房间。',
    colors: { zh: '#1E1B3A', py: '#5B4A8A', accent: '#7A5FBF', badgeBg: '#1E1B3A', badgeFg: '#3C3468', rule: '#7A5FBF', title: '#1E1B3A', meta: '#5B4A8A' },
    shadow: { color: '#FFFFFF', opacity: 0.55 },
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
    name: '纸 · Paper',
    desc: '暖白纸质感，墨色文字，一根金线。极简，白天房间最清楚。',
    colors: { zh: '#2A2723', py: '#8A5A2B', accent: '#B8863B', badgeBg: '#2A2723', badgeFg: '#5A524A', rule: '#B8863B', title: '#2A2723', meta: '#7A6F63' },
    shadow: { color: '#FFFFFF', opacity: 0.0 },
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

export const layout = {
  W, H,
  // Typography (pt) — lyric sizes are fixed by the church's template.
  zh: { font: 'SimHei', size: 45 },
  py: { font: 'Arial', size: 35 },
  title: { font: 'KaiTi', size: 84 },
  titlePy: { font: 'Arial', size: 30 },
  badge: { font: 'Arial', size: 16 },
  meta: { font: 'Arial', size: 18 },
  maxLines: 4,
}

// CSS font stacks that approximate the PPTX fonts on any OS (preview only)
export const cssFonts = {
  zh: `"SimHei","Heiti SC","PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif`,
  title: `"KaiTi","Kaiti SC","STKaiti","楷体",serif`,
  py: `Arial,"Helvetica Neue",Helvetica,sans-serif`,
}
