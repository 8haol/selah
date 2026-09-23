import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSong, listDecksForSong } from '@/modules/worship-slides/actions'
import { SongForm } from '@/modules/worship-slides/components/SongForm'
import { getTheme } from '@selah/slide-engine'

export const dynamic = 'force-dynamic'

export default async function SongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const song = await getSong(id)
  if (!song) notFound()
  const decks = await listDecksForSong(id)
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3"><h1 className="text-2xl font-semibold">{song.title}</h1><Link href="/worship" className="ml-auto text-sm text-ink-soft hover:text-ink">← 返回歌库</Link></div>
      <SongForm mode="edit" song={song} />
      {decks.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold">这首歌的历史版本</h2>
          <ul className="mt-3 divide-y divide-line rounded-[var(--radius-lg)] border border-line bg-card">
            {decks.map((d) => (
              <li key={d.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                <span className="font-mono text-xs text-ink-soft">{d.createdAt.toLocaleString('zh-CN')}</span>
                <span>{getTheme(d.themeId).name}</span>
                <span className="text-ink-soft">flow：{d.flows[song.id]}</span>
                <Link href={`/worship/decks/${d.id}`} className="ml-auto text-accent">查看 / 下载</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
