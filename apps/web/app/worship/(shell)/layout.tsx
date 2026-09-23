import { MobileNav, Sidebar } from '@/core/Sidebar'
import { getCurrentSetlist, listDrafts } from '@/modules/worship-slides/setlist-actions'
import { NewDraftButton } from '@/modules/worship-slides/components/NewDraftButton'

export const dynamic = 'force-dynamic'

/**
 * The sidebar shell: 工作台 / 歌库 / 主题 / 导入新歌, then 本周 and 最近制作. The setlist editor sits
 * outside it — it runs full-bleed and brings its own top bar.
 */
export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const [setlist, drafts] = await Promise.all([getCurrentSetlist(), listDrafts()])
  const service = setlist
    ? { href: `/worship/setlist/${setlist.id}`, label: setlist.title, count: `${setlist.songs.length} 首` }
    : null
  const nav = {
    service,
    drafts: drafts.map((d) => ({ href: `/worship/setlist/${d.id}`, label: d.title, count: `${d.count} 首` })),
  }
  return (
    <div className="grid min-h-screen grid-cols-1 grid-rows-[auto_1fr] md:grid-cols-[236px_minmax(0,1fr)] md:grid-rows-[1fr]">
      <div className="md:hidden">
        <MobileNav {...nav} newDraft={<NewDraftButton variant="mobile" />} />
      </div>
      <div className="hidden md:block">
        <Sidebar {...nav} newDraft={<NewDraftButton variant="sidebar" />} />
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
