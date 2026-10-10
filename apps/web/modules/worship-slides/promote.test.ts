import { beforeAll, describe, expect, it } from 'vitest'

// an in-memory PGlite, migrated from drizzle/ on first use; this file controls every setlist in it
process.env.PGLITE_DIR = 'memory://'
delete process.env.DATABASE_URL

const { getDb } = await import('@/db/client')
const { wsSongs } = await import('@/db/schema')
const { getCurrentContext } = await import('@/core/context')
const {
  addSongToSetlist, createDraft, defaultServiceTitle, getCurrentSetlist, getSetlist, listDrafts, promoteDraft, renameSetlist,
} = await import('./setlist-actions')
const { nextSunday } = await import('./service-date')

beforeAll(async () => {
  const { orgId } = await getCurrentContext()
  const db = await getDb()
  await db.insert(wsSongs).values({
    id: 'song_grace', orgId, title: '奇异恩典', sections: [{ id: 'V1', lines: [{ zh: '奇异恩典' }] }] as never,
  })
})

describe('设为本周主日', () => {
  it('gives an unnamed draft the Sunday\'s own title', async () => {
    const d = await createDraft()
    if (!d.ok) throw new Error('setup failed')
    expect(await promoteDraft(d.id)).toEqual({ ok: true })
    expect(await getCurrentSetlist()).toMatchObject({ id: d.id, kind: 'service', serviceDate: nextSunday(), title: await defaultServiceTitle(nextSunday()) })
  })

  it('keeps songs and name, and an empty 本周 makes way for it', async () => {
    const empty = await getCurrentSetlist()
    const d = await createDraft()
    if (!d.ok || !empty) throw new Error('setup failed')
    expect(empty.songs).toEqual([])
    await addSongToSetlist(d.id, 'song_grace')
    await renameSetlist(d.id, '青年主日')

    expect(await promoteDraft(d.id)).toEqual({ ok: true })
    const current = await getCurrentSetlist()
    expect(current).toMatchObject({ id: d.id, serviceDate: nextSunday(), title: '青年主日' })
    expect(current!.songs.map((x) => x.song.title)).toEqual(['奇异恩典'])
    expect(await getSetlist(empty.id)).toBeNull()
    expect((await listDrafts()).map((x) => x.id)).not.toContain(d.id)
  })

  it('never hides a 本周 that already has songs, and only takes drafts', async () => {
    const current = await getCurrentSetlist()
    const d = await createDraft()
    if (!d.ok || !current) throw new Error('setup failed')
    expect(await promoteDraft(d.id)).toMatchObject({ ok: false, message: expect.stringContaining('青年主日') })
    expect((await getSetlist(d.id))?.kind).toBe('draft')
    expect((await getCurrentSetlist())?.id).toBe(current.id)
    expect((await promoteDraft(current.id)).ok).toBe(false)
  })
})
