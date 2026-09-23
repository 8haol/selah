import { createSong, listSongs } from '../modules/worship-slides/actions'
import type { SongInput } from '../modules/worship-slides/actions'

/**
 * The starter songs — enough for the library, the setlist editor and the
 * theme previews to have something real to show on a fresh database.
 */
const SONGS: SongInput[] = [
  {
    title: '我要爱慕你', artist: '赞美之泉', key: 'D',
    lyricsText: `[V1]\n耶稣　我要爱慕祢\n我要爱慕祢　倾倒我的生命\n祢是我唯一所求\n让我心单单渴慕祢\n\n[C]\n我心满溢　我心满溢\n对祢的爱和思念无止尽\n让我走向　祢的身旁贴近祢\n主啊　我渴慕寻求祢`,
    defaultFlow: 'V1 C C V1 C', pinyinOverrides: {}, createdByName: 'seed',
  },
  {
    title: '耶和华是我的牧者', artist: '诗篇 23（和合本）', key: 'D',
    lyricsText: `[V1]\n耶和华是我的牧者\n我必不致缺乏\n他使我躺卧在青草地上\n领我在可安歇的水边\n\n[C]\n他使我的灵魂苏醒\n为自己的名引导我走义路\n\n[V2]\n我虽然行过死荫的幽谷\n也不怕遭害\n因为你与我同在\n你的杖你的竿都安慰我`,
    defaultFlow: 'V1 C V2 C', pinyinOverrides: {}, createdByName: 'seed',
  },
  {
    title: '奇异恩典', artist: '传统圣诗', key: 'G',
    lyricsText: `[V1]\n奇异恩典　何等甘甜\n我罪已得赦免\n前我失丧　今被寻回\n瞎眼今得看见\n\n[V2]\n如此恩典　使我敬畏\n使我心得安慰\n初信之时　即蒙恩惠\n真是何等宝贵`,
    defaultFlow: 'V1 V2', pinyinOverrides: {}, createdByName: 'seed',
  },
]

async function main() {
  const existing = await listSongs()
  const have = new Set(existing.map((s) => s.title))
  let added = 0
  for (const song of SONGS) {
    if (have.has(song.title)) continue
    const result = await createSong(song)
    if (!result.ok) {
      console.error(`seed failed for ${song.title}:`, result.message)
      process.exit(1)
    }
    added += 1
  }
  console.log(added ? `seeded ${added} song(s)` : 'library already seeded')
  process.exit(0)
}

void main()
