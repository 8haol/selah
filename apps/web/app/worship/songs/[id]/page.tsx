import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSong, listDecksForSong } from '@/modules/worship-slides/actions'
import { SongForm } from '@/modules/worship-slides/components/SongForm'
import { getTheme } from '@selah/slide-engine'
import { Badge, Card } from '@/modules/worship-slides/components/ui'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const song = await getSong(id)
  return { title: song ? song.title : '歌曲' }
}

export default async function SongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const song = await getSong(id)
  if (!song) notFound()
  const decks = await listDecksForSong(id)
  return (
    <div className="space-y-10">
      <header>
        <Link href="/worship" className="inline-flex rounded-sm text-xs text-ink-soft transition-colors hover:text-ink">← 返回歌库</Link>
        <h1 className="mt-2 font-serif text-[28px] font-medium leading-tight text-ink">{song.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
          {song.artist && <span>{song.artist}</span>}
          {song.key && <Badge mono>Key {song.key}</Badge>}
          {song.defaultFlow && <Badge tone="accent" mono>{song.defaultFlow}</Badge>}
        </div>
      </header>

      <SongForm mode="edit" song={song} />

      {decks.length > 0 && (
        <section>
          <h2 className="font-serif text-lg font-medium text-ink">这首歌的历史版本</h2>
          <Card className="mt-4 divide-y divide-line">
            {decks.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 text-sm">
                <span className="font-mono text-xs text-ink-soft">{d.createdAt.toLocaleString('zh-CN')}</span>
                <span className="text-ink">{getTheme(d.themeId).name}</span>
                <Badge tone="accent" mono>{d.flows[song.id]}</Badge>
                <Link href={`/worship/decks/${d.id}`} className="ml-auto inline-flex min-h-11 items-center rounded-md px-2 font-medium text-accent transition-colors hover:bg-accent-soft">
                  查看 / 下载
                </Link>
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  )
}
