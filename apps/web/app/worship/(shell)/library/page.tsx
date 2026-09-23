import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { parseFlow } from '@selah/slide-engine'
import { listSongs } from '@/modules/worship-slides/actions'
import { getCurrentSetlist } from '@/modules/worship-slides/setlist-actions'
import { LibraryControls } from '@/modules/worship-slides/components/LibraryControls'
import { AddToServiceButton } from '@/modules/worship-slides/components/AddToServiceButton'
import { pillClass } from '@/core/ui'
import { typeName } from '@/modules/worship-slides/section-name'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: '歌库' }

const COLS = 'grid grid-cols-[minmax(0,1fr)_auto] gap-5 md:grid-cols-[minmax(0,2fr)_60px_minmax(0,1.4fr)_120px]'

export default async function Library({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const { tab: rawTab, q } = await searchParams
  const tab = rawTab === 'mine' ? 'mine' : 'public'
  const query = q?.trim() ?? ''
  const [songs, setlist] = await Promise.all([listSongs(query, tab), getCurrentSetlist()])
  const inSetlist = new Set(setlist?.songs.map((x) => x.song.id) ?? [])

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-[26px] px-6 pb-20 pt-10 md:px-12 md:pt-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-[32px] font-bold tracking-[-0.02em] md:text-[40px]">歌库</h1>
          <p className="text-base text-ink-4">分好段、排好顺序的歌，选一首加进歌单。</p>
        </div>
        <Link href="/worship/import" className={pillClass({ size: 'md' })}>
          导入新歌
        </Link>
      </header>

      <Suspense fallback={<div className="h-[46px]" />}>
        <LibraryControls tab={tab} query={query} />
      </Suspense>

      <div className="flex flex-col">
        <div className={`${COLS} border-b border-line-3 px-1 pb-3 text-[12.5px] text-ink-5`}>
          <span>歌名</span>
          <span className="hidden md:block">调</span>
          <span className="hidden md:block">常用顺序</span>
          <span className="hidden md:block" />
        </div>

        {songs.map((s) => {
          const ready = s.sections.length > 0
          const flow = parseFlow(s.defaultFlow || '').map(typeName).join(' · ')
          return (
            <div key={s.id} className={`${COLS} items-center border-b border-line px-1 py-[18px]`}>
              <div className="min-w-0">
                <Link href={`/worship/songs/${s.id}`} className="block truncate text-base font-semibold hover:text-accent">
                  {s.title}
                </Link>
                <div className="mt-1 truncate text-[13.5px] text-ink-5">
                  {s.artist ?? '—'}
                  <span className="md:hidden">{s.key ? ` · ${s.key} 调` : ''}</span>
                </div>
              </div>
              <span className="hidden font-mono text-[13px] font-medium text-ink-4 md:block">{s.key || '—'}</span>
              <span className="hidden truncate text-[13.5px] text-ink-4 md:block">{flow || '—'}</span>
              <div className="flex justify-end">
                <AddToServiceButton
                  songId={s.id}
                  setlistId={setlist?.id ?? null}
                  added={inSetlist.has(s.id)}
                  disabled={!ready}
                  label="加入歌单"
                  addedLabel="已在歌单"
                  size="sm"
                />
              </div>
            </div>
          )
        })}

        {songs.length === 0 && (
          <p className="py-12 text-center text-[15px] text-ink-5">
            {query ? (
              '没有找到匹配的歌。换个关键字，或用拼音首字母再试一次。'
            ) : tab === 'mine' ? (
              <>
                还没有导入过歌。
                <Link href="/worship/import" className="text-accent hover:text-accent-link">
                  导入第一首
                </Link>
              </>
            ) : (
              '公共歌库还是空的。'
            )}
          </p>
        )}
      </div>
    </div>
  )
}
