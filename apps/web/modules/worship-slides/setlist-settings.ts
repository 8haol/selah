import type { BuildDeckInput } from '@selah/slide-engine'
import type { SetlistSettings } from '@/db/schema'

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
