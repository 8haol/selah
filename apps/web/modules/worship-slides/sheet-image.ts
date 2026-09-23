/**
 * Turn whatever the phone or scanner produced into something the recognizer
 * accepts: every image becomes a white-backed JPEG no longer than 2000px on
 * its long side (plenty to read lyrics, small enough to upload fast), and a
 * PDF passes through as is.
 */

const LONG_SIDE = 2000
const MAX_PDF_BYTES = 3_000_000

export const SHEET_ACCEPT = 'image/*,.heic,.heif,.avif,.bmp,.tif,.tiff,application/pdf,.pdf'

const isPdf = (f: File) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name)
const isHeic = (f: File) => /hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name)

export function isSheetFile(f: File): boolean {
  return isPdf(f) || f.type.startsWith('image/') || /\.(heic|heif|avif|bmp|tiff?|jpe?g|png|webp|gif)$/i.test(f.name)
}

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

/** Browsers decode most formats natively; Chrome and Firefox still can't read iPhone HEIC. */
async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file)
  } catch (e) {
    if (!isHeic(file)) throw e
    const { default: heic2any } = await import('heic2any')
    const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 })
    return createImageBitmap(Array.isArray(out) ? out[0]! : out)
  }
}

export async function prepareSheet(file: File): Promise<string> {
  if (isPdf(file)) {
    if (file.size > MAX_PDF_BYTES) throw new Error(`${file.name} 太大了（PDF 最多 3MB），可以截图后上传`)
    return readAsDataUrl(file.type ? file : new Blob([file], { type: 'application/pdf' }))
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await decode(file)
  } catch {
    throw new Error(`读不了 ${file.name}，换成 JPG 或 PNG 试试`)
  }
  const scale = Math.min(1, LONG_SIDE / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff' // transparent PNGs would otherwise turn black
  ctx.fillRect(0, 0, w, h)
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.85)
}
