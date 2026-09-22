import Link from 'next/link'
import { Music, Calendar, Ticket, BookOpen } from 'lucide-react'
import { MODULES } from '@/core/registry'

const ICONS = { music: Music, calendar: Calendar, ticket: Ticket, book: BookOpen }

export default function Home() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">CCIL 国语堂 · 工具</h1>
      <p className="mt-1 text-ink-soft">选一个工具开始。</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => {
          const Icon = ICONS[m.icon]
          const card = (
            <div className={`rounded-[var(--radius-lg)] border border-line bg-card p-5 transition ${m.status === 'ready' ? 'hover:-translate-y-0.5 hover:shadow-md' : 'opacity-60'}`}>
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent"><Icon size={20} /></span>
                <h2 className="text-lg font-medium">{m.name}</h2>
                {m.status === 'soon' && <span className="ml-auto rounded-full border border-line px-2 py-0.5 text-xs text-ink-soft">即将推出</span>}
              </div>
              <p className="mt-3 text-sm text-ink-soft">{m.description}</p>
            </div>
          )
          return m.status === 'ready' ? <Link key={m.id} href={m.href}>{card}</Link> : <div key={m.id}>{card}</div>
        })}
      </div>
    </div>
  )
}
