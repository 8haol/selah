import { beforeAll, describe, expect, it } from 'vitest'

// an in-memory PGlite, migrated from drizzle/ on first use
process.env.PGLITE_DIR = 'memory://'
delete process.env.DATABASE_URL

const { getDb } = await import('@/db/client')
const { wsSongs, wsDecks, wsSetlists } = await import('@/db/schema')
const { getCurrentContext } = await import('@/core/context')
const {
  addSongToSetlist, createDraft, deleteDraft, getCurrentSetlist, getSetlist, listDrafts, renameSetlist, startSetlist,
} = await import('./setlist-actions')
const { nextSunday } = await import('./service-date')

let songId = ''

beforeAll(async () => {
  const { orgId } = await getCurrentContext()
  const db = await getDb()
  songId = 'song_test'
  await db.insert(wsSongs).values({
    id: songId, orgId, title: '奇异恩典', sections: [{ id: 'V1', lines: [{ zh: '奇异恩典' }] }] as never,
  })
})

describe('drafts', () => {
  it('a fresh start with only drafts around still makes a service', async () => {
    const d = await createDraft()
    expect(d.ok).toBe(true)
    const s = await startSetlist()
    expect(s.ok && d.ok && s.id !== d.id).toBe(true)
    const view = s.ok ? await getSetlist(s.id) : null
    expect(view?.kind).toBe('service')
  })

  it('editing a draft never takes over 本周', async () => {
    const service = await startSetlist()
    const draft = await createDraft()
    if (!service.ok || !draft.ok) throw new Error('setup failed')

    await addSongToSetlist(draft.id, songId)
    await renameSetlist(draft.id, '青年团契')

    expect((await getCurrentSetlist())?.id).toBe(service.id)
    expect((await startSetlist()).ok && (await startSetlist())).toMatchObject({ id: service.id })
  })

  it('lists drafts newest first with their song counts, and never the service', async () => {
    const service = await startSetlist()
    const a = await createDraft()
    const b = await createDraft()
    if (!service.ok || !a.ok || !b.ok) throw new Error('setup failed')
    await addSongToSetlist(a.id, songId)

    const list = await listDrafts()
    expect(list[0]).toMatchObject({ id: a.id, count: 1 })
    expect(list.map((x) => x.id)).toContain(b.id)
    expect(list.map((x) => x.id)).not.toContain(service.id)
  })

  it('names a new draft 未命名制作 and renames with a trimmed title', async () => {
    const d = await createDraft()
    if (!d.ok) throw new Error('setup failed')
    expect((await getSetlist(d.id))?.title).toBe('未命名制作')
    expect((await renameSetlist(d.id, '  婚礼  ')).ok).toBe(true)
    expect((await getSetlist(d.id))?.title).toBe('婚礼')
    expect((await renameSetlist(d.id, '   ')).ok).toBe(false)
  })

  it('deletes a draft but keeps the decks it exported', async () => {
    const d = await createDraft()
    if (!d.ok) throw new Error('setup failed')
    await addSongToSetlist(d.id, songId)
    const { orgId } = await getCurrentContext()
    const db = await getDb()
    await db.insert(wsDecks).values({ id: 'deck_keep', orgId, setlistId: d.id, themeId: 'x', deck: {} as never, flows: {} })

    expect((await deleteDraft(d.id)).ok).toBe(true)
    expect(await getSetlist(d.id)).toBeNull()
    const decks = await db.select().from(wsDecks)
    expect(decks.find((x) => x.id === 'deck_keep')?.setlistId).toBeNull()
  })

  it('refuses to delete the service', async () => {
    const s = await startSetlist()
    if (!s.ok) throw new Error('setup failed')
    expect((await deleteDraft(s.id)).ok).toBe(false)
    expect(await getSetlist(s.id)).not.toBeNull()
  })
})

describe('本周', () => {
  it('lets last week\'s service go once its Sunday has passed', async () => {
    const { orgId } = await getCurrentContext()
    const db = await getDb()
    // the newest service by far, but for a Sunday long gone
    await db.insert(wsSetlists).values({
      id: 'set_past', orgId, serviceDate: '2020-01-05', title: '1 月 5 日 主日敬拜', updatedAt: new Date(Date.now() + 3_600_000),
    })

    expect((await getCurrentSetlist())?.id).not.toBe('set_past')
    const s = await startSetlist()
    if (!s.ok) throw new Error('setup failed')
    expect(s.id).not.toBe('set_past')
    expect((await getSetlist(s.id))!.serviceDate! >= nextSunday()).toBe(true)
  })
})
