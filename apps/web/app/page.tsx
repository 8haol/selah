import type { Metadata } from 'next'
import Link from 'next/link'
import { annotateLine, getTheme, type Slide } from '@selah/slide-engine'
import { SlideView } from '@/modules/worship-slides/components/SlideView'
import { pillClass } from '@/core/ui'

export const metadata: Metadata = { title: { absolute: 'Selah · 敬拜投影片，一分钟做好' } }

const NAV = [
  { label: '主题', href: '/worship/themes' },
  { label: '歌库', href: '/worship/library' },
]

/** Not built yet, so they stay plain text rather than links that 404. */
const NAV_SOON = ['帮助']

const STEPS = [
  { n: '01', title: '建好歌库', body: '粘贴、上传或拍照导入歌词，自动分出主歌和副歌，全队共用一个歌库。' },
  { n: '02', title: '排本周歌单', body: '加入这周要唱的歌，每首排好顺序、选好主题。' },
  { n: '03', title: '一键导出', body: '整场合成一份 PPT，标题页和空白页自动加好。' },
]

/** The product shot: two real lyric lines, laid out by the real slide engine. */
const HERO_LINES = ['我心满溢　我心满溢', '对祢的爱和思念无止尽']

export default function Home() {
  // the live 流光 loop, not a still: it is the first thing a visitor sees
  const heroTheme = getTheme('flow-deep')
  const heroSlide: Slide = { kind: 'lyrics', lines: HERO_LINES.map((zh) => ({ zh, pinyin: annotateLine(zh, {}) })) }

  return (
    <div className="flex min-h-screen flex-col items-center">
      <header className="sticky top-0 z-10 flex h-16 w-full items-center gap-6 border-b border-line bg-[rgba(255,255,255,.88)] px-6 text-sm backdrop-blur-[14px] md:gap-[30px] md:px-12">
        <Link href="/" className="font-display text-xl font-bold tracking-[-0.01em]">
          Selah
        </Link>
        <nav className="ml-auto hidden items-center gap-[30px] text-ink-3 sm:flex">
          {NAV.map((n) => (
            <Link key={n.label} href={n.href} className="transition-colors hover:text-ink">
              {n.label}
            </Link>
          ))}
          {NAV_SOON.map((label) => (
            <span key={label} title="还没上线">
              {label}
            </span>
          ))}
        </nav>
        <Link href="/worship" className={pillClass({ className: 'ml-auto sm:ml-0' })}>
          开始使用
        </Link>
      </header>

      <section className="flex flex-col items-center px-6 pt-16 text-center md:pt-[104px]">
        <h1 className="text-[44px] font-bold leading-[1.1] tracking-[-0.03em] sm:text-[60px] md:text-[76px]">
          敬拜投影片
          <br />
          <span className="text-accent">一分钟做好</span>
        </h1>
        <p className="mt-7 text-pretty text-lg leading-[1.6] text-ink-4 md:text-xl">
          粘贴歌词或上传文件，自动分段、加拼音、排好版式。
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/worship" className={pillClass({ size: 'lg' })}>
            开始使用
          </Link>
          <Link href="/worship/themes" className={pillClass({ tone: 'soft', size: 'lg', className: 'px-[26px]' })}>
            浏览主题
          </Link>
        </div>
        <p className="mt-5 text-[13.5px] text-ink-5">免费使用，不用注册</p>
      </section>

      <div className="mt-14 w-[calc(100%-48px)] max-w-[1040px] overflow-hidden rounded-[22px] shadow-[0_40px_90px_rgba(0,0,0,.2)] md:mt-20 md:w-[calc(100%-96px)]">
        <SlideView slide={heroSlide} theme={heroTheme} frameClassName="" />
      </div>

      <section className="mt-24 grid w-[calc(100%-48px)] max-w-[1040px] grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-12 md:mt-[140px] md:w-[calc(100%-96px)]">
        {STEPS.map((s) => (
          <div key={s.n} className="flex flex-col gap-3">
            <span className="font-mono text-[13px] font-medium text-accent">{s.n}</span>
            <h2 className="text-[22px] font-semibold">{s.title}</h2>
            <p className="text-[15.5px] leading-[1.7] text-ink-4">{s.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-24 flex flex-col items-center gap-6 px-6 text-center md:mt-[140px]">
        <h2 className="text-[32px] font-bold leading-[1.2] tracking-[-0.02em] md:text-[44px]">这个主日，试试看</h2>
        <Link href="/worship" className={pillClass({ size: 'lg' })}>
          开始使用
        </Link>
      </section>

      <footer className="mt-20 flex w-full flex-wrap items-center gap-6 border-t border-line px-6 py-7 text-[13px] text-ink-5 md:mt-[120px] md:px-12">
        <span className="font-display text-base font-bold text-ink">Selah</span>
        <span>© 2026</span>
        <div className="ml-auto flex gap-6">
          <span>隐私</span>
          <span>条款</span>
          <span>联系我们</span>
        </div>
      </footer>
    </div>
  )
}
