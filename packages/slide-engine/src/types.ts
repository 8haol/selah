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
  meta?: string
  lines: LyricLine[]
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
    display?: { linesPerSlide?: number; bigText?: boolean }
  }
}
