'use client'
import { useState } from 'react'
import { BUILTIN_THEMES, buildDeck, type Slide, type Song } from '@selah/slide-engine'
import { SlideView } from './DeckPreview'

/** The line every theme card shows, so the grid compares like with like. */
const SAMPLE_SONG: Song = {
  id: 'sample',
  title: '耶和华是我的牧者',
  sections: [
    {
      id: 'C',
      type: 'chorus',
      lines: [
        { zh: '耶和华是我的牧者', pinyin: [] },
        { zh: '我必不致缺乏', pinyin: [] },
      ],
    },
  ],
  pinyinOverrides: {},
  defaultFlow: 'C',
}

// buildDeck re-annotates pinyin for every theme; once per theme is plenty.
const sampleCache = new Map<string, Slide>()
function sampleSlide(themeId: string): Slide {
  const hit = sampleCache.get(themeId)
  if (hit) return hit
  // slides[0] is the title slide, slides[1] the one lyrics slide of section C
  const slide = buildDeck({ songs: [SAMPLE_SONG], flows: { sample: 'C' }, themeId }).slides[1]!
  sampleCache.set(themeId, slide)
  return slide
}

export function ThemePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  // only the hovered/focused dynamic theme plays, so the grid never runs five videos at once
  const [active, setActive] = useState<string | null>(null)

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {BUILTIN_THEMES.map((t) => {
        const selected = value === t.id
        const isVideo = t.background.kind === 'video'
        return (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => onChange(t.id)}
              title={t.description}
              aria-pressed={selected}
              onMouseEnter={() => setActive(t.id)}
              onMouseLeave={() => setActive((a) => (a === t.id ? null : a))}
              onFocus={() => setActive(t.id)}
              onBlur={() => setActive((a) => (a === t.id ? null : a))}
              className={`block w-full overflow-hidden rounded-md border bg-card text-left transition ${
                selected ? 'border-accent ring-2 ring-accent' : 'border-line hover:border-ink-soft/50'
              }`}
            >
              <div className="relative">
                <SlideView slide={sampleSlide(t.id)} theme={t} static={active !== t.id} />
                {isVideo && (
                  <span className="pointer-events-none absolute right-1.5 top-1.5 rounded-full bg-ink/65 px-2 py-0.5 text-[10px] leading-4 text-white">
                    动态
                  </span>
                )}
              </div>
              <span className="flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-ink">
                <span className="truncate">{t.name}</span>
                {selected && <span className="ml-auto shrink-0 text-accent">已选</span>}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
