import type { Slide, SlideDeck, Theme } from './types'

const base = {
  fonts: { zh: 'SimHei', pinyin: 'Arial', title: 'KaiTi' },
  sizes: { zh: 45, pinyin: 35, title: 84, titlePinyin: 30, badge: 16, meta: 18 },
  maxLinesPerSlide: 4,
} as const

const dark = (color: string, opacity = 0.55) => ({ color, opacity })

// The pinyin row carries the same colour as the character above it. A tinted
// pinyin looks good on a flat swatch but the row is smaller, thinner and
// unbolded, so on a textured or moving background it is the first thing to
// disappear — see the "never gives the pinyin less contrast" theme test. The
// themes keep their accent on `rule` / `badge` / `meta` instead.

export const BUILTIN_THEMES: Theme[] = [
  {
    id: 'night', name: '夜空 · Night', description: '深夜蓝黑，满天细星与一道淡淡的银河。最稳妥的投影底色。',
    background: { kind: 'image', src: '/themes/night.jpg', approxColor: '#090e29' },
    colors: { zh: '#FFFFFF', pinyin: '#FFFFFF', title: '#FFFFFF', rule: '#8FA3FF', badge: '#DCE3FF', meta: '#AAB4E6' },
    shadow: dark('#000000'), ...base,
  },
  {
    id: 'sanctuary', name: '圣殿 · Sanctuary', description: '深紫红的殿墙，一束金光自高窗洒下，光里浮着微尘。庄重温暖。',
    background: { kind: 'image', src: '/themes/sanctuary.jpg', approxColor: '#40252d' },
    colors: { zh: '#FFF8EC', pinyin: '#FFF8EC', title: '#FFF8EC', rule: '#E3B762', badge: '#F7E3B0', meta: '#D9C39A' },
    shadow: dark('#1A0A1E', 0.6), ...base,
  },
  {
    id: 'deep', name: '深海 · Deep', description: '仿佛从水下仰望：水面粼粼波光与光束，清爽现代。',
    background: { kind: 'image', src: '/themes/deep.jpg', approxColor: '#072e44' },
    colors: { zh: '#FFFFFF', pinyin: '#FFFFFF', title: '#FFFFFF', rule: '#5FD6E3', badge: '#D9FAFD', meta: '#9ED3DA' },
    shadow: dark('#031521', 0.6), ...base,
  },
  {
    id: 'meadow', name: '青草地 · Meadow', description: '黄昏时起伏的青草丘陵，薄雾与低垂的夕阳。',
    background: { kind: 'image', src: '/themes/meadow.jpg', approxColor: '#2e3f2e' },
    colors: { zh: '#FFFFFF', pinyin: '#FFFFFF', title: '#FFFFFF', rule: '#BFE79A', badge: '#EEFBE2', meta: '#C4DDB0' },
    shadow: dark('#062516', 0.6), ...base,
  },
  {
    id: 'dawn', name: '晨光 · Dawn', description: '桃色到薰衣草紫的清晨天空，深色文字。适合灯光较亮的房间。',
    background: { kind: 'image', src: '/themes/dawn.jpg', approxColor: '#f1deec' },
    colors: { zh: '#1E1B3A', pinyin: '#1E1B3A', title: '#1E1B3A', rule: '#7A5FBF', badge: '#3C3468', meta: '#5B4A8A' },
    shadow: { color: '#FFFFFF', opacity: 0.5 }, ...base,
  },
  {
    id: 'paper', name: '纸 · Paper', description: '暖白纸质感，墨色文字，一根金线。极简，白天房间最清楚。',
    background: { kind: 'image', src: '/themes/paper.jpg', approxColor: '#f3ecde' },
    colors: { zh: '#2A2723', pinyin: '#2A2723', title: '#2A2723', rule: '#B8863B', badge: '#5A524A', meta: '#7A6F63' },
    shadow: null, ...base,
  },
  {
    id: 'cross-dawn', name: '十架晨光 · Cross at Dawn', description: '晨光中的十字架剪影，温暖而庄重。',
    background: { kind: 'image', src: '/themes/cross-dawn.jpg', approxColor: '#3b2c3a' },
    colors: { zh: '#FFFFFF', pinyin: '#FFFFFF', title: '#FFFFFF', rule: '#F6C86A', badge: '#FFE7C2', meta: '#E8C9A8' },
    shadow: dark('#000000', 0.6), ...base,
  },
  {
    id: 'cross-glow', name: '光之十架 · Luminous Cross', description: '深蓝星空中的纤细发光十字架。',
    background: { kind: 'image', src: '/themes/cross-glow.jpg', approxColor: '#191c26' },
    colors: { zh: '#FFFFFF', pinyin: '#FFFFFF', title: '#FFFFFF', rule: '#FFF4D6', badge: '#E4ECFF', meta: '#AFC0E8' },
    shadow: dark('#000000', 0.6), ...base,
  },
  {
    id: 'rays', name: '光束 · Rays', description: '云雾间落下柔和光束，沉静而有层次。',
    background: { kind: 'image', src: '/themes/rays.jpg', approxColor: '#272f33' },
    colors: { zh: '#FFFFFF', pinyin: '#FFFFFF', title: '#FFFFFF', rule: '#E9C877', badge: '#FFF0C8', meta: '#C9C2A8' },
    shadow: dark('#000000', 0.6), ...base,
  },
  {
    id: 'stained-glass', name: '彩窗 · Stained Glass', description: '深色中央留白，边缘环绕柔和彩色玻璃。',
    background: { kind: 'image', src: '/themes/stained-glass.jpg', approxColor: '#110b16' },
    colors: { zh: '#FFF8F0', pinyin: '#FFF8F0', title: '#FFF8F0', rule: '#E8A33C', badge: '#FFE3B3', meta: '#D9C7B8' },
    shadow: dark('#0A0612', 0.65), ...base,
  },
  {
    id: 'dove', name: '白鸽 · Dove', description: '淡蓝天空与白云，一只白鸽在右上方滑翔。明亮轻盈。',
    background: { kind: 'image', src: '/themes/dove.jpg', approxColor: '#e5eef9' },
    colors: { zh: '#1B2A44', pinyin: '#1B2A44', title: '#1B2A44', rule: '#5B7FB8', badge: '#2F4A7A', meta: '#4C6390' },
    shadow: { color: '#FFFFFF', opacity: 0.55 }, ...base,
  },
  {
    id: 'candle', name: '烛光 · Candlelight', description: '暖色暗室，底部一排虚化的烛光与飘浮的火星。温暖安静。',
    background: { kind: 'image', src: '/themes/candle.jpg', approxColor: '#27140a' },
    colors: { zh: '#FFF6E8', pinyin: '#FFF6E8', title: '#FFF6E8', rule: '#FF9B3D', badge: '#FFE7C2', meta: '#D9B896' },
    shadow: dark('#000000', 0.65), ...base,
  },
  // --- 动态主题 (video) ---
  {
    id: 'flow-deep', name: '流光 · 深海', description: '青蓝色流光在深海底色上缓缓漂移，循环播放。',
    background: { kind: 'video', src: '/themes/video/flow-deep.mp4', poster: '/themes/video/flow-deep.jpg', approxColor: '#09324b', durationMs: 24_000 },
    colors: { zh: '#FFFFFF', pinyin: '#FFFFFF', title: '#FFFFFF', rule: '#5FD6E3', badge: '#D9FAFD', meta: '#9ED3DA' },
    shadow: dark('#031521', 0.6), ...base,
  },
  {
    id: 'flow-sanctuary', name: '流光 · 圣殿', description: '紫红与琥珀色流光交织，庄重温暖，循环播放。',
    background: { kind: 'video', src: '/themes/video/flow-sanctuary.mp4', poster: '/themes/video/flow-sanctuary.jpg', approxColor: '#3f1837', durationMs: 24_000 },
    colors: { zh: '#FFF8EC', pinyin: '#FFF8EC', title: '#FFF8EC', rule: '#E3B762', badge: '#F7E3B0', meta: '#D9C39A' },
    shadow: dark('#1A0A1E', 0.6), ...base,
  },
  {
    id: 'clouds', name: '流光 · 夜空', description: '靛蓝与淡紫的流光在夜色中缓缓漂移，循环播放。',
    background: { kind: 'video', src: '/themes/video/clouds.mp4', poster: '/themes/video/clouds.jpg', approxColor: '#141b47', durationMs: 24_000 },
    colors: { zh: '#FFFFFF', pinyin: '#FFFFFF', title: '#FFFFFF', rule: '#8FA3FF', badge: '#DCE3FF', meta: '#AAB4E6' },
    shadow: dark('#02040C', 0.65), ...base,
  },
  {
    id: 'rays-motion', name: '光束 · 晨光', description: '暖金色光束自上方缓缓摇曳，循环播放。',
    background: { kind: 'video', src: '/themes/video/rays-motion.mp4', poster: '/themes/video/rays-motion.jpg', approxColor: '#2e3130', durationMs: 24_000 },
    colors: { zh: '#FFFFFF', pinyin: '#FFFFFF', title: '#FFFFFF', rule: '#E9C877', badge: '#FFF0C8', meta: '#C9C2A8' },
    shadow: dark('#0A1018', 0.65), ...base,
  },
  {
    id: 'bokeh', name: '光斑 · Bokeh', description: '三层景深的暖色光斑缓缓上浮、轻轻闪烁，循环播放。',
    background: { kind: 'video', src: '/themes/video/bokeh.mp4', poster: '/themes/video/bokeh.jpg', approxColor: '#171830', durationMs: 24_000 },
    colors: { zh: '#FFFFFF', pinyin: '#FFFFFF', title: '#FFFFFF', rule: '#FFD27A', badge: '#FFF0D6', meta: '#C9C2B0' },
    shadow: dark('#05070F', 0.65), ...base,
  },
]

