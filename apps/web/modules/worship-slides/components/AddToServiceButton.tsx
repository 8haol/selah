'use client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Pill } from '@/core/ui'
import { addSongToSetlist, startSetlist } from '../setlist-actions'

/**
 * 加入歌单 / 加入本周. With no setlist yet it makes one first, so the row works
 * the same whether or not this week has been started.
 */
export function AddToServiceButton({
  songId, setlistId, added, label, addedLabel, disabled, disabledLabel, size = 'xs',
}: {
  songId: string
  setlistId: string | null
  added: boolean
  label: string
  addedLabel: string
  /** A song with no sections yet cannot be projected. */
  disabled?: boolean
  disabledLabel?: string
  size?: 'xs' | 'sm'
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [done, setDone] = useState(added)

  if (disabled) {
    return (
      <Pill tone="done" size={size} disabled>
        {disabledLabel ?? '整理中'}
      </Pill>
    )
  }
  if (done) {
    return (
      <Pill tone="done" size={size} disabled>
        {addedLabel}
      </Pill>
    )
  }
  return (
    <Pill
      size={size}
      loading={pending}
      onClick={() =>
        start(async () => {
          let id = setlistId
          if (!id) {
            const s = await startSetlist()
            if (!s.ok) return
            id = s.id
          }
          const r = await addSongToSetlist(id, songId)
          if (!r.ok) return
          setDone(true)
          router.push(`/worship/setlist/${id}`)
        })
      }
    >
      {label}
    </Pill>
  )
}
