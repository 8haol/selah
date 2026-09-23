import { deckThemeIds, getTheme, type RenderAssets, type SlideDeck, type ThemeAssets } from '@selah/slide-engine'

async function fetchAsset(url: string): Promise<{ dataUrl: string; bytes: number }> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`主题素材加载失败（${res.status}）`)
  const blob = await res.blob()
  // a rewritten 200 (an HTML error page, say) would otherwise be embedded as the background
  if (!blob.type.startsWith('image/') && !blob.type.startsWith('video/')) throw new Error('主题素材类型不正确')
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
  return { dataUrl, bytes: blob.size }
}

/**
 * Load every background the deck needs, straight from the browser — a deck
 * whose songs use different themes needs one set per theme. `onNote` reports
 * the big video downloads so the button can say why it is taking a while.
 */
export async function fetchDeckAssets(deck: SlideDeck, onNote?: (note: string) => void): Promise<RenderAssets> {
  const byTheme: Record<string, ThemeAssets> = {}
  for (const id of deckThemeIds(deck)) {
    const theme = getTheme(id)
    const bg = theme.background
    const poster = await fetchAsset(bg.kind === 'video' ? bg.poster : bg.src)
    let videoDataUrl: string | undefined
    if (bg.kind === 'video') {
      const video = await fetchAsset(bg.src)
      videoDataUrl = video.dataUrl
      onNote?.(`动态主题「${theme.name}」约 ${Math.max(1, Math.round(video.bytes / 1024 / 1024))} MB，生成中…`)
    }
    byTheme[id] = { backgroundDataUrl: poster.dataUrl, videoDataUrl }
  }
  return { ...byTheme[deck.themeId]!, byTheme }
}
