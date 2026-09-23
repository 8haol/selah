import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Selah', template: '%s · Selah' },
  description: '敬拜投影片，一分钟做好。粘贴歌词或上传文件，自动分段、加拼音、排好版式。',
}

/**
 * No global chrome. The landing page carries its own nav and footer, the app
 * screens sit inside the sidebar shell, and the setlist editor is full-bleed —
 * so a header here would have to be undone on every route.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        {/* Only the weights the UI uses: Noto Sans SC 400–700, the wordmark's 700, mono 400/500.
            The stylesheet blocks first paint and every CJK weight adds ~100 unicode-range
            rules to it, so an unused weight is a real cost, not a free extra. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;600;700&family=Bricolage+Grotesque:opsz,wght@12..96,700&family=JetBrains+Mono:wght@400;500&display=swap"
        />
      </head>
      <body className="min-h-screen bg-surface font-sans text-ink">{children}</body>
    </html>
  )
}
