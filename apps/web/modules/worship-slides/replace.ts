import { spotKey, type SongSection } from '@selah/slide-engine'
import { spotChar } from './tone'

/** How many times `find` appears in these sections' lyrics. */
export function countMatches(sections: SongSection[], find: string): number {
  if (!find) return 0
  let n = 0
  for (const s of sections) for (const l of s.lines) n += l.zh.split(find).length - 1
  return n
}

/** Every `find` in the lyrics becomes `to`. Sections without a match come back as the same objects. */
export function replaceInSections(sections: SongSection[], find: string, to: string): SongSection[] {
  if (!find) return sections
  return sections.map((s) =>
    s.lines.some((l) => l.zh.includes(find))
      ? { ...s, lines: s.lines.map((l) => (l.zh.includes(find) ? { ...l, zh: l.zh.split(find).join(to) } : l)) }
      : s,
  )
}

/** The words a find/replace reaches: the title and every lyric line. */
export interface SongText { title: string; sections: SongSection[] }

export function countInSong(song: SongText, find: string): number {
  if (!find) return 0
  return song.title.split(find).length - 1 + countMatches(song.sections, find)
}

export function replaceInSong(song: SongText, find: string, to: string): SongText {
  if (!find) return song
  return { title: song.title.split(find).join(to), sections: replaceInSections(song.sections, find, to) }
}

/** `zh` with the character at `at` (a character index, as SlideView reports it) swapped for `to`. */
export function replaceCharAt(zh: string, at: number, to: string): string {
  const chars = [...zh]
  if (at < 0 || at >= chars.length) return zh
  chars[at] = to
  return chars.join('')
}

/**
 * Per-spot pinyin fixes are keyed by their line's text, so editing the text
 * orphans them. Carry each one over to the edited line while it still points
 * at the same character in the same place; a fix for a character that changed
 * or moved is dropped — it was for a different reading of a different line.
 */
export function carrySpotFixes(overrides: Record<string, string>, before: SongText, after: SongText): Record<string, string> {
  const renamed = new Map<string, string>()
  if (after.title !== before.title) renamed.set(before.title.trimEnd(), after.title)
  before.sections.forEach((s, si) => s.lines.forEach((l, li) => {
    const zh = after.sections[si]?.lines[li]?.zh
    if (zh !== undefined && zh !== l.zh) renamed.set(l.zh.trimEnd(), zh)
  }))
  if (renamed.size === 0) return overrides

  const next: Record<string, string> = {}
  for (const [key, reading] of Object.entries(overrides)) {
    const bar = key.lastIndexOf('|')
    const newZh = bar < 0 ? undefined : renamed.get(key.slice(0, bar))
    if (newZh === undefined) { next[key] = reading; continue }
    const at = Number(key.slice(bar + 1))
    if ([...newZh][at] === spotChar(key)) next[spotKey(newZh, at)] = reading
  }
  return next
}
