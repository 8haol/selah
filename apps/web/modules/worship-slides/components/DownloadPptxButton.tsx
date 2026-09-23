'use client'
import { useState } from 'react'
import { getTheme, renderPptxBytes, deckFileName, type SlideDeck } from '@selah/slide-engine'
import { Button } from './ui'

async function fetchAsset(url: string): Promise<{ dataUrl: string; bytes: number }> {
  const blob = await (await fetch(url)).blob()
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(blob)
  })
  return { dataUrl, bytes: blob.size }
}

export function DownloadPptxButton({ deck, titles, variant = 'primary' }: { deck: SlideDeck; titles: string[]; variant?: 'primary' | 'ghost' }) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const run = async () => {
    setBusy(true); setError(null); setNote(null)
    try {
      const theme = getTheme(deck.themeId)
      const bg = theme.background
      const background = await fetchAsset(bg.kind === 'video' ? bg.poster : bg.src)
      let videoDataUrl: string | undefined
      if (bg.kind === 'video') {
        const video = await fetchAsset(bg.src)
        videoDataUrl = video.dataUrl
        setNote(`视频主题文件较大（约 ${Math.max(1, Math.round(video.bytes / 1024 / 1024))} MB），生成中…`)
      }
      const bytes = await renderPptxBytes(deck, { backgroundDataUrl: background.dataUrl, videoDataUrl })
      // lib.dom types BlobPart as ArrayBufferView<ArrayBuffer>; JSZip's Uint8Array is over ArrayBufferLike
      const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob); a.download = deckFileName(deck, titles); a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false); setNote(null) }
  }
  return (
    <div>
      <Button variant={variant} onClick={run} disabled={busy || deck.slides.length === 0}>{busy ? '生成中…' : '下载 PPTX'}</Button>
      {busy && note && <p className="mt-2 text-xs text-ink-soft">{note}</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}
