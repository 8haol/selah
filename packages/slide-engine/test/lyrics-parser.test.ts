import { describe, it, expect } from 'vitest'
import { parseLyrics, sectionLabel } from '../src/lyrics-parser.js'

describe('parseLyrics', () => {
  it('splits by bracket headers and numbers verses', () => {
    const text = `[V1]\n耶和华是我的牧者\n我必不致缺乏\n\n[C]\n他使我的灵魂苏醒\n\n[V2]\n我虽然行过死荫的幽谷\n[B]\n因为你与我同在`
    const s = parseLyrics(text)
    expect(s.map((x) => x.id)).toEqual(['V1', 'C', 'V2', 'B'])
    expect(s[0]!.type).toBe('verse')
    expect(s[0]!.lines.map((l) => l.zh)).toEqual(['耶和华是我的牧者', '我必不致缺乏'])
    expect(s[1]!.type).toBe('chorus')
    expect(s[3]!.type).toBe('bridge')
  })
  it('accepts English and Chinese header words, with or without brackets', () => {
    const text = `Verse 1:\n一\n【副歌】\n二\n主歌 2\n三\nPre-Chorus\n四\n结尾\n五`
    expect(parseLyrics(text).map((x) => x.id)).toEqual(['V1', 'C', 'V2', 'PC', 'E'])
  })
  it('auto-numbers unnumbered verses and repeated choruses', () => {
    const text = `[Verse]\n一\n[Chorus]\n二\n[Verse]\n三\n[Chorus]\n四`
    expect(parseLyrics(text).map((x) => x.id)).toEqual(['V1', 'C', 'V2', 'C2'])
  })
  it('falls back to blank-line blocks as verses when there are no headers', () => {
    const text = `一\n二\n\n三\n四\n\n\n五`
    const s = parseLyrics(text)
    expect(s.map((x) => x.id)).toEqual(['V1', 'V2', 'V3'])
    expect(s[2]!.lines[0]!.zh).toBe('五')
  })
  it('trims whitespace and drops empty lines, lines start with empty pinyin', () => {
    const s = parseLyrics(`[C]\n  他使我的灵魂苏醒  \n\n   \n为自己的名引导我走义路`)
    expect(s[0]!.lines.length).toBe(2)
    expect(s[0]!.lines[0]!.pinyin).toEqual([])
  })
  it('returns [] for empty input', () => {
    expect(parseLyrics('   \n ')).toEqual([])
  })
})

describe('sectionLabel', () => {
  it('formats ids', () => {
    expect(sectionLabel('V1')).toBe('VERSE 1')
    expect(sectionLabel('C')).toBe('CHORUS')
    expect(sectionLabel('C2')).toBe('CHORUS 2')
    expect(sectionLabel('PC')).toBe('PRE-CHORUS')
    expect(sectionLabel('B')).toBe('BRIDGE')
    expect(sectionLabel('E')).toBe('ENDING')
    expect(sectionLabel('T')).toBe('TAG')
  })
})
