'use client'
import { useState } from 'react'
import { getTheme, renderPptx, deckFileName, type SlideDeck } from '@selah/slide-engine'
import { Button } from './ui'

async function toDataUrl(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob()
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(blob) })
}

export function DownloadPptxButton({ deck, titles, variant = 'primary' }: { deck: SlideDeck; titles: string[]; variant?: 'primary' | 'ghost' }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const run = async () => {
    setBusy(true); setError(null)
    try {
      const theme = getTheme(deck.themeId)
      const pptx = await renderPptx(deck, { backgroundDataUrl: await toDataUrl(theme.background.src) })
      const blob = (await pptx.write({ outputType: 'blob' })) as Blob
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob); a.download = deckFileName(deck, titles); a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  return (
    <div>
      <Button variant={variant} onClick={run} disabled={busy || deck.slides.length === 0}>{busy ? '生成中…' : '下载 PPTX'}</Button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}
