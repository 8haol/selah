export type SectionType = 'verse' | 'chorus' | 'bridge' | 'prechorus' | 'intro' | 'ending' | 'tag'

/** One lyric line. `pinyin[i]` corresponds to `[...zh][i]`; non-Chinese chars map to ''. */
export interface LyricLine {
  zh: string
  pinyin: string[]
  en?: string
}

/** A song section such as V1 / C / B. `id` is the flow token that selects it. */
export interface SongSection {
  id: string // 'V1' | 'V2' | 'C' | 'C2' | 'B' | 'PC' | 'E' | 'T'
  type: SectionType
  lines: LyricLine[]
}

export interface Song {
  id: string
  title: string
  titleEn?: string
  artist?: string
  key?: string
  sections: SongSection[]
  /** character → pinyin, applied to every occurrence in this song */
  pinyinOverrides: Record<string, string>
  defaultFlow: string
}

export type BackgroundKind = 'image' | 'video'

export type ThemeBackground =
  | { kind: 'image'; src: string; approxColor: string }
  | { kind: 'video'; src: string; poster: string; approxColor: string; durationMs: number }

export interface Theme {
  id: string
  name: string
  description: string
  background: ThemeBackground
  fonts: { zh: string; pinyin: string; title: string }
  sizes: { zh: number; pinyin: number; title: number; titlePinyin: number; badge: number; meta: number }
  colors: { zh: string; pinyin: string; title: string; rule: string; badge: string; meta: string }
  shadow: { color: string; opacity: number } | null
  maxLinesPerSlide: number
  /**
   * Multiplies the type scale `layoutSlide` is allowed to reach. 1 is the
   * built-in size; the 大字 setting raises it. Undefined reads as 1, so a
   * theme that never sets it lays out exactly as it did before.
   */
  textScale?: number
  /** Gap between rows at scale 1, in pt. Undefined reads as 16 (标准). */
  rowGap?: number
  /** 字体描边: stroke colour and width as a fraction of the character size. */
  outline?: { color: string; ratio: number } | null
}

export type LineSpacing = 'tight' | 'normal' | 'loose'
export type OutlineWeight = 'none' | 'thin' | 'thick'
/** `top` pins a song's first row to one height; `center` centres every slide on its own. */
export type TextAnchor = 'top' | 'center'

/** A song-wide layout decision, so every slide of the song sets the same size. */
export interface SlideFit {
  scale: number
  /** Row gap at scale 1. */
  rowGap: number
  /** The first row's top. Absent: centre the slide on its own. */
  topPt?: number
}

export type SlideKind = 'title' | 'lyrics' | 'blank'

export interface Slide {
  kind: SlideKind
  /**
   * Set when a deck mixes themes — one theme per song. Readers fall back to
   * `SlideDeck.themeId`, so single-theme decks leave it off entirely.
   */
  themeId?: string
  songId?: string
  sectionId?: string
  /** Which step of the song's flow produced this slide — a section sung twice
   *  yields two different indices. Lyrics slides only. */
  flowIndex?: number
  /** human label for the badge, e.g. 'VERSE 1' */
  sectionLabel?: string
  /** for 'title' slides */
  title?: string
  titlePinyin?: string
  /** The title with per-character pinyin, so each syllable sits over its own character. */
  titleLine?: LyricLine
  meta?: string
  /** The song's name, set small in the bottom-right corner of its lyrics slides. */
  songTitle?: string
  lines: LyricLine[]
  /** Lyrics slides built since per-song sizing. Older decks lay out slide by slide. */
  fit?: SlideFit
  /** Set by `applyDeckEdits`: the slide's place in the deck, see `slideKeys`. */
  key?: string
  /** Set by `applyDeckEdits` on a slide the setlist changed by hand. */
  edit?: 'rewritten' | 'added' | 'removed'
}

/**
 * Changes made to one setlist's slides on the overview before export. They
 * belong to the setlist, not the song: the library keeps the lyrics as they are.
 * `was` is the text the slide showed when it was changed, one line per row.
 */
export interface DeckEdits {
  removed?: { key: string; was: string }[]
  rewritten?: { key: string; was: string; lines: string[] }[]
  /** Free-text slides, each placed right after the slide `after` names; '' puts it first. */
  added?: { id: string; after: string; lines: string[] }[]
}

export interface SlideDeck {
  version: 1
  themeId: string
  slides: Slide[]
  meta: {
    songIds: string[]
    flows: Record<string, string>
    generatedAt: string
    /** songId → themeId, present only when the deck mixes themes. */
    themes?: Record<string, string>
    /**
     * The setlist's display settings, kept on the deck so the export lays out
     * exactly like the preview it was generated from.
     */
    display?: { linesPerSlide?: number; bigText?: boolean; lineSpacing?: LineSpacing; outline?: OutlineWeight }
  }
}
