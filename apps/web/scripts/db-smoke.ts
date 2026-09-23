import { getDb } from '../db/client'
import { getCurrentContext } from '../core/context'
import { organizations } from '../db/schema'
import { createSong, getDeck, listSongs, saveDeck } from '../modules/worship-slides/actions'

async function main() {
  const ctx = await getCurrentContext()
  const db = await getDb()
  const rows = await db.select().from(organizations)
  const created = await createSong({
    title: '耶和华是我的牧者',
    artist: 'Psalm 23',
    lyricsText: '[Verse 1]\n耶和华是我的牧者',
    defaultFlow: 'V1',
    pinyinOverrides: {},
  })
  if (!created.ok) throw new Error(created.message)
  const songId = created.id
  const songs = await listSongs('yhh')
  const saveResult = await saveDeck({ songIds: [songId], flows: { [songId]: 'V1' }, themeId: 'night' })
  if (!saveResult.ok) throw new Error(saveResult.message)
  const { deckId } = saveResult
  const saved = await getDeck(deckId)
  console.log(ctx, rows.map((r) => r.slug), { songCount: songs.length, deckId, slideCount: saved?.deck.slides.length ?? 0 })
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
