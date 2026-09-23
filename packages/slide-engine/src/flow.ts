import type { SectionType, Song } from './types'

export class FlowError extends Error {
  constructor(message: string, public index: number, public token: string) {
    super(message)
    this.name = 'FlowError'
  }
}

export type FlowStep = { kind: 'section'; sectionId: string } | { kind: 'blank'; label: 'INTRO' }

const PREFIX_TYPE: Record<string, SectionType> = { V: 'verse', C: 'chorus', B: 'bridge', PC: 'prechorus', I: 'intro', E: 'ending', T: 'tag' }
const REPEAT = /^[x×*](\d+)$/i

/** A `x3` / `Cx3` repeat has to stay a plausible arrangement, not a paste accident. */
export const MIN_REPEAT = 1
export const MAX_REPEAT = 20
/** Hard ceiling on the expanded flow, so one typo cannot build a 10 000-slide deck. */
export const MAX_FLOW_STEPS = 200

function checkRepeat(n: number, index: number, token: string): void {
  if (n < MIN_REPEAT || n > MAX_REPEAT) {
    throw new FlowError(`重复次数必须在 ${MIN_REPEAT} 到 ${MAX_REPEAT} 之间`, index, token)
  }
}

function checkLength(out: string[]): string[] {
  if (out.length > MAX_FLOW_STEPS) throw new FlowError(`flow 太长（最多 ${MAX_FLOW_STEPS} 段）`, 0, '')
  return out
}

function expandRepeat(tok: string, out: string[], index: number): boolean {
  const m = tok.match(REPEAT)
  if (!m) return false
  const n = Number(m[1])
  checkRepeat(n, index, tok)
  const prev = out[out.length - 1]
  if (prev === undefined) throw new FlowError('重复符号前面要先有一个段落', index, tok)
  for (let i = 1; i < n; i++) out.push(prev)
  return true
}

export function parseFlow(input: string): string[] {
  const trimmed = input.trim()
  if (!trimmed) return []
  const compact = /^((PC|[VCBPIET])\d?)+$/i.test(trimmed) && !/\s/.test(trimmed)
  if (compact) {
    const out: string[] = []
    for (const m of trimmed.toUpperCase().matchAll(/(PC|P|[VCBIET])(\d?)/g)) {
      const letter = m[1] === 'P' ? 'PC' : m[1]!
      out.push(letter + (m[2] ?? ''))
    }
    return checkLength(out)
  }
  const raw = trimmed.split(/[\s,，→>\-]+/).filter(Boolean)
  const out: string[] = []
  raw.forEach((r, index) => {
    const tok = r.toUpperCase()
    if (expandRepeat(tok, out, index)) return
    const suffix = tok.match(/^([A-Z]+\d*)[X×*](\d+)$/)
    if (suffix) {
      const base = suffix[1]!, n = Number(suffix[2])
      checkRepeat(n, index, tok)
      for (let i = 0; i < n; i++) out.push(base)
      return
    }
    out.push(tok === 'P' ? 'PC' : tok)
  })
  return checkLength(out)
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

/**
 * Drop the flow tokens that no longer name anything in the song — a section
 * deleted in the editor — so one stale token cannot break every later build.
 */
export function pruneFlow(song: Song, tokens: string[]): string[] {
  return tokens.filter((tok) => {
    if (tok === 'I' || song.sections.some((s) => s.id === tok)) return true
    const m = tok.match(/^([A-Z]+)$/)
    const type = m ? PREFIX_TYPE[m[1]!] : undefined
    return type !== undefined && song.sections.some((s) => s.type === type)
  })
}
