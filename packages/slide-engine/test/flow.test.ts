import { describe, it, expect } from 'vitest'
import { parseFlow, expandFlow, pruneFlow, FlowError } from '../src/flow.js'
import type { Song } from '../src/types.js'

const song: Song = {
  id: 's1', title: 't', pinyinOverrides: {}, defaultFlow: 'V1 C V2 C B C',
  sections: [
    { id: 'V1', type: 'verse', lines: [{ zh: '一', pinyin: [] }] },
    { id: 'V2', type: 'verse', lines: [{ zh: '二', pinyin: [] }] },
    { id: 'C', type: 'chorus', lines: [{ zh: '三', pinyin: [] }] },
    { id: 'B', type: 'bridge', lines: [{ zh: '四', pinyin: [] }] },
  ],
}
const ids = (steps: ReturnType<typeof expandFlow>) => steps.map((s) => (s.kind === 'section' ? s.sectionId : 'I'))

describe('parseFlow', () => {
  it('normalises spaced tokens', () => {
    expect(parseFlow('v1, c  v2 → c B c')).toEqual(['V1', 'C', 'V2', 'C', 'B', 'C'])
  })
  it('expands compact form with auto-incrementing verses', () => {
    expect(parseFlow('VCVCBC')).toEqual(['V', 'C', 'V', 'C', 'B', 'C'])
    expect(parseFlow('V1CV2C')).toEqual(['V1', 'C', 'V2', 'C'])
    expect(parseFlow('VPB')).toEqual(['V', 'PC', 'B'])
    expect(parseFlow('P')).toEqual(['PC'])
    expect(parseFlow('PCB')).toEqual(['PC', 'B'])
  })
  it('handles repeat suffixes and tokens', () => {
    expect(parseFlow('V1 Cx2 B C ×2')).toEqual(['V1', 'C', 'C', 'B', 'C', 'C'])
  })
})

describe('expandFlow', () => {
  it('resolves exact ids', () => {
    expect(ids(expandFlow(song, 'V1 C V2 C B C'))).toEqual(['V1', 'C', 'V2', 'C', 'B', 'C'])
  })
  it('resolves bare V in order and wraps', () => {
    expect(ids(expandFlow(song, 'V C V C V'))).toEqual(['V1', 'C', 'V2', 'C', 'V1'])
  })
  it('resolves compact form', () => {
    expect(ids(expandFlow(song, 'VCVCBC'))).toEqual(['V1', 'C', 'V2', 'C', 'B', 'C'])
  })
  it('emits blank steps for I', () => {
    expect(ids(expandFlow(song, 'I V1 C'))).toEqual(['I', 'V1', 'C'])
  })
  it('throws a helpful FlowError for unknown sections', () => {
    expect(() => expandFlow(song, 'V1 C V3')).toThrowError(FlowError)
    try { expandFlow(song, 'V1 C V3') } catch (e) {
      const err = e as FlowError
      expect(err.index).toBe(2)
      expect(err.token).toBe('V3')
      expect(err.message).toContain('V3')
      expect(err.message).toContain('V1, V2, C, B')
    }
  })
  it('rejects empty flow', () => {
    expect(() => expandFlow(song, '  ')).toThrowError(FlowError)
  })
})

describe('parseFlow repeat limits', () => {
  it('rejects a repeat count outside 1–20', () => {
    for (const input of ['Cx0', 'Cx21', 'V1 C x0', 'V1 C x21']) {
      expect(() => parseFlow(input), input).toThrowError(FlowError)
    }
    try {
      parseFlow('Cx0')
      expect.unreachable('Cx0 must throw')
    } catch (e) {
      const err = e as FlowError
      expect(err.message).toBe('重复次数必须在 1 到 20 之间')
      expect(err.index).toBe(0)
      expect(err.token).toBe('CX0')
    }
  })
  it('accepts the 1 and 20 boundaries', () => {
    expect(parseFlow('Cx1')).toEqual(['C'])
    expect(parseFlow('Cx20')).toHaveLength(20)
    expect(parseFlow('C x20')).toHaveLength(20)
  })
  it('rejects a repeat token with nothing in front of it', () => {
    expect(() => parseFlow('x2')).toThrowError(FlowError)
    expect(() => parseFlow('×2 C')).toThrowError(FlowError)
  })
  it('rejects a flow longer than 200 sections', () => {
    const tooLong = Array.from({ length: 11 }, () => 'Cx20').join(' ')
    expect(() => parseFlow(tooLong)).toThrowError(FlowError)
    try {
      parseFlow(tooLong)
      expect.unreachable('220 sections must throw')
    } catch (e) {
      expect((e as FlowError).message).toBe('flow 太长（最多 200 段）')
    }
    expect(parseFlow(Array.from({ length: 10 }, () => 'Cx20').join(' '))).toHaveLength(200)
  })
})

describe('pruneFlow', () => {
  it('drops tokens for sections the song no longer has, keeps the rest in order', () => {
    const withoutB = { ...song, sections: song.sections.filter((s) => s.id !== 'B') }
    expect(pruneFlow(withoutB, ['V1', 'C', 'B', 'C', 'V3', 'I', 'V'])).toEqual(['V1', 'C', 'C', 'I', 'V'])
  })
})

describe('V and V1 name the same lone verse', () => {
  const lone: Song = { ...song, sections: [{ id: 'V', type: 'verse', lines: [{ zh: '一', pinyin: [] }] }, song.sections[2]!] }
  it('resolves an old V1 token to V', () => {
    expect(expandFlow(lone, 'V1 C V1')).toEqual([
      { kind: 'section', sectionId: 'V' }, { kind: 'section', sectionId: 'C' }, { kind: 'section', sectionId: 'V' },
    ])
    expect(pruneFlow(lone, ['V1', 'C', 'V2'])).toEqual(['V1', 'C'])
  })
})
