import { pinyin, polyphonic } from 'pinyin-pro'
import type { Song } from './types.js'

const CJK = /\p{Script=Han}/u

interface PinyinEntry {
  pinyin: string
}

export function isChinese(char: string): boolean {
  return CJK.test(char)
}

export function annotateLine(zh: string, overrides: Record<string, string> = {}): string[] {
  const chars = [...zh]
  const all = pinyin(zh, {
    type: 'all',
    toneType: 'symbol',
    nonZh: 'spaced',
  }) as PinyinEntry[]

  if (all.length === chars.length) {
    return chars.map((char, index) => {
      if (!isChinese(char)) return ''
      return overrides[char] ?? all[index]?.pinyin ?? ''
    })
  }

  return chars.map((char) => {
    if (!isChinese(char)) return ''
    return overrides[char] ?? pinyin(char, { toneType: 'symbol' })
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

  return [...new Set(flat)].filter(Boolean)
}

export function joinPinyin(pinyinArr: string[]): string {
  return pinyinArr.filter(Boolean).join(' ')
}
