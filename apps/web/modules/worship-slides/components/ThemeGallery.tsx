'use client'
import { useMemo, useState, useTransition } from 'react'
import { BUILTIN_THEMES, annotateLine, themeCategory, type Slide } from '@selah/slide-engine'
import { Chip, InlineError, cx } from '@/core/ui'
import { SlideView } from './SlideView'
import { setDefaultThemeId } from '../setlist-actions'

const SAMPLE = ['我心满溢　我心满溢', '对祢的爱和思念无止尽']
const CATEGORIES = ['全部', '照片', '动态'] as const

export function ThemeGallery({ defaultThemeId }: { defaultThemeId: string }) {
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>('全部')
  const [current, setCurrent] = useState(defaultThemeId)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const sample: Slide = useMemo(() => ({ kind: 'lyrics', lines: SAMPLE.map((zh) => ({ zh, pinyin: annotateLine(zh, {}) })) }), [])
  const shown = BUILTIN_THEMES.filter((t) => cat === '全部' || themeCategory(t) === cat)

  const pick = (id: string) => {
    const was = current
    setCurrent(id) // optimistic: the ring should not wait on the round trip
    setError(null)
    start(async () => {
      const r = await setDefaultThemeId(id)
      if (!r.ok) { setCurrent(was); setError(r.message) }
    })
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
            {c}
          </Chip>
        ))}
      </div>

      {error && <InlineError>{error}</InlineError>}

      <div className="grid gap-x-6 gap-y-9 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
        {shown.map((t) => {
          const on = t.id === current
          return (
            <div key={t.id} className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => pick(t.id)}
                aria-pressed={on}
                aria-label={`把 ${t.name} 设为默认主题`}
                className={cx(
                  'relative overflow-hidden rounded-xl border border-line-soft outline-offset-[3px] transition',
                  on ? 'outline-[2.5px] outline-accent' : 'outline-[2.5px] outline-transparent',
                  pending && 'opacity-90',
                )}
              >
                <SlideView slide={sample} theme={t} static frameClassName="" />
                {themeCategory(t) === '动态' && (
                  <span className="absolute bottom-2 right-3 font-mono text-[10px] text-white/60">动态 · 循环播放</span>
                )}
              </button>
              <div className="flex items-center gap-2.5">
                <span className="truncate text-[15px] font-semibold">{t.name}</span>
                <span className="flex-none text-[13px] text-ink-5">{themeCategory(t)}</span>
                <button
                  type="button"
                  onClick={() => pick(t.id)}
                  disabled={on}
                  className={cx('ml-auto flex-none text-sm', on ? 'cursor-default text-ink-5' : 'text-accent hover:text-accent-link')}
                >
                  {on ? '默认主题' : '设为默认'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
