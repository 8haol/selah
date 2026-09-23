import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSetlist } from '@/modules/worship-slides/setlist-actions'
import { SetlistEditor } from '@/modules/worship-slides/components/SetlistEditor'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const setlist = await getSetlist(id)
  return { title: setlist?.title ?? '本周歌单' }
}

export default async function SetlistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const setlist = await getSetlist(id)
  if (!setlist) notFound()
  return <SetlistEditor initial={setlist} />
}
