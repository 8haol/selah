'use client'
import { useMemo } from 'react'
import { expandFlow, FlowError, type SongSection } from '@selah/slide-engine'
import { Badge, Input } from './ui'

export function FlowInput({ value, onChange, sections, placeholder }: { value: string; onChange: (v: string) => void; sections: SongSection[]; placeholder?: string }) {
  const result = useMemo(() => {
    if (!value.trim()) return { ids: sections.map((s) => s.id), error: null as string | null }
    try {
      const steps = expandFlow({ id: 'tmp', title: '', pinyinOverrides: {}, defaultFlow: '', sections }, value)
      return { ids: steps.map((s) => (s.kind === 'section' ? s.sectionId : '间奏')), error: null }
    } catch (e) { return { ids: [], error: e instanceof FlowError ? e.message : String(e) } }
  }, [value, sections])
  return (
    <div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? '例如 V1 C V2 C B C，或 VCVCBC'}
        spellCheck={false}
        aria-invalid={result.error ? true : undefined}
        className={`font-mono tracking-wide ${result.error ? 'border-danger' : ''}`}
      />
      <div className="mt-2 min-h-7 text-xs">
        {result.error ? <span className="text-danger">{result.error}</span> : (
          <span className="flex flex-wrap items-center gap-1.5">
            {!value.trim() && <span className="mr-0.5 text-ink-soft">留空则按段落顺序</span>}
            {result.ids.map((id, i) => <Badge key={i} tone="accent" mono>{id}</Badge>)}
          </span>
        )}
      </div>
    </div>
  )
}
