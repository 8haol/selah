'use client'
import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cx } from '@/core/ui'
import { deleteDeck } from '../actions'

/**
 * Two taps: the first arms it ("确认删除？"), the second deletes. It disarms
 * itself after a few seconds, so a stray tap never removes anything.
 */
export function DeleteDeckButton({ id, redirectTo, className }: { id: string; redirectTo?: string; className?: string }) {
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
      const r = await deleteDeck(id)
      if (!r.ok) { setError(r.message); setArmed(false); return }
      if (redirectTo) router.push(redirectTo)
      else router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      title={error ?? '删除这次生成记录'}
      className={cx(
        'rounded-full px-3 py-1 text-[12.5px] font-medium transition-colors',
        armed ? 'bg-accent-strong text-white' : 'bg-surface/90 text-ink-4 hover:text-ink',
        className,
        (armed || pending) && 'opacity-100!',
      )}
    >
      {pending ? '删除中…' : error ? '删除失败' : armed ? '确认删除？' : '删除'}
    </button>
  )
}
