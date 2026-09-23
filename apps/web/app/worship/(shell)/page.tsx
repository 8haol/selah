import type { Metadata } from 'next'
import Link from 'next/link'
import { buildDeck, getTheme, slideTheme, type SlideDeck } from '@selah/slide-engine'
import { listRecentDecks, listSongs } from '@/modules/worship-slides/actions'
import { getCurrentSetlist, getDefaultThemeId, nextServiceDate } from '@/modules/worship-slides/setlist-actions'
import { SlideView } from '@/modules/worship-slides/components/SlideView'
import { StartServiceButton } from '@/modules/worship-slides/components/StartServiceButton'
import { AddToServiceButton } from '@/modules/worship-slides/components/AddToServiceButton'
import { DeleteDeckButton } from '@/modules/worship-slides/components/DeleteDeckButton'
import { typeName } from '@/modules/worship-slides/section-name'
import { deckDisplay } from '@/modules/worship-slides/setlist-settings'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: '工作台' }

const SHORTCUTS = [
  { href: '/worship/import', title: '导入新歌', sub: '上传歌谱图片自动识别，或粘贴歌词' },
  { href: '/worship/library', title: '浏览歌库', sub: '分好段的歌，直接加进歌单' },
] as const

/** The frame the design draws behind a recent service — a real slide, statically. */
function DeckCard({ deck, titles, id }: { deck: SlideDeck; titles: string[]; id: string }) {
  const slide = deck.slides.find((s) => s.kind === 'lyrics') ?? deck.slides[0]
  const pages = deck.slides.length
  return (
    <div className="group relative">
      <Link href={`/worship/decks/${id}`} className="flex flex-col gap-2.5">
        <div className="overflow-hidden rounded-lg border border-line-soft">
          {slide ? <SlideView slide={slide} theme={slideTheme(deck, slide)} static frameClassName="" /> : <div className="aspect-video bg-surface-3" />}
        </div>
        <div>
          <div className="truncate text-[14.5px] font-semibold">{titles.join(' · ')}</div>
          <div className="mt-[3px] text-[13px] text-ink-5">
            {titles.length} 首 · {pages} 页 · {getTheme(deck.themeId).name.split(' · ')[0]}
          </div>
        </div>
      </Link>
      <DeleteDeckButton
        id={id}
        className="absolute right-2 top-2 shadow-sm md:opacity-0 md:focus-visible:opacity-100 md:group-hover:opacity-100"
      />
    </div>
  )
}

function serviceDateLabel(date: string | null): string | null {
  if (!date) return null
  const [, m, d] = date.split('-')
  return `${Number(m)} 月 ${Number(d)} 日`
}

export default async function Dashboard() {
  const [setlist, defaultThemeId, decks, songs, upcoming] = await Promise.all([
    getCurrentSetlist(),
    getDefaultThemeId(),
    listRecentDecks(3),
    listSongs(),
    nextServiceDate(),
  ])

  const has = !!setlist && setlist.songs.length > 0
  const total = has
    ? buildDeck({
        songs: setlist.songs.map((x) => x.song),
        flows: Object.fromEntries(setlist.songs.map((x) => [x.song.id, x.flow.join(' ')])),
        themeId: setlist.songs[0]!.themeId,
        ...deckDisplay(setlist.settings),
      }).slides.length
    : 0
  const date = serviceDateLabel(setlist?.serviceDate ?? upcoming)
  const defaultTheme = getTheme(defaultThemeId)

  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-11 px-6 pb-20 pt-10 md:px-12 md:pt-12">
      <section className="grid items-end gap-8 rounded-4xl bg-surface-3 p-8 md:grid-cols-[minmax(0,1fr)_auto] md:px-11 md:py-10">
        <div className="flex flex-col gap-3">
          {date && <span className="text-[15px] font-semibold text-accent">本周主日 · {date}</span>}
          <h1 className="text-[32px] font-bold leading-[1.2] tracking-[-0.02em] md:text-[40px]">
            {has ? setlist!.title : '创建本周主日 PPT'}
          </h1>
          <p className="text-base text-ink-4">
            {has
              ? `${setlist!.songs.length} 首歌 · ${total} 页，还可以继续加歌、调顺序`
              : '把这周要唱的歌加进来，排好顺序，最后一起导出。'}
          </p>
        </div>
        <StartServiceButton label={has ? '继续编辑' : '开始创建'} />
      </section>

      <section className="grid gap-4 md:grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
        {SHORTCUTS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="flex flex-col gap-1.5 rounded-2xl border border-line-2 px-6 py-[22px] transition-colors hover:border-line-strong"
          >
            <span className="text-[16.5px] font-semibold">{s.title}</span>
            <span className="text-sm text-ink-5">{s.sub}</span>
          </Link>
        ))}
        <Link
          href="/worship/themes"
          className="flex flex-col gap-1.5 rounded-2xl border border-line-2 px-6 py-[22px] transition-colors hover:border-line-strong"
        >
          <span className="text-[16.5px] font-semibold">浏览主题</span>
          <span className="text-sm text-ink-5">默认主题：{defaultTheme.name}</span>
        </Link>
      </section>

      {decks.length > 0 && (
        <section className="flex flex-col gap-3.5">
          <h2 className="text-xl font-bold">最近的敬拜</h2>
          <div className="grid gap-5 sm:grid-cols-[repeat(auto-fill,minmax(230px,1fr))]">
            {decks.map((d) => (
              <DeckCard key={d.id} id={d.id} deck={d.deck} titles={d.titles} />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-bold">歌库</h2>
          <Link href="/worship/library" className="text-sm text-accent hover:text-accent-link">
            全部 {songs.length} 首 ›
          </Link>
        </div>
        {songs.length === 0 ? (
          <p className="py-8 text-[15px] text-ink-5">
            还没有导入过歌。
            <Link href="/worship/import" className="text-accent hover:text-accent-link">
              导入第一首
            </Link>
          </p>
        ) : (
          songs.slice(0, 4).map((s) => (
            <div key={s.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-line py-3.5">
              <div className="min-w-0">
                <Link href={`/worship/songs/${s.id}`} className="block truncate text-[15px] font-semibold hover:text-accent">
                  {s.title}
                </Link>
                <div className="mt-[3px] truncate text-[13px] text-ink-5">
                  {s.sections.map((x) => typeName(x.id)).join(' · ')}
                </div>
              </div>
              <AddToServiceButton
                songId={s.id}
                setlistId={setlist?.id ?? null}
                added={!!setlist?.songs.some((x) => x.song.id === s.id)}
                addedLabel="已在歌单"
                label="加入本周"
              />
            </div>
          ))
        )}
      </section>
    </div>
  )
}
