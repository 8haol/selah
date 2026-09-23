import type { Metadata } from 'next'
import Link from 'next/link'
import { SongForm } from '@/modules/worship-slides/components/SongForm'

export const metadata: Metadata = { title: '新建歌曲' }

export default function NewSong() {
  return (
    <div className="space-y-10">
      <header>
        <Link href="/worship" className="inline-flex rounded-sm text-xs text-ink-soft transition-colors hover:text-ink">← 返回歌库</Link>
        <h1 className="mt-2 font-serif text-[28px] font-medium leading-tight text-ink">新建歌曲</h1>
        <p className="mt-1.5 text-sm text-ink-soft">把歌词贴进来，段落和拼音会自动识别。</p>
      </header>
      <SongForm mode="create" />
    </div>
  )
}
