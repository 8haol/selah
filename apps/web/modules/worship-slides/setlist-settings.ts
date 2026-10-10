import { applyDeckEdits, buildDeck, type BuildDeckInput, type SlideDeck } from '@selah/slide-engine'
import type { SetlistSettings } from '@/db/schema'
import type { SetlistSongView } from './setlist-actions'

/** 整场设置 as buildDeck reads them. The editor, the export and the dashboard's page count all go through here. */
export function deckDisplay(s: SetlistSettings): Pick<
  BuildDeckInput,
  'linesPerSlide' | 'bigText' | 'pinyin' | 'titleSlides' | 'blankBetweenSongs' | 'lineSpacing' | 'outline' | 'anchor'
> {
  return {
    linesPerSlide: s.linesPerSlide,
    bigText: s.bigText,
    pinyin: s.pinyin,
    titleSlides: s.titleSlides,
    blankBetweenSongs: s.blankBetween,
    lineSpacing: s.lineSpacing,
    outline: s.outline,
    anchor: s.anchor,
  }
}

/**
 * The whole service as one deck, with the slide edits from 总览 applied. The
 * editor, the export and the dashboard's page count all build through here, so
 * they never disagree on what will be projected.
 */
export function setlistDeck(
  songs: Pick<SetlistSongView, 'song' | 'flow' | 'themeId'>[],
  settings: SetlistSettings,
  opts: { showRemoved?: boolean } = {},
): SlideDeck | null {
  if (songs.length === 0) return null
  const deck = buildDeck({
    songs: songs.map((x) => x.song),
    flows: Object.fromEntries(songs.map((x) => [x.song.id, x.flow.join(' ')])),
    themes: Object.fromEntries(songs.map((x) => [x.song.id, x.themeId])),
    themeId: songs[0]!.themeId,
    ...deckDisplay(settings),
  })
  return applyDeckEdits(deck, settings.edits, {
    pinyin: settings.pinyin,
    overrides: Object.fromEntries(songs.map((x) => [x.song.id, x.song.pinyinOverrides])),
    showRemoved: opts.showRemoved,
  })
}
