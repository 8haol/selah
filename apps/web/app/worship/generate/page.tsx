import { listSongs } from '@/modules/worship-slides/actions'
import { GeneratePanel } from '@/modules/worship-slides/components/GeneratePanel'

export const dynamic = 'force-dynamic'

export default async function GeneratePage({ searchParams }: { searchParams: Promise<{ songs?: string }> }) {
  const { songs: pre } = await searchParams
  const songs = await listSongs()
  const initial = (pre ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">生成 PPT</h1>
      <GeneratePanel songs={songs} initialSongIds={initial} />
    </div>
  )
}
