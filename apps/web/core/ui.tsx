import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

export const cx = (...c: Array<string | false | undefined | null>) => c.filter(Boolean).join(' ')

/* ---------------------------------------------------------------- buttons */

/** The pill sizes the design actually uses, smallest to largest. */
const PILL_SIZES = {
  xs: 'px-4 py-[7px] text-[13.5px] font-medium',
  sm: 'px-[18px] py-2 text-sm font-medium',
  md: 'px-5 py-2.5 text-[14.5px] font-medium',
  lg: 'px-[30px] py-3.5 text-base font-medium',
  xl: 'px-[30px] py-4 text-[16.5px] font-semibold',
} as const

const PILL_TONES = {
  dark: 'bg-ink text-white hover:bg-ink-2',
  accent: 'bg-accent text-white hover:bg-accent-strong',
  soft: 'bg-surface-4 text-ink hover:bg-line-3',
  plain: 'bg-surface text-ink hover:bg-surface-3',
  /** Reached its end state — reads as a label, not an invitation. */
  done: 'bg-surface-4 text-ink-6 cursor-default',
} as const

export type PillTone = keyof typeof PILL_TONES
export type PillSize = keyof typeof PILL_SIZES

const PILL_BASE =
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full transition-colors disabled:cursor-not-allowed'

export function pillClass({ tone = 'dark', size = 'sm', className }: { tone?: PillTone; size?: PillSize; className?: string } = {}) {
  return cx(PILL_BASE, PILL_SIZES[size], PILL_TONES[tone], className)
}

export type PillProps = ButtonHTMLAttributes<HTMLButtonElement> & { tone?: PillTone; size?: PillSize; loading?: boolean }

export function Pill({ tone = 'dark', size = 'sm', loading = false, className, children, disabled, ...p }: PillProps) {
  return (
    <button
      {...p}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        PILL_BASE,
        PILL_SIZES[size],
        disabled && !loading ? 'cursor-not-allowed bg-ink-disabled text-white' : PILL_TONES[tone],
        className,
      )}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}

/** A 1em ring that spins; inherits the button's text colour. */
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx('inline-block size-[1em] shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent', className)}
    />
  )
}

/* ------------------------------------------------------------- segmented */

export interface SegmentOption<T> {
  value: T
  label: ReactNode
}

/**
 * The grey track with a white thumb behind the selected item — the design's
 * one control for "pick exactly one of a few". `grow` stretches the items to
 * fill the track, which the 4-up tab rows and the settings rows do.
 */
export function Segmented<T extends string | number | boolean>({
  options, value, onChange, grow = false, size = 'md', ariaLabel,
}: {
  options: ReadonlyArray<SegmentOption<T>>
  value: T
  onChange: (v: T) => void
  grow?: boolean
  size?: 'sm' | 'md' | 'lg'
  ariaLabel: string
}) {
  const track = { sm: 'p-[3px] rounded-[10px] text-[13.5px]', md: 'p-1 rounded-[12px] text-sm', lg: 'p-1 rounded-[14px] text-[15px]' }[size]
  const item = { sm: 'px-3.5 py-[7px] rounded-lg', md: 'px-[18px] py-2 rounded-[9px]', lg: 'px-[22px] py-2.5 rounded-[11px]' }[size]
  return (
    <div role="tablist" aria-label={ariaLabel} className={cx('flex font-medium bg-surface-4', track, grow && 'w-full')}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={cx(
              'cursor-pointer whitespace-nowrap transition-colors',
              item,
              grow && 'flex-1 text-center',
              on ? 'bg-surface text-ink shadow-[0_1px_3px_rgba(0,0,0,.08)]' : 'text-ink-4 hover:text-ink',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/* ----------------------------------------------------------------- chips */

/** Filled pill filter, as on the 主题 gallery. */
export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cx(
        'cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors',
        active ? 'bg-ink text-white' : 'bg-surface-4 text-ink hover:bg-line-3',
      )}
    >
      {children}
    </button>
  )
}

/** Outlined pill action, as on 添加段落 / 加入. */
export function GhostChip({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer rounded-full border border-line-4 px-[11px] py-[5px] text-[13px] transition-colors hover:border-accent hover:text-accent"
    >
      {children}
    </button>
  )
}

/* --------------------------------------------------------------- toggle */

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex cursor-pointer items-center justify-between text-sm"
    >
      <span>{label}</span>
      <span
        aria-hidden="true"
        className={cx('flex h-6 w-10 rounded-xl p-0.5 transition-colors', checked ? 'justify-end bg-accent' : 'justify-start bg-line-4')}
      >
        <span className="size-5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.15)]" />
      </span>
    </button>
  )
}

/* ---------------------------------------------------------------- fields */

/** The filled, borderless field the design uses everywhere. */
export function FilledInput({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...p}
      className={cx('min-w-0 flex-1 border-0 bg-transparent text-[15px] outline-0', className)}
    />
  )
}

export function FieldShell({ label, className, children }: { label?: string; className?: string; children: ReactNode }) {
  return (
    <div className={cx('flex items-center gap-3 rounded-lg bg-surface-3 px-4', className)}>
      {label && <span className="flex-none text-sm text-ink-5">{label}</span>}
      {children}
    </div>
  )
}

/* ---------------------------------------------------------------- modal */

/**
 * Click-outside-to-close overlay. The panel stops propagation so a click
 * inside never reaches the scrim.
 */
export function Modal({ onClose, labelledBy, className, children }: { onClose: () => void; labelledBy: string; className?: string; children: ReactNode }) {
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-30 flex items-center justify-center bg-[rgba(20,18,16,.36)] p-6 backdrop-blur-[4px]"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(e) => e.stopPropagation()}
        className={cx('flex w-full flex-col overflow-hidden rounded-[22px] bg-surface shadow-[0_30px_80px_rgba(0,0,0,.22)]', className)}
      >
        {children}
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- inline */

/** Error text that sits where the action happened, not in a floating toast. */
export function InlineError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-lg bg-accent-soft px-3.5 py-2.5 text-[13.5px] leading-6 text-accent-deep">
      {children}
    </p>
  )
}
