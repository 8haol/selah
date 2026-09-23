'use client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { cx } from '@/core/ui'
import { createDraft } from '../setlist-actions'

/** ＋ 新建制作 — a fresh deck beside Sunday's, straight into the editor. */
const VARIANTS = {
  sidebar: 'w-full rounded-[10px] px-3 py-[9px] text-[14.5px] text-ink-4 hover:bg-line hover:text-ink',
  mobile: 'whitespace-nowrap rounded-[10px] px-3 py-2 text-sm text-ink-4',
} as const

export function NewDraftButton({ variant }: { variant: keyof typeof VARIANTS }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <button
      type="button"
      disabled={pending}
      title={error ?? '另开一份和主日无关的 PPT'}
      onClick={() =>
        start(async () => {
          setError(null)
          const r = await createDraft()
          if (r.ok) router.push(`/worship/setlist/${r.id}`)
          else setError(r.message)
        })
      }
      className={cx('cursor-pointer text-left transition-colors disabled:cursor-wait', VARIANTS[variant])}
    >
      {pending ? '创建中…' : error ? '创建失败，再试一次' : '＋ 新建制作'}
    </button>
  )
}
