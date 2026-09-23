'use client'
import { useState } from 'react'
import { cx } from '@/core/ui'
import { countInSong, type SongText } from '../replace'

/**
 * 查找替换 across the titles and lyrics — 你 → 祢 in one go. Folded away until asked for;
 * reaches either this song or every song in the setlist.
 */
export function FindReplace({ song, all, onReplace }: {
  song: SongText
  /** Every song in the setlist, the current one included. */
  all: SongText[]
  onReplace: (find: string, to: string, everySong: boolean) => void
}) {
  const [open, setOpen] = useState(false)
  const [find, setFind] = useState('')
  const [to, setTo] = useState('')
  const [everySong, setEverySong] = useState(false)
  const [done, setDone] = useState<string | null>(null)

  const hits = everySong ? all.reduce((n, s) => n + countInSong(s, find), 0) : countInSong(song, find)
  const songsHit = everySong ? all.filter((s) => countInSong(s, find) > 0).length : 0

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="self-end text-[13px] font-medium text-accent hover:text-ink">
        查找替换
      </button>
    )
  }

  const field = 'h-9 min-w-0 flex-1 rounded-lg border border-line-2 bg-surface px-3 text-sm text-ink outline-0 focus:border-accent'
  return (
    <form
      className="flex flex-col gap-2.5 rounded-xl bg-surface-3 px-4 py-3.5 text-[13px]"
      onSubmit={(e) => {
        e.preventDefault()
        if (!find || hits === 0 || find === to) return
        onReplace(find, to, everySong)
        setDone(`已替换 ${hits} 处`)
      }}
    >
      <div className="flex items-center gap-2">
        <span className="font-semibold">查找替换</span>
        <button type="button" onClick={() => setOpen(false)} aria-label="收起查找替换" className="ml-auto px-1 text-base leading-none text-ink-5 hover:text-ink">×</button>
      </div>
      <div className="flex items-center gap-2">
        <input value={find} onChange={(e) => { setFind(e.target.value); setDone(null) }} placeholder="查找，如 你" aria-label="查找" className={field} />
        <span className="text-ink-5">→</span>
        <input value={to} onChange={(e) => { setTo(e.target.value); setDone(null) }} placeholder="替换成，如 祢" aria-label="替换成" className={field} />
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-ink-4">
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={!everySong} onChange={() => setEverySong(false)} className="accent-accent" />
          这首歌
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={everySong} onChange={() => setEverySong(true)} className="accent-accent" />
          歌单里所有歌
        </label>
        <span className="ml-auto flex items-center gap-2.5">
          <span className={cx(done ? 'text-accent' : 'text-ink-5')}>
            {done ?? (find ? `找到 ${hits} 处${everySong && songsHit > 0 ? `（${songsHit} 首）` : ''}` : '')}
          </span>
          <button
            type="submit"
            disabled={!find || hits === 0 || find === to}
            className="rounded-full bg-ink px-3.5 py-1.5 font-semibold text-white transition-colors hover:bg-ink-2 disabled:cursor-not-allowed disabled:bg-ink-disabled"
          >
            全部替换
          </button>
        </span>
      </div>
    </form>
  )
}
