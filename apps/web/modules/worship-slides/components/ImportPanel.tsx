'use client'
import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { getTheme } from '@selah/slide-engine'
import { FieldShell, FilledInput, InlineError, Segmented, Spinner, cx } from '@/core/ui'
import { createSong } from '../actions'
import { addSongToSetlist } from '../setlist-actions'
import { SHEET_ACCEPT, isSheetFile, prepareSheet } from '../sheet-image'
import { blockIds, blocksFromTagged, blocksFromText, blocksToLyricsText, blocksToSections, flowIds, newBlock, type LyricBlock } from '../blocks'
import { LyricBlocksEditor } from './LyricBlocksEditor'
import { FlowPanel } from './SetlistPanels'
import type { RecognizeResult } from '@/app/api/worship/recognize/route'

type Tab = 'sheet' | 'paste' | 'file'

const TABS = [
  { value: 'sheet' as const, label: '上传歌谱' },
  { value: 'paste' as const, label: '粘贴歌词' },
  { value: 'file' as const, label: '上传文件' },
]

const MAX_PAGES = 4

const DROP_COPY = {
  file: { title: '把文件拖到这里', sub: '支持 TXT 和 Markdown；歌谱图片和 PDF 用「上传歌谱」', btn: '选择文件', accept: '.txt,.md,text/plain,text/markdown' },
  sheet: { title: '把歌谱拖到这里', sub: '照片、截图、扫描件都行：JPG、PNG、HEIC、WebP、PDF 等。一首歌最多 4 页，也可以直接粘贴截图', btn: '选择歌谱', accept: SHEET_ACCEPT },
} as const

