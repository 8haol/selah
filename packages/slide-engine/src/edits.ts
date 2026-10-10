import type { DeckEdits, LyricLine, Slide, SlideDeck } from './types'
import { annotateLine, joinPinyin, stripPinyin } from './pinyin'

/**
 * A generated slide's place in the deck, stable across rebuilds while the song
 * and its flow stay put: `songId/title`, `songId/flowIndex/page` for lyrics,
 * `songId/flowIndex` for a blank step in the flow, and `songId/before` for the
 * blank that separates a song from the one before it.
 */
export function slideKeys(deck: SlideDeck): string[] {
  const pageOf = new Map<string, number>()
  return deck.slides.map((s, i) => {
    if (s.kind === 'title') return `${s.songId}/title`
    if (s.kind === 'blank' && !s.songId) return `${deck.slides[i + 1]?.songId ?? 'end'}/before`
    if (s.kind === 'blank') return `${s.songId}/${s.flowIndex}`
    const step = `${s.songId}/${s.flowIndex}`
    const n = pageOf.get(step) ?? 0
    pageOf.set(step, n + 1)
    return `${step}/${n}`
  })
}

/** What a slide shows, one line per row: the title on a title slide, nothing on a blank one. */
export function slideText(slide: Slide): string[] {
  if (slide.kind === 'title') return [slide.title ?? '']
  return slide.lines.map((l) => l.zh)
}

export interface ApplyEditsOptions {
  /** 显示拼音. Default true. */
  pinyin?: boolean
  /** songId → that song's pinyin fixes, so rewritten lines read the way the song does. */
  overrides?: Record<string, Record<string, string>>
  /** Keep removed slides in place, marked `edit: 'removed'`, for the overview to offer them back. */
  showRemoved?: boolean
}

/**
 * The deck with this setlist's own slide edits applied. Every slide comes back
 * with its `key`. A removal or rewrite only holds while the slide still shows
 * the text it was made against — change the song and the slide comes back as
 * generated, rather than an edit landing on the wrong page. A free-text slide
 * follows the slide it was added after; if that one is gone, it goes last.
 */
export function applyDeckEdits(deck: SlideDeck, edits: DeckEdits | undefined, opts: ApplyEditsOptions = {}): SlideDeck {
  const keys = slideKeys(deck)
  const showPinyin = opts.pinyin !== false
  const line = (zh: string, songId?: string): LyricLine => {
    const l = { zh, pinyin: annotateLine(zh, (songId && opts.overrides?.[songId]) || {}) }
    return showPinyin ? l : stripPinyin(l)
  }
  const removed = new Map((edits?.removed ?? []).map((r) => [r.key, r.was]))
  const rewritten = new Map((edits?.rewritten ?? []).map((r) => [r.key, r]))
  const added = edits?.added ?? []

  const out: Slide[] = []
  const placed = new Set<string>()
  const addAfter = (key: string, themeId: string | undefined) => {
    for (const a of added) {
      if (a.after !== key || placed.has(a.id)) continue
      placed.add(a.id)
      const k = `add/${a.id}`
      out.push({ kind: 'lyrics', ...(themeId ? { themeId } : {}), key: k, edit: 'added', lines: a.lines.map((zh) => line(zh)) })
      addAfter(k, themeId)
    }
  }

  addAfter('', deck.slides[0]?.themeId)
  deck.slides.forEach((slide, i) => {
    const key = keys[i]!
    const text = slideText(slide).join('\n')
    const gone = removed.get(key) === text
    const rw = rewritten.get(key)
    if (gone) {
      if (opts.showRemoved) out.push({ ...slide, key, edit: 'removed' })
    } else if (rw && slide.kind !== 'blank' && rw.was === text) {
      out.push(rewrite(slide, key, rw.lines, line))
    } else {
      out.push({ ...slide, key })
    }
    addAfter(key, slide.themeId)
  })
  // the slide they followed is no longer in the deck
  for (const a of added) if (!placed.has(a.id)) addAfter(a.after, deck.slides.at(-1)?.themeId)

  return { ...deck, slides: out }
}

function rewrite(slide: Slide, key: string, lines: string[], line: (zh: string, songId?: string) => LyricLine): Slide {
  if (slide.kind === 'title') {
    const title = lines.join(' ')
    const titleLine = line(title, slide.songId)
    return { ...slide, key, edit: 'rewritten', title, titleLine, titlePinyin: joinPinyin(titleLine.pinyin) }
  }
  // the song-wide size was chosen for the lines it had; new text lays out on its own
  const next: Slide = { ...slide, key, edit: 'rewritten', lines: lines.map((zh) => line(zh, slide.songId)) }
  delete next.fit
  return next
}
