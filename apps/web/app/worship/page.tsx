import type { Metadata } from 'next'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { listSongs, listRecentDecks } from '@/modules/worship-slides/actions'
import { getTheme, type Theme } from '@selah/slide-engine'
import { Card, EmptyState, Input, buttonClass } from '@/modules/worship-slides/components/ui'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: '歌库' }

/** Server-side twin of DeckPreview's posterSrc — that module is client-only. */
function poster(theme: Theme): string {
  return theme.background.kind === 'video' ? theme.background.poster : theme.background.src
}

export default async function WorshipHome({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const [songs, decks] = await Promise.all([listSongs(q), listRecentDecks(6)])
  const query = q?.trim() ?? ''

  return (
    <div className="space-y-14">
      <header className="space-y-6">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
          <div>
            <h1 className="font-serif text-[28px] font-medium leading-tight text-ink">歌库</h1>
            <p className="mt-1.5 text-sm text-ink-soft">录一次歌词，以后每周直接排 flow 生成。</p>
          </div>
          <div className="ml-auto flex flex-wrap gap-3">
            <Link href="/worship/songs/new" className={buttonClass({ variant: 'ghost' })}>新建歌曲</Link>
            <Link href="/worship/generate" className={buttonClass()}>生成 PPT</Link>
          </div>
        </div>
        <form action="/worship" className="relative max-w-md">
          <label htmlFor="song-search" className="sr-only">搜索歌曲</label>
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <Input
            id="song-search"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="搜歌名或拼音首字母，如 yhh"
            className="pl-9"
          />
          <button type="submit" className="sr-only">搜索</button>
        </form>
      </header>

      <section>
        {songs.length === 0 ? (
          <EmptyState
            title={query ? '没有找到匹配的歌' : '歌库还是空的'}
            description={query ? '换个关键字，或用拼音首字母再试一次。' : '录下第一首歌的歌词，之后每周排好 flow 就能直接生成。'}
            action={
              query ? (
                <Link href="/worship" className={buttonClass({ variant: 'ghost' })}>清除搜索</Link>
              ) : (
                <Link href="/worship/songs/new" className={buttonClass()}>新建歌曲</Link>
              )
            }
          />
        ) : (
          <ul className="space-y-2">
            {songs.map((s) => (
              <li key={s.id}>
                <Card className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4 transition hover:-translate-y-0.5 hover:border-ink-soft/40 hover:shadow-[0_6px_20px_rgba(30,27,24,0.07)]">
                  <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                    <Link href={`/worship/songs/${s.id}`} className="font-serif text-[18px] font-medium text-ink transition-colors hover:text-accent">
                      {s.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-ink-soft">
                      {(
                        [
                          s.artist ? { text: s.artist } : null,
                          s.key ? { text: `Key ${s.key}`, mono: true } : null,
                          s.defaultFlow ? { text: s.defaultFlow, mono: true } : null,
                          { text: s.updatedAt.toLocaleDateString('zh-CN') },
                        ].filter(Boolean) as Array<{ text: string; mono?: boolean }>
                      ).map((part, i) => (
                        <span key={i} className="flex items-center gap-2">
                          {i > 0 && <span aria-hidden="true" className="text-line">·</span>}
                          <span className={part.mono ? 'font-mono' : undefined}>{part.text}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Link
                      href={`/worship/songs/${s.id}`}
                      className="inline-flex min-h-11 items-center rounded-md px-3 text-sm text-ink-soft transition-colors hover:bg-paper hover:text-ink"
                    >
                      编辑
                    </Link>
                    <Link
                      href={`/worship/generate?songs=${s.id}`}
                      className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-accent transition-colors hover:bg-accent-soft"
                    >
                      生成 PPT
                    </Link>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {decks.length > 0 && (
        <section>
          <h2 className="font-serif text-lg font-medium text-ink">最近生成</h2>
          <ul className="mt-4 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:thin]">
            {decks.map((d) => {
              const theme = getTheme(d.themeId)
              return (
                <li key={d.id} className="w-60 shrink-0">
                  <Link href={`/worship/decks/${d.id}`} className="block h-full rounded-lg">
                    <Card className="h-full overflow-hidden transition hover:-translate-y-0.5 hover:border-ink-soft/40 hover:shadow-[0_6px_20px_rgba(30,27,24,0.07)]">
                      <div
                        className="aspect-video w-full bg-ink/10 bg-cover bg-center"
                        style={{ backgroundImage: `url(${poster(theme)})` }}
                      />
                      <div className="p-4">
                        <div className="truncate text-sm font-medium text-ink">{d.titles.join(' · ')}</div>
                        <div className="mt-1.5 text-xs leading-5 text-ink-soft">
                          {theme.name}
                          <br />
                          <span className="font-mono">{d.deck.slides.length}</span> 页 · {d.createdAt.toLocaleDateString('zh-CN')}
                        </div>
                      </div>
                    </Card>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
