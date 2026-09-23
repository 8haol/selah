import { createSong, listSongs } from '../modules/worship-slides/actions'

async function main() {
  const existing = await listSongs('yehehuashiwodemuzhe')
  if (existing.length === 0) {
    const result = await createSong({
      title: '耶和华是我的牧者', artist: '诗篇 23（和合本）', key: 'D',
      lyricsText: `[V1]\n耶和华是我的牧者\n我必不致缺乏\n他使我躺卧在青草地上\n领我在可安歇的水边\n\n[C]\n他使我的灵魂苏醒\n为自己的名引导我走义路\n\n[V2]\n我虽然行过死荫的幽谷\n也不怕遭害\n因为你与我同在\n你的杖你的竿都安慰我`,
      defaultFlow: 'V1 C V2 C', pinyinOverrides: {}, createdByName: 'seed',
    })
    if (!result.ok) {
      console.error('seed failed:', result.message)
      process.exit(1)
    }
    console.log('seeded sample song')
  } else console.log('sample song already present')
  process.exit(0)
}

void main()
