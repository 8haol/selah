'use client'
import Link from 'next/link'
import { useMemo, useRef, useState, useTransition } from 'react'
import {
  annotateLine, buildDeck, deckFileName, getTheme, parseFlow, renderPptxBytes,
  sectionIdFor, slideTheme, tunedTheme, type Slide, type SongSection,
} from '@selah/slide-engine'
import type { SetlistSettings } from '@/db/schema'
import type { SetlistView } from '../setlist-actions'
import {
  addSongToSetlist, getSetlist, removeSetlistItem, reorderSetlist, saveSetlistDeck,
  setSetlistTheme, updateSetlistItem, updateSetlistSettings,
} from '../setlist-actions'
import { updateSongPinyin, updateSongSections } from '../actions'
import { fetchDeckAssets } from '../deck-assets'
import { InlineError, Segmented, cx, pillClass } from '@/core/ui'
import { SlideView, posterSrc, slideLabel } from './SlideView'
import { FlowPanel, LyricsPanel, SettingsPanel, ThemePanel } from './SetlistPanels'
import { typeName } from '../section-name'
import { AddSongModal, ExportModal, type ExportRow } from './SetlistModals'

type Tab = 'lyrics' | 'flow' | 'theme' | 'set'

const TABS = [
  { value: 'lyrics' as const, label: '歌词' },
  { value: 'flow' as const, label: '顺序' },
  { value: 'theme' as const, label: '主题' },
  { value: 'set' as const, label: '整场设置' },
]

const SAMPLE_LINES = ['我心满溢　我心满溢']

/** Turn a textarea's contents back into the lines a section stores. */
function linesFrom(text: string, overrides: Record<string, string>) {
  return text.split('\n').map((zh) => ({ zh: zh.trim(), pinyin: annotateLine(zh.trim(), overrides) }))
}

