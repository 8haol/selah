import type { Metadata } from 'next'
import Link from 'next/link'
import { Noto_Sans_SC, Noto_Serif_SC } from 'next/font/google'
import './globals.css'

// Latin subset only: the CJK subsets are ~10 MB and would be preloaded on every
// page. Chinese glyphs fall back to the system serif / sans stacks in globals.css.
const serif = Noto_Serif_SC({ subsets: ['latin'], weight: ['500', '700'], display: 'swap', variable: '--font-serif-sc' })
const sans = Noto_Sans_SC({ subsets: ['latin'], weight: ['400', '500', '700'], display: 'swap', variable: '--font-sans-sc' })

export const metadata: Metadata = {
  title: { default: 'Selah', template: '%s · Selah' },
  description: '教会工具平台 · 敬拜投影一分钟做好',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" className={`${serif.variable} ${sans.variable}`}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-[1120px] items-center gap-8 px-6">
            <Link href="/" className="rounded-sm font-serif text-xl font-bold tracking-[0.18em] text-ink">
              Selah
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/worship"
                className="inline-flex min-h-11 items-center rounded-md px-3 text-ink-soft transition-colors hover:text-ink sm:min-h-0 sm:py-1.5"
              >
                敬拜投影
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1120px] flex-1 px-6 py-10">{children}</main>
        <footer className="mt-16 border-t border-line">
          <div className="mx-auto max-w-[1120px] px-6 py-8 text-xs text-ink-soft">
            Selah · CCIL 国语堂敬拜队 · 2026
          </div>
        </footer>
      </body>
    </html>
  )
}
