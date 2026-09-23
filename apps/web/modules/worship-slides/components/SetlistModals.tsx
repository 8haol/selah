'use client'
import Link from 'next/link'
import { useEffect, useState, useTransition } from 'react'
import { getTheme } from '@selah/slide-engine'
import type { SongRow } from '@/db/schema'
import { FieldShell, FilledInput, InlineError, Modal, Pill, Segmented, cx } from '@/core/ui'
import { listSongs } from '../actions'
import { typeName } from '../section-name'

/* ------------------------------------------------------------ add songs */

const TABS = [
  { value: 'public' as const, label: '公共歌库' },
  { value: 'mine' as const, label: '我的歌' },
]

export function AddSongModal({
  count, inSetlist, onAdd, onClose,
}: {
  count: number
  inSetlist: Set<string>
  onAdd: (songId: string) => void
  onClose: () => void
}) {
  const [tab, setTab] = useState<'public' | 'mine'>('public')
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<SongRow[] | null>(null)
  const [, start] = useTransition()

  useEffect(() => {
    let live = true
    const t = setTimeout(() => {
      start(async () => {
        const r = await listSongs(q, tab)
        if (live) setRows(r)
      })
    }, q ? 250 : 0)
    return () => { live = false; clearTimeout(t) }
  }, [q, tab])

  return (
    <Modal onClose={onClose} labelledBy="add-song-title" className="max-h-[84vh] max-w-[640px]">
      <div className="flex flex-col gap-4 px-[26px] pb-4 pt-6">
        <div className="flex items-baseline justify-between">
          <h2 id="add-song-title" className="text-[21px] font-bold">添加歌曲</h2>
          <span className="text-sm font-semibold text-accent">歌单 {count} 首</span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex-none">
            <Segmented ariaLabel="歌库范围" size="sm" options={TABS} value={tab} onChange={setTab} />
          </div>
          <FieldShell className="h-10 flex-1">
            <FilledInput
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜索歌名或歌词"
              aria-label="搜索歌曲"
              className="text-[14.5px]"
            />
          </FieldShell>
        </div>
      </div>

      <div className="scroll-thin flex-1 overflow-auto px-[26px]">
        {rows === null ? (
          <p className="py-10 text-center text-[14.5px] text-ink-5">正在找…</p>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-[14.5px] text-ink-5">
            {q ? '没有找到匹配的歌' : tab === 'mine' ? '还没有导入过歌' : '公共歌库还是空的'}
          </p>
        ) : (
          rows.map((s) => {
            const added = inSetlist.has(s.id)
            const ready = s.sections.length > 0
            return (
              <div key={s.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-line py-3.5">
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold">{s.title}</div>
                  <div className="mt-[3px] truncate text-[13px] text-ink-5">
                    {[s.artist, s.key && `${s.key} 调`, s.sections.map((x) => typeName(x.id)).join(' · ')].filter(Boolean).join(' · ')}
                  </div>
                </div>
                <Pill
                  tone={added || !ready ? 'done' : 'dark'}
                  disabled={added || !ready}
                  onClick={() => onAdd(s.id)}
                >
                  {!ready ? '整理中' : added ? '已在歌单' : '加入歌单'}
                </Pill>
              </div>
            )
          })
        )}
      </div>

      <div className="flex items-center gap-2.5 border-t border-line px-[26px] py-4">
        <Link href="/worship/import?from=svc" className="text-[14.5px] text-accent hover:text-accent-link">
          找不到？导入新歌
        </Link>
        <Pill onClick={onClose} size="md" className="ml-auto font-semibold">
          完成
        </Pill>
      </div>
    </Modal>
  )
}

/* --------------------------------------------------------------- export */

/** Only PPTX is wired up; the rest are drawn so the choice is visible, not silently dropped. */
const FORMATS = [
  { value: 'pptx' as const, label: 'PowerPoint' },
  { value: 'key' as const, label: 'Keynote' },
  { value: 'pdf' as const, label: 'PDF' },
]
const RATIOS = [
  { value: '16:9' as const, label: '16:9' },
  { value: '4:3' as const, label: '4:3' },
]

export interface ExportRow {
  n: number
  name: string
  pages: string
  themeId: string
}

export function ExportModal({
  title, summary, rows, busy, note, error, done, fileName, onDownload, onClose,
}: {
  title: string
  summary: string
  rows: ExportRow[]
  busy: boolean
  note: string | null
  error: string | null
  done: boolean
  fileName: string
  onDownload: () => void
  onClose: () => void
}) {
  const [fmt, setFmt] = useState<'pptx' | 'key' | 'pdf'>('pptx')
  const [ratio, setRatio] = useState<'16:9' | '4:3'>('16:9')

  return (
    <Modal onClose={onClose} labelledBy="export-title" className="max-w-[460px] gap-[22px] p-7">
      {done ? (
        <>
          <div className="flex flex-col gap-2">
            <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-lg font-bold text-accent">✓</span>
            <h2 id="export-title" className="mt-1.5 text-[22px] font-bold">已开始下载</h2>
            <p className="break-all text-sm text-ink-4">{fileName}</p>
          </div>
          <p className="rounded-xl bg-surface-3 px-[18px] py-4 text-sm leading-[1.7] text-ink-2">
            这份歌单已经存下来了，工作台的「最近的敬拜」里能再找到它。
          </p>
          <Pill tone="soft" size="md" onClick={onClose} className="justify-center font-medium">
            完成
          </Pill>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <h2 id="export-title" className="text-[22px] font-bold">导出整场</h2>
            <p className="text-sm text-ink-5">
              {title} · {summary}
            </p>
          </div>

          <div className="flex flex-col gap-0.5">
            {rows.map((r) => (
              <div key={r.n} className="flex items-center gap-2.5 border-b border-surface-3 py-2 text-sm">
                <span className="w-[18px] font-mono text-[11.5px] font-medium text-ink-5">{r.n}</span>
                <span
                  className="size-3 rounded-[3px] border border-black/10 bg-cover bg-center"
                  style={{ backgroundImage: `url(${posterOf(r.themeId)})` }}
                />
                <span className="flex-1 truncate">{r.name}</span>
                <span className="text-[12.5px] text-ink-5">{r.pages}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2.5">
            <span className="text-[13px] text-ink-4">格式</span>
            <Segmented ariaLabel="格式" size="sm" grow options={FORMATS} value={fmt} onChange={setFmt} />
          </div>
          <div className="flex flex-col gap-2.5">
            <span className="text-[13px] text-ink-4">比例</span>
            <Segmented ariaLabel="比例" size="sm" grow options={RATIOS} value={ratio} onChange={setRatio} />
          </div>

          {(fmt !== 'pptx' || ratio !== '16:9') && (
            <p className="text-xs leading-5 text-ink-5">
              现在只能导出 16:9 的 PowerPoint。Keynote 能直接打开这个 .pptx；PDF 和 4:3 还没接上。
            </p>
          )}
          {error && <InlineError>{error}</InlineError>}
          {busy && note && <p className="text-xs text-ink-5">{note}</p>}

          <button
            type="button"
            onClick={onDownload}
            disabled={busy || fmt !== 'pptx' || ratio !== '16:9'}
            className={cx(
              'rounded-xl py-3.5 text-center text-[15.5px] font-semibold text-white transition-colors',
              busy || fmt !== 'pptx' || ratio !== '16:9' ? 'cursor-not-allowed bg-ink-disabled' : 'cursor-pointer bg-ink hover:bg-ink-2',
            )}
          >
            {busy ? '生成中…' : '下载'}
          </button>
        </>
      )}
    </Modal>
  )
}

function posterOf(themeId: string): string {
  const bg = getTheme(themeId).background
  return bg.kind === 'video' ? bg.poster : bg.src
}
