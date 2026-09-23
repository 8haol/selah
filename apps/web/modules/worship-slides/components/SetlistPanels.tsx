'use client'
import { BUILTIN_THEMES, annotateLine, paginateLines, polyphonicChoices, type Slide, type SongSection, type Theme } from '@selah/slide-engine'
import type { SetlistSettings } from '@/db/schema'
import { GhostChip, Segmented, Toggle, cx } from '@/core/ui'
import { ADDABLE, typeName } from '../section-name'
import { SlideView } from './SlideView'


/**
 * Characters a hymn genuinely reads two ways. Nearly every Chinese character
 * has some second reading, so the list stays short: a prompt for 和 or 为 —
 * right almost every time — would bury the ones that are actually wrong.
 */
const AMBIGUOUS = ['单', '行', '乐', '长', '重', '降', '血', '还', '朝', '曾']

/* ------------------------------------------------------------- 歌词 tab */

export function LyricsPanel({
  sections, theme, currentSectionId, overrides, onEdit, onAddSection, onRemoveSection, onPinyin,
}: {
  sections: SongSection[]
  theme: Theme
  currentSectionId: string | undefined
  overrides: Record<string, string>
  onEdit: (sectionId: string, text: string) => void
  onAddSection: (prefix: string) => void
  onRemoveSection: (sectionId: string) => void
  onPinyin: (char: string, reading: string) => void
}) {
  const lines = sections.flatMap((s) => s.lines.map((l) => l.zh))
  // Show what the slide is reading right now, so the row confirms rather than nags.
  const prompts = AMBIGUOUS
    .filter((c) => lines.some((l) => l.includes(c)))
    .map((char) => {
      const line = lines.find((l) => l.includes(char))!
      const at = [...line].indexOf(char)
      return { char, line, current: annotateLine(line, overrides)[at] ?? '', choices: polyphonicChoices(char) }
    })
    .filter((p) => p.choices.length > 1)
    .slice(0, 2)

  return (
    <>
      {sections.map((sec) => {
        const filled = sec.lines.filter((l) => l.zh.trim())
        const pages = paginateLines(filled, theme).length
        return (
          <div
            key={sec.id}
            className={cx(
              'flex flex-col gap-1.5 rounded-xl bg-surface-3 px-4 pb-2.5 pt-3.5 outline-2',
              sec.id === currentSectionId ? 'outline-accent' : 'outline-transparent',
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold">{typeName(sec.id)}</span>
              <span className="ml-auto text-xs text-ink-5">
                {filled.length > 0 ? `${filled.length} 行 · ${pages} 页` : '还没有歌词'}
              </span>
              <button
                type="button"
                aria-label={`删除 ${typeName(sec.id)}`}
                title="删除这一段"
                onClick={() => {
                  if (filled.length === 0 || window.confirm(`删除 ${typeName(sec.id)}？这一段的歌词会一起删掉。`)) onRemoveSection(sec.id)
                }}
                className="-mr-1 px-1 text-base leading-none text-ink-6 transition-colors hover:text-ink"
              >
                ×
              </button>
            </div>
            <textarea
              value={sec.lines.map((l) => l.zh).join('\n')}
              onChange={(e) => onEdit(sec.id, e.target.value)}
              rows={Math.max(2, sec.lines.length)}
              placeholder="在这里输入歌词，一行一句"
              aria-label={`${typeName(sec.id)} 歌词`}
              className="resize-none border-0 bg-transparent p-0 text-[14.5px] leading-[1.85] text-ink-2 outline-0 placeholder:text-ink-6"
            />
          </div>
        )
      })}

      {prompts.map((p) => (
        <div key={p.char} className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-lg bg-accent-soft px-3.5 py-[11px] text-[13.5px] text-accent-deep">
          <span>
            “{p.char}” 现在读 {p.current || '—'}
          </span>
          <span className="ml-auto flex gap-1 font-mono text-xs font-medium">
            {p.choices.slice(0, 3).map((py) => {
              const on = (overrides[p.char] ?? p.current) === py
              return (
                <button
                  key={py}
                  type="button"
                  onClick={() => onPinyin(p.char, py)}
                  className={cx('rounded-[6px] px-2 py-[3px] transition-colors', on ? 'bg-ink text-white' : 'bg-surface text-ink-4')}
                >
                  {py}
                </button>
              )
            })}
          </span>
        </div>
      ))}

      <div className="flex flex-col gap-2 rounded-xl border border-dashed border-line-strong px-3.5 py-3 text-[13px]">
        <span className="text-ink-5">歌里还缺一段？新建一段空白歌词，会自动排到顺序最后</span>
        <div className="flex flex-wrap gap-1.5">
          {ADDABLE.map((t) => (
            <GhostChip key={t.prefix} onClick={() => onAddSection(t.prefix)}>
              + {t.label}
            </GhostChip>
          ))}
        </div>
      </div>
    </>
  )
}

/* ------------------------------------------------------------- 顺序 tab */

export function FlowPanel({
  flow, sections, theme, currentFlowIndex, onGo, onRemove, onMove, onAdd, onReset,
}: {
  flow: string[]
  sections: SongSection[]
  theme: Theme
  currentFlowIndex: number | undefined
  onGo: (index: number) => void
  onRemove: (index: number) => void
  onMove: (from: number, to: number) => void
  onAdd: (sectionId: string) => void
  onReset: () => void
}) {
  return (
    <>
      <div className="flex justify-between text-[13px] text-ink-5">
        <span>按唱的顺序排，拖动调整</span>
        <button type="button" onClick={onReset} className="hover:text-ink">
          恢复默认
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        {flow.map((tag, i) => {
          const sec = sections.find((s) => s.id === tag)
          const filled = sec?.lines.filter((l) => l.zh.trim()) ?? []
          const pages = paginateLines(filled, theme).length
          return (
            <div
              key={`${tag}-${i}`}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', String(i))}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const from = Number(e.dataTransfer.getData('text/plain'))
                if (!Number.isNaN(from) && from !== i) onMove(from, i)
              }}
              onClick={() => onGo(i)}
              className={cx(
                'grid cursor-grab grid-cols-[22px_minmax(0,1fr)_auto_18px] items-center gap-3 rounded-xl bg-surface-3 py-[11px] pl-3.5 pr-3 outline-2',
                i === currentFlowIndex ? 'outline-accent' : 'outline-transparent',
              )}
            >
              <span className="font-mono text-[11.5px] text-ink-5">{String(i + 1).padStart(2, '0')}</span>
              <div className="min-w-0">
                <div className="text-sm font-semibold">{typeName(tag)}</div>
                <div className="truncate text-[12.5px] text-ink-5">{filled[0]?.zh || '这一段还没有歌词'}</div>
              </div>
              <span className="text-xs text-ink-5">{pages > 0 ? `${pages} 页` : '—'}</span>
              <button
                type="button"
                aria-label={`把第 ${i + 1} 段移出顺序`}
                onClick={(e) => { e.stopPropagation(); onRemove(i) }}
                className="text-center text-base text-ink-6 hover:text-ink"
              >
                ×
              </button>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
        <span className="mr-1 text-ink-5">加入</span>
        {sections.map((s) => (
          <GhostChip key={s.id} onClick={() => onAdd(s.id)}>
            {typeName(s.id)}
          </GhostChip>
        ))}
      </div>
    </>
  )
}

/* ------------------------------------------------------------- 主题 tab */

export function ThemePanel({
  themeId, sample, applyAllLabel, onPick, onApplyAll,
}: {
  themeId: string
  sample: Slide
  applyAllLabel: string
  onPick: (id: string) => void
  onApplyAll: () => void
}) {
  return (
    <>
      <div className="flex items-center justify-between text-[13px]">
        <span className="text-ink-5">这首歌的主题</span>
        <button type="button" onClick={onApplyAll} className="text-accent hover:text-accent-link">
          {applyAllLabel}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-3.5">
        {BUILTIN_THEMES.map((t) => (
          <button key={t.id} type="button" onClick={() => onPick(t.id)} className="flex flex-col gap-1.5 text-left">
            <span
              className={cx(
                'overflow-hidden rounded-sm border border-line-soft outline-[2.5px] outline-offset-2',
                t.id === themeId ? 'outline-accent' : 'outline-transparent',
              )}
            >
              <SlideView slide={sample} theme={t} static frameClassName="" />
            </span>
            <span className="truncate text-[12.5px] text-ink-2">{t.name}</span>
          </button>
        ))}
      </div>
    </>
  )
}

/* --------------------------------------------------------- 整场设置 tab */

const LPP = [
  { value: 1 as const, label: '1 行' },
  { value: 2 as const, label: '2 行' },
  { value: 3 as const, label: '3 行' },
  { value: 4 as const, label: '4 行' },
]
const SPACING = [
  { value: 'tight' as const, label: '紧凑' },
  { value: 'normal' as const, label: '标准' },
  { value: 'loose' as const, label: '宽松' },
]
const OUTLINE = [
  { value: 'none' as const, label: '无' },
  { value: 'thin' as const, label: '细' },
  { value: 'thick' as const, label: '粗' },
]
const ANCHOR = [
  { value: 'top' as const, label: '固定首行' },
  { value: 'center' as const, label: '每页居中' },
]
const SIZE = [
  { value: false, label: '标准' },
  { value: true, label: '大字' },
]

export function SettingsPanel({
  settings, onChange,
}: {
  settings: SetlistSettings
  onChange: (patch: Partial<SetlistSettings>) => void
}) {
  return (
    <>
      <p className="text-[13px] text-ink-5">以下设置对整场歌单生效</p>
      <div className="flex flex-col gap-2.5">
        <span className="text-[13px] text-ink-4">每页行数</span>
        <Segmented ariaLabel="每页行数" size="sm" grow options={LPP} value={settings.linesPerSlide} onChange={(v) => onChange({ linesPerSlide: v })} />
      </div>
      <div className="flex flex-col gap-2.5">
        <span className="text-[13px] text-ink-4">字号</span>
        <Segmented ariaLabel="字号" size="sm" grow options={SIZE} value={settings.bigText} onChange={(v) => onChange({ bigText: v })} />
      </div>
      <div className="flex flex-col gap-2.5">
        <span className="text-[13px] text-ink-4">行间距</span>
        <Segmented ariaLabel="行间距" size="sm" grow options={SPACING} value={settings.lineSpacing} onChange={(v) => onChange({ lineSpacing: v })} />
      </div>
      <div className="flex flex-col gap-2.5">
        <span className="text-[13px] text-ink-4">字体描边</span>
        <Segmented ariaLabel="字体描边" size="sm" grow options={OUTLINE} value={settings.outline} onChange={(v) => onChange({ outline: v })} />
      </div>
      <div className="flex flex-col gap-2.5">
        <span className="text-[13px] text-ink-4">文字位置</span>
        <Segmented ariaLabel="文字位置" size="sm" grow options={ANCHOR} value={settings.anchor} onChange={(v) => onChange({ anchor: v })} />
        <span className="text-[12.5px] leading-[1.5] text-ink-5">
          {settings.anchor === 'top' ? '同一首歌每页第一行在同一高度，翻页时文字不上下跳' : '每页各自居中，行少的页也在正中间'}
        </span>
      </div>
      <div className="h-px bg-line" />
      <Toggle label="显示拼音" checked={settings.pinyin} onChange={(v) => onChange({ pinyin: v })} />
      <Toggle label="每首歌前加标题页" checked={settings.titleSlides} onChange={(v) => onChange({ titleSlides: v })} />
      <Toggle label="歌与歌之间空白页" checked={settings.blankBetween} onChange={(v) => onChange({ blankBetween: v })} />
    </>
  )
}
