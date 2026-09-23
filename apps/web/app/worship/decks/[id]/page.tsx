import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDeck } from '@/modules/worship-slides/actions'
import { DeckPreview } from '@/modules/worship-slides/components/DeckPreview'
import { DownloadPptxButton } from '@/modules/worship-slides/components/DownloadPptxButton'
import { getTheme } from '@selah/slide-engine'

export const dynamic = 'force-dynamic'

export default async function DeckPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const row = await getDeck(id)
  if (!row) notFound()
  const theme = getTheme(row.themeId)
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{row.titles.join(' · ')}</h1>
          <p className="mt-1 text-sm text-ink-soft">{theme.name} · {row.deck.slides.length} 页 · {row.createdAt.toLocaleString('zh-CN')}{row.generatedByName ? ` · ${row.generatedByName}` : ''}</p>
          <p className="mt-1 text-xs text-ink-soft">flow：{Object.entries(row.flows).map(([sid, f]) => `${row.titles[row.deck.meta.songIds.indexOf(sid)] ?? sid}：${f}`).join('　')}</p>
        </div>
        <div className="ml-auto flex gap-3">
          <Link href={`/worship/generate?songs=${row.deck.meta.songIds.join(',')}`} className="inline-flex h-10 items-center rounded-lg border border-line bg-card px-4 text-sm hover:bg-paper">用这些歌重新生成</Link>
          <DownloadPptxButton deck={row.deck} titles={row.titles} />
        </div>
      </div>
      <DeckPreview deck={row.deck} />
    </div>
  )
}
