import type { ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react'
import { cx } from '@/core/ui'

export { cx }

/**
 * Form-shaped primitives for the song editor. The rest of the product speaks
 * in pills and segmented controls — see `core/ui` — but a long edit form still
 * wants labelled fields and a rectangular button.
 */

const BUTTON_SIZES = {
  sm: 'h-9 min-h-9 px-3 text-xs gap-1.5',
  md: 'h-11 min-h-11 px-4 text-sm gap-2',
  lg: 'h-12 min-h-12 px-6 text-base gap-2',
} as const

const BUTTON_VARIANTS = {
  primary: 'bg-ink text-white hover:bg-ink-2',
  accent: 'bg-accent text-white hover:bg-accent-strong',
  ghost: 'border border-line-3 bg-surface text-ink hover:border-line-strong hover:bg-surface-3',
  danger: 'border border-accent/35 bg-surface text-accent hover:bg-accent-soft',
} as const

export type ButtonVariant = keyof typeof BUTTON_VARIANTS
export type ButtonSize = keyof typeof BUTTON_SIZES

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
}

/** Button skin for elements that must stay links — a <button> inside an <a> is invalid. */
export function buttonClass({ variant = 'primary', size = 'md', className }: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cx(
    'inline-flex select-none items-center justify-center rounded-md font-medium transition-colors',
    BUTTON_SIZES[size],
    BUTTON_VARIANTS[variant],
    className,
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

export function Button({ variant = 'primary', size = 'md', loading = false, className, children, disabled, ...p }: ButtonProps) {
  return (
    <button
      {...p}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex select-none items-center justify-center rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        BUTTON_SIZES[size],
        BUTTON_VARIANTS[variant],
        className,
      )}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}

export function Input({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...p}
      className={cx(
        'h-11 w-full rounded-md border border-line-3 bg-surface px-3 text-sm text-ink transition-colors hover:border-line-strong focus:border-accent',
        className,
      )}
    />
  )
}

export function Textarea({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...p}
      className={cx(
        'w-full rounded-md border border-line-3 bg-surface px-3 py-2.5 text-sm leading-7 text-ink transition-colors hover:border-line-strong focus:border-accent',
        className,
      )}
    />
  )
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string | null; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs text-accent-deep">{error}</span>
      ) : (
        hint && <span className="mt-1.5 block text-xs text-ink-5">{hint}</span>
      )}
    </label>
  )
}

const BADGE_TONES = {
  neutral: 'border-line-3 bg-surface-3 text-ink-4',
  accent: 'border-transparent bg-accent-soft text-accent-deep',
  success: 'border-transparent bg-ok/10 text-ok',
  danger: 'border-transparent bg-accent-soft text-accent-deep',
} as const

export function Badge({ tone = 'neutral', mono = false, className, children }: { tone?: keyof typeof BADGE_TONES; mono?: boolean; className?: string; children: ReactNode }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs leading-5',
        mono && 'font-mono tracking-tight',
        BADGE_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Card({ as: As = 'div', className, children }: { as?: 'div' | 'section' | 'li' | 'article'; className?: string; children: ReactNode }) {
  return <As className={cx('rounded-xl border border-line-2 bg-surface', className)}>{children}</As>
}

/** Music note inside a circle — the one illustration the product owns. */
export function NoteMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" className={cx('size-14', className)} fill="none">
      <circle cx="32" cy="32" r="30" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.5" />
      <path d="M27 40.5V23.2l15-3.2v14.4" stroke="currentColor" strokeOpacity="0.75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <ellipse cx="23.5" cy="41" rx="4.5" ry="3.6" fill="currentColor" fillOpacity="0.75" />
      <ellipse cx="38.5" cy="37.8" rx="4.5" ry="3.6" fill="currentColor" fillOpacity="0.75" />
    </svg>
  )
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-line-strong px-6 py-14 text-center">
      <NoteMark className="size-14 text-accent" />
      <p className="mt-5 text-lg font-semibold text-ink">{title}</p>
      {description && <p className="mt-2 max-w-sm text-sm leading-6 text-ink-4">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

const TOAST_TONES = {
  success: { wrap: 'border-ok/30 bg-ok/10 text-ok', icon: 'M4.5 10.5l3.6 3.6 7.4-8.2' },
  danger: { wrap: 'border-accent/30 bg-accent-soft text-accent-deep', icon: 'M10 5.5v5.4M10 14.2v.3' },
} as const

/** Inline banner, not a floating popover — it sits where the action happened. */
export function Toast({ tone = 'success', children }: { tone?: keyof typeof TOAST_TONES; children: ReactNode }) {
  const t = TOAST_TONES[tone]
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cx('flex items-start gap-2.5 rounded-md border px-3.5 py-2.5 text-sm', t.wrap)}>
      <svg viewBox="0 0 20 20" aria-hidden="true" className="mt-0.5 size-4 shrink-0" fill="none">
        <circle cx="10" cy="10" r="8.5" stroke="currentColor" strokeOpacity="0.4" />
        <path d={t.icon} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="leading-6">{children}</span>
    </div>
  )
}
