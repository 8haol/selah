import { Spinner } from '@/core/ui'

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center gap-2 text-sm text-ink-5" aria-busy="true">
      <Spinner /> 正在打开歌单…
    </div>
  )
}
