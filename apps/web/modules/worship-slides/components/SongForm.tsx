'use client'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { parseLyrics } from '@selah/slide-engine'
import type { SongRow } from '@/db/schema'
import { createSong, updateSong, deleteSong } from '../actions'
import { Badge, Button, Card, Field, Input, Textarea, Toast } from './ui'
import { FlowInput } from './FlowInput'
import { PinyinEditor } from './PinyinEditor'

function sectionsToText(row: SongRow): string {
  return row.sections.map((s) => `[${s.id}]\n${s.lines.map((l) => l.zh).join('\n')}`).join('\n\n')
}

const PLACEHOLDER = `[V1]
耶和华是我的牧者
我必不致缺乏

[C]
他使我的灵魂苏醒
为自己的名引导我走义路

[V2]
…

支持 [V1] [C] [B] [PC] [E]，也支持 主歌1 / 副歌 / 桥段；不写标记则按空行分段。`

export function SongForm({ mode, song }: { mode: 'create'; song?: undefined } | { mode: 'edit'; song: SongRow }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)
  const [title, setTitle] = useState(song?.title ?? '')
  const [titleEn, setTitleEn] = useState(song?.titleEn ?? '')
  const [artist, setArtist] = useState(song?.artist ?? '')
  const [key, setKey] = useState(song?.key ?? '')
  const [lyricsText, setLyricsText] = useState(song ? sectionsToText(song) : '')
  const [defaultFlow, setDefaultFlow] = useState(song?.defaultFlow ?? '')
  const [overrides, setOverrides] = useState<Record<string, string>>(song?.pinyinOverrides ?? {})
  const [createdByName, setCreatedByName] = useState(song?.createdByName ?? '')
  const sections = useMemo(() => parseLyrics(lyricsText), [lyricsText])

  const titleError = touched && !title.trim() ? '请填写歌名。' : null
  const lyricsError = touched && sections.length === 0 ? '请粘贴歌词，至少要有一个段落。' : null
  const invalid = !title.trim() || sections.length === 0

  const submit = () => {
    setTouched(true)
    if (invalid) return
    setError(null)
    start(async () => {
      try {
        const input = { title, titleEn, artist, key, lyricsText, defaultFlow, pinyinOverrides: overrides, createdByName }
        if (mode === 'create') { const { id } = await createSong(input); router.push(`/worship/songs/${id}`) }
        else { await updateSong(song.id, input); router.refresh() }
      } catch (e) { setError(e instanceof Error ? e.message : String(e)) }
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
          <Field label="作者 / 来源"><Input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="赞美之泉" /></Field>
          <Field label="调性"><Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="D" /></Field>
        </div>

        <Field label="歌词 *" hint="每个段落前加一行标记，例如 [V1]、[C]、[B]。" error={lyricsError}>
          <Textarea
            value={lyricsText}
            onChange={(e) => setLyricsText(e.target.value)}
            rows={18}
            placeholder={PLACEHOLDER}
            aria-invalid={lyricsError ? true : undefined}
            className="font-mono text-[15px] leading-8"
          />
        </Field>

        <Field label="默认 flow" hint="生成时可以再改。">
          <FlowInput value={defaultFlow} onChange={setDefaultFlow} sections={sections} />
        </Field>

        <Field label="制作人昵称"><Input value={createdByName} onChange={(e) => setCreatedByName(e.target.value)} placeholder="可选" /></Field>

        {error && <Toast tone="danger">{error}</Toast>}

        <div className="sticky bottom-0 z-10 -mx-6 flex flex-wrap items-center gap-3 border-t border-line bg-paper/95 px-6 py-3 backdrop-blur lg:static lg:mx-0 lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:backdrop-blur-none">
          <Button onClick={submit} loading={pending}>
            {pending ? '保存中' : mode === 'create' ? '保存歌曲' : '保存修改'}
          </Button>
          {mode === 'edit' && (
            <>
              <Button variant="ghost" onClick={() => router.push(`/worship/generate?songs=${song.id}`)}>生成 PPT</Button>
              <Button
                variant="danger"
                className="ml-auto"
                onClick={() => { if (confirm('确定删除这首歌？30 天内可联系管理员恢复。')) start(async () => { await deleteSong(song.id); router.push('/worship') }) }}
              >
                删除
              </Button>
            </>
          )}
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-24">
        <Card as="section" className="p-4">
          <h2 className="font-serif text-sm font-medium text-ink">识别到的段落</h2>
          {sections.length === 0 ? (
            <p className="mt-2 text-xs leading-6 text-ink-soft">粘贴歌词后这里会显示段落。</p>
          ) : (
            <ul className="mt-3 space-y-1.5 text-sm">
              {sections.map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  <Badge tone="accent" mono>{s.id}</Badge>
                  <span className="ml-auto text-xs text-ink-soft"><span className="font-mono">{s.lines.length}</span> 行</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card as="section" className="p-4">
          <h2 className="font-serif text-sm font-medium text-ink">多音字确认</h2>
          <div className="mt-3"><PinyinEditor sections={sections} overrides={overrides} onChange={setOverrides} /></div>
        </Card>
      </aside>
    </div>
  )
}