export function getTheme(id: string): Theme {
  const t = BUILTIN_THEMES.find((x) => x.id === id)
  if (!t) throw new Error(`未知主题：${id}`)
  return t
}

/**
 * The theme a setlist actually projects with: its own look, plus the
 * per-service display settings (每页行数 / 字号). Returns `base` untouched when
 * nothing differs, so single-theme decks keep object identity.
 */
export function tunedTheme(base: Theme, opts: { linesPerSlide?: number; bigText?: boolean } = {}): Theme {
  const maxLinesPerSlide = opts.linesPerSlide ?? base.maxLinesPerSlide
  const textScale = opts.bigText ? 1.15 : 1
  if (maxLinesPerSlide === base.maxLinesPerSlide && textScale === (base.textScale ?? 1)) return base
  return { ...base, maxLinesPerSlide, textScale }
}

/** How the 主题 gallery groups a theme. Video themes loop; the rest are stills. */
export function themeCategory(theme: Theme): '照片' | '动态' {
  return theme.background.kind === 'video' ? '动态' : '照片'
}

/**
 * The theme one slide of a deck projects with — its song's theme when the deck
 * mixes themes, otherwise the deck's, with the setlist's display settings
 * applied. Preview and export both go through here so they cannot drift.
 */
export function slideTheme(deck: SlideDeck, slide: Slide): Theme {
  return tunedTheme(getTheme(slide.themeId ?? deck.themeId), deck.meta.display ?? {})
}
