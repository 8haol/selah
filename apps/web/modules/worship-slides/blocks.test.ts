import { describe, it, expect } from 'vitest'
import { parseLyrics } from '@selah/slide-engine'
import { blockIds, blocksFromSong, blocksFromTagged, blocksFromText, blocksToLyricsText, flowIds, newBlock } from './blocks'

describe('blockIds', () => {
  it('a lone verse is V; two verses are V1 and V2; choruses are C and C2', () => {
    expect(blockIds([newBlock('verse'), newBlock('chorus')])).toEqual(['V', 'C'])
    expect(blockIds([newBlock('verse'), newBlock('chorus'), newBlock('verse'), newBlock('chorus')])).toEqual(['V1', 'C', 'V2', 'C2'])
  })
})

describe('blocksFromText', () => {
  it('splits on headers and blank lines, and turns a repeat into order rather than a copy', () => {
    const { blocks, flow } = blocksFromText('[V1]\n每个狂风暴雨里\n\n[C]\n我爱你\n\n[B]\n四面受敌\n\n[C]\n我爱你')
    expect(blockIds(blocks)).toEqual(['V', 'C', 'B'])
    expect(flowIds(blocks, flow)).toEqual(['V', 'C', 'B', 'C'])
  })
  it('reads a header with no blank line before it, and a bare header as a repeat', () => {
    const { blocks, flow } = blocksFromText('主歌\n一\n副歌\n二\n主歌 2\n三\n副歌')
    expect(blockIds(blocks)).toEqual(['V1', 'C', 'V2'])
    expect(flowIds(blocks, flow)).toEqual(['V1', 'C', 'V2', 'C'])
  })
  it('drops the pinyin line printed under each Chinese line, and keeps English lyrics', () => {
    const { blocks } = blocksFromText('當我抬頭仰望\ndāng wǒ tái tóu yǎng wàng\n\n人算什麼 祢竟顧念他\nrén suàn shí me  mí jìng gù niàn tā\n世人算什麼\nshì rén suàn shí me\n\nAmazing grace\nhow sweet the sound')
    expect(blocks.map((b) => b.text)).toEqual(['當我抬頭仰望', '人算什麼 祢竟顧念他\n世人算什麼', 'Amazing grace\nhow sweet the sound'])
  })
  it('untagged paragraphs become verses', () => {
    expect(blockIds(blocksFromText('一\n二\n\n三\n四').blocks)).toEqual(['V1', 'V2'])
  })
})

describe('round trip', () => {
  it('saves as text the parser reads back to the same ids, and the order survives retyping', () => {
    const { blocks, flow } = blocksFromTagged([{ tag: 'V1', lines: ['一'] }, { tag: 'C', lines: ['二'] }], ['V1', 'C', 'C'])
    expect(parseLyrics(blocksToLyricsText(blocks)).map((s) => s.id)).toEqual(['V', 'C'])
    const retyped = blocks.map((b, i) => (i === 1 ? { ...b, type: 'bridge' as const } : b))
    expect(flowIds(retyped, flow)).toEqual(['V', 'B', 'B'])
  })
  it('blocksFromSong reads the default flow back as block keys', () => {
    const song = { id: 's', title: 't', pinyinOverrides: {}, defaultFlow: 'V1 C V1', sections: parseLyrics('[V]\n一\n[C]\n二') }
    const { blocks, flow } = blocksFromSong(song)
    expect(flowIds(blocks, flow)).toEqual(['V', 'C', 'V'])
  })
})
