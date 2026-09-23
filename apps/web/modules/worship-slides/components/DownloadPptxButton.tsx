'use client'
import { useState } from 'react'
import { renderPptxBytes, deckFileName, type SlideDeck } from '@selah/slide-engine'
import { fetchDeckAssets } from '../deck-assets'
import { Button, Toast } from './ui'

export function DownloadPptxButton({ deck, titles, variant = 'primary', size = 'md' }: { deck: SlideDeck; titles: string[]; variant?: 'primary' | 'ghost'; size?: 'sm' | 'md' | 'lg' }) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const run = async () => {
    setBusy(true); setError(null); setNote(null)
    try {
      const assets = await fetchDeckAssets(deck, setNote)
      const bytes = await renderPptxBytes(deck, assets)
      // lib.dom types BlobPart as ArrayBufferView<ArrayBuffer>; JSZip's Uint8Array is over ArrayBufferLike
      const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob); a.download = deckFileName(deck, titles); a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false); setNote(null) }
  }
  return (
    <div className="space-y-2">
      <Button variant={variant} size={size} loading={busy} onClick={run} disabled={deck.slides.length === 0}>
        {busy ? '生成中' : '下载 PPTX'}
      </Button>
      {busy && note && <p className="text-xs text-ink-5">{note}</p>}
      {error && <Toast tone="danger">{error}</Toast>}
    </div>
  )
}
