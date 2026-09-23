import { sectionLabel } from '@selah/slide-engine'

/** Section names as the worship team says them: V1 → 主歌 1, C → 副歌. */
const TYPE_LABEL: Record<string, string> = {
  V: '主歌', C: '副歌', PC: '导歌', B: '桥段', E: '尾声', I: '前奏', T: '尾句',
}

export function typeName(id: string): string {
  const m = id.match(/^([A-Z]+)(\d*)$/)
  if (!m) return sectionLabel(id)
  return (TYPE_LABEL[m[1]!] ?? sectionLabel(id)) + (m[2] ? ` ${m[2]}` : '')
}

/** The five a song can gain from the 添加段落 row, in the order the design lists them. */
export const ADDABLE: Array<{ prefix: string; label: string }> = [
  { prefix: 'V', label: '主歌' }, { prefix: 'C', label: '副歌' }, { prefix: 'PC', label: '导歌' },
  { prefix: 'B', label: '桥段' }, { prefix: 'E', label: '尾声' },
]
