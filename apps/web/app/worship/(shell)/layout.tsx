import { MobileNav, Sidebar } from '@/core/Sidebar'
import { getCurrentSetlist } from '@/modules/worship-slides/setlist-actions'

export const dynamic = 'force-dynamic'

/**
 * The sidebar shell: 工作台 / 歌库 / 主题 / 导入新歌. The setlist editor sits
 * outside it — it runs full-bleed and brings its own top bar.
 */
export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const setlist = await getCurrentSetlist()
  const service = setlist
    ? { href: `/worship/setlist/${setlist.id}`, label: setlist.title, count: `${setlist.songs.length} 首` }
    : null
  return (
    <div className="grid min-h-screen grid-cols-1 grid-rows-[auto_1fr] md:grid-cols-[236px_minmax(0,1fr)] md:grid-rows-[1fr]">
      <div className="md:hidden">
        <MobileNav service={service} />
      </div>
      <div className="hidden md:block">
        <Sidebar service={service} />
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}
