import Link from 'next/link'
import { listSongs, listRecentDecks } from '@/modules/worship-slides/actions'
import { getTheme } from '@selah/slide-engine'
import { Button, Input } from '@/modules/worship-slides/components/ui'

export const dynamic = 'force-dynamic'

export default async function WorshipHome({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const [songs, decks] = await Promise.all([listSongs(q), listRecentDecks(5)])
  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">歌库</h1>
        <form className="ml-auto flex gap-2" action="/worship">
          <Input name="q" defaultValue={q ?? ''} placeholder="搜歌名或拼音首字母，如 yhh" className="w-64" />
          <Button variant="ghost" type="submit">搜索</Button>
        </form>
        <Link href="/worship/songs/new"><Button variant="ghost">新建歌曲</Button></Link>
        <Link href="/worship/generate"><Button>生成整场 PPT</Button></Link>
      </div>
      {songs.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-line p-10 text-center text-ink-soft">
          {q ? '没有找到匹配的歌。' : '歌库还是空的。点「新建歌曲」录第一首。'}
        </div>
      ) : (
        <ul className="divide-y divide-line rounded-[var(--radius-lg)] border border-line bg-card">
          {songs.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <Link href={`/worship/songs/${s.id}`} className="text-base font-medium hover:text-accent">{s.title}</Link>
                <div className="mt-0.5 text-xs text-ink-soft">{[s.artist, s.key && `Key ${s.key}`, s.defaultFlow].filter(Boolean).join(' · ')}</div>
              </div>
              <span className="text-xs text-ink-soft">{s.updatedAt.toLocaleDateString('zh-CN')}</span>
              <Link href={`/worship/songs/${s.id}`} className="text-sm text-ink-soft hover:text-ink">编辑</Link>
              <Link href={`/worship/generate?songs=${s.id}`} className="text-sm font-medium text-accent">生成 PPT</Link>
            </li>
          ))}
        </ul>
      )}
      {decks.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold">最近生成</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {decks.map((d) => (
              <li key={d.id}>
                <Link href={`/worship/decks/${d.id}`} className="block rounded-[var(--radius-lg)] border border-line bg-card p-4 hover:shadow-md">
                  <div className="font-medium">{d.titles.join(' · ')}</div>
                  <div className="mt-1 text-xs text-ink-soft">{getTheme(d.themeId).name} · {d.deck.slides.length} 页 · {d.createdAt.toLocaleString('zh-CN')}</div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
