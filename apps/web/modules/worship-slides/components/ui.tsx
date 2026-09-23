import type { ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react'

const cx = (...c: Array<string | false | undefined>) => c.filter(Boolean).join(' ')

export function Button({ variant = 'primary', className, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const v = { primary: 'bg-accent text-white hover:brightness-110', ghost: 'border border-line bg-card hover:bg-paper', danger: 'border border-red-200 text-red-700 hover:bg-red-50' }[variant]
  return <button {...p} className={cx('inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition disabled:opacity-50', v, className)} />
}
export function Input(p: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cx('h-10 w-full rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-accent', p.className)} />
}
export function Textarea(p: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} className={cx('w-full rounded-lg border border-line bg-card px-3 py-2 text-sm leading-6 outline-none focus:border-accent', p.className)} />
}
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
    </label>
  )
}
