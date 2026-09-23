'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FieldShell, FilledInput } from '@/core/ui'

/**
 * Search lives in the URL so the list itself stays a server render —
 * the query hits the database's search key, not a client-side filter.
 */
export function LibraryControls({ query, basePath = '/worship/library' }: { query: string; basePath?: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const [q, setQ] = useState(query)
  const [seen, setSeen] = useState(query)

  // The field owns the text while typing and the URL catches up after a pause.
  // When the URL moves on its own (back button, a link), adopt it during render
  // rather than in an effect, which would cascade a second render.
  if (query !== seen) { setSeen(query); setQ(query) }

  useEffect(() => {
    if (q === query) return
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString())
      if (q.trim()) next.set('q', q.trim())
      else next.delete('q')
      router.replace(`${basePath}?${next}`, { scroll: false })
    }, 250)
    return () => clearTimeout(t)
  }, [q, query, params, router, basePath])

  return (
    <div className="flex flex-wrap items-center gap-3">
      <FieldShell className="h-[46px] min-w-[260px] flex-1">
        <label htmlFor="song-search" className="sr-only">
          搜索歌曲
        </label>
        <FilledInput
          id="song-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索歌名、作者或一句歌词"
        />
      </FieldShell>
    </div>
  )
}
