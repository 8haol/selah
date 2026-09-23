'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { cx } from './ui'

const NAV = [
  { label: '工作台', href: '/worship' },
  { label: '歌库', href: '/worship/library' },
  { label: '主题', href: '/worship/themes' },
  { label: '导入新歌', href: '/worship/import' },
] as const

export interface SidebarService {
  href: string
  label: string
  count: string
}

export interface SidebarDraft {
  href: string
  label: string
  count: string
}

const ROW = 'flex items-center justify-between rounded-[10px] px-3 py-[9px] text-[14.5px] transition-colors hover:bg-line'

interface SidebarProps {
  service: SidebarService | null
  drafts: SidebarDraft[]
  /** 新建制作, rendered by the module so core stays free of its actions. */
  newDraft: ReactNode
}

export function Sidebar({ service, drafts, newDraft }: SidebarProps) {
  const pathname = usePathname()
  return (
    <div className="sticky top-0 flex h-screen flex-col gap-[3px] border-r border-line-2 bg-surface-2 px-3.5 py-5">
      <Link href="/" className="px-3 pb-5 pt-0.5 font-display text-xl font-bold">
        Selah
      </Link>

      <nav className="flex flex-col gap-[3px]">
        {NAV.map((n) => {
          // /worship is the dashboard, so only an exact match lights it up
          const on = n.href === '/worship' ? pathname === n.href : pathname.startsWith(n.href)
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={on ? 'page' : undefined}
              className={cx(
                'rounded-[10px] px-3 py-[9px] text-[14.5px] transition-colors hover:bg-line',
                on ? 'bg-line font-semibold text-ink' : 'text-ink-3',
              )}
            >
              {n.label}
            </Link>
          )
        })}
      </nav>

      {service && (
        <>
          <span className="px-3 pb-1.5 pt-[18px] text-xs text-ink-5">本周</span>
          <Link href={service.href} className={ROW}>
            <span className="min-w-0 truncate">{service.label}</span>
            <span className="ml-2 flex-none text-xs font-semibold text-accent">{service.count}</span>
          </Link>
        </>
      )}

      <span className="px-3 pb-1.5 pt-[18px] text-xs text-ink-5">最近制作</span>
      <div className="scroll-thin -mx-1 flex min-h-0 flex-col gap-[3px] overflow-y-auto px-1">
        {drafts.map((d) => (
          <Link key={d.href} href={d.href} className={ROW}>
            <span className="min-w-0 truncate">{d.label}</span>
            <span className="ml-2 flex-none text-xs text-ink-5">{d.count}</span>
          </Link>
        ))}
        {newDraft}
      </div>

      <p className="mt-auto rounded-xl border border-line-2 bg-surface p-3.5 text-[13px] leading-[1.6] text-ink-4">
        歌库和歌单存在服务器上，整个敬拜队共用，打开就能用。
      </p>
    </div>
  )
}

/** Below the sidebar breakpoint the same destinations ride in a top bar. */
export function MobileNav({ service, drafts, newDraft }: SidebarProps) {
  const pathname = usePathname()
  return (
    <div className="sticky top-0 z-20 border-b border-line bg-[rgba(255,255,255,.92)] backdrop-blur-[14px]">
      <div className="flex h-14 items-center gap-4 px-6">
        <Link href="/" className="font-display text-lg font-bold">
          Selah
        </Link>
        {service && (
          <Link href={service.href} className="ml-auto flex items-center gap-2 text-[13.5px]">
            <span className="max-w-[9rem] truncate text-ink-4">{service.label}</span>
            <span className="font-semibold text-accent">{service.count}</span>
          </Link>
        )}
      </div>
      <nav className="scroll-thin flex gap-1 overflow-x-auto px-4 pb-2">
        {NAV.map((n) => {
          const on = n.href === '/worship' ? pathname === n.href : pathname.startsWith(n.href)
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={on ? 'page' : undefined}
              className={cx(
                'whitespace-nowrap rounded-[10px] px-3 py-2 text-sm transition-colors',
                on ? 'bg-line font-semibold text-ink' : 'text-ink-3',
              )}
            >
              {n.label}
            </Link>
          )
        })}
        {drafts.map((d) => (
          <Link key={d.href} href={d.href} className="max-w-[10rem] truncate whitespace-nowrap rounded-[10px] px-3 py-2 text-sm text-ink-3">
            {d.label}
          </Link>
        ))}
        {newDraft}
      </nav>
    </div>
  )
}
