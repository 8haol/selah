import type { Metadata } from 'next'
import { listSongs } from '@/modules/worship-slides/actions'
import { GeneratePanel } from '@/modules/worship-slides/components/GeneratePanel'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: '生成 PPT' }

export default async function GeneratePage({ searchParams }: { searchParams: Promise<{ songs?: string }> }) {
  const { songs: pre } = await searchParams
  const songs = await listSongs()
  const initial = (pre ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-serif text-[28px] font-medium leading-tight text-ink">生成 PPT</h1>
        <p className="mt-1.5 text-sm text-ink-soft">选歌、排 flow、挑一套主题，右边就是投影出来的样子。</p>
      </header>
      <GeneratePanel songs={songs} initialSongIds={initial} />
    </div>
  )
}
