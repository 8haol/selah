'use client'
import { useMemo, useState } from 'react'
import { annotateLine, polyphonicChoices, isChinese, type SongSection } from '@selah/slide-engine'

export function PinyinEditor({ sections, overrides, onChange }: { sections: SongSection[]; overrides: Record<string, string>; onChange: (o: Record<string, string>) => void }) {
  // Most songs have 15–20 polyphonic characters and almost all defaults are right,
  // so the list stays collapsed until asked for. Overridden characters always show.
  const [showAll, setShowAll] = useState(false)
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

  const changed = rows.filter(([ch]) => overrides[ch] !== undefined)
  const visible = showAll ? rows : changed

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className="text-ink-soft">
          多音字 <span className="font-mono text-ink">{rows.length}</span> 个 ·{' '}
          {changed.length > 0 ? <>已改 <span className="font-mono text-accent">{changed.length}</span> 个</> : '已确认默认读音'}
        </span>
        <button
          type="button"
          aria-expanded={showAll}
          onClick={() => setShowAll((v) => !v)}
          className="ml-auto rounded-sm font-medium text-accent transition-colors hover:text-ink"
        >
          {showAll ? '收起' : '逐字检查'}
        </button>
      </div>

      {visible.length > 0 && (
        <ul className="grid gap-2">
          {visible.map(([ch, { def, choices }]) => {
            const current = overrides[ch] ?? def
            const isOverride = overrides[ch] !== undefined
            return (
              <li key={ch} className={`flex items-center gap-3 rounded-md border bg-card px-3 py-2 ${isOverride ? 'border-accent/45' : 'border-line'}`}>
                <span className="font-serif text-2xl leading-none text-ink">{ch}</span>
                <label className="flex-1">
                  <span className="sr-only">{ch} 的读音</span>
                  <select
                    className="h-10 w-full rounded-md border border-line bg-paper px-2 text-sm text-ink transition-colors hover:border-ink-soft/50 focus:border-accent"
                    value={current}
                    onChange={(e) => {
                      const next = { ...overrides }
                      if (e.target.value === def) delete next[ch]; else next[ch] = e.target.value
                      onChange(next)
                    }}
                  >
                    {[...new Set([def, ...choices])].map((c) => <option key={c} value={c}>{c}{c === def ? '（默认）' : ''}</option>)}
                  </select>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
