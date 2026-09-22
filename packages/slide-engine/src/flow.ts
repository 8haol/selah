import type { SectionType, Song } from './types.js'

export class FlowError extends Error {
  constructor(message: string, public index: number, public token: string) {
    super(message)
    this.name = 'FlowError'
  }
}

export type FlowStep = { kind: 'section'; sectionId: string } | { kind: 'blank'; label: 'INTRO' }

const PREFIX_TYPE: Record<string, SectionType> = { V: 'verse', C: 'chorus', B: 'bridge', PC: 'prechorus', I: 'intro', E: 'ending', T: 'tag' }
const REPEAT = /^[x×*](\d+)$/i

function expandRepeat(tokens: string[], tok: string, out: string[]): boolean {
  const m = tok.match(REPEAT)
  if (!m) return false
  const n = Number(m[1])
  const prev = out[out.length - 1]
  if (prev === undefined) return true
  for (let i = 1; i < n; i++) out.push(prev)
  return true
}

export function parseFlow(input: string): string[] {
  const trimmed = input.trim()
  if (!trimmed) return []
  const compact = /^((PC|[VCBPIET])\d?)+$/i.test(trimmed) && !/\s/.test(trimmed)
  if (compact) {
    const out: string[] = []
    for (const m of trimmed.toUpperCase().matchAll(/(PC|[VCBIET])(\d?)/g)) {
      const letter = m[1] === 'P' ? 'PC' : m[1]!
      out.push(letter + (m[2] ?? ''))
    }
    return out
  }
  const raw = trimmed.split(/[\s,，→>\-]+/).filter(Boolean)
  const out: string[] = []
  for (const r of raw) {
    const tok = r.toUpperCase()
    if (expandRepeat(raw, tok, out)) continue
    const suffix = tok.match(/^([A-Z]+\d*)[X×*](\d+)$/)
    if (suffix) {
      const base = suffix[1]!, n = Number(suffix[2])
      for (let i = 0; i < n; i++) out.push(base)
      continue
    }
    out.push(tok === 'P' ? 'PC' : tok)
  }
  return out
}

export function describeFlow(song: Song): string {
  return `可用段落：${song.sections.map((s) => s.id).join(', ')}`
}

export function expandFlow(song: Song, input: string): FlowStep[] {
  const tokens = parseFlow(input)
  if (tokens.length === 0) throw new FlowError('flow 不能为空。' + describeFlow(song), 0, '')
  const verses = song.sections.filter((s) => s.type === 'verse')
  let verseCursor = 0
  const steps: FlowStep[] = []
  tokens.forEach((tok, index) => {
    if (tok === 'I') { steps.push({ kind: 'blank', label: 'INTRO' }); return }
    const exact = song.sections.find((s) => s.id === tok)
    if (exact) { steps.push({ kind: 'section', sectionId: exact.id }); if (exact.type === 'verse') verseCursor = verses.indexOf(exact) + 1; return }
    const m = tok.match(/^([A-Z]+)(\d*)$/)
    const type = m ? PREFIX_TYPE[m[1]!] : undefined
    if (type && !m![2]) {
      if (type === 'verse' && verses.length) {
        const v = verses[verseCursor % verses.length]!
        verseCursor++
        steps.push({ kind: 'section', sectionId: v.id }); return
      }
      const ofType = song.sections.filter((s) => s.type === type)
      const pick = ofType.find((s) => /^[A-Z]+$/.test(s.id)) ?? ofType.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))[0]
      if (pick) { steps.push({ kind: 'section', sectionId: pick.id }); return }
    }
    throw new FlowError(`第 ${index + 1} 个段落 "${tok}" 不存在。${describeFlow(song)}`, index, tok)
  })
  return steps
}
