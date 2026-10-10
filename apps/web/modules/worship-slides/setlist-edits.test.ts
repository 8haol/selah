import { beforeAll, describe, expect, it } from 'vitest'

// an in-memory PGlite, migrated from drizzle/ on first use
process.env.PGLITE_DIR = 'memory://'
delete process.env.DATABASE_URL

const { getDb } = await import('@/db/client')
const { wsSongs } = await import('@/db/schema')
const { getCurrentContext } = await import('@/core/context')
const { addSongToSetlist, createDraft, getSetlist, saveSetlistDeck, updateSetlistEdits } = await import('./setlist-actions')

let setlistId = ''

beforeAll(async () => {
  const { orgId } = await getCurrentContext()
  const db = await getDb()
  await db.insert(wsSongs).values({
    id: 'song_grace', orgId, title: '奇异恩典', defaultFlow: 'V1',
    sections: [{ id: 'V1', lines: [{ zh: '奇异恩典　何等甘甜' }, { zh: '我罪已得赦免' }] }] as never,
  })
  const d = await createDraft()
  if (!d.ok) throw new Error('setup failed')
  setlistId = d.id
  await addSongToSetlist(setlistId, 'song_grace')
})

describe('总览 edits', () => {
  it('export carries the removed, rewritten and added slides; the song stays as it was', async () => {
    const r = await updateSetlistEdits(setlistId, {
      removed: [{ key: 'song_grace/title', was: '奇异恩典' }],
      rewritten: [{ key: 'song_grace/0/0', was: '奇异恩典　何等甘甜\n我罪已得赦免', lines: ['奇异恩典'] }],
      added: [{ id: 'a1', after: 'song_grace/0/0', lines: ['  阿们  ', ''] }],
    })
    expect(r.ok).toBe(true)

    const saved = await saveSetlistDeck(setlistId)
    if (!saved.ok) throw new Error(saved.message)
    expect(saved.deck.slides.map((s) => s.lines.map((l) => l.zh))).toEqual([['奇异恩典'], ['阿们']])

    const view = await getSetlist(setlistId)
    expect(view!.songs[0]!.song.sections[0]!.lines.map((l) => l.zh)).toEqual(['奇异恩典　何等甘甜', '我罪已得赦免'])
  })

  it('refuses a page of free text too long to project', async () => {
    const r = await updateSetlistEdits(setlistId, { added: [{ id: 'a2', after: '', lines: Array(13).fill('哈利路亚') }] })
    expect(r).toMatchObject({ ok: false, message: '一页最多 12 行' })
  })
})
