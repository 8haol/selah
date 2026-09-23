import { Spinner } from '@/core/ui'

/**
 * Shown the instant a sidebar link is clicked, while the next page's queries
 * run. Without it the click looks ignored until the server answers.
 */
export default function Loading() {
  return (
    <div className="mx-auto flex max-w-[1080px] flex-col gap-6 px-6 pt-10 md:px-12 md:pt-12" aria-busy="true">
      <div className="h-10 w-48 animate-pulse rounded-lg bg-surface-3" />
      <div className="h-5 w-72 animate-pulse rounded bg-surface-3" />
      <div className="mt-4 flex items-center gap-2 text-sm text-ink-5">
        <Spinner /> 正在打开…
      </div>
    </div>
  )
}