export function ImportPanel({ from, setlistId }: { from: 'dash' | 'svc'; setlistId: string | null }) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('sheet')
  const [name, setName] = useState('')
  const [paste, setPaste] = useState('')
  const [blocks, setBlocks] = useState<LyricBlock[]>([])
  /** The singing order, as block keys, so retyping a block carries its place along. */
  const [flow, setFlow] = useState<string[]>([])
  const [artist, setArtist] = useState('')
  const [loaded, setLoaded] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [recognizing, setRecognizing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const sections = useMemo(() => blocksToSections(blocks), [blocks])
  const ids = sections.map((s) => s.id)
  const editing = blocks.length > 0
  const ready = sections.length > 0 && !!name.trim() && !recognizing

  const load = (next: { blocks: LyricBlock[]; flow: string[] }) => { setBlocks(next.blocks); setFlow(next.flow) }

  const recognize = async (files: File[]) => {
    setError(null)
    const sheets = files.filter(isSheetFile)
    if (sheets.length === 0) { setError('请选择歌谱图片或 PDF。'); return }
    if (sheets.length > MAX_PAGES) { setError(`一首歌最多 ${MAX_PAGES} 页，先选前 ${MAX_PAGES} 页。`); return }
    setRecognizing(true)
    setLoaded(sheets.length === 1 ? sheets[0]!.name : `${sheets.length} 页歌谱`)
    try {
      const prepared = await Promise.all(sheets.map(prepareSheet))
      const res = await fetch('/api/worship/recognize', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ files: prepared }),
      })
      const body = (await res.json().catch(() => null)) as { ok: true; result: RecognizeResult } | { ok: false; message: string } | null
      if (!body || !body.ok) { setError(body?.message ?? '识别失败，稍后再试。'); return }
      const r = body.result
      load(blocksFromTagged(r.sections, r.flow))
      if (r.artist && !artist.trim()) setArtist(r.artist)
      if (!name.trim() && r.title) setName(r.title)
      setNotice('已从歌谱识别出歌词，核对一下错字和分段再保存。')
    } catch (e) {
      setError(e instanceof Error ? e.message : '识别失败，稍后再试。')
    } finally {
      setRecognizing(false)
    }
  }

  // A screenshot on the clipboard can be pasted straight onto the page.
  const recognizeRef = useRef(recognize)
  useEffect(() => { recognizeRef.current = recognize })
  useEffect(() => {
    if (tab !== 'sheet') return
    const onPaste = (e: ClipboardEvent) => {
      const files = [...(e.clipboardData?.files ?? [])]
      if (files.length) { e.preventDefault(); void recognizeRef.current(files) }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [tab])

  const readFile = async (file: File) => {
    setError(null)
    if (isSheetFile(file)) { setTab('sheet'); void recognize([file]); return }
    if (!/\.(txt|md)$/i.test(file.name)) {
      setError('这里只能读 TXT 和 Markdown。Word 还没接上——先把歌词贴到「粘贴歌词」。')
      return
    }
    load(blocksFromText(await file.text()))
    setNotice(`已读取 ${file.name}，核对一下分段再保存。`)
    if (!name.trim()) setName(file.name.replace(/\.(txt|md)$/i, ''))
  }

  const save = () =>
    start(async () => {
      setError(null)
      const order = flowIds(blocks, flow)
      const r = await createSong({
        title: name.trim(), lyricsText: blocksToLyricsText(blocks),
        defaultFlow: (order.length ? order : ids).join(' '), pinyinOverrides: {}, artist: artist.trim(),
      })
      if (!r.ok) { setError(r.message); return }
      if (from === 'svc' && setlistId) {
        const add = await addSongToSetlist(setlistId, r.id)
        if (!add.ok) { setError(add.message); return }
        router.push(`/worship/setlist/${setlistId}`)
        return
      }
      router.push('/worship/library')
    })

  const drop = tab === 'paste' ? null : DROP_COPY[tab]

  const addBlock = (b: LyricBlock) => { setBlocks((xs) => [...xs, b]); setFlow((f) => [...f, b.key]) }
  const removeBlock = (key: string) => { setBlocks((xs) => xs.filter((b) => b.key !== key)); setFlow((f) => f.filter((k) => k !== key)) }
  const keyOfId = (id: string) => blocks[blockIds(blocks).indexOf(id)]?.key
  // The order list shows only blocks that have lyrics; its indices are into this.
  const liveFlow = flow.filter((k) => flowIds(blocks, [k]).length > 0)
  const flowView = flowIds(blocks, liveFlow)

  return (
    <>
      {!editing && (
        <div className="self-start">
          <Segmented
            ariaLabel="导入方式"
            size="lg"
            options={TABS}
            value={tab}
            onChange={(v) => { setTab(v); setLoaded(null); setError(null); setNotice(null) }}
          />
        </div>
      )}

      <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-3.5">
          <div className="grid gap-3.5 xl:grid-cols-2">
            <FieldShell label="歌名" className="h-[50px]">
              <FilledInput value={name} onChange={(e) => setName(e.target.value)} placeholder="例如：我要爱慕你" className="text-[15.5px] font-medium" aria-label="歌名" />
            </FieldShell>
            <FieldShell label="作者" className="h-[50px]">
              <FilledInput value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="例如：赞美之泉 · 游智婷" className="text-[15.5px]" aria-label="作者 / 来源" />
            </FieldShell>
          </div>

          {notice && (
            <p className="flex items-center gap-2 rounded-lg bg-accent-soft px-4 py-2.5 text-sm text-accent-deep">
              <span className="size-2 flex-none rounded-full bg-ok" />
              {notice}
            </p>
          )}

          {editing ? (
            <>
              <div className="flex items-baseline justify-between px-1">
                <h2 className="text-base font-semibold">歌词段落</h2>
                <button
                  type="button"
                  onClick={() => { if (window.confirm('清空这些段落，重新导入？')) { load({ blocks: [], flow: [] }); setNotice(null) } }}
                  className="text-[13px] text-ink-5 hover:text-ink"
                >
                  清空，重新导入
                </button>
              </div>
              <LyricBlocksEditor blocks={blocks} onChange={setBlocks} onAdd={addBlock} onRemove={removeBlock} />
            </>
          ) : tab === 'paste' ? (
            <div className="flex flex-col gap-2.5">
              <textarea
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                aria-label="歌词"
                placeholder={'把整首歌词贴在这里，段落之间空一行。\n写了“副歌”“[C]”“Chorus”这类标记的会自动认出来；没写也没关系，下一步可以逐段改。'}
                className="min-h-[380px] resize-none rounded-2xl border-0 bg-surface-3 px-[22px] py-5 text-[15.5px] leading-[1.9] outline-0"
              />
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={!paste.trim()}
                  onClick={() => { load(blocksFromText(paste)); setPaste('') }}
                  className={cx('rounded-full px-5 py-2.5 text-[14.5px] font-medium text-white transition-colors', paste.trim() ? 'bg-ink hover:bg-ink-2' : 'cursor-not-allowed bg-ink-disabled')}
                >
                  分成段落
                </button>
                <button type="button" onClick={() => addBlock(newBlock('verse'))} className="text-sm text-ink-4 hover:text-ink">
                  或者一段一段手动写
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                const files = [...e.dataTransfer.files]
                if (tab === 'sheet') void recognize(files)
                else if (files[0]) void readFile(files[0])
              }}
              className="flex min-h-[280px] flex-1 flex-col items-center justify-center gap-3.5 rounded-2xl md:min-h-[440px] border-[1.5px] border-dashed border-line-strong p-6 text-center"
            >
              <span className="flex size-12 items-center justify-center rounded-xl bg-accent-soft">
                <span className="size-4 rounded-[4px] border-2 border-accent" />
              </span>
              <span className="text-lg font-semibold">{drop!.title}</span>
              <span className="text-sm text-ink-5">{drop!.sub}</span>
              <input
                ref={fileRef}
                type="file"
                accept={drop!.accept}
                multiple={tab === 'sheet'}
                className="sr-only"
                onChange={(e) => {
                  const files = [...(e.target.files ?? [])]
                  e.target.value = '' // picking the same file again should still fire
                  if (tab === 'sheet') void recognize(files)
                  else if (files[0]) void readFile(files[0])
                }}
              />
              <button
                type="button"
                disabled={recognizing}
                onClick={() => fileRef.current?.click()}
                className={cx(
                  'mt-1.5 inline-flex items-center gap-2 rounded-full px-[22px] py-2.5 text-[14.5px] font-medium text-white transition-colors',
                  recognizing ? 'cursor-wait bg-ink-disabled' : 'bg-ink hover:bg-ink-2',
                )}
              >
                {recognizing && <Spinner />}
                {recognizing ? '正在识别歌谱…' : drop!.btn}
              </button>
              {loaded && (
                <div className="mt-3.5 flex items-center gap-2.5 rounded-lg bg-surface-3 px-4 py-2.5 text-sm">
                  <span className={cx('size-2 rounded-full', recognizing ? 'animate-pulse bg-accent' : 'bg-ok')} />
                  {loaded}
                  {recognizing && <span className="text-ink-5">· 大约 10–20 秒</span>}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3.5 rounded-[20px] bg-surface-3 p-[22px] lg:sticky lg:top-6">
          <h2 className="text-base font-semibold">演唱顺序</h2>
          {sections.length > 0 ? (
            <FlowPanel
              flow={flowView}
              sections={sections}
              theme={getTheme('night')}
              currentFlowIndex={undefined}
              onGo={() => {}}
              onRemove={(i) => setFlow(liveFlow.filter((_, k) => k !== i))}
              onMove={(from, to) => {
                const next = [...liveFlow]
                const [m] = next.splice(from, 1)
                next.splice(to, 0, m!)
                setFlow(next)
              }}
              onAdd={(id) => { const k = keyOfId(id); if (k) setFlow([...liveFlow, k]) }}
              onReset={() => setFlow(blocks.map((b) => b.key))}
            />
          ) : (
            <p className="py-10 text-center text-sm text-ink-6">分好段以后，在这里排唱的顺序</p>
          )}

          {error && <InlineError>{error}</InlineError>}

          <button
            type="button"
            onClick={save}
            disabled={!ready || pending}
            className={cx(
              'mt-2 rounded-xl py-3.5 text-center text-[15.5px] font-semibold text-white transition-colors',
              ready && !pending ? 'cursor-pointer bg-ink hover:bg-ink-2' : 'cursor-not-allowed bg-ink-disabled',
            )}
          >
            {pending ? '保存中…' : from === 'svc' ? '保存并加入歌单' : '保存到歌库'}
          </button>
          {!name.trim() && sections.length > 0 && <p className="text-center text-xs text-ink-5">还差一个歌名。</p>}
        </div>
      </div>
    </>
  )
}
