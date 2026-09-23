'use client'
import { useMemo } from 'react'
import { annotateLine, polyphonicChoices, isChinese, type SongSection } from '@selah/slide-engine'

export function PinyinEditor({ sections, overrides, onChange }: { sections: SongSection[]; overrides: Record<string, string>; onChange: (o: Record<string, string>) => void }) {
  const rows = useMemo(() => {
    const seen = new Map<string, { def: string; choices: string[] }>()
    for (const s of sections) for (const l of s.lines) {
      const chars = [...l.zh]
      const def = annotateLine(l.zh)
      chars.forEach((ch, i) => {
        if (!isChinese(ch) || seen.has(ch)) return
        const choices = polyphonicChoices(ch)
        if (choices.length > 1) seen.set(ch, { def: def[i] ?? '', choices })
      })
    }
    return [...seen.entries()]
  }, [sections])
  if (rows.length === 0) return <p className="text-xs text-ink-soft">没有多音字需要确认。</p>
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(([ch, { def, choices }]) => {
        const current = overrides[ch] ?? def
        return (
          <div key={ch} className="flex items-center gap-3 rounded-lg border border-line bg-card px-3 py-2">
            <span className="text-2xl font-semibold">{ch}</span>
            <select
              className="h-9 flex-1 rounded-md border border-line bg-paper px-2 text-sm"
              value={current}
              onChange={(e) => {
                const next = { ...overrides }
                if (e.target.value === def) delete next[ch]; else next[ch] = e.target.value
                onChange(next)
              }}
            >
              {[...new Set([def, ...choices])].map((c) => <option key={c} value={c}>{c}{c === def ? '（默认）' : ''}</option>)}
            </select>
          </div>
        )
      })}
    </div>
  )
}
