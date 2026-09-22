import type { Theme } from './types.js'

const base = {
  fonts: { zh: 'SimHei', pinyin: 'Arial', title: 'KaiTi' },
  sizes: { zh: 45, pinyin: 35, title: 84, titlePinyin: 30, badge: 16, meta: 18 },
  maxLinesPerSlide: 4,
} as const

const dark = (color: string, opacity = 0.55) => ({ color, opacity })

export const BUILTIN_THEMES: Theme[] = [
  {
    id: 'night', name: '夜空 · Night', description: '深夜蓝黑，细星点与一团蓝紫星云。最稳妥的投影底色。',
    background: { kind: 'image', src: '/themes/night.jpg', approxColor: '#0A1030' },
    colors: { zh: '#FFFFFF', pinyin: '#B9C6FF', title: '#FFFFFF', rule: '#8FA3FF', badge: '#DCE3FF', meta: '#AAB4E6' },
    shadow: dark('#000000'), ...base,
  },
  {
    id: 'sanctuary', name: '圣殿 · Sanctuary', description: '深紫红底，金色光晕自上方洒下，庄重温暖。',
    background: { kind: 'image', src: '/themes/sanctuary.jpg', approxColor: '#3A1638' },
    colors: { zh: '#FFF8EC', pinyin: '#F2D28C', title: '#FFF8EC', rule: '#E3B762', badge: '#F7E3B0', meta: '#D9C39A' },
    shadow: dark('#1A0A1E', 0.6), ...base,
  },
  {
    id: 'deep', name: '深海 · Deep', description: '海军蓝到青绿的渐变，青色光斑，清爽现代。',
    background: { kind: 'image', src: '/themes/deep.jpg', approxColor: '#0A3A5C' },
    colors: { zh: '#FFFFFF', pinyin: '#A6EFF7', title: '#FFFFFF', rule: '#5FD6E3', badge: '#D9FAFD', meta: '#9ED3DA' },
    shadow: dark('#031521', 0.6), ...base,
  },
  {
    id: 'meadow', name: '青草地 · Meadow', description: '深绿到嫩绿的清晨草地，一束暖黄光从右上漏进来。',
    background: { kind: 'image', src: '/themes/meadow.jpg', approxColor: '#145238' },
    colors: { zh: '#FFFFFF', pinyin: '#DCF6C4', title: '#FFFFFF', rule: '#BFE79A', badge: '#EEFBE2', meta: '#C4DDB0' },
    shadow: dark('#062516', 0.6), ...base,
  },
  {
    id: 'dawn', name: '晨光 · Dawn', description: '桃色到薰衣草紫的清晨天空，深色文字。适合灯光较亮的房间。',
    background: { kind: 'image', src: '/themes/dawn.jpg', approxColor: '#E7CDE6' },
    colors: { zh: '#1E1B3A', pinyin: '#453574', title: '#1E1B3A', rule: '#7A5FBF', badge: '#3C3468', meta: '#5B4A8A' },
    shadow: { color: '#FFFFFF', opacity: 0.5 }, ...base,
  },
  {
    id: 'paper', name: '纸 · Paper', description: '暖白纸质感，墨色文字，一根金线。极简，白天房间最清楚。',
    background: { kind: 'image', src: '/themes/paper.jpg', approxColor: '#F6EFE2' },
    colors: { zh: '#2A2723', pinyin: '#70451D', title: '#2A2723', rule: '#B8863B', badge: '#5A524A', meta: '#7A6F63' },
    shadow: null, ...base,
  },
]

export function getTheme(id: string): Theme {
  const t = BUILTIN_THEMES.find((x) => x.id === id)
  if (!t) throw new Error(`未知主题：${id}`)
  return t
}
