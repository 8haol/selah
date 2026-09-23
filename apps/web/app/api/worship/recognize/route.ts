import { generateText, Output } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'

// Reading a dense page with reasoning on takes 20–50s.
export const maxDuration = 120

/**
 * Recognition runs on the church's own OpenAI key and nothing else, so the
 * only money it can spend is that account's prepaid balance. When the balance
 * is gone OpenAI refuses the call and the page says so.
 */
// Picked on 2026-09-23 against two real sheets: the only one of six that read
// every stanza and repeat right on every run, at 12–31s a page.
const MODEL = process.env.SELAH_OCR_MODEL || 'gpt-5.6-sol'
const EFFORT = (process.env.SELAH_OCR_EFFORT || 'medium') as 'low' | 'medium' | 'high'

// The browser shrinks every page to a JPEG first, so these only stop abuse.
const MAX_FILES = 4
const MAX_BYTES = 4_000_000

const requestSchema = z.object({
  files: z.array(z.string().regex(/^data:(image\/(jpeg|png|webp|gif)|application\/pdf);base64,/)).min(1).max(MAX_FILES),
})

const TAG = /^(V\d*|C\d*|PC\d*|B\d*|E\d*|T)$/

const resultSchema = z.object({
  title: z.string().describe('歌名，按歌谱上印的写'),
  artist: z.string().nullable().describe('出处和词曲作者，例如 "赞美之泉 · 游智婷"；都没有就 null'),
  sections: z.array(z.object({
    tag: z.string().describe('V 主歌（多节时 V1/V2/…），C 副歌，PC 导歌，B 桥段，E 尾声'),
    lines: z.array(z.string()).describe('这一段的歌词，每个乐句一行，带中文标点'),
  })),
  flow: z.array(z.string()).describe('按反复记号、1./2. 房子展开后的演唱顺序，用 tag 表示'),
})
export type RecognizeResult = z.infer<typeof resultSchema>

const PROMPT = `这是一首敬拜诗歌的歌谱（五线谱或简谱，可能有多页）。请把它转成投影用的歌词。

读歌词：
- 只要歌词。忽略音符、简谱数字、和弦（如 E、C#m7、B/D#）、速度、小节号、页脚的制谱信息。
- 逐字照抄歌谱上的字：繁体就写繁体，简体就写简体，不改写、不补字。
- 多节歌词：一行旋律下面印了几行字，就是第 1、2、3… 节。每一节都要沿着"同一行"跨过所有谱行读下去——
  第 1 节 = 每个谱行下面第 1 行歌词依次接起来，第 2 节 = 每个谱行下面第 2 行，以此类推。绝不能把不同行的字混在一起。
  每一节是一个单独的段落：V1、V2、V3…；只有一节主歌就标 V。
- 读完以后自己检查一遍：每一节的字数应该和旋律的音符数大致相同，几节之间字数也应该差不多。

分行：
- 一行是投影片上的一行，一般 5 到 12 个字，通常对应一个完整乐句（大约两小节）。
- 不要拆成两三个字的碎片；乐句中间的短停顿不要换行。

标点：
- 投影歌词要带中文全角标点。歌谱上印了标点就照抄；没印的，按歌词的意思补上：
  一行中间的停顿用逗号（，），一行末尾用逗号，一段最后一句用句号（。），呼喊或赞美用感叹号（！），问句用问号（？）。
  例如"每个狂风暴雨里，你同在在那里，"、"我爱你，用尽我全心。"。
- 只用 ，。！？、；： 这几种，不要用空格代替标点。

分段和顺序：
- 反复记号（‖: :‖）里的段落要唱两遍，1./2. 房子、D.S.、Fine 也要展开，按真实演唱顺序写进 flow。重复唱的段落在 sections 里只写一次。
- 反复之后出现的新旋律、情绪最高、歌词里常有"我心""主啊"这类呼喊的部分，通常是副歌，标 C。
  引向副歌的短段标 PC，只唱一次的对比段落标 B，结尾额外的一句标 E。只有多节同旋律的诗歌才全部用 V1、V2…
- 1./2. 房子里只差几个字的，把各自结尾的字放进各自的段落，不要丢字。

其他：
- title 用歌谱上的歌名。
- artist：出处（出版的团体或专辑，例如"赞美之泉""约书亚乐团""泥土音乐""小羊诗歌"）在前，词曲作者的名字在后，用" · "隔开，
  例如"赞美之泉 · 游智婷"。词和曲是不同的人就都写上（"赞美之泉 · 词：张清芳 / 曲：游智婷"可以简化成"赞美之泉 · 张清芳 / 游智婷"）。
  歌谱上只印了其中一样就只写那一样；都没有就 null。不要写调性、拍号、速度。
- 不需要调性。`

function friendly(e: unknown): string {
  const text = e instanceof Error ? `${e.message} ${String((e as { responseBody?: unknown }).responseBody ?? '')}` : String(e)
  if (/insufficient_quota|exceeded your current quota|billing/i.test(text)) return 'AI 额度用完了，暂时不能识别歌谱。先用「粘贴歌词」，或者请管理员充值。'
  if (/invalid_api_key|incorrect api key|401/i.test(text)) return 'AI 识别的密钥无效，请管理员检查 OPENAI_API_KEY。'
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

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return Response.json({ ok: false, message: 'AI 识别还没配置好，先用「粘贴歌词」。' }, { status: 503 })

  try {
    const { output } = await generateText({
      model: createOpenAI({ apiKey })(MODEL),
      output: Output.object({ schema: resultSchema }),
      // Reading stanzas across staff systems needs the model to think first.
      providerOptions: { openai: { reasoningEffort: EFFORT } },
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
    // Keep only well-formed sections. A repeat the model wrote out twice under
    // two tags is one section sung twice, so fold identical lyrics together.
    const sections: RecognizeResult['sections'] = []
    const alias = new Map<string, string>()
    const byText = new Map<string, string>()
    for (const s of output.sections) {
      const tag = s.tag.trim().toUpperCase()
      const lines = s.lines.map((l) => l.trim()).filter(Boolean)
      if (!TAG.test(tag) || lines.length === 0 || alias.has(tag)) continue
      // punctuation can differ between two copies of the same chorus
      const key = lines.join('').replace(/[\s，。！？、；：,.!?;:]/g, '')
      const same = byText.get(key)
      if (same) { alias.set(tag, same); continue }
      byText.set(key, tag)
      alias.set(tag, tag)
      sections.push({ tag, lines })
    }
    if (sections.length === 0) return Response.json({ ok: false, message: '这张图里没找到歌词。' }, { status: 422 })
    const flow = output.flow.map((t) => alias.get(t.trim().toUpperCase())).filter((t): t is string => !!t)

    const result: RecognizeResult = {
      title: output.title.trim(),
      artist: output.artist?.trim() || null,
      sections,
      flow: flow.length ? flow : sections.map((s) => s.tag),
    }
    return Response.json({ ok: true, result })
  } catch (e) {
    console.error('recognize failed', e)
    return Response.json({ ok: false, message: friendly(e) }, { status: 502 })
  }
}
