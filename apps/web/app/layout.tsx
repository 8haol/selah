import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = { title: 'Selah', description: '教会工具平台' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">
        <header className="sticky top-0 z-20 border-b border-line bg-card/80 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-5">
            <Link href="/" className="text-lg font-semibold tracking-wide">Selah</Link>
            <nav className="flex items-center gap-4 text-sm text-ink-soft">
              <Link href="/worship" className="hover:text-ink">敬拜投影</Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
      </body>
    </html>
  )
}
