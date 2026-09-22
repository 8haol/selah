import type { Theme } from './types.js'

function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number]
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

export function contrastRatio(hexA: string, hexB: string): number {
  const [l1, l2] = [luminance(hexA), luminance(hexB)].sort((a, b) => b - a) as [number, number]
  return (l1 + 0.05) / (l2 + 0.05)
}

export function assertThemeContrast(theme: Theme, min = 7): void {
  const bg = theme.background.approxColor
  const failing = (['zh', 'pinyin'] as const)
    .map((k) => ({ k, ratio: contrastRatio(theme.colors[k], bg) }))
    .filter((x) => x.ratio < min)
  if (failing.length) {
    throw new Error(`主题 "${theme.name}" 对比度不足：${failing.map((f) => `${f.k} ${f.ratio.toFixed(1)}:1`).join('，')}（要求 ≥ ${min}:1）`)
  }
}
