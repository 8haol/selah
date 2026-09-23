import { pinyin, polyphonic } from 'pinyin-pro'
import type { LyricLine, Song } from './types'

const CJK = /\p{Script=Han}/u

interface PinyinEntry {
  pinyin: string
}

/**
 * Characters the dictionary reads one way and Chinese Christian texts another.
 *
 * 祢 (and the variants 袮 / 禰) is the reverent second-person pronoun for God —
 * always nǐ in a hymn. pinyin-pro only carries the ancestral-shrine reading mí
 * and does not even list nǐ as a second reading, so neither the automatic pass
 * nor the polyphonic picker could reach it.
 */
export const CHURCH_CHAR_READINGS: Record<string, string> = {
  祢: 'nǐ',
  袮: 'nǐ',
  禰: 'nǐ',
}

/**
 * Words the dictionary mis-reads in hymn context. Matched left to right against
 * the line, so a word beats the per-character table above.
 */
const CHURCH_WORDS: Array<[string, string[]]> = [
  ['数算', ['shǔ', 'suàn']],   // 数算主恩 — to count over, not shù
  ['數算', ['shǔ', 'suàn']],
  ['應許', ['yīng', 'xǔ']],     // the traditional form loses the tone on 許
  ['得着', ['dé', 'zháo']],     // 得着能力 — to obtain, not the aspect particle
  ['得著', ['dé', 'zháo']],
  ['睡着', ['shuì', 'zháo']],
  ['睡著', ['shuì', 'zháo']],
]

/**
 * In traditional-script hymns 著 is almost always the character simplified
 * script writes 着 (爱著你, 带著, 得著), which pinyin-pro reads zhù. Read it as
 * 着 unless it sits in one of the few words that really are zhù.
 */
const ZHU_WORDS = /显著|顯著|著名|著作|著述|名著|原著|巨著|编著|編著|昭著|卓著|著称|著稱/g

function asZhe(zh: string): string {
  if (!zh.includes('著')) return zh
  const keep = new Set<number>()
  for (const m of zh.matchAll(ZHU_WORDS)) {
    const at = [...zh.slice(0, m.index)].length
    ;[...m[0]].forEach((c, k) => { if (c === '著') keep.add(at + k) })
  }
  return [...zh].map((c, i) => (c === '著' && !keep.has(i) ? '着' : c)).join('')
}

/** Key for a reading that applies to one spot only: this character, at this index, in this line. */
export function spotKey(zh: string, index: number): string {
  return `${zh.trimEnd()}|${index}`
}

export function isChinese(char: string): boolean {
  return CJK.test(char)
}

/** Overwrites `out[i]` for every occurrence of a mis-read word in `chars`. */
function applyChurchWords(chars: string[], out: string[]): void {
  for (const [word, readings] of CHURCH_WORDS) {
    const wordChars = [...word]
    for (let i = 0; i + wordChars.length <= chars.length; i += 1) {
      if (wordChars.every((c, k) => chars[i + k] === c)) {
        readings.forEach((reading, k) => { out[i + k] = reading })
      }
    }
  }
}

export function annotateLine(zh: string, overrides: Record<string, string> = {}): string[] {
  const chars = [...zh]
  const all = pinyin(asZhe(zh), {
    type: 'all',
    toneType: 'symbol',
    nonZh: 'spaced',
  }) as PinyinEntry[]

  const aligned = all.length === chars.length
  const out = chars.map((char, index) => {
    if (!isChinese(char)) return ''
    const base = aligned ? (all[index]?.pinyin ?? '') : pinyin(asZhe(char), { toneType: 'symbol' })
    return CHURCH_CHAR_READINGS[char] ?? base
  })

  applyChurchWords(chars, out)

  // A song's own overrides are the last word — they beat the church defaults too.
  // One spot (this character in this line) beats the character everywhere.
  return out.map((reading, index) => {
    const char = chars[index]!
    if (!isChinese(char)) return ''
    return overrides[spotKey(zh, index)] ?? overrides[char] ?? reading
  })
}

export function annotateSong(song: Song): Song {
  return {
    ...song,
    sections: song.sections.map((section) => ({
      ...section,
      lines: section.lines.map((line) => ({
        ...line,
        pinyin: annotateLine(line.zh, song.pinyinOverrides),
      })),
    })),
  }
}

export function polyphonicChoices(char: string): string[] {
  if (!isChinese(char)) return []

  const readings = polyphonic(char, {
    type: 'array',
    toneType: 'symbol',
  }) as unknown as string[] | string[][]
  const flat = Array.isArray(readings[0]) ? (readings as string[][]).flat() : (readings as string[])

  // The church reading leads, so the picker opens on what the song actually uses.
  const church = CHURCH_CHAR_READINGS[char]
  return [...new Set(church ? [church, ...flat] : flat)].filter(Boolean)
}

export function joinPinyin(pinyinArr: string[]): string {
  return pinyinArr.filter(Boolean).join(' ')
}

const SYLLABLE = /^(?:zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?(?:a|o|e|ai|ei|ao|ou|an|en|ang|eng|ong|er|i|ia|ie|iao|iu|ian|in|iang|ing|iong|u|ua|uo|uai|ui|uan|un|uang|ue|v|ve)$/

/**
 * Whether `line` is the pinyin printed under the Chinese line `zh` — lyric
 * sheets copied from YouTube and the like often carry one under every line.
 * Every word has to be a pinyin syllable, and either there is one per Chinese
 * character or the tone marks give it away; English lyrics are neither.
 */
export function isPinyinFor(zh: string, line: string): boolean {
  const han = [...zh].filter(isChinese).length
  if (han === 0 || CJK.test(line)) return false
  const nfd = line.normalize('NFD').toLowerCase()
  const toned = /[\u0300\u0301\u030c\u0304]/.test(nfd)
  const words = nfd.replace(/\p{M}/gu, '').replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean)
  if (words.length === 0 || !words.every((w) => SYLLABLE.test(w))) return false
  return words.length === han || toned
}

/** The same line with its pinyin row blanked — the 显示拼音 switch, off. */
export function stripPinyin(line: LyricLine): LyricLine {
  return { ...line, pinyin: line.pinyin.map(() => '') }
}
