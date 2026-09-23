'use client'
import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { parseHeader, sectionIdFor } from '@selah/slide-engine'
import { FieldShell, FilledInput, InlineError, Segmented, cx } from '@/core/ui'
import { createSong } from '../actions'
import { addSongToSetlist } from '../setlist-actions'

type Tab = 'paste' | 'file' | 'photo'

const TABS = [
  { value: 'paste' as const, label: '粘贴歌词' },
  { value: 'file' as const, label: '上传文件' },
  { value: 'photo' as const, label: '拍照识别' },
]

/** The section names the church actually says out loud. */
const TYPE_LABEL: Record<string, string> = { V: '主歌', C: '副歌', PC: '导歌', B: '桥段', E: '尾声' }
const CHOICES = ['V1', 'C', 'PC', 'B', 'E']

function typeName(id: string): string {
  const m = id.match(/^([A-Z]+)(\d*)$/)
  if (!m) return id
  return (TYPE_LABEL[m[1]!] ?? id) + (m[2] ? ` ${m[2]}` : '')
}

interface Block {
  i: number
  tag: string
  lines: string[]
  hint: string
}

/**
 * Split on blank lines the way the import screen shows it, so what the user
 * retags is exactly what they see. The tagged text then goes through the real
 * parser on save, which is what normalises the ids.
 */
function splitBlocks(raw: string): Block[] {
  const blocks = raw.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)
  const seen: Array<{ key: string; tag: string }> = []
  let verse = 0
  return blocks.map((b, i) => {
    let lines = b.split('\n').map((l) => l.trim()).filter(Boolean)
    let tag: string | null = null
    let hint = '按空行分段'

    const head = lines[0] ? parseHeader(lines[0]) : null
    if (head && lines.length > 1) {
      tag = sectionIdFor(head.type, head.number ?? 1)
      lines = lines.slice(1)
      hint = `识别到“${typeName(tag)}”`
    }

    const key = lines.join('|')
    const dup = seen.find((s) => s.key === key)
    if (!tag && dup) { tag = dup.tag; hint = '与前面相同，算作重复' }
    if (!tag) { verse += 1; tag = `V${verse}` }
    seen.push({ key, tag })
    return { i, tag, lines, hint }
  })
}

const DROP_COPY = {
  file: { title: '把文件拖到这里', sub: '支持 TXT 和 Markdown；Word 和 PDF 还在接', btn: '选择文件', accept: '.txt,.md,text/plain,text/markdown' },
  photo: { title: '上传歌谱照片或截图', sub: '拍照识别还没接上，先用粘贴或上传 TXT', btn: '选择图片', accept: '' },
} as const

