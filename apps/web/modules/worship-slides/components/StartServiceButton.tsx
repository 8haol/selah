'use client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Pill, InlineError } from '@/core/ui'
import { startSetlist } from '../setlist-actions'

/** 开始创建 / 继续编辑 — opens this week's setlist, making one if there isn't one. */
export function StartServiceButton({ label }: { label: string }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <div className="flex flex-col items-start gap-2">
      <Pill
        tone="accent"
        size="xl"
        loading={pending}
        onClick={() =>
          start(async () => {
            setError(null)
            const r = await startSetlist()
            if (r.ok) router.push(`/worship/setlist/${r.id}`)
            else setError(r.message)
          })
        }
      >
        {label}
      </Pill>
      {error && <InlineError>{error}</InlineError>}
    </div>
  )
}
