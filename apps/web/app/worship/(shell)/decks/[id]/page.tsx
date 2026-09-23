import type { Metadata } from 'next'
import { cache } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDeck } from '@/modules/worship-slides/actions'
import { DeckPreview } from '@/modules/worship-slides/components/DeckPreview'
import { DownloadPptxButton } from '@/modules/worship-slides/components/DownloadPptxButton'
import { DeleteDeckButton } from '@/modules/worship-slides/components/DeleteDeckButton'
import { getTheme } from '@selah/slide-engine'
import { Badge, Card, buttonClass } from '@/modules/worship-slides/components/ui'

export const dynamic = 'force-dynamic'

// metadata and the page ask for the same row; fetch it once per request
const load = cache(getDeck)

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const row = await load(id)
  return { title: row?.titles.length ? row.titles.join(' · ') : '生成记录' }
}

export default async function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const row = await load(id)
  if (!row) notFound()
  const theme = getTheme(row.themeId)
  return (
    <div className="mx-auto max-w-[1080px] space-y-10 px-6 pb-20 pt-10 md:px-12 md:pt-12">
      <header className="flex flex-wrap items-end gap-x-6 gap-y-4">
        <div className="min-w-0">
          <Link href="/worship/library" className="inline-flex rounded-sm text-sm text-ink-5 transition-colors hover:text-ink">‹ 歌库</Link>
          <h1 className="mt-2 text-[32px] font-bold tracking-[-0.02em] text-ink md:text-[40px]">{row.titles.join(' · ')}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge>{theme.name}</Badge>
            <Badge mono>{row.deck.slides.length} 页</Badge>
            <Badge>{row.createdAt.toLocaleString('zh-CN')}</Badge>
            {row.generatedByName && <Badge>{row.generatedByName}</Badge>}
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-start gap-3">
          {row.setlistId && (
            <Link href={`/worship/setlist/${row.setlistId}`} className={buttonClass({ variant: 'ghost' })}>
              回到这份歌单
            </Link>
          )}
          <DownloadPptxButton deck={row.deck} titles={row.titles} />
          <DeleteDeckButton id={row.id} redirectTo="/worship" className="self-center px-4 py-2 text-sm" />
        </div>
      </header>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:gap-12">
        <DeckPreview deck={row.deck} />
        <Card as="section" className="p-4">
          <h2 className="text-sm font-semibold text-ink">每首歌的 flow</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {row.deck.meta.songIds.map((sid, i) => (
              <li key={sid}>
                <div className="truncate text-ink">{row.titles[i] ?? sid}</div>
                <div className="mt-1"><Badge tone="accent" mono>{row.flows[sid] ?? '—'}</Badge></div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
