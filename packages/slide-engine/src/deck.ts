import type { LyricLine, Slide, SlideDeck, Song, Theme } from './types'
import { expandFlow } from './flow'
import { annotateSong, annotateLine, joinPinyin } from './pinyin'
import { sectionLabel } from './lyrics-parser'
import { getTheme } from './themes'
import { countRows } from './layout'

export interface BuildDeckInput {
  songs: Song[]
  flows: Record<string, string>
  themeId: string
  blankBetweenSongs?: boolean
}

export function songMeta(song: Song): string {
  return [song.artist, song.key ? `Key of ${song.key}` : ''].filter(Boolean).join(' · ')
}

/** Pack lines into slides so the wrapped row count never exceeds theme.maxLinesPerSlide. */
export function paginateLines(lines: LyricLine[], theme: Theme): LyricLine[][] {
  const pages: LyricLine[][] = []
  let cur: LyricLine[] = []
  let rows = 0
  for (const line of lines) {
    const r = countRows(line, theme)
    if (cur.length > 0 && rows + r > theme.maxLinesPerSlide) { pages.push(cur); cur = []; rows = 0 }
    cur.push(line); rows += r
  }
  if (cur.length) pages.push(cur)
  return pages
}

export function buildDeck(input: BuildDeckInput): SlideDeck {
  const theme = getTheme(input.themeId)
  const slides: Slide[] = []
  const flows: Record<string, string> = {}
  input.songs.forEach((raw, idx) => {
    const song = annotateSong(raw)
    const flow = (input.flows[song.id] ?? song.defaultFlow ?? '').trim() || song.defaultFlow
    flows[song.id] = flow
    if (idx > 0 && input.blankBetweenSongs !== false) slides.push({ kind: 'blank', lines: [] })
    slides.push({
      kind: 'title', songId: song.id, title: song.title,
      titlePinyin: joinPinyin(annotateLine(song.title, song.pinyinOverrides)),
      meta: songMeta(song), lines: [],
    })
    for (const step of expandFlow(song, flow)) {
      if (step.kind === 'blank') { slides.push({ kind: 'blank', songId: song.id, sectionLabel: step.label, lines: [] }); continue }
      const section = song.sections.find((s) => s.id === step.sectionId)!
      for (const lines of paginateLines(section.lines, theme)) {
        slides.push({ kind: 'lyrics', songId: song.id, sectionId: section.id, sectionLabel: sectionLabel(section.id), lines })
      }
    }
  })
  return {
    version: 1, themeId: theme.id, slides,
    meta: { songIds: input.songs.map((s) => s.id), flows, generatedAt: new Date().toISOString() },
  }
}
