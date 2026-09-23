'use client'
import { useMemo, useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, X } from 'lucide-react'
import { buildDeck, FlowError, type SlideDeck } from '@selah/slide-engine'
import type { SongRow } from '@/db/schema'
import { rowToSong } from '../song-row'
import { saveDeck } from '../actions'
import { Button, Card, EmptyState, Field, Input, Toast } from './ui'
import { FlowInput } from './FlowInput'
import { ThemePicker } from './ThemePicker'
import { DeckPreview } from './DeckPreview'
import { DownloadPptxButton } from './DownloadPptxButton'

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-full border border-accent/25 bg-accent-soft font-serif text-sm font-medium text-accent"
        >
          {n}
        </span>
        <h2 className="font-serif text-base font-medium text-ink">{title}</h2>
        {hint && <span className="text-xs text-ink-soft">{hint}</span>}
      </div>
      <div className="mt-4 sm:pl-11">{children}</div>
    </section>
  )
}

export function GeneratePanel({ songs, initialSongIds }: { songs: SongRow[]; initialSongIds: string[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const byId = useMemo(() => new Map(songs.map((s) => [s.id, s])), [songs])
  const [selected, setSelected] = useState<string[]>(initialSongIds.filter((id) => byId.has(id)))
  const [flows, setFlows] = useState<Record<string, string>>({})
  const [themeId, setThemeId] = useState('night')
  const [name, setName] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const built = useMemo<{ deck: SlideDeck | null; error: string | null }>(() => {
    if (selected.length === 0) return { deck: null, error: null }
    try {
      const deck = buildDeck({ songs: selected.map((id) => rowToSong(byId.get(id)!)), flows, themeId })
      return { deck, error: null }
    } catch (e) { return { deck: null, error: e instanceof FlowError ? e.message : String(e) } }
  }, [selected, flows, themeId, byId])

  const move = (i: number, d: -1 | 1) => setSelected((s) => { const n = [...s]; const j = i + d; if (j < 0 || j >= n.length) return s; [n[i], n[j]] = [n[j]!, n[i]!]; return n })
  const titles = selected.map((id) => byId.get(id)!.title)
  const remaining = songs.filter((s) => !selected.includes(s.id))

  const save = () => {
    setSaveError(null)
    setSaved(false)
    start(async () => {
      try {
        const { deckId } = await saveDeck({ songIds: selected, flows: built.deck!.meta.flows, themeId, generatedByName: name || undefined })
        setSaved(true)
        router.push(`/worship/decks/${deckId}`)
      } catch (e) { setSaveError(e instanceof Error ? e.message : String(e)) }
    })
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start lg:gap-12">
      <div className="space-y-10">
        <Step n={1} title="选歌" hint="按敬拜顺序">
          <div className="space-y-4">
            <label className="block">
              <span className="sr-only">添加歌曲</span>
              <select
                className="h-11 w-full rounded-md border border-line bg-card px-3 text-sm text-ink transition-colors hover:border-ink-soft/50 focus:border-accent disabled:opacity-50"
                value=""
                disabled={remaining.length === 0}
                onChange={(e) => { const id = e.target.value; if (id && !selected.includes(id)) setSelected([...selected, id]) }}
              >
                <option value="">{remaining.length === 0 ? '歌库里的歌都加上了' : '＋ 添加一首歌…'}</option>
                {remaining.map((s) => <option key={s.id} value={s.id}>{s.title}{s.artist ? ` · ${s.artist}` : ''}</option>)}
              </select>
            </label>

            {selected.length === 0 ? (
              <p className="text-xs text-ink-soft">先从歌库里添加至少一首歌。</p>
            ) : (
              <ul className="space-y-3">
                {selected.map((id, i) => {
                  const s = byId.get(id)!
                  return (
                    <Card as="li" key={id} className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-ink-soft">{String(i + 1).padStart(2, '0')}</span>
                        <span className="min-w-0 flex-1 truncate font-serif text-[15px] font-medium text-ink">{s.title}</span>
                        <div className="flex shrink-0 items-center text-ink-soft">
                          <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="上移" className="grid size-11 place-items-center rounded-md sm:size-9 transition-colors hover:bg-paper hover:text-ink disabled:opacity-30"><ArrowUp size={15} aria-hidden="true" /></button>
                          <button type="button" onClick={() => move(i, 1)} disabled={i === selected.length - 1} aria-label="下移" className="grid size-11 place-items-center rounded-md sm:size-9 transition-colors hover:bg-paper hover:text-ink disabled:opacity-30"><ArrowDown size={15} aria-hidden="true" /></button>
                          <button type="button" onClick={() => setSelected(selected.filter((x) => x !== id))} aria-label="移除" className="grid size-11 place-items-center rounded-md sm:size-9 transition-colors hover:bg-danger-soft hover:text-danger"><X size={15} aria-hidden="true" /></button>
                        </div>
                      </div>
                      <div className="mt-3">
                        <FlowInput value={flows[id] ?? s.defaultFlow} onChange={(v) => setFlows({ ...flows, [id]: v })} sections={s.sections} />
                      </div>
                    </Card>
                  )
                })}
              </ul>
            )}
          </div>
        </Step>

        <Step n={2} title="主题" hint="鼠标移上去可预览动态主题">
          <ThemePicker value={themeId} onChange={setThemeId} />
        </Step>

        <Step n={3} title="导出">
          <div className="space-y-4">
            {built.error && <Toast tone="danger">{built.error}</Toast>}
            <Field label="制作人昵称" hint="可选，会记在这次生成的记录里。">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如 敬拜队" />
            </Field>
            <div className="flex flex-wrap items-start gap-3">
              {built.deck && <DownloadPptxButton deck={built.deck} titles={titles} size="lg" />}
              <Button variant="ghost" size="lg" loading={pending} disabled={!built.deck} onClick={save}>
                {pending ? '保存中' : '保存这次生成'}
              </Button>
            </div>
            {saved && !saveError && <Toast>已保存，正在打开这次生成的记录。</Toast>}
            {saveError && <Toast tone="danger">{saveError}</Toast>}
            <p className="text-xs leading-6 text-ink-soft">保存后可以在歌库首页「最近生成」里再次下载，flow 错了也能改完重新生成。</p>
          </div>
        </Step>
      </div>

      <div className="lg:sticky lg:top-24">
        <h2 className="mb-4 font-serif text-base font-medium text-ink">预览</h2>
        {built.deck ? (
          <DeckPreview deck={built.deck} />
        ) : (
          <EmptyState
            title="预览会出现在这里"
            description="左边选一首歌，排好 flow，这里就会实时显示每一页投影的样子。"
          />
        )}
      </div>
    </div>
  )
}
