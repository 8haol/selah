'use client'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { parseLyrics } from '@selah/slide-engine'
import type { SongRow } from '@/db/schema'
import { createSong, updateSong, deleteSong } from '../actions'
import { Button, Field, Input, Textarea } from './ui'
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
  const [title, setTitle] = useState(song?.title ?? '')
  const [titleEn, setTitleEn] = useState(song?.titleEn ?? '')
  const [artist, setArtist] = useState(song?.artist ?? '')
  const [key, setKey] = useState(song?.key ?? '')
  const [lyricsText, setLyricsText] = useState(song ? sectionsToText(song) : '')
  const [defaultFlow, setDefaultFlow] = useState(song?.defaultFlow ?? '')
  const [overrides, setOverrides] = useState<Record<string, string>>(song?.pinyinOverrides ?? {})
  const [createdByName, setCreatedByName] = useState(song?.createdByName ?? '')
  const sections = useMemo(() => parseLyrics(lyricsText), [lyricsText])

  const submit = () => {
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
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="歌名 *"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="耶和华是我的牧者" /></Field>
          <Field label="英文名"><Input value={titleEn} onChange={(e) => setTitleEn(e.target.value)} /></Field>
          <Field label="作者 / 来源"><Input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="赞美之泉" /></Field>
          <Field label="调性"><Input value={key} onChange={(e) => setKey(e.target.value)} placeholder="D" /></Field>
        </div>
        <Field label="歌词 *" hint="每个段落前加一行标记，例如 [V1]、[C]、[B]。">
          <Textarea value={lyricsText} onChange={(e) => setLyricsText(e.target.value)} rows={18} placeholder={PLACEHOLDER} className="font-mono" />
        </Field>
        <Field label="默认 flow" hint="生成时可以再改。">
          <FlowInput value={defaultFlow} onChange={setDefaultFlow} sections={sections} />
        </Field>
        <Field label="制作人昵称"><Input value={createdByName} onChange={(e) => setCreatedByName(e.target.value)} placeholder="可选" /></Field>
        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex items-center gap-3">
          <Button onClick={submit} disabled={pending || !title.trim() || sections.length === 0}>{pending ? '保存中…' : mode === 'create' ? '保存歌曲' : '保存修改'}</Button>
          {mode === 'edit' && (
            <>
              <Button variant="ghost" onClick={() => router.push(`/worship/generate?songs=${song.id}`)}>生成 PPT</Button>
              <Button variant="danger" className="ml-auto" onClick={() => { if (confirm('确定删除这首歌？30 天内可联系管理员恢复。')) start(async () => { await deleteSong(song.id); router.push('/worship') }) }}>删除</Button>
            </>
          )}
        </div>
      </div>
      <aside className="space-y-6">
        <section className="rounded-[var(--radius-lg)] border border-line bg-card p-4">
          <h3 className="text-sm font-semibold">识别到的段落</h3>
          {sections.length === 0 ? <p className="mt-2 text-xs text-ink-soft">粘贴歌词后这里会显示段落。</p> : (
            <ul className="mt-2 space-y-1 text-sm">
              {sections.map((s) => <li key={s.id} className="flex justify-between"><span className="font-medium">{s.id}</span><span className="text-ink-soft">{s.lines.length} 行</span></li>)}
            </ul>
          )}
        </section>
        <section className="rounded-[var(--radius-lg)] border border-line bg-card p-4">
          <h3 className="text-sm font-semibold">多音字确认</h3>
          <div className="mt-3"><PinyinEditor sections={sections} overrides={overrides} onChange={setOverrides} /></div>
        </section>
      </aside>
    </div>
  )
}
