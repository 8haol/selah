'use client'
import { useEffect, useState } from 'react'
import { nanoid } from 'nanoid'
import { annotateLine, slideText, slideTheme, stripPinyin, type DeckEdits, type Slide, type SlideDeck } from '@selah/slide-engine'
import { InlineError, Modal, Pill, cx } from '@/core/ui'
import { SlideView } from './SlideView'
import { typeName } from '../section-name'
import { addSlide, editCount, removeSlide, restoreSlide, revertSlide, rewriteSlide } from '../slide-edits'

/** One line per row, as typed; blank lines are dropped on save. */
const linesOf = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean)
const MAX_LINES = 12

/**
 * 总览: every slide of the service in order, to look over before export. A
 * slide can be rewritten, removed or followed by a page of free text; the
 * changes belong to this setlist only, the songs in the library stay as they are.
 */
export function DeckOverview({ deck, edits, titles, showPinyin, title, error, onChange, onBack, onNext }: {
  /** Built with `showRemoved`, so removed slides can be offered back. */
  deck: SlideDeck
  edits: DeckEdits
  /** songId → song title, for the captions. */
  titles: Record<string, string>
  showPinyin: boolean
  title: string
  error: string | null
  onChange: (edits: DeckEdits) => void
  onBack: () => void
  onNext: () => void
}) {
  /** The slide whose text is open for editing, or where a new one goes. */
  const [editing, setEditing] = useState<{ slide: Slide } | { after: string } | null>(null)
  const live = deck.slides.filter((s) => s.edit !== 'removed').length
  const changes = editCount(edits)

  // Esc goes back to the editor, unless the text dialog is open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !editing) onBack() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editing, onBack])

  const numbers = deck.slides.reduce<number[]>((acc, s) => [...acc, (acc.at(-1) ?? 0) + (s.edit === 'removed' ? 0 : 1)], [])
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="overview-title" className="fixed inset-0 z-30 flex flex-col bg-surface-3">
      <header className="flex h-[56px] flex-none items-center gap-3 border-b border-line-3 bg-surface px-4 text-sm md:h-[60px] md:gap-4 md:px-5">
        <button type="button" onClick={onBack} className="flex-none text-ink-4 transition-colors hover:text-ink">
          ‹ 返回编辑
        </button>
        <span className="h-5 w-px flex-none bg-line-3" />
        <h2 id="overview-title" className="min-w-0 truncate font-semibold">
          总览 · {title}
        </h2>
        <div className="ml-auto flex flex-none items-center gap-3.5">
          <span className="hidden text-[13.5px] text-ink-4 sm:inline">{live} 页</span>
          {changes > 0 && (
            <button type="button" onClick={() => onChange({})} className="hidden text-[13.5px] text-ink-4 hover:text-ink sm:inline">
              还原全部改动
            </button>
          )}
          <Pill size="md" onClick={onNext} disabled={live === 0}>
            下一步：导出
          </Pill>
        </div>
      </header>

      <div className="scroll-thin flex-1 overflow-auto px-4 pb-16 pt-6 md:px-8">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[13.5px] text-ink-4">
              导出前把每一页过一遍。这里的改字、删除和新加的页只用在这份歌单，歌库里的歌不会变。
            </p>
            <button type="button" onClick={() => setEditing({ after: '' })} className="text-[13.5px] font-medium text-accent hover:text-accent-link">
              + 在开头加一页
            </button>
          </div>
          {changes > 0 && (
            <button type="button" onClick={() => onChange({})} className="self-start text-[13.5px] text-ink-4 hover:text-ink sm:hidden">
              还原全部改动
            </button>
          )}
          {error && <InlineError>{error}</InlineError>}

          <ol className="grid gap-x-4 gap-y-6 [grid-template-columns:repeat(auto-fill,minmax(200px,1fr))]">
            {deck.slides.map((s, i) => {
              const removed = s.edit === 'removed'
              return (
                <li key={s.key} className="flex flex-col gap-2">
                  <div className={cx('relative overflow-hidden rounded-lg border border-line-4', removed && 'opacity-35')}>
                    <SlideView slide={s} theme={slideTheme(deck, s)} static frameClassName="" />
                  </div>
                  <div className="flex items-baseline gap-2 text-[12.5px]">
                    <span className="w-6 flex-none font-mono text-[11.5px] text-ink-5">{removed ? '—' : numbers[i]}</span>
                    <span className={cx('min-w-0 flex-1 truncate', removed ? 'text-ink-6 line-through' : 'text-ink-3')}>{caption(s, titles)}</span>
                    {s.edit === 'rewritten' && <span className="flex-none font-medium text-accent">已改</span>}
                    {s.edit === 'added' && <span className="flex-none font-medium text-accent">新加</span>}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 pl-8 text-[12.5px]">
                    {removed ? (
                      <SmallAction onClick={() => onChange(restoreSlide(edits, s))}>恢复</SmallAction>
                    ) : (
                      <>
                        {s.kind !== 'blank' && <SmallAction onClick={() => setEditing({ slide: s })}>改字</SmallAction>}
                        {s.edit === 'rewritten' && <SmallAction onClick={() => onChange(revertSlide(edits, s))}>用回原文</SmallAction>}
                        <SmallAction onClick={() => onChange(removeSlide(edits, s))}>删除</SmallAction>
                        <SmallAction onClick={() => setEditing({ after: s.key! })}>+ 后面加一页</SmallAction>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </div>

      {editing && (
        <SlideTextModal
          slide={'slide' in editing ? editing.slide : null}
          deck={deck}
          after={'after' in editing ? editing.after : null}
          showPinyin={showPinyin}
          onSave={(lines) => {
            onChange('slide' in editing ? rewriteSlide(edits, editing.slide, lines) : addSlide(edits, editing.after, lines, nanoid(8)))
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function SmallAction({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="text-ink-4 transition-colors hover:text-accent">
      {children}
    </button>
  )
}

function caption(s: Slide, titles: Record<string, string>): string {
  if (s.edit === 'added') return '新加的页'
  const song = s.songId ? titles[s.songId] : undefined
  if (s.kind === 'blank') return song && s.sectionLabel ? `${song} · 空白` : '空白'
  if (s.kind === 'title') return `${song ?? s.title} · 标题`
  return [song, s.sectionId ? typeName(s.sectionId) : null].filter(Boolean).join(' · ')
}

/** Write a slide's text: the existing slide's, or a new page's. The preview follows as you type. */
function SlideTextModal({ slide, deck, after, showPinyin, onSave, onClose }: {
  slide: Slide | null
  deck: SlideDeck
  after: string | null
  showPinyin: boolean
  onSave: (lines: string[]) => void
  onClose: () => void
}) {
  const [text, setText] = useState(() => (slide ? slideText(slide).join('\n') : ''))
  const lines = linesOf(text)
  const isTitle = slide?.kind === 'title'
  const tooMany = lines.length > MAX_LINES

  // a new page takes the theme of the slide it follows
  const near = slide ?? deck.slides.find((s) => s.key === after) ?? deck.slides[0]
  const line = (zh: string) => {
    const l = { zh, pinyin: annotateLine(zh) }
    return showPinyin ? l : stripPinyin(l)
  }
  const preview: Slide = isTitle
    ? { ...slide!, title: lines.join(' '), titleLine: line(lines.join(' ')) }
    : { ...(slide ?? { kind: 'lyrics', themeId: near?.themeId }), fit: undefined, lines: lines.map(line) }

  return (
    <Modal onClose={onClose} labelledBy="slide-text-title" className="max-w-[720px] gap-5 p-6 md:p-7">
      <div className="flex flex-col gap-1.5">
        <h2 id="slide-text-title" className="text-[20px] font-bold">{slide ? (isTitle ? '改标题' : '改这一页') : '加一页'}</h2>
        <p className="text-[13px] text-ink-5">
          {isTitle ? '标题写在一行。' : '一行一行地写，和歌词页一样配拼音。'}只改这份歌单，歌库里的歌不变。
        </p>
      </div>
      <div className="overflow-hidden rounded-lg border border-line-4">
        <SlideView slide={preview} theme={slideTheme(deck, preview)} static frameClassName="" />
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={isTitle ? 1 : 4}
        autoFocus
        aria-label="这一页的文字"
        placeholder={slide ? '' : '例如：诗篇 23 篇 1–2 节'}
        className="w-full resize-y rounded-xl bg-surface-3 px-4 py-3 text-[15px] leading-7 outline-none focus:ring-2 focus:ring-accent/40"
      />
      {tooMany && <InlineError>一页最多 {MAX_LINES} 行，分成两页会更清楚。</InlineError>}
      <div className="flex justify-end gap-2.5">
        <Pill tone="soft" size="md" onClick={onClose}>取消</Pill>
        <Pill size="md" onClick={() => onSave(lines)} disabled={lines.length === 0 || tooMany || lines.some((l) => [...l].length > 80)}>
          {slide ? '保存' : '加上这一页'}
        </Pill>
      </div>
    </Modal>
  )
}
