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
    <div className="mx-auto max-w-[1080px] space-y-10 px-6 pb-20 pt-10 md:px-12 md:pt-12">
      <header>
        <Link href="/worship/library" className="inline-flex rounded-sm text-sm text-ink-5 transition-colors hover:text-ink">‹ 歌库</Link>
        <h1 className="mt-2 text-[32px] font-bold tracking-[-0.02em] text-ink md:text-[40px]">{song.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-5">
          {song.artist && <span>{song.artist}</span>}
        </div>
      </header>

      <SongForm mode="edit" song={song} />

      {decks.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-ink">这首歌的历史版本</h2>
          <Card className="mt-4 divide-y divide-line-2">
            {decks.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3.5 text-sm">
                <span className="font-mono text-xs text-ink-5">{d.createdAt.toLocaleString('zh-CN')}</span>
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
