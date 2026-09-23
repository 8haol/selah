import { sectionLabel } from '@selah/slide-engine'

/** Section names as the band calls them when arranging: V1 → Verse 1, C → Chorus. */
const TYPE_LABEL: Record<string, string> = {
  V: 'Verse', C: 'Chorus', PC: 'Pre-Chorus', B: 'Bridge', E: 'Ending', I: 'Intro', T: 'Tag',
}

export function typeName(id: string): string {
  const m = id.match(/^([A-Z]+)(\d*)$/)
  if (!m) return sectionLabel(id)
  return (TYPE_LABEL[m[1]!] ?? sectionLabel(id)) + (m[2] ? ` ${m[2]}` : '')
}

/** The kinds of section the lyrics tab can add, in the order a song usually runs. */
export const ADDABLE: Array<{ prefix: string; label: string }> = [
  { prefix: 'V', label: 'Verse' }, { prefix: 'PC', label: 'Pre-Chorus' }, { prefix: 'C', label: 'Chorus' },
  { prefix: 'B', label: 'Bridge' }, { prefix: 'E', label: 'Ending' },
]
