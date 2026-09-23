import type { Metadata } from 'next'
import Link from 'next/link'
import { getCurrentSetlist } from '@/modules/worship-slides/setlist-actions'
import { ImportPanel } from '@/modules/worship-slides/components/ImportPanel'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: '导入新歌' }

export default async function Import({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const { from: rawFrom } = await searchParams
  const from = rawFrom === 'svc' ? 'svc' : 'dash'
  const setlist = from === 'svc' ? await getCurrentSetlist() : null
  const back = from === 'svc' && setlist ? { href: `/worship/setlist/${setlist.id}`, label: '本周歌单' } : { href: '/worship', label: '工作台' }

  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-7 px-6 pb-[72px] pt-10 md:px-12 md:pt-12">
      <header className="flex flex-col gap-2">
        <Link href={back.href} className="text-sm text-ink-5 transition-colors hover:text-ink">
          ‹ {back.label}
        </Link>
        <h1 className="text-[32px] font-bold tracking-[-0.02em] md:text-[40px]">导入新歌</h1>
        <p className="text-base text-ink-4">
          {from === 'svc' ? '导入后会存进“我的歌”，并加到本周歌单。' : '导入后会存进“我的歌”，以后每周都能直接用。'}
        </p>
      </header>
      <ImportPanel from={from} setlistId={setlist?.id ?? null} />
    </div>
  )
}