export function SetlistEditor({ initial }: { initial: SetlistView }) {
  const [songs, setSongs] = useState(initial.songs)
  const [settings, setSettings] = useState<SetlistSettings>(initial.settings)
  const [cur, setCur] = useState(0)
  const [page, setPage] = useState(0)
  const [tab, setTab] = useState<Tab>('lyrics')
  const [addOpen, setAddOpen] = useState(initial.songs.length === 0)
  const [dlOpen, setDlOpen] = useState(false)
  const [dlDone, setDlDone] = useState(false)
  const [fileName, setFileName] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, start] = useTransition()
  const dragItem = useRef<number | null>(null)

  const setlistId = initial.id
  const index = Math.min(cur, Math.max(0, songs.length - 1))
  const song = songs[index]

  /** One build covers the whole service: the summary, the rail and the preview. */
  const deck = useMemo(() => {
    if (songs.length === 0) return null
    return buildDeck({
      // a half-typed blank line should not become a blank row on the projector
      songs: songs.map((s) => ({
        ...s.song,
        sections: s.song.sections.map((sec) => ({ ...sec, lines: sec.lines.filter((l) => l.zh.trim()) })),
      })),
      flows: Object.fromEntries(songs.map((s) => [s.song.id, s.flow.join(' ')])),
      themes: Object.fromEntries(songs.map((s) => [s.song.id, s.themeId])),
      themeId: songs[0]!.themeId,
      linesPerSlide: settings.linesPerSlide,
      bigText: settings.bigText,
      pinyin: settings.pinyin,
      titleSlides: settings.titleSlides,
      blankBetweenSongs: settings.blankBetween,
    })
  }, [songs, settings])

  const pages = useMemo(
    () => (deck && song ? deck.slides.filter((s) => s.songId === song.song.id) : []),
    [deck, song],
  )
  const pi = Math.min(page, Math.max(0, pages.length - 1))
  const slide = pages[pi]
  const total = deck?.slides.length ?? 0
  const pageCountOf = (songId: string) => (deck?.slides.filter((s) => s.songId === songId).length ?? 0)

  const editorTheme = song ? tunedTheme(getTheme(song.themeId), settings) : null
  const sample: Slide = useMemo(
    () => ({ kind: 'lyrics', lines: SAMPLE_LINES.map((l) => ({ zh: l, pinyin: annotateLine(l, {}) })) }),
    [],
  )

  /* ------------------------------------------------------------ mutation */

  const patchSong = (i: number, fn: (s: SetlistView['songs'][number]) => SetlistView['songs'][number]) =>
    setSongs((xs) => xs.map((s, k) => (k === i ? fn(s) : s)))

  const saveSections = (songId: string, sections: SongSection[]) =>
    start(async () => {
      const r = await updateSongSections(songId, sections.map((s) => ({ id: s.id, lines: s.lines.map((l) => l.zh) })))
      if (!r.ok) setError(r.message)
    })

  const onEditSection = (sectionId: string, text: string) => {
    if (!song) return
    const overrides = song.song.pinyinOverrides
    const sections = song.song.sections.map((s) => (s.id === sectionId ? { ...s, lines: linesFrom(text, overrides) } : s))
    patchSong(index, (s) => ({ ...s, song: { ...s.song, sections } }))
    saveSections(song.song.id, sections)
  }

  const onAddSection = (prefix: string) => {
    if (!song) return
    const existing = new Set(song.song.sections.map((s) => s.id))
    let id = prefix === 'V' ? 'V1' : prefix
    if (prefix === 'V') { let n = 1; while (existing.has(`V${n}`)) n += 1; id = `V${n}` }
    else if (existing.has(id)) return
    const type = { V: 'verse', C: 'chorus', PC: 'prechorus', B: 'bridge', E: 'ending' }[prefix] as SongSection['type']
    const sections = [...song.song.sections, { id: sectionIdFor(type, Number(id.replace(/\D/g, '') || 1)), type, lines: [{ zh: '', pinyin: [] }] }]
    patchSong(index, (s) => ({ ...s, song: { ...s.song, sections } }))
  }

  const onPinyin = (char: string, reading: string) => {
    if (!song) return
    const overrides = { ...song.song.pinyinOverrides, [char]: reading }
    const sections = song.song.sections.map((s) => ({ ...s, lines: s.lines.map((l) => ({ ...l, pinyin: annotateLine(l.zh, overrides) })) }))
    patchSong(index, (s) => ({ ...s, song: { ...s.song, pinyinOverrides: overrides, sections } }))
    start(async () => {
      const r = await updateSongPinyin(song.song.id, overrides)
      if (!r.ok) setError(r.message)
    })
  }

  const saveFlow = (i: number, flow: string[]) => {
    const s = songs[i]!
    patchSong(i, (x) => ({ ...x, flow }))
    start(async () => {
      const r = await updateSetlistItem(setlistId, s.itemId, { flow: flow.join(' ') })
      if (!r.ok) setError(r.message)
    })
  }

  const onPickTheme = (themeId: string) => {
    if (!song) return
    patchSong(index, (s) => ({ ...s, themeId }))
    start(async () => {
      const r = await updateSetlistItem(setlistId, song.itemId, { themeId })
      if (!r.ok) setError(r.message)
    })
  }

  const onApplyAll = () => {
    if (!song) return
    const themeId = song.themeId
    setSongs((xs) => xs.map((s) => ({ ...s, themeId })))
    start(async () => {
      const r = await setSetlistTheme(setlistId, themeId)
      if (!r.ok) setError(r.message)
    })
  }

  const onSettings = (patch: Partial<SetlistSettings>) => {
    setSettings((s) => ({ ...s, ...patch }))
    setPage(0)
    start(async () => {
      const r = await updateSetlistSettings(setlistId, patch)
      if (!r.ok) setError(r.message)
    })
  }

  const onAddSong = (songId: string) =>
    start(async () => {
      const r = await addSongToSetlist(setlistId, songId)
      if (!r.ok) { setError(r.message); return }
      // re-read rather than guess: the server owns positions and the default theme
      const fresh = await getSetlist(setlistId)
      if (!fresh) return
      setSongs(fresh.songs)
      setCur(fresh.songs.length - 1)
      setPage(0)
    })

  const onRemoveSong = (i: number) => {
    const s = songs[i]!
    setSongs((xs) => xs.filter((_, k) => k !== i))
    setCur((c) => Math.max(0, Math.min(c, songs.length - 2)))
    setPage(0)
    start(async () => {
      const r = await removeSetlistItem(setlistId, s.itemId)
      if (!r.ok) setError(r.message)
    })
  }

  const onMoveSong = (from: number, to: number) => {
    const next = [...songs]
    const [m] = next.splice(from, 1)
    next.splice(to, 0, m!)
    setSongs(next)
    setCur(to)
    start(async () => {
      const r = await reorderSetlist(setlistId, next.map((s) => s.itemId))
      if (!r.ok) setError(r.message)
    })
  }

  /* -------------------------------------------------------------- export */

  const download = async () => {
    if (!deck) return
    setBusy(true); setError(null); setNote(null)
    try {
      const saved = await saveSetlistDeck(setlistId)
      if (!saved.ok) throw new Error(saved.message)

      const assets = await fetchDeckAssets(saved.deck, setNote)
      const bytes = await renderPptxBytes(saved.deck, assets)
      const name = deckFileName(saved.deck, saved.titles)
      // lib.dom types BlobPart as ArrayBufferView<ArrayBuffer>; JSZip's Uint8Array is over ArrayBufferLike
      const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob); a.download = name; a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
      setFileName(name)
      setDlDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false); setNote(null)
    }
  }

  const exportRows: ExportRow[] = songs.map((s, i) => ({
    n: i + 1, name: s.song.title, pages: `${pageCountOf(s.song.id)} 页`, themeId: s.themeId,
  }))
  const summary = `${songs.length} 首 · ${total} 页`
  const allSame = songs.length > 0 && songs.every((s) => s.themeId === songs[0]!.themeId)

  /* ---------------------------------------------------------------- view */

  return (
    <div className="flex h-screen min-h-[680px] flex-col bg-surface-3">
      <header className="flex h-[60px] flex-none items-center gap-4 border-b border-line-3 bg-surface px-5 text-sm">
        <Link href="/worship" className="flex-none text-ink-4 transition-colors hover:text-ink">
          ‹ 工作台
        </Link>
        <span className="h-5 w-px flex-none bg-line-3" />
        <span className="min-w-0 truncate text-[15.5px] font-semibold">{initial.title}</span>
        <span className="hidden flex-none text-[13px] text-ink-5 sm:inline">改动自动保存</span>
        <div className="ml-auto flex flex-none items-center gap-3.5">
          <span className="hidden text-[13.5px] text-ink-4 sm:inline">{summary}</span>
          <button
            type="button"
            onClick={() => { if (songs.length) { setDlOpen(true); setDlDone(false); setError(null) } }}
            disabled={songs.length === 0}
            className={cx(
              'rounded-full px-5 py-2.5 font-semibold text-white transition-colors',
              songs.length ? 'cursor-pointer bg-ink hover:bg-ink-2' : 'cursor-not-allowed bg-ink-disabled',
            )}
          >
            一键导出 PPT
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[272px_340px_minmax(0,1fr)]">
        {/* ---------------------------------------------------- 歌单 rail */}
        <div className="scroll-thin flex max-h-[38vh] flex-col gap-1.5 overflow-auto border-b border-line-2 bg-surface-2 px-3.5 py-5 lg:max-h-none lg:border-b-0 lg:border-r">
          <div className="flex items-baseline justify-between px-1.5 pb-2">
            <h2 className="text-[17px] font-bold">歌单</h2>
            <span className="text-[13px] font-semibold text-accent">{songs.length} 首</span>
          </div>

          {songs.map((s, i) => {
            const on = i === index
            return (
              <div
                key={s.itemId}
                draggable
                onDragStart={() => { dragItem.current = i }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const from = dragItem.current
                  dragItem.current = null
                  if (from !== null && from !== i) onMoveSong(from, i)
                }}
                onClick={() => { setCur(i); setPage(0) }}
                className={cx(
                  'grid cursor-pointer grid-cols-[20px_minmax(0,1fr)_16px] items-center gap-2.5 rounded-xl py-[11px] pl-3 pr-2.5',
                  on ? 'bg-surface shadow-[0_1px_4px_rgba(0,0,0,.08)]' : 'hover:bg-line',
                )}
              >
                <span className={cx('font-mono text-xs font-medium', on ? 'text-accent' : 'text-ink-5')}>{i + 1}</span>
                <div className="flex min-w-0 flex-col gap-[5px]">
                  <span className="truncate text-[14.5px] font-semibold">{s.song.title}</span>
                  <div className="flex items-center gap-1.5 text-xs text-ink-5">
                    <span
                      className="size-3 flex-none rounded-[3px] border border-black/10 bg-cover bg-center"
                      style={{ backgroundImage: `url(${posterSrc(getTheme(s.themeId))})` }}
                    />
                    <span className="truncate">
                      {s.flow.length} 段 · {pageCountOf(s.song.id)} 页 · {getTheme(s.themeId).name.split(' · ')[0]}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label={`把《${s.song.title}》移出歌单`}
                  onClick={(e) => { e.stopPropagation(); onRemoveSong(i) }}
                  className="text-center text-base text-ink-6 hover:text-ink"
                >
                  ×
                </button>
              </div>
            )
          })}

          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="mt-1 rounded-xl border-[1.5px] border-dashed border-line-strong p-3 text-center text-sm font-medium text-accent transition-colors hover:border-accent"
          >
            + 添加歌曲
          </button>
        </div>

        {songs.length === 0 || !song || !editorTheme ? (
          <div className="flex flex-col items-center justify-center gap-4 p-6 text-center lg:col-span-2">
            <h2 className="text-[28px] font-bold">先加几首歌</h2>
            <p className="text-[15.5px] text-ink-4">从歌库挑，或者导入一首新歌。</p>
            <div className="mt-2 flex gap-2.5">
              <button type="button" onClick={() => setAddOpen(true)} className={pillClass({ size: 'md' })}>
                从歌库添加
              </button>
              <Link href="/worship/import?from=svc" className={pillClass({ tone: 'plain', size: 'md' })}>
                导入新歌
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* ------------------------------------------------ song panel */}
            <div className="flex min-h-0 flex-col border-b border-line-2 bg-surface lg:border-b-0 lg:border-r">
              <div className="flex flex-col gap-3.5 px-5 pt-[18px]">
                <h2 className="truncate text-[17px] font-bold">{song.song.title}</h2>
                <Segmented ariaLabel="编辑哪一部分" size="sm" grow options={TABS} value={tab} onChange={setTab} />
              </div>
              <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-3.5 overflow-auto px-5 pb-6 pt-[18px]">
                {error && <InlineError>{error}</InlineError>}

                {tab === 'lyrics' && (
                  <LyricsPanel
                    sections={song.song.sections}
                    theme={editorTheme}
                    currentSectionId={slide?.sectionId}
                    overrides={song.song.pinyinOverrides}
                    onEdit={onEditSection}
                    onAddSection={onAddSection}
                    onPinyin={onPinyin}
                  />
                )}

                {tab === 'flow' && (
                  <FlowPanel
                    flow={song.flow}
                    sections={song.song.sections}
                    theme={editorTheme}
                    currentFlowIndex={slide?.flowIndex}
                    onGo={(i) => {
                      const idx = pages.findIndex((p) => p.flowIndex === i)
                      if (idx >= 0) setPage(idx)
                    }}
                    onRemove={(i) => saveFlow(index, song.flow.filter((_, k) => k !== i))}
                    onMove={(from, to) => {
                      const next = [...song.flow]
                      const [m] = next.splice(from, 1)
                      next.splice(to, 0, m!)
                      saveFlow(index, next)
                    }}
                    onAdd={(id) => saveFlow(index, [...song.flow, id])}
                    onReset={() => saveFlow(index, parseFlow(song.song.defaultFlow || song.song.sections.map((s) => s.id).join(' ')))}
                  />
                )}

                {tab === 'theme' && (
                  <ThemePanel
                    themeId={song.themeId}
                    sample={sample}
                    applyAllLabel={allSame ? '所有歌都用这个主题' : '应用到所有歌'}
                    onPick={onPickTheme}
                    onApplyAll={onApplyAll}
                  />
                )}

                {tab === 'set' && <SettingsPanel settings={settings} onChange={onSettings} />}
              </div>
            </div>

            {/* --------------------------------------------------- preview */}
            <div className="flex min-w-0 flex-col items-center gap-4 px-6 pb-5 pt-9 md:px-11">
              <div className="w-full max-w-[760px] overflow-hidden rounded-xl shadow-[0_24px_60px_rgba(0,0,0,.16)]">
                {slide && deck ? (
                  <SlideView slide={slide} theme={slideTheme(deck, slide)} frameClassName="" />
                ) : (
                  <div className="grid aspect-video place-items-center bg-surface text-sm text-ink-5">这首歌的顺序是空的</div>
                )}
              </div>

              <div className="flex items-center gap-3.5 text-[13px] text-ink-5">
                <button
                  type="button"
                  aria-label="上一页"
                  onClick={() => setPage(Math.max(0, pi - 1))}
                  className="rounded-sm bg-surface px-2.5 py-1"
                >
                  ‹
                </button>
                <span>
                  {slide ? slideLabel(slide) : '—'} · 第 {pages.length ? pi + 1 : 0} / {pages.length} 页
                </span>
                <button
                  type="button"
                  aria-label="下一页"
                  onClick={() => setPage(Math.min(pages.length - 1, pi + 1))}
                  className="rounded-sm bg-surface px-2.5 py-1"
                >
                  ›
                </button>
              </div>

              <div className="scroll-thin mt-auto flex w-full max-w-[760px] gap-2 overflow-x-auto p-1 pb-1.5">
                {deck &&
                  pages.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPage(i)}
                      aria-current={i === pi || undefined}
                      className="flex w-[88px] flex-none flex-col gap-[5px]"
                    >
                      <span
                        className={cx(
                          'overflow-hidden rounded-xs border border-line-4 outline-2 outline-offset-2',
                          i === pi ? 'outline-accent' : 'outline-transparent',
                        )}
                      >
                        <SlideView slide={p} theme={slideTheme(deck, p)} static frameClassName="" />
                      </span>
                      <span className={cx('truncate text-center text-[11px]', i === pi ? 'text-accent' : 'text-ink-5')}>
                        {p.kind === 'title' ? '标题' : p.sectionId ? typeName(p.sectionId) : slideLabel(p)}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          </>
        )}
      </div>

      {addOpen && (
        <AddSongModal
          count={songs.length}
          inSetlist={new Set(songs.map((s) => s.song.id))}
          onAdd={onAddSong}
          onClose={() => setAddOpen(false)}
        />
      )}

      {dlOpen && (
        <ExportModal
          title={initial.title}
          summary={summary}
          rows={exportRows}
          busy={busy}
          note={note}
          error={error}
          done={dlDone}
          fileName={fileName}
          onDownload={download}
          onClose={() => setDlOpen(false)}
        />
      )}
    </div>
  )
}
