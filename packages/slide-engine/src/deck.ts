import type { LineSpacing, LyricLine, OutlineWeight, Slide, SlideDeck, Song, TextAnchor, Theme } from './types'
import { expandFlow } from './flow'
import { annotateSong, annotateLine, joinPinyin, stripPinyin } from './pinyin'
import { sectionLabel } from './lyrics-parser'
import { getTheme, tunedTheme } from './themes'
import { countRows, songFit } from './layout'

export interface BuildDeckInput {
  songs: Song[]
  flows: Record<string, string>
  /** The deck's theme, and the fallback for any song `themes` does not name. */
  themeId: string
  /** songId → themeId. Present when the setlist gives songs different themes. */
  themes?: Record<string, string>
  /** 每页行数. Defaults to whatever the theme carries. */
  linesPerSlide?: number
  /** 字号：大字 */
  bigText?: boolean
  /** 显示拼音. Default true. */
  pinyin?: boolean
  /** 每首歌前加标题页. Default true. */
  titleSlides?: boolean
  /** 歌与歌之间空白页. Default true. */
  blankBetweenSongs?: boolean
  /** 行间距. Default normal. */
  lineSpacing?: LineSpacing
  /** 字体描边. Default none. */
  outline?: OutlineWeight
  /** 文字位置. Default top: a song's first row stays put from slide to slide. */
  anchor?: TextAnchor
}

/** The small line under a title. The key is for the band's charts, not the projector. */
export function songMeta(song: Song): string {
  return song.artist ?? ''
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
  const deckTheme = getTheme(input.themeId)
  const display = {
    ...(input.linesPerSlide ? { linesPerSlide: input.linesPerSlide } : {}),
    ...(input.bigText ? { bigText: input.bigText } : {}),
    ...(input.lineSpacing && input.lineSpacing !== 'normal' ? { lineSpacing: input.lineSpacing } : {}),
    ...(input.outline && input.outline !== 'none' ? { outline: input.outline } : {}),
  }
  const tune = display
  const showPinyin = input.pinyin !== false
  const withTitles = input.titleSlides !== false
  const slides: Slide[] = []
  const flows: Record<string, string> = {}
  const themes: Record<string, string> = {}
  let mixed = false

  input.songs.forEach((raw, idx) => {
    const song = annotateSong(raw)
    const themeId = input.themes?.[song.id] ?? deckTheme.id
    if (themeId !== deckTheme.id) mixed = true
    themes[song.id] = themeId
    const theme = tunedTheme(getTheme(themeId), tune)
    const py = (line: LyricLine) => (showPinyin ? line : stripPinyin(line))

    const flow = (input.flows[song.id] ?? song.defaultFlow ?? '').trim() || song.defaultFlow
    flows[song.id] = flow
    if (idx > 0 && input.blankBetweenSongs !== false) slides.push({ kind: 'blank', themeId, lines: [] })
    if (withTitles) {
      slides.push({
        kind: 'title', themeId, songId: song.id, title: song.title,
        titlePinyin: showPinyin ? joinPinyin(annotateLine(song.title, song.pinyinOverrides)) : '',
        titleLine: py({ zh: song.title, pinyin: annotateLine(song.title, song.pinyinOverrides) }),
        meta: songMeta(song), lines: [],
      })
    }
    const first = slides.length
    expandFlow(song, flow).forEach((step, flowIndex) => {
      if (step.kind === 'blank') { slides.push({ kind: 'blank', themeId, songId: song.id, sectionLabel: step.label, flowIndex, lines: [] }); return }
      const section = song.sections.find((s) => s.id === step.sectionId)!
      for (const lines of paginateLines(section.lines, theme)) {
        slides.push({ kind: 'lyrics', themeId, songId: song.id, sectionId: section.id, flowIndex, sectionLabel: sectionLabel(section.id), lines: lines.map(py) })
      }
    })
    // one size, and one first-row height, for every lyrics slide of the song
    const own = slides.slice(first).filter((s) => s.kind === 'lyrics')
    const fit = songFit(own.map((s) => s.lines), theme, input.anchor)
    if (fit) for (const s of own) s.fit = fit
  })

  // A single-theme deck stays byte-identical to what it was before per-song
  // themes existed: no per-slide themeId, no meta.themes.
  if (!mixed) for (const s of slides) delete s.themeId

  return {
    version: 1, themeId: deckTheme.id, slides,
    meta: {
      songIds: input.songs.map((s) => s.id), flows,
      generatedAt: new Date().toISOString(),
      ...(mixed ? { themes } : {}),
      ...(Object.keys(display).length ? { display } : {}),
    },
  }
}
