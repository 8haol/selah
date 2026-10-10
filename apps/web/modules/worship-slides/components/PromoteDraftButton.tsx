'use client'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cx } from '@/core/ui'
import { promoteDraft } from '../setlist-actions'

/** Two taps, like DeleteDraftButton: arm, then make this draft the coming Sunday's service. */
export function PromoteDraftButton({ id, className }: { id: string; className?: string }) {
  const router = useRouter()
  const [armed, setArmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(t)
  }, [armed])

  const onClick = () => {
    if (!armed) { setArmed(true); setError(null); return }
    start(async () => {
      const r = await promoteDraft(id)
      setArmed(false)
      if (!r.ok) { setError(r.message); return }
      router.refresh()
    })
  }

  return (
    <span className="relative flex-none">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        title="把这份制作变成这个主日的歌单，歌和顺序都保留"
        className={cx(
          'cursor-pointer rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors',
          armed ? 'bg-accent text-white' : 'text-accent hover:bg-accent-soft',
          className,
        )}
      >
        {pending ? '设置中…' : armed ? '确认？' : '设为本周'}
      </button>
      {error && (
        <span role="alert" className="absolute left-0 top-full z-30 mt-2 w-[260px] rounded-lg bg-accent-soft px-3 py-2 text-[12.5px] leading-5 text-accent-deep shadow-sm">
          {error}
        </span>
      )}
    </span>
  )
}
