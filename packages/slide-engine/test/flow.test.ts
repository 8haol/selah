import { describe, it, expect } from 'vitest'
import { parseFlow, expandFlow, FlowError } from '../src/flow.js'
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
