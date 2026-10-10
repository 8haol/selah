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
  /** 每页最多行数. Defaults to whatever the theme carries. */
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

/**
 * Split a section into slides of at most `theme.maxLinesPerSlide` rows (a long
 * line that wraps counts as its rows). It uses as few slides as filling each
 * one would, then chooses where they break:
 *
 * - never a slide with a single one-row line when the section has more — the
 *   leftover line that used to sit alone after a full slide;
 * - between couplets rather than inside one, when that costs nothing else —
 *   worship lyrics mostly come in pairs of lines;
 * - otherwise as even as possible.
 *
 * At 2 lines a slide some sections cannot avoid a lone line (3 lines, 5 lines),
 * so there the odd line joins its neighbours as a third row instead.
 */
export function paginateLines(lines: LyricLine[], theme: Theme): LyricLine[][] {
  const pages = splitPages(lines, theme.maxLinesPerSlide, theme)
  const lone = (page: LyricLine[]) => page.length === 1 && countRows(page[0]!, theme) === 1
  if (theme.maxLinesPerSlide === 2 && lines.length > 1 && pages.some(lone)) {
    return splitPages(lines, 3, theme)
  }
  return pages
}

const LONE_COST = 1e6
const COUPLET_COST = 10

function splitPages(lines: LyricLine[], maxRows: number, theme: Theme): LyricLine[][] {
  const n = lines.length
  if (n === 0) return []
  const rows = lines.map((line) => countRows(line, theme))
  const rowsIn = (i: number, j: number) => rows.slice(i, j).reduce((a, b) => a + b, 0)

  // fewest slides: greedy fill is optimal for that
  let count = 0
  for (let at = 0, used = 0; at < n; at += 1) {
    if (at === 0 || used + rows[at]! > maxRows) { count += 1; used = 0 }
    used += rows[at]!
  }

  const target = rowsIn(0, n) / count
  // best[k][j]: cheapest way to set lines [0, j) as k slides; from[k][j] its last break
  const best = Array.from({ length: count + 1 }, () => new Array<number>(n + 1).fill(Infinity))
  const from = Array.from({ length: count + 1 }, () => new Array<number>(n + 1).fill(-1))
  best[0]![0] = 0
  for (let k = 1; k <= count; k += 1) {
    for (let j = 1; j <= n; j += 1) {
      for (let i = j - 1; i >= k - 1; i -= 1) {
        const r = rowsIn(i, j)
        // a line too long for a slide still gets one of its own
        if (r > maxRows && j - i > 1) break
        const prev = best[k - 1]![i]!
        if (prev === Infinity) continue
        const lone = n > 1 && j - i === 1 && r === 1 ? LONE_COST : 0
        const couplet = j < n && j % 2 === 1 ? COUPLET_COST : 0
        const cost = prev + lone + couplet + (r - target) ** 2
        if (cost < best[k]![j]!) { best[k]![j] = cost; from[k]![j] = i }
      }
    }
  }
  const pages: LyricLine[][] = []
  for (let k = count, j = n; k > 0; k -= 1) {
    const i = from[k]![j]!
    pages.unshift(lines.slice(i, j))
    j = i
  }
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
        slides.push({ kind: 'lyrics', themeId, songId: song.id, sectionId: section.id, flowIndex, sectionLabel: sectionLabel(section.id), songTitle: song.title, lines: lines.map(py) })
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
