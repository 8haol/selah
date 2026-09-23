import type { Theme } from './types'

export interface MeasuredBackground { id: string; avg: string; p95: string; p05: string }

interface ContrastMinimums { zh: number; pinyin: number; bright: number }

export function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number]
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

export function contrastRatio(hexA: string, hexB: string): number {
  const [l1, l2] = [luminance(hexA), luminance(hexB)].sort((a, b) => b - a) as [number, number]
  return (l1 + 0.05) / (l2 + 0.05)
}

export function assertThemeContrast(theme: Theme, min?: number): void
export function assertThemeContrast(theme: Theme, measured?: MeasuredBackground, min?: ContrastMinimums): void
export function assertThemeContrast(
  theme: Theme,
  measuredOrMin?: MeasuredBackground | number,
  minimums: ContrastMinimums = { zh: 7, pinyin: 8, bright: 4.5 },
): void {
  const measured = typeof measuredOrMin === 'number' ? undefined : measuredOrMin
  const min = typeof measuredOrMin === 'number'
    ? { zh: measuredOrMin, pinyin: measuredOrMin, bright: 4.5 }
    : minimums
  const avg = measured?.avg ?? theme.background.approxColor
  const light = luminance(avg) > 0.5
  const extreme = measured ? (light ? measured.p05 : measured.p95) : null
  const checks: Array<[string, number]> = [
    ['zh/avg', contrastRatio(theme.colors.zh, avg) - min.zh],
    ['pinyin/avg', contrastRatio(theme.colors.pinyin, avg) - min.pinyin],
  ]
  if (extreme) {
    checks.push([`zh/${light ? 'p05' : 'p95'}`, contrastRatio(theme.colors.zh, extreme) - min.bright])
    checks.push([`pinyin/${light ? 'p05' : 'p95'}`, contrastRatio(theme.colors.pinyin, extreme) - min.bright])
  }
  const failing = checks.filter(([, difference]) => difference < 0)
  if (failing.length) {
    throw new Error(`主题 "${theme.name}" 对比度不足：${failing.map(([key, difference]) => `${key} 差 ${(-difference).toFixed(2)}`).join('，')}`)
  }
}
