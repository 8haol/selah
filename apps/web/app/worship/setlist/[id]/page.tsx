import type { Metadata } from 'next'
import { cache } from 'react'
import { notFound } from 'next/navigation'
import { getSetlist } from '@/modules/worship-slides/setlist-actions'
import { SetlistEditor } from '@/modules/worship-slides/components/SetlistEditor'

export const dynamic = 'force-dynamic'

// metadata and the page ask for the same row; fetch it once per request
const load = cache(getSetlist)

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const setlist = await load(id)
  return { title: setlist?.title ?? '本周歌单' }
}

export default async function SetlistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const setlist = await load(id)
  if (!setlist) notFound()
  return <SetlistEditor initial={setlist} />
}
