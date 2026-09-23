import type { Metadata } from 'next'
import Link from 'next/link'
import { Music, Calendar, Ticket, BookOpen } from 'lucide-react'
import { MODULES } from '@/core/registry'
import { Badge, Card, buttonClass } from '@/modules/worship-slides/components/ui'

export const metadata: Metadata = { title: { absolute: 'Selah · CCIL 国语堂工具' } }

const ICONS = { music: Music, calendar: Calendar, ticket: Ticket, book: BookOpen }

const STEPS = ['贴歌词', '排 flow', '选主题', '下载 PPT']

export default function Home() {
  return (
    <div className="space-y-16">
      <section className="max-w-2xl pt-4">
        <h1 className="font-serif text-[28px] font-medium leading-[1.35] tracking-tight text-ink sm:text-4xl">
          敬拜投影，一分钟做好。
        </h1>
        <p className="mt-4 text-[15px] leading-7 text-ink-soft">
          把歌词贴进来，排好 flow，选一套主题，就能下载带拼音的 PPT。歌进了库，下周直接复用。
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/worship" className={buttonClass({ size: 'lg' })}>进入歌库</Link>
          <Link href="/worship/generate" className={buttonClass({ size: 'lg', variant: 'ghost' })}>生成 PPT</Link>
        </div>
        <ol className="mt-10 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-ink-soft">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-3">
              {i > 0 && <span aria-hidden="true" className="text-line">—</span>}
              <span className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-accent">{i + 1}</span>
                {s}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="font-serif text-lg font-medium text-ink">工具</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => {
            const Icon = ICONS[m.icon]
            const ready = m.status === 'ready'
            const card = (
              <Card className={`h-full p-5 transition ${ready ? 'hover:-translate-y-0.5 hover:border-ink-soft/40 hover:shadow-[0_6px_20px_rgba(30,27,24,0.07)]' : 'border-dashed bg-transparent'}`}>
                <div className="flex items-center gap-3">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-md ${ready ? 'bg-accent-soft text-accent' : 'bg-paper text-ink-soft'}`}>
                    <Icon size={19} aria-hidden="true" />
                  </span>
                  <h3 className={`font-serif text-base font-medium ${ready ? 'text-ink' : 'text-ink-soft'}`}>{m.name}</h3>
                  {!ready && <Badge className="ml-auto">即将推出</Badge>}
                </div>
                <p className="mt-3 text-sm leading-6 text-ink-soft">{m.description}</p>
              </Card>
            )
            return ready ? (
              <Link key={m.id} href={m.href} className="rounded-lg">{card}</Link>
            ) : (
              <div key={m.id}>{card}</div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
