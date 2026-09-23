'use client'
import { BUILTIN_THEMES } from '@selah/slide-engine'

export function ThemePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {BUILTIN_THEMES.map((t) => (
        <button key={t.id} type="button" onClick={() => onChange(t.id)} title={t.description}
          className={`overflow-hidden rounded-lg border text-left transition ${value === t.id ? 'border-accent ring-2 ring-accent' : 'border-line hover:border-ink-soft'}`}>
          <div className="aspect-video w-full" style={{ backgroundImage: `url(${t.background.src})`, backgroundSize: 'cover' }} />
          <div className="px-2 py-1.5 text-xs font-medium">{t.name}</div>
        </button>
      ))}
    </div>
  )
}
