import { beforeAll, describe, expect, it } from 'vitest'

// an in-memory PGlite, migrated from drizzle/ on first use; this file controls every service in it
process.env.PGLITE_DIR = 'memory://'
delete process.env.DATABASE_URL

const { getDb } = await import('@/db/client')
const { wsDecks, wsSetlistItems, wsSetlists, wsSongs } = await import('@/db/schema')
const { getCurrentContext } = await import('@/core/context')
const { defaultServiceTitle, getCurrentSetlist, getSetlist, startSetlist } = await import('./setlist-actions')
const { nextSunday } = await import('./service-date')

let orgId = ''
const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000)

beforeAll(async () => {
  orgId = (await getCurrentContext()).orgId
  const db = await getDb()
  await db.insert(wsSongs).values({
    id: 'song_grace', orgId, title: '奇异恩典', sections: [{ id: 'V1', lines: [{ zh: '奇异恩典' }] }] as never,
  })
})

describe('本周', () => {
  it('lets a service go once it was exported and its Sunday has passed', async () => {
    const db = await getDb()
    await db.insert(wsSetlists).values({
      id: 'set_done', orgId, serviceDate: '2020-01-05', title: '1 月 5 日 主日敬拜', updatedAt: new Date('2020-01-04T10:00:00Z'),
    })
    await db.insert(wsDecks).values({ id: 'deck_done', orgId, setlistId: 'set_done', themeId: 'night', deck: {} as never, flows: {} })

    expect(await getCurrentSetlist()).toBeNull()
    const s = await startSetlist()
    if (!s.ok) throw new Error('setup failed')
    expect(s.id).not.toBe('set_done')
    expect((await getSetlist(s.id))!.serviceDate).toBe(nextSunday())
  })

  it('keeps an unfinished service and moves it on to the coming Sunday, songs and all', async () => {
    const db = await getDb()
    await db.insert(wsSetlists).values({
      id: 'set_wip', orgId, serviceDate: '2020-02-02', title: '2 月 2 日 主日敬拜', updatedAt: hoursFromNow(1),
    })
    await db.insert(wsSetlistItems).values({ id: 'si_wip', setlistId: 'set_wip', songId: 'song_grace', position: 0, flow: 'V1' })

    const current = await getCurrentSetlist()
    expect(current).toMatchObject({ id: 'set_wip', serviceDate: nextSunday(), title: await defaultServiceTitle(nextSunday()) })
    expect(current!.songs.map((x) => x.song.title)).toEqual(['奇异恩典'])
    // saved, not just shown
    expect((await getSetlist('set_wip'))!.serviceDate).toBe(nextSunday())
    expect((await startSetlist()).ok && (await startSetlist())).toMatchObject({ id: 'set_wip' })
  })

  it('keeps a service touched after its Sunday, even an exported one, and its own title', async () => {
    const db = await getDb()
    await db.insert(wsSetlists).values({
      id: 'set_named', orgId, serviceDate: '2020-03-01', title: '青年主日', updatedAt: hoursFromNow(2),
    })
    await db.insert(wsDecks).values({ id: 'deck_named', orgId, setlistId: 'set_named', themeId: 'night', deck: {} as never, flows: {} })

    expect(await getCurrentSetlist()).toMatchObject({ id: 'set_named', serviceDate: nextSunday(), title: '青年主日' })
  })
})
