'use client'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { getTheme } from '@selah/slide-engine'
import type { SongRow } from '@/db/schema'
import { createSong, updateSong, deleteSong } from '../actions'
import { blockIds, blocksFromSong, blocksToLyricsText, blocksToSections, flowIds, type LyricBlock } from '../blocks'
import { rowToSong } from '../song-row'
import { Button, Card, Field, Input, Toast } from './ui'
import { LyricBlocksEditor } from './LyricBlocksEditor'
import { FlowPanel } from './SetlistPanels'
import { PinyinEditor } from './PinyinEditor'

export function SongForm({ mode, song }: { mode: 'create'; song?: undefined } | { mode: 'edit'; song: SongRow }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const [title, setTitle] = useState(song?.title ?? '')
  const [titleEn, setTitleEn] = useState(song?.titleEn ?? '')
  const [artist, setArtist] = useState(song?.artist ?? '')
  const [initial] = useState(() => (song ? blocksFromSong(rowToSong(song)) : { blocks: [], flow: [] }))
  const [blocks, setBlocks] = useState<LyricBlock[]>(initial.blocks)
  /** The default singing order, as block keys. */
  const [flow, setFlow] = useState<string[]>(initial.flow)
  const [overrides, setOverrides] = useState<Record<string, string>>(song?.pinyinOverrides ?? {})
  const [createdByName, setCreatedByName] = useState(song?.createdByName ?? '')
  const sections = useMemo(() => blocksToSections(blocks), [blocks])
  const liveFlow = flow.filter((k) => flowIds(blocks, [k]).length > 0)

  const titleError = touched && !title.trim() ? '请填写歌名。' : null
  const lyricsError = touched && sections.length === 0 ? '至少要有一段歌词。' : null
  const invalid = !title.trim() || sections.length === 0

  const submit = () => {
    setTouched(true)
    if (invalid) return
    setError(null)
    start(async () => {
      const order = flowIds(blocks, liveFlow)
      const input = {
        title, titleEn, artist, lyricsText: blocksToLyricsText(blocks),
        defaultFlow: (order.length ? order : sections.map((x) => x.id)).join(' '), pinyinOverrides: overrides, createdByName,
      }
      try {
        const result = mode === 'create' ? await createSong(input) : await updateSong(song.id, input)
        if (!result.ok) { setError(result.message); return }
        if ('id' in result) router.push(`/worship/songs/${result.id}`)
        else router.refresh()
      } catch {
        setError('网络或服务器暂时不可用，请稍后再试')
      }
    })
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-12">
      <div className="space-y-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="歌名 *" error={titleError}>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="耶和华是我的牧者" aria-invalid={titleError ? true : undefined} />
          </Field>
          <Field label="英文名"><Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} placeholder="The Lord Is My Shepherd" /></Field>
          <Field label="作者 / 来源"><Input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="赞美之泉 · 游智婷" /></Field>
        </div>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-ink">歌词段落</h2>
          <LyricBlocksEditor
            blocks={blocks}
            onChange={setBlocks}
            onAdd={(b) => { setBlocks((xs) => [...xs, b]); setFlow((f) => [...f, b.key]) }}
            onRemove={(key) => { setBlocks((xs) => xs.filter((b) => b.key !== key)); setFlow((f) => f.filter((k) => k !== key)) }}
          />
          {lyricsError && <p className="text-sm text-accent-deep">{lyricsError}</p>}
        </section>

        <Field label="制作人昵称"><Input value={createdByName} onChange={(e) => setCreatedByName(e.target.value)} placeholder="可选" /></Field>

        {error && <Toast tone="danger">{error}</Toast>}

        <div className="sticky bottom-0 z-10 -mx-6 flex flex-wrap items-center gap-3 border-t border-line-2 bg-surface-3/95 px-6 py-3 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
          <Button onClick={submit} loading={pending}>
            {pending ? '保存中' : mode === 'create' ? '保存歌曲' : '保存修改'}
          </Button>
          {mode === 'edit' && (
            <>
              <Button
                variant="danger"
                className="ml-auto"
                onClick={() => {
                  if (!confirm('确定删除这首歌？30 天内可联系管理员恢复。')) return
                  start(async () => {
                    try {
                      const result = await deleteSong(song.id)
                      if (!result.ok) { setError(result.message); return }
                      router.push('/worship')
                    } catch {
                      setError('网络或服务器暂时不可用，请稍后再试')
                    }
                  })
                }}
              >
                删除
              </Button>
            </>
          )}
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24">
        <Card as="section" className="flex flex-col gap-3.5 p-4">
          <h2 className="text-sm font-medium text-ink">默认演唱顺序</h2>
          {sections.length === 0 ? (
            <p className="text-xs leading-6 text-ink-5">写好歌词段落后，在这里排唱的顺序。</p>
          ) : (
            <FlowPanel
              flow={flowIds(blocks, liveFlow)}
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
              onAdd={(id) => { const k = blocks[blockIds(blocks).indexOf(id)]?.key; if (k) setFlow([...liveFlow, k]) }}
              onReset={() => setFlow(blocks.map((b) => b.key))}
            />
          )}
        </Card>
        <Card as="section" className="p-4">
          <h2 className="text-sm font-medium text-ink">多音字确认</h2>
          <div className="mt-3"><PinyinEditor sections={sections} overrides={overrides} onChange={setOverrides} /></div>
        </Card>
      </aside>
    </div>
  )
}
