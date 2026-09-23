'use client'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { buildDeck, FlowError, type SlideDeck } from '@selah/slide-engine'
import type { SongRow } from '@/db/schema'
import { rowToSong } from '../song-row'
import { saveDeck } from '../actions'
import { Button, Field, Input } from './ui'
import { FlowInput } from './FlowInput'
import { ThemePicker } from './ThemePicker'
import { DeckPreview } from './DeckPreview'
import { DownloadPptxButton } from './DownloadPptxButton'

export function GeneratePanel({ songs, initialSongIds }: { songs: SongRow[]; initialSongIds: string[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const byId = useMemo(() => new Map(songs.map((s) => [s.id, s])), [songs])
  const [selected, setSelected] = useState<string[]>(initialSongIds.filter((id) => byId.has(id)))
  const [flows, setFlows] = useState<Record<string, string>>({})
  const [themeId, setThemeId] = useState('night')
  const [name, setName] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)

  const built = useMemo<{ deck: SlideDeck | null; error: string | null }>(() => {
    if (selected.length === 0) return { deck: null, error: null }
    try {
      const deck = buildDeck({ songs: selected.map((id) => rowToSong(byId.get(id)!)), flows, themeId })
      return { deck, error: null }
    } catch (e) { return { deck: null, error: e instanceof FlowError ? e.message : String(e) } }
  }, [selected, flows, themeId, byId])

  const move = (i: number, d: -1 | 1) => setSelected((s) => { const n = [...s]; const j = i + d; if (j < 0 || j >= n.length) return s; [n[i], n[j]] = [n[j]!, n[i]!]; return n })
  const titles = selected.map((id) => byId.get(id)!.title)

  return (
    <div className="grid gap-8 lg:grid-cols-[400px_1fr]">
      <div className="space-y-6">
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">1 · 选歌（按敬拜顺序）</h2>
          <select className="h-10 w-full rounded-lg border border-line bg-card px-3 text-sm" value="" onChange={(e) => { const id = e.target.value; if (id && !selected.includes(id)) setSelected([...selected, id]) }}>
            <option value="">＋ 添加一首歌…</option>
            {songs.filter((s) => !selected.includes(s.id)).map((s) => <option key={s.id} value={s.id}>{s.title}{s.artist ? ` · ${s.artist}` : ''}</option>)}
          </select>
          {selected.length === 0 && <p className="text-xs text-ink-soft">先从歌库里添加至少一首歌。</p>}
          <ul className="space-y-3">
            {selected.map((id, i) => {
              const s = byId.get(id)!
              return (
                <li key={id} className="rounded-[var(--radius-lg)] border border-line bg-card p-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{i + 1}. {s.title}</span>
                    <div className="ml-auto flex gap-1 text-xs text-ink-soft">
                      <button onClick={() => move(i, -1)} className="px-1 hover:text-ink">↑</button>
                      <button onClick={() => move(i, 1)} className="px-1 hover:text-ink">↓</button>
                      <button onClick={() => setSelected(selected.filter((x) => x !== id))} className="px-1 hover:text-red-600">移除</button>
                    </div>
                  </div>
                  <div className="mt-2"><FlowInput value={flows[id] ?? s.defaultFlow} onChange={(v) => setFlows({ ...flows, [id]: v })} sections={s.sections} /></div>
                </li>
              )
            })}
          </ul>
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">2 · 选主题</h2>
          <ThemePicker value={themeId} onChange={setThemeId} />
        </section>
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">3 · 导出</h2>
          {built.error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{built.error}</p>}
          <Field label="制作人昵称（可选）"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <div className="flex flex-wrap gap-3">
            {built.deck && <DownloadPptxButton deck={built.deck} titles={titles} />}
            <Button variant="ghost" disabled={!built.deck || pending} onClick={() => { setSaveError(null); start(async () => { try { const { deckId } = await saveDeck({ songIds: selected, flows: built.deck!.meta.flows, themeId, generatedByName: name || undefined }); router.push(`/worship/decks/${deckId}`) } catch (e) { setSaveError(e instanceof Error ? e.message : String(e)) } }) }}>{pending ? '保存中…' : '保存这次生成'}</Button>
          </div>
          {saveError && <p className="text-xs text-red-600">{saveError}</p>}
          <p className="text-xs text-ink-soft">保存后可以在歌库首页「最近生成」里再次下载，flow 错了也能改完重新生成。</p>
        </section>
      </div>
      <div>
        <h2 className="mb-3 text-sm font-semibold">预览</h2>
        {built.deck ? <DeckPreview deck={built.deck} /> : <div className="aspect-video w-full rounded-lg border border-dashed border-line" />}
      </div>
    </div>
  )
}
