import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Selah', template: '%s · Selah' },
  description: '教会工具平台 · 敬拜投影一分钟做好',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@500;700&family=Noto+Sans+SC:wght@400;500;700&display=swap"
        />
      </head>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <header className="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-8 px-6">
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
        <main className="mx-auto w-full max-w-[1320px] flex-1 px-6 py-10">{children}</main>
        <footer className="mt-16 border-t border-line">
          <div className="mx-auto max-w-[1320px] px-6 py-8 text-xs text-ink-soft">
            Selah · 五饼二鱼敬拜队 · 2026
          </div>
        </footer>
      </body>
    </html>
  )
}
