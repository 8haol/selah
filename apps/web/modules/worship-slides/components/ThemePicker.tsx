'use client'
import { useState } from 'react'
import { BUILTIN_THEMES } from '@selah/slide-engine'
import { posterSrc } from './DeckPreview'

export function ThemePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  // only the hovered dynamic theme plays, so the grid never runs five videos at once
  const [hovered, setHovered] = useState<string | null>(null)
  return (
    <div className="grid grid-cols-3 gap-2">
      {BUILTIN_THEMES.map((t) => {
        const video = t.background.kind === 'video' ? t.background : null
        return (
          <button key={t.id} type="button" onClick={() => onChange(t.id)} title={t.description}
            onMouseEnter={() => setHovered(t.id)} onMouseLeave={() => setHovered((h) => (h === t.id ? null : h))}
            className={`overflow-hidden rounded-lg border text-left transition ${value === t.id ? 'border-accent ring-2 ring-accent' : 'border-line hover:border-ink-soft'}`}>
            <div className="relative aspect-video w-full" style={{ backgroundImage: `url(${posterSrc(t)})`, backgroundSize: 'cover' }}>
              {video && hovered === t.id && (
                <video src={video.src} poster={video.poster} autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover" />
              )}
              {video && (
                <span className="absolute right-1 top-1 rounded bg-black/55 px-1 py-0.5 text-[10px] leading-none text-white">动态</span>
              )}
            </div>
            <div className="px-2 py-1.5 text-xs font-medium">{t.name}</div>
          </button>
        )
      })}
    </div>
  )
}
