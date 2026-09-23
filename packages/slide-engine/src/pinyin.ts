import { pinyin, polyphonic } from 'pinyin-pro'
import type { Song } from './types'

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
]

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
  const all = pinyin(zh, {
    type: 'all',
    toneType: 'symbol',
    nonZh: 'spaced',
  }) as PinyinEntry[]

  const aligned = all.length === chars.length
  const out = chars.map((char, index) => {
    if (!isChinese(char)) return ''
    const base = aligned ? (all[index]?.pinyin ?? '') : pinyin(char, { toneType: 'symbol' })
    return CHURCH_CHAR_READINGS[char] ?? base
  })

  applyChurchWords(chars, out)

  // A song's own overrides are the last word — they beat the church defaults too.
  return out.map((reading, index) => {
    const char = chars[index]!
    if (!isChinese(char)) return ''
    return overrides[char] ?? reading
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
