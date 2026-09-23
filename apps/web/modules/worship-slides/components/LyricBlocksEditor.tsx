'use client'
import { annotateLine, getTheme, lineNeedsBreak, type SectionType } from '@selah/slide-engine'
import { GhostChip, cx } from '@/core/ui'
import { BLOCK_TYPES, blockIds, blockLines, newBlock, type LyricBlock } from '../blocks'
import { typeName } from '../section-name'

const THEME = getTheme('night')

/**
 * The song's lyrics as a stack of blocks — one card per Verse, Chorus, Bridge.
 * Each card picks its kind; the number (Verse 1, Verse 2) follows from order.
 * Adding and removing blocks goes through `onAdd` / `onRemove` so the caller
 * can keep its singing order in step.
 */
export function LyricBlocksEditor({
  blocks, onChange, onAdd, onRemove,
}: {
  blocks: LyricBlock[]
  onChange: (blocks: LyricBlock[]) => void
  onAdd: (block: LyricBlock) => void
  onRemove: (key: string) => void
}) {
  const ids = blockIds(blocks)
  const patch = (key: string, p: Partial<LyricBlock>) => onChange(blocks.map((b) => (b.key === key ? { ...b, ...p } : b)))
  const move = (i: number, d: -1 | 1) => {
    const next = [...blocks]
    const [b] = next.splice(i, 1)
    next.splice(i + d, 0, b!)
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((b, i) => {
        const lines = blockLines(b)
        const long = lines.filter((zh) => lineNeedsBreak({ zh, pinyin: annotateLine(zh) }, THEME))
        return (
          <div key={b.key} className="flex flex-col gap-2 rounded-xl bg-surface-3 px-4 pb-3 pt-3">
            <div className="flex items-center gap-2">
              <label className="relative">
                <span className="sr-only">段落类型</span>
                <select
                  value={b.type}
                  onChange={(e) => patch(b.key, { type: e.target.value as SectionType })}
                  className="appearance-none rounded-full bg-ink py-1 pl-3 pr-7 text-[13px] font-semibold text-white outline-0"
                >
                  {BLOCK_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
                </select>
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-white/80">▾</span>
              </label>
              {/* the number follows from order: a lone verse has none */}
              <span className="font-mono text-[13px] font-semibold text-ink-3">{ids[i]!.replace(/^\D+/, '')}</span>
              <span className="ml-auto whitespace-nowrap text-xs text-ink-5">{lines.length > 0 ? `${lines.length} 行` : '还没有歌词'}</span>
              <button type="button" aria-label="上移" disabled={i === 0} onClick={() => move(i, -1)} className="px-1 text-ink-5 hover:text-ink disabled:opacity-30">↑</button>
              <button type="button" aria-label="下移" disabled={i === blocks.length - 1} onClick={() => move(i, 1)} className="px-1 text-ink-5 hover:text-ink disabled:opacity-30">↓</button>
              <button
                type="button"
                aria-label={`删除 ${typeName(ids[i]!)}`}
                onClick={() => { if (lines.length === 0 || window.confirm(`删除 ${typeName(ids[i]!)}？这一段的歌词会一起删掉。`)) onRemove(b.key) }}
                className="px-1 text-base leading-none text-ink-6 hover:text-ink"
              >
                ×
              </button>
            </div>
            <textarea
              value={b.text}
              onChange={(e) => patch(b.key, { text: e.target.value })}
              rows={Math.max(2, b.text.split('\n').length)}
              placeholder="在这里输入歌词，一行一句"
              aria-label={`${typeName(ids[i]!)} 歌词`}
              className="resize-none border-0 bg-transparent p-0 text-[15px] leading-[1.85] text-ink-2 outline-0 placeholder:text-ink-6"
            />
            {long.length > 0 && (
              <p className={cx('rounded-md bg-accent-soft px-2.5 py-1.5 text-xs leading-5 text-accent-deep')}>
                这行太长，投影时会缩小，建议断成两行：{long[0]!.slice(0, 14)}{long[0]!.length > 14 ? '…' : ''}
              </p>
            )}
          </div>
        )
      })}

      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-dashed border-line-strong px-3.5 py-3 text-[13px]">
        <span className="mr-1 text-ink-5">新建段落</span>
        {BLOCK_TYPES.slice(0, 5).map((t) => (
          <GhostChip key={t.type} onClick={() => onAdd(newBlock(t.type))}>+ {t.label}</GhostChip>
        ))}
      </div>
    </div>
  )
}
