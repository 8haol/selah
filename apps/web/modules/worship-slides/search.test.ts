import { describe, it, expect } from 'vitest'
import { buildSearchKey } from './search'

describe('buildSearchKey', () => {
  it('includes full pinyin, initials, original title and artist, lowercased without spaces', () => {
    const k = buildSearchKey({ title: '耶和华是我的牧者', artist: 'Psalm 23' })
    expect(k).toContain('yehehuashiwodemuzhe')
    expect(k).toContain('yhhswdmz')
    expect(k).toContain('耶和华是我的牧者')
    expect(k).toContain('psalm23')
    expect(k).toBe(k.toLowerCase())
  })
})
