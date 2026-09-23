import type { Metadata } from 'next'
import { getDefaultThemeId } from '@/modules/worship-slides/setlist-actions'
import { ThemeGallery } from '@/modules/worship-slides/components/ThemeGallery'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: '主题' }

export default async function Themes() {
  const defaultThemeId = await getDefaultThemeId()
  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-[26px] px-6 pb-20 pt-10 md:px-12 md:pt-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-[32px] font-bold tracking-[-0.02em] md:text-[40px]">主题</h1>
        <p className="text-base text-ink-4">选一个作为默认主题，新加进歌单的歌都会用它。</p>
      </header>
      <ThemeGallery defaultThemeId={defaultThemeId} />
    </div>
  )
}
