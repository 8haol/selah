import { describe, it, expect } from 'vitest'
import type { SlideDeck } from '../src/index.js'

describe('types', () => {
  it('SlideDeck shape compiles', () => {
    const deck: SlideDeck = { version: 1, themeId: 'night', slides: [], meta: { songIds: [], flows: {}, generatedAt: 'x' } }
    expect(deck.version).toBe(1)
  })
})