export function ImportPanel({ from, setlistId }: { from: 'dash' | 'svc'; setlistId: string | null }) {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('paste')
  const [name, setName] = useState('')
  const [raw, setRaw] = useState('')
  const [types, setTypes] = useState<Record<number, string>>({})
  const [loaded, setLoaded] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  const blocks = useMemo(() => splitBlocks(raw), [raw])
  const tagged = blocks.map((b) => ({ ...b, tag: types[b.i] ?? b.tag }))
  const ready = tagged.length > 0 && !!name.trim()

  const readFile = async (file: File) => {
    setError(null)
    if (!/\.(txt|md)$/i.test(file.name)) {
      setError('现在只能读 TXT 和 Markdown。Word、PDF 和拍照识别还没接上——先把歌词贴到左边。')
      return
    }
    const text = await file.text()
    setRaw(text)
    setTypes({})
    setLoaded(`${file.name} · 已读取`)
    if (!name.trim()) setName(file.name.replace(/\.(txt|md)$/i, ''))
  }

  const save = () =>
    start(async () => {
      setError(null)
      // A block repeated later in the sheet is the same section sung again, not a
      // new one: each tag contributes its lyrics once and the repeat lives in the flow.
      const seen = new Map<string, string[]>()
      for (const b of tagged) if (!seen.has(b.tag)) seen.set(b.tag, b.lines)
      const lyricsText = [...seen].map(([tag, lines]) => `[${tag}]\n${lines.join('\n')}`).join('\n\n')
      const defaultFlow = tagged.map((b) => b.tag).join(' ')
      const r = await createSong({ title: name.trim(), lyricsText, defaultFlow, pinyinOverrides: {} })
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

  return (
    <>
      <div className="self-start">
        <Segmented
          ariaLabel="导入方式"
          size="lg"
          options={TABS}
          value={tab}
          onChange={(v) => { setTab(v); setLoaded(null); setError(null) }}
        />
      </div>

      <div className="grid items-stretch gap-7 lg:grid-cols-[repeat(auto-fit,minmax(380px,1fr))]">
        <div className="flex flex-col gap-3.5">
          <FieldShell label="歌名" className="h-[50px]">
            <FilledInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：我要爱慕你"
              className="text-[15.5px] font-medium"
              aria-label="歌名"
            />
          </FieldShell>
          {tab === 'paste' ? (
            <textarea
              value={raw}
              onChange={(e) => { setRaw(e.target.value); setTypes({}) }}
              aria-label="歌词"
              placeholder="把整首歌词贴在这里。段落之间空一行；写上“副歌”“桥段”会自动识别。"
              className="min-h-[440px] flex-1 resize-none rounded-2xl border-0 bg-surface-3 px-[22px] py-5 text-[15.5px] leading-[1.9] outline-0"
            />
          ) : (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) void readFile(f) }}
              className="flex min-h-[440px] flex-1 flex-col items-center justify-center gap-3.5 rounded-2xl border-[1.5px] border-dashed border-line-strong p-6 text-center"
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
                className="sr-only"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) void readFile(f) }}
              />
              <button
                type="button"
                disabled={tab === 'photo'}
                onClick={() => fileRef.current?.click()}
                className={cx(
                  'mt-1.5 rounded-full px-[22px] py-2.5 text-[14.5px] font-medium text-white transition-colors',
                  tab === 'photo' ? 'cursor-not-allowed bg-ink-disabled' : 'bg-ink hover:bg-ink-2',
                )}
              >
                {drop!.btn}
              </button>
              {loaded && (
                <div className="mt-3.5 flex items-center gap-2.5 rounded-lg bg-surface-3 px-4 py-2.5 text-sm">
                  <span className="size-2 rounded-full bg-ok" />
                  {loaded}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex min-h-[504px] flex-col gap-3 rounded-[20px] bg-surface-3 p-[22px]">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold">识别结果</h2>
            <span className="text-[13px] text-ink-5">{tagged.length ? `${tagged.length} 段，点标签可改` : ''}</span>
          </div>

          {tagged.length > 0 ? (
            <div className="scroll-thin flex flex-col gap-2.5 overflow-auto">
              {tagged.map((b) => {
                // the block's own verse number stays offerable alongside the fixed five
                const options = [...new Set([b.tag.startsWith('V') ? b.tag : 'V1', ...CHOICES])]
                return (
                  <div key={b.i} className="flex flex-col gap-2 rounded-xl bg-surface p-4">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {options.map((id) => {
                        const on = id === b.tag
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setTypes((t) => ({ ...t, [b.i]: id }))}
                            className={cx(
                              'rounded-full px-2.5 py-1 text-[12.5px] font-medium transition-colors',
                              on ? 'bg-ink text-white' : 'bg-surface-4 text-ink-4 hover:text-ink',
                            )}
                          >
                            {typeName(id)}
                          </button>
                        )
                      })}
                      <span className="ml-auto text-xs text-ink-5">{b.hint}</span>
                    </div>
                    <p className="text-sm leading-[1.75] text-ink-2">
                      {b.lines.slice(0, 2).join(' / ')}
                      {b.lines.length > 2 ? ' …' : ''}
                    </p>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-ink-6">识别出的段落会显示在这里</div>
          )}

          {error && <InlineError>{error}</InlineError>}

          <button
            type="button"
            onClick={save}
            disabled={!ready || pending}
            className={cx(
              'mt-auto rounded-xl py-3.5 text-center text-[15.5px] font-semibold text-white transition-colors',
              ready && !pending ? 'cursor-pointer bg-ink hover:bg-ink-2' : 'cursor-not-allowed bg-ink-disabled',
            )}
          >
            {pending ? '保存中…' : from === 'svc' ? '保存并加入歌单' : '保存到歌库'}
          </button>
          {!name.trim() && tagged.length > 0 && <p className="text-center text-xs text-ink-5">还差一个歌名。</p>}
        </div>
      </div>
    </>
  )
}
