'use client'
import { useState } from 'react'
import { annotateLine, polyphonicChoices, spotKey } from '@selah/slide-engine'
import { cx } from '@/core/ui'
import { spotChar, withToneMark } from '../tone'

/**
 * Correct one character picked on the preview: its pinyin, or the character
 * itself (你 → 祢). Either applies to this spot only (the default — 着 is zhe in
 * one line and zháo in the next), or every time the character appears in the song.
 * `showPinyin` is off when the setlist hides pinyin; `onReplaceChar` is absent
 * where the text cannot be edited from here (the title).
 */
export function PinyinPicker({
  zh, at, overrides, showPinyin = true, onChange, onReplaceChar, onClose,
}: {
  zh: string
  at: number
  overrides: Record<string, string>
  showPinyin?: boolean
  onChange: (next: Record<string, string>) => void
  onReplaceChar?: (to: string, everywhere: boolean) => void
  onClose: () => void
}) {
  const char = [...zh][at] ?? ''
  const key = spotKey(zh, at)
  const [everywhere, setEverywhere] = useState(overrides[key] === undefined && overrides[char] !== undefined)
  const [typed, setTyped] = useState('')
  const [newChar, setNewChar] = useState('')
  const current = annotateLine(zh, overrides)[at] ?? ''
  const auto = annotateLine(zh, {})[at] ?? ''
  const choices = [...new Set([auto, ...polyphonicChoices(char), current])].filter(Boolean)

  const set = (reading: string) => {
    const next = { ...overrides }
    delete next[key]
    if (everywhere) {
      // one reading for the whole song: drop any per-spot fixes for this character
      for (const k of Object.keys(next)) if (spotChar(k) === char) delete next[k]
      if (reading === auto) delete next[char]; else next[char] = reading
    } else if (reading !== (overrides[char] ?? auto)) {
      next[key] = reading
    }
    onChange(next)
  }

  const reset = () => {
    const next = { ...overrides }
    delete next[key]
    if (everywhere) delete next[char]
    onChange(next)
  }

  return (
    <div className="flex w-full flex-col gap-3 rounded-xl bg-surface p-4 shadow-[0_6px_24px_rgba(0,0,0,.08)]">
      <div className="flex items-center gap-3">
        <span className="text-3xl font-bold leading-none">{char}</span>
        {showPinyin && (
          <div className="min-w-0 text-[13px] text-ink-5">
            现在读 <span className="font-mono text-ink">{current}</span>
            {current !== auto && <span> · 自动是 {auto}</span>}
          </div>
        )}
        <button type="button" onClick={onClose} aria-label="关闭" className="ml-auto px-1 text-lg leading-none text-ink-5 hover:text-ink">×</button>
      </div>

      {showPinyin && <div className="flex flex-wrap gap-1.5">
        {choices.map((py) => (
          <button
            key={py}
            type="button"
            onClick={() => set(py)}
            className={cx('rounded-full px-3 py-1.5 font-mono text-sm transition-colors', py === current ? 'bg-ink text-white' : 'bg-surface-4 text-ink-3 hover:text-ink')}
          >
            {py}
          </button>
        ))}
        <form
          className="flex items-center gap-1"
          onSubmit={(e) => { e.preventDefault(); const r = withToneMark(typed); if (r) { set(r); setTyped('') } }}
        >
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="自己输入，如 zhao2"
            aria-label="自己输入拼音"
            className="h-8 w-36 rounded-full border border-line-2 bg-surface-3 px-3 font-mono text-sm outline-0 focus:border-accent"
          />
          <button type="submit" disabled={!typed.trim()} className="rounded-full px-2 text-sm text-accent disabled:text-ink-6">确定</button>
        </form>
      </div>}

      {onReplaceChar && (
        <form
          className="flex items-center gap-2 text-[13px] text-ink-4"
          onSubmit={(e) => {
            e.preventDefault()
            const to = newChar.trim()
            if (to && to !== char) { onReplaceChar(to, everywhere); setNewChar('') }
          }}
        >
          <span>改字</span>
          <span className="text-ink">{char}</span>
          <span>→</span>
          <input
            value={newChar}
            onChange={(e) => setNewChar(e.target.value)}
            placeholder="如 祢"
            aria-label={`把“${char}”改成`}
            className="h-8 w-28 rounded-full border border-line-2 bg-surface-3 px-3 text-sm text-ink outline-0 focus:border-accent"
          />
          <button type="submit" disabled={!newChar.trim() || newChar.trim() === char} className="rounded-full px-2 text-sm text-accent disabled:text-ink-6">改</button>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-ink-4">
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={!everywhere} onChange={() => setEverywhere(false)} className="accent-accent" />
          只改这一处
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={everywhere} onChange={() => setEverywhere(true)} className="accent-accent" />
          这首歌里所有的“{char}”
        </label>
        {showPinyin && current !== auto && (
          <button type="button" onClick={reset} className="ml-auto text-ink-5 hover:text-ink">恢复自动</button>
        )}
      </div>
    </div>
  )
}
