import { expandFlow, isPinyinFor, parseHeader, sectionIdFor, type SectionType, type Song, type SongSection } from '@selah/slide-engine'

/**
 * One block of lyrics as the import and edit screens show it: a kind
 * (Verse, Chorus…) and its lines. Blocks carry no id of their own — the id
 * comes from their kind and position, so a lone verse is V, two verses are
 * V1 and V2, and retyping or deleting a block renumbers the rest.
 */
export interface LyricBlock {
  key: string
  type: SectionType
  text: string
}

/** The kinds a block can be. Intro is left out: it has no lyrics, and I is the flow's blank-slide token. */
export const BLOCK_TYPES: Array<{ type: SectionType; label: string }> = [
  { type: 'verse', label: 'Verse' },
  { type: 'prechorus', label: 'Pre-Chorus' },
  { type: 'chorus', label: 'Chorus' },
  { type: 'bridge', label: 'Bridge' },
  { type: 'ending', label: 'Ending' },
  { type: 'tag', label: 'Tag' },
]

const TYPE_OF_PREFIX: Record<string, SectionType> = { V: 'verse', C: 'chorus', PC: 'prechorus', B: 'bridge', E: 'ending', T: 'tag' }

let seq = 0
export const newKey = () => `b${Date.now().toString(36)}${(seq++).toString(36)}`

export function newBlock(type: SectionType, text = ''): LyricBlock {
  return { key: newKey(), type, text }
}

export function typeOfTag(tag: string): SectionType {
  const m = tag.toUpperCase().match(/^([A-Z]+?)\d*$/)
  return (m && TYPE_OF_PREFIX[m[1]!]) || 'verse'
}

export function blockLines(block: LyricBlock): string[] {
  return block.text.split('\n').map((l) => l.trim()).filter(Boolean)
}

/** The section id each block saves under, in block order. */
export function blockIds(blocks: LyricBlock[]): string[] {
  const total = new Map<SectionType, number>()
  for (const b of blocks) total.set(b.type, (total.get(b.type) ?? 0) + 1)
  const seen = new Map<SectionType, number>()
  return blocks.map((b) => {
    const n = (seen.get(b.type) ?? 0) + 1
    seen.set(b.type, n)
    if (total.get(b.type) === 1) return b.type === 'verse' ? 'V' : sectionIdFor(b.type, 1)
    return sectionIdFor(b.type, n)
  })
}

/** The blocks as sections, for the order list and the pinyin check. Empty blocks are left out. */
export function blocksToSections(blocks: LyricBlock[]): SongSection[] {
  const ids = blockIds(blocks)
  return blocks
    .map((b, i) => ({ id: ids[i]!, type: b.type, lines: blockLines(b).map((zh) => ({ zh, pinyin: [] })) }))
    .filter((s) => s.lines.length > 0)
}

/** The tagged text the server's parser reads back into sections. */
export function blocksToLyricsText(blocks: LyricBlock[]): string {
  const ids = blockIds(blocks)
  return blocks
    .map((b, i) => ({ id: ids[i]!, lines: blockLines(b) }))
    .filter((s) => s.lines.length > 0)
    .map((s) => `[${s.id}]\n${s.lines.join('\n')}`)
    .join('\n\n')
}

/** Flow tokens for an order kept as block keys. Keys of empty or deleted blocks drop out. */
export function flowIds(blocks: LyricBlock[], flow: string[]): string[] {
  const ids = blockIds(blocks)
  const idOf = new Map(blocks.filter((b) => blockLines(b).length > 0).map((b) => [b.key, ids[blocks.indexOf(b)]!]))
  return flow.map((k) => idOf.get(k)).filter((id): id is string => !!id)
}

/** A saved song as blocks, with its default order as block keys. */
export function blocksFromSong(song: Song): { blocks: LyricBlock[]; flow: string[] } {
  const blocks = song.sections.map((s) => newBlock(s.type, s.lines.map((l) => l.zh).join('\n')))
  const keyOf = new Map(song.sections.map((s, i) => [s.id, blocks[i]!.key]))
  let flow: string[]
  try {
    flow = expandFlow(song, song.defaultFlow || song.sections.map((s) => s.id).join(' '))
      .flatMap((step) => (step.kind === 'section' ? [keyOf.get(step.sectionId)!] : []))
  } catch {
    flow = blocks.map((b) => b.key)
  }
  return { blocks, flow }
}

/** Recognised sections (tag + lines) and the sheet's singing order. */
export function blocksFromTagged(sections: Array<{ tag: string; lines: string[] }>, tagFlow: string[]): { blocks: LyricBlock[]; flow: string[] } {
  const blocks = sections.map((s) => newBlock(typeOfTag(s.tag), s.lines.join('\n')))
  const keyOf = new Map(sections.map((s, i) => [s.tag, blocks[i]!.key]))
  const flow = tagFlow.map((t) => keyOf.get(t)).filter((k): k is string => !!k)
  return { blocks, flow: flow.length ? flow : blocks.map((b) => b.key) }
}

/** Same words, ignoring spacing and punctuation. */
const norm = (text: string) => text.replace(/[\s，。！？、；：,.!?;:]/g, '')

/**
 * Pasted lyrics as blocks. A header line ("[副歌]", "Chorus:", "V2") starts a
 * block, and so does a blank line. A block that repeats an earlier one — the
 * same words, or just the header again — is that block sung again: it goes
 * into the order, not into a second copy. A pinyin line under a Chinese
 * line is dropped: the slides make their own.
 */
export function blocksFromText(raw: string): { blocks: LyricBlock[]; flow: string[] } {
  const chunks: Array<{ tag: string | null; lines: string[] }> = []
  let cur: { tag: string | null; lines: string[] } | null = null
  let prev = ''
  for (const rawLine of raw.replace(/\r\n?/g, '\n').split('\n')) {
    const line = rawLine.trim()
    if (!line) { cur = null; prev = ''; continue }
    if (prev && isPinyinFor(prev, line)) { prev = ''; continue }
    const head = parseHeader(line)
    if (head) {
      cur = { tag: sectionIdFor(head.type, head.number ?? 1), lines: [] }
      prev = ''
      chunks.push(cur)
      continue
    }
    if (!cur) { cur = { tag: null, lines: [] }; chunks.push(cur) }
    cur.lines.push(line)
    prev = line
  }

  const blocks: LyricBlock[] = []
  const flow: string[] = []
  const byText = new Map<string, string>()
  const byTag = new Map<string, string>()
  for (const c of chunks) {
    const text = c.lines.join('\n')
    const again = text ? byText.get(norm(text)) : c.tag ? byTag.get(c.tag) : undefined
    if (again) { flow.push(again); continue }
    if (!text) continue
    const block = newBlock(c.tag ? typeOfTag(c.tag) : 'verse', text)
    blocks.push(block)
    flow.push(block.key)
    byText.set(norm(text), block.key)
    if (c.tag) byTag.set(c.tag, block.key)
  }
  return { blocks, flow }
}
