import { generateText, Output } from 'ai'
import { z } from 'zod'

// A photographed page can take a while to read; the default 10s is too tight.
export const maxDuration = 60

/** Overridable so a cheaper or newer model is one env var away. */
const MODEL = process.env.SELAH_OCR_MODEL || 'anthropic/claude-sonnet-5'

// The browser shrinks every page to a JPEG first, so these only stop abuse.
const MAX_FILES = 4
const MAX_BYTES = 4_000_000

const requestSchema = z.object({
  files: z.array(z.string().regex(/^data:(image\/(jpeg|png|webp|gif)|application\/pdf);base64,/)).min(1).max(MAX_FILES),
})

const TAG = /^(V\d+|C\d*|PC\d*|B\d*|E|T)$/

const resultSchema = z.object({
  title: z.string().describe('歌名，按歌谱上印的写'),
  artist: z.string().nullable().describe('词曲作者或出处；没有就 null'),
  key: z.string().nullable().describe('调性，例如 "E"、"G"、"Bb"；简谱写 1=G 就是 "G"'),
  sections: z.array(z.object({
    tag: z.string().describe('V1/V2/… 主歌，C 副歌，PC 导歌，B 桥段，E 尾声'),
    lines: z.array(z.string()).describe('这一段的歌词，每个乐句一行'),
  })),
  flow: z.array(z.string()).describe('按反复记号、1./2. 房子展开后的演唱顺序，用 tag 表示'),
})
export type RecognizeResult = z.infer<typeof resultSchema>

const PROMPT = `这是一首敬拜诗歌的歌谱（五线谱或简谱，可能有多页）。请把它转成投影用的歌词。

规则：
- 只要歌词。忽略音符、简谱数字、和弦（如 E、C#m7、B/D#）、速度、小节号、页脚的制谱信息。
- 歌词逐字照抄歌谱上的字，繁体就写繁体，简体就写简体，不要改写、不要补字，也不要加标点。
- 一行 = 一个乐句，通常 4 到 12 个字。按旋律的自然停顿断行，不要按歌谱的排版换行。
- 同一段旋律下面印了几行歌词（第 1、2、3… 节），每一节是一个单独的主歌：V1、V2、V3…
- 反复记号、1./2. 房子、D.S.、Fine 要展开成真实的演唱顺序，写进 flow。重复唱的段落在 sections 里只出现一次。
- 能看出副歌（通常是情绪最高、最常重复的部分）就标 C，前面引向副歌的短段标 PC，只唱一次的对比段落标 B。
  分不清就都用 V1、V2…，不要硬猜。
- 1./2. 房子里只差最后几个字的，把两个结尾分别放进各自的段落里，不要丢字。
- title 用歌谱上的歌名；key 优先看"1=X"，否则看调号和第一个和弦。`

function friendly(e: unknown): string {
  const text = e instanceof Error ? `${e.message} ${String((e as { responseBody?: unknown }).responseBody ?? '')}` : String(e)
  if (/credit card|customer_verification/i.test(text)) return '识别服务还没开通：需要在 Vercel 的 AI Gateway 里绑卡解锁免费额度。'
  if (/insufficient|quota|credits/i.test(text)) return '这个月的免费识别额度用完了，先用粘贴歌词。'
  if (/rate.?limit|429/i.test(text)) return '识别请求太多了，等一分钟再试。'
  return '没能识别这份歌谱。换一张更清楚的照片，或者先粘贴歌词。'
}

export async function POST(req: Request) {
  const raw = await req.text()
  if (raw.length > MAX_BYTES) return Response.json({ ok: false, message: '图片太大了，一次最多 4 页。' }, { status: 413 })

  let body: unknown = null
  try { body = JSON.parse(raw) } catch { /* reported below */ }
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) return Response.json({ ok: false, message: '只能识别图片或 PDF，一次最多 4 页。' }, { status: 400 })

  try {
    const { output } = await generateText({
      model: MODEL,
      output: Output.object({ schema: resultSchema }),
      messages: [{
        role: 'user',
        content: [
          ...parsed.data.files.map((url) => {
            const mediaType = url.slice(5, url.indexOf(';'))
            return { type: 'file' as const, mediaType, data: url }
          }),
          { type: 'text' as const, text: PROMPT },
        ],
      }],
    })

    // Keep only well-formed sections and a flow that refers to them.
    const sections = output.sections
      .map((s) => ({ tag: s.tag.trim().toUpperCase(), lines: s.lines.map((l) => l.trim()).filter(Boolean) }))
      .filter((s) => TAG.test(s.tag) && s.lines.length > 0)
    if (sections.length === 0) return Response.json({ ok: false, message: '这张图里没找到歌词。' }, { status: 422 })
    const tags = new Set(sections.map((s) => s.tag))
    const flow = output.flow.map((t) => t.trim().toUpperCase()).filter((t) => tags.has(t))

    const result: RecognizeResult = {
      title: output.title.trim(),
      artist: output.artist?.trim() || null,
      key: output.key?.trim() || null,
      sections,
      flow: flow.length ? flow : sections.map((s) => s.tag),
    }
    return Response.json({ ok: true, result })
  } catch (e) {
    console.error('recognize failed', e)
    return Response.json({ ok: false, message: friendly(e) }, { status: 502 })
  }
}
