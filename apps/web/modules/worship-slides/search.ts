import { pinyin } from 'pinyin-pro'

const squash = (s: string) => s.toLowerCase().replace(/\s+/g, '')

export function buildSearchKey(parts: { title: string; titleEn?: string | null; artist?: string | null }): string {
  const full = pinyin(parts.title, { toneType: 'none', type: 'array', nonZh: 'removed' }).join('')
  const initials = pinyin(parts.title, { pattern: 'first', toneType: 'none', type: 'array', nonZh: 'removed' }).join('')
  return [full, initials, parts.title, parts.titleEn ?? '', parts.artist ?? ''].filter(Boolean).map(squash).join('|')
}
