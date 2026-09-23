import type { SectionType, SongSection } from './types'

const TYPE_BY_PREFIX: Record<string, SectionType> = {
  V: 'verse', C: 'chorus', B: 'bridge', PC: 'prechorus', I: 'intro', E: 'ending', T: 'tag',
}
const PREFIX_BY_TYPE: Record<SectionType, string> = {
  verse: 'V', chorus: 'C', bridge: 'B', prechorus: 'PC', intro: 'I', ending: 'E', tag: 'T',
}
const LABEL_BY_TYPE: Record<SectionType, string> = {
  verse: 'VERSE', chorus: 'CHORUS', bridge: 'BRIDGE', prechorus: 'PRE-CHORUS', intro: 'INTRO', ending: 'ENDING', tag: 'TAG',
}

/** word (English or Chinese) → section type */
const WORDS: Array<[RegExp, SectionType]> = [
  [/^(pre[\s-]?chorus|pc|导歌|预副歌)$/i, 'prechorus'],
  [/^(verse|v|主歌|正歌)$/i, 'verse'],
  [/^(chorus|c|副歌)$/i, 'chorus'],
  [/^(bridge|b|桥段|桥)$/i, 'bridge'],
  [/^(ending|end|e|outro|结尾|尾声)$/i, 'ending'],
  [/^(tag|t|尾句)$/i, 'tag'],
  [/^(intro|i|前奏|间奏)$/i, 'intro'],
]

export const SECTION_HEADER_PATTERNS = WORDS.map(([re]) => re.source)

/** Parse a header line like "[Verse 1]", "【副歌】", "主歌 2:", "PC". Returns null when the line is lyrics. */
export function parseHeader(line: string): { type: SectionType; number: number | null } | null {
  const trimmed = line.trim()
  const wrapped = /^[\[【(（].*[\]】)）]\s*[:：]?$/.test(trimmed)
  const hasColon = /[:：]$/.test(trimmed)
  const m = trimmed.match(/^[\[【(（]?\s*([A-Za-z\- ]+?|[一-鿿]+?)\s*(\d+)?\s*[\]】)）]?\s*[:：]?$/)
  if (!m) return null
  const word = m[1]!.trim()
  const number = m[2] ? Number(m[2]) : null
  if (/^[A-Za-z]$/.test(word) && !wrapped && number === null && !hasColon) return null
  for (const [re, type] of WORDS) if (re.test(word)) return { type, number }
  return null
}

export function sectionIdFor(type: SectionType, n: number): string {
  const prefix = PREFIX_BY_TYPE[type]
  return n <= 1 ? (type === 'verse' ? `${prefix}1` : prefix) : `${prefix}${n}`
}

export function sectionLabel(id: string): string {
  const m = id.match(/^([A-Z]+)(\d+)?$/)
  if (!m) return id.toUpperCase()
  const type = TYPE_BY_PREFIX[m[1]!]
  if (!type) return id.toUpperCase()
  const label = LABEL_BY_TYPE[type]
  return m[2] ? `${label} ${m[2]}` : label
}

export function parseLyrics(text: string): SongSection[] {
  const rawLines = text.replace(/\r\n?/g, '\n').split('\n')
  const hasHeader = rawLines.some((l) => parseHeader(l) !== null)
  const sections: SongSection[] = []
  const counters: Partial<Record<SectionType, number>> = {}

  const open = (type: SectionType, explicit: number | null): SongSection => {
    const n = explicit ?? (counters[type] ?? 0) + 1
    counters[type] = Math.max(counters[type] ?? 0, n)
    const id = sectionIdFor(type, n)
    // A repeated explicit header ("[V1]" twice) means "more of V1", not a second V1.
    const existing = sections.find((s) => s.id === id)
    if (existing) return existing
    const s: SongSection = { id, type, lines: [] }
    sections.push(s)
    return s
  }

  let current: SongSection | null = null
  let blankRun = 0
  for (const raw of rawLines) {
    const line = raw.trim()
    if (!line) { blankRun++; continue }
    if (hasHeader) {
      const h = parseHeader(line)
      if (h) { current = open(h.type, h.number); blankRun = 0; continue }
      if (!current) current = open('verse', null)
    } else if (!current || blankRun > 0) {
      current = open('verse', null)
    }
    blankRun = 0
    current.lines.push({ zh: line, pinyin: [] })
  }
  return singleVerseAsV(sections.filter((s) => s.lines.length > 0))
}

/** A song with only one verse calls it V ("Verse"), not V1 — there is no verse 2 to tell it apart from. */
export function singleVerseAsV(sections: SongSection[]): SongSection[] {
  const verses = sections.filter((s) => s.type === 'verse')
  if (verses.length !== 1 || verses[0]!.id !== 'V1') return sections
  return sections.map((s) => (s.id === 'V1' ? { ...s, id: 'V' } : s))
}
