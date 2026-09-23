'use client'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cx } from '@/core/ui'
import { deleteDraft } from '../setlist-actions'

/** Two taps, like DeleteDeckButton: arm, then delete. Only drafts carry it. */
export function DeleteDraftButton({ id, className }: { id: string; className?: string }) {
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
      const r = await deleteDraft(id)
      if (!r.ok) { setError(r.message); setArmed(false); return }
      router.push('/worship')
    })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      title={error ?? '删除这份制作，导出过的 PPT 记录会保留'}
      className={cx(
        'flex-none cursor-pointer rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors',
        armed ? 'bg-accent-strong text-white' : 'text-ink-4 hover:bg-surface-3 hover:text-ink',
        className,
      )}
    >
      {pending ? '删除中…' : error ? '删除失败' : armed ? '确认删除？' : '删除'}
    </button>
  )
}
