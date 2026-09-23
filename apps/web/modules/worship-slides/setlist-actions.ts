'use server'

import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { getDb } from '@/db/client'
import { orgModules, wsDecks, wsSongs, wsSetlists, wsSetlistItems, SETLIST_DEFAULTS, type SetlistSettings } from '@/db/schema'
import { getCurrentContext } from '@/core/context'
import { rowToSong } from './song-row'
import { BUILTIN_THEMES, buildDeck, parseFlow, type SlideDeck, type Song } from '@selah/slide-engine'
import type { ActionResult } from './actions'

const MODULE_ID = 'worship-slides'
const FALLBACK_THEME = BUILTIN_THEMES[0]!.id
const themeIds = new Set(BUILTIN_THEMES.map((t) => t.id))

/* ---------------------------------------------------------------- shapes */

export interface SetlistSongView {
  itemId: string
  song: Song
  /** The flow this setlist uses, as tokens. Empty falls back to the song's own. */
  flow: string[]
  themeId: string
}

export interface SetlistView {
  id: string
  title: string
  serviceDate: string | null
  settings: SetlistSettings
  songs: SetlistSongView[]
}

/* --------------------------------------------------------------- helpers */

/** Server actions never throw at the caller — see the note in actions.ts. */
function failure(e: unknown): { ok: false; message: string } {
  if (e instanceof z.ZodError) return { ok: false, message: e.issues[0]?.message ?? '输入有误，请检查后再试' }
  console.error(e)
  return { ok: false, message: '保存失败，请稍后再试' }
}

const safeTheme = (id: string | null | undefined, fallback: string) => (id && themeIds.has(id) ? id : fallback)

/** The Sunday on or after today, as YYYY-MM-DD in the church's own calendar. */
function nextSunday(now = new Date()): string {
  const d = new Date(now)
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() + ((7 - d.getDay()) % 7))
  return d.toISOString().slice(0, 10)
}

/** The Sunday the dashboard counts down to when no setlist exists yet. */
export async function nextServiceDate(): Promise<string> {
  return nextSunday()
}

export async function defaultServiceTitle(date = nextSunday()): Promise<string> {
  const [, m, day] = date.split('-')
  return `${Number(m)} 月 ${Number(day)} 日 主日敬拜`
}

/* ------------------------------------------------------------ org settings */

export async function getDefaultThemeId(): Promise<string> {
  const { orgId } = await getCurrentContext()
  const db = await getDb()
  const rows = await db.select().from(orgModules).where(and(eq(orgModules.orgId, orgId), eq(orgModules.moduleId, MODULE_ID))).limit(1)
  return safeTheme(rows[0]?.settings?.defaultThemeId as string | undefined, FALLBACK_THEME)
}

export async function setDefaultThemeId(themeId: string): Promise<ActionResult> {
  try {
    if (!themeIds.has(themeId)) return { ok: false, message: '未知主题' }
    const { orgId } = await getCurrentContext()
    const db = await getDb()
    await db
      .update(orgModules)
      .set({ settings: sql`${orgModules.settings} || ${JSON.stringify({ defaultThemeId: themeId })}::jsonb` })
      .where(and(eq(orgModules.orgId, orgId), eq(orgModules.moduleId, MODULE_ID)))
    return { ok: true }
  } catch (e) { return failure(e) }
}

/* --------------------------------------------------------------- reading */

async function loadSetlist(setlistId: string, orgId: string, defaultThemeId: string): Promise<SetlistView | null> {
  const db = await getDb()
  const rows = await db.select().from(wsSetlists).where(and(eq(wsSetlists.id, setlistId), eq(wsSetlists.orgId, orgId))).limit(1)
  const row = rows[0]
  if (!row) return null

  const items = await db.select().from(wsSetlistItems).where(eq(wsSetlistItems.setlistId, row.id)).orderBy(asc(wsSetlistItems.position))
  const songRows = items.length
    ? await db.select().from(wsSongs).where(inArray(wsSongs.id, items.map((i) => i.songId)))
    : []
  const byId = new Map(songRows.map((s) => [s.id, s]))

  return {
    id: row.id,
    title: row.title,
    serviceDate: row.serviceDate,
    settings: { ...SETLIST_DEFAULTS, ...row.settings },
    // a song deleted out from under the setlist drops the item rather than the page
    songs: items.flatMap((i) => {
      const s = byId.get(i.songId)
      if (!s) return []
      const song = rowToSong(s)
      return [{
        itemId: i.id,
        song,
        flow: parseFlow(i.flow || song.defaultFlow || song.sections.map((x) => x.id).join(' ')),
        themeId: safeTheme(i.themeId, defaultThemeId),
      }]
    }),
  }
}

export async function getSetlist(id: string): Promise<SetlistView | null> {
  const { orgId } = await getCurrentContext()
  return loadSetlist(id, orgId, await getDefaultThemeId())
}

/** The setlist the sidebar calls 本周 — the most recently touched one. */
export async function getCurrentSetlist(): Promise<SetlistView | null> {
  const { orgId } = await getCurrentContext()
  const db = await getDb()
  const rows = await db.select({ id: wsSetlists.id }).from(wsSetlists).where(eq(wsSetlists.orgId, orgId)).orderBy(desc(wsSetlists.updatedAt)).limit(1)
  if (!rows[0]) return null
  return loadSetlist(rows[0].id, orgId, await getDefaultThemeId())
}

/* --------------------------------------------------------------- writing */

async function touch(setlistId: string) {
  const db = await getDb()
  await db.update(wsSetlists).set({ updatedAt: new Date() }).where(eq(wsSetlists.id, setlistId))
}

/** Returns the setlist to edit: the current one, or a fresh one for next Sunday. */
export async function startSetlist(): Promise<ActionResult<{ id: string }>> {
  try {
    const existing = await getCurrentSetlist()
    if (existing) return { ok: true, id: existing.id }
    const { orgId } = await getCurrentContext()
    const db = await getDb()
    const id = `set_${nanoid(10)}`
    const date = nextSunday()
    await db.insert(wsSetlists).values({ id, orgId, serviceDate: date, title: await defaultServiceTitle(date) })
    return { ok: true, id }
  } catch (e) { return failure(e) }
}

export async function addSongToSetlist(setlistId: string, songId: string): Promise<ActionResult<{ itemId: string }>> {
  try {
    const { orgId } = await getCurrentContext()
    const db = await getDb()
    const owns = await db.select({ id: wsSetlists.id }).from(wsSetlists).where(and(eq(wsSetlists.id, setlistId), eq(wsSetlists.orgId, orgId))).limit(1)
    if (!owns[0]) return { ok: false, message: '歌单不存在' }

    const already = await db.select({ id: wsSetlistItems.id }).from(wsSetlistItems).where(and(eq(wsSetlistItems.setlistId, setlistId), eq(wsSetlistItems.songId, songId))).limit(1)
    if (already[0]) return { ok: true, itemId: already[0].id }

    const songRows = await db.select().from(wsSongs).where(and(eq(wsSongs.id, songId), eq(wsSongs.orgId, orgId))).limit(1)
    const song = songRows[0]
    if (!song) return { ok: false, message: '歌曲不存在' }

    const count = await db.$count(wsSetlistItems, eq(wsSetlistItems.setlistId, setlistId))
    const itemId = `si_${nanoid(10)}`
    await db.insert(wsSetlistItems).values({
      id: itemId, setlistId, songId, position: count,
      flow: song.defaultFlow || song.sections.map((s) => s.id).join(' '),
      themeId: await getDefaultThemeId(),
    })
    await touch(setlistId)
    return { ok: true, itemId }
  } catch (e) { return failure(e) }
}

export async function removeSetlistItem(setlistId: string, itemId: string): Promise<ActionResult> {
  try {
    const { orgId } = await getCurrentContext()
    const db = await getDb()
    const owns = await db.select({ id: wsSetlists.id }).from(wsSetlists).where(and(eq(wsSetlists.id, setlistId), eq(wsSetlists.orgId, orgId))).limit(1)
    if (!owns[0]) return { ok: false, message: '歌单不存在' }
    await db.delete(wsSetlistItems).where(and(eq(wsSetlistItems.id, itemId), eq(wsSetlistItems.setlistId, setlistId)))
    const rest = await db.select({ id: wsSetlistItems.id }).from(wsSetlistItems).where(eq(wsSetlistItems.setlistId, setlistId)).orderBy(asc(wsSetlistItems.position))
    await Promise.all(rest.map((r, i) => db.update(wsSetlistItems).set({ position: i }).where(eq(wsSetlistItems.id, r.id))))
    await touch(setlistId)
    return { ok: true }
  } catch (e) { return failure(e) }
}

export async function reorderSetlist(setlistId: string, itemIds: string[]): Promise<ActionResult> {
  try {
    const { orgId } = await getCurrentContext()
    const db = await getDb()
    const owns = await db.select({ id: wsSetlists.id }).from(wsSetlists).where(and(eq(wsSetlists.id, setlistId), eq(wsSetlists.orgId, orgId))).limit(1)
    if (!owns[0]) return { ok: false, message: '歌单不存在' }
    await Promise.all(itemIds.map((id, i) =>
      db.update(wsSetlistItems).set({ position: i }).where(and(eq(wsSetlistItems.id, id), eq(wsSetlistItems.setlistId, setlistId))),
    ))
    await touch(setlistId)
    return { ok: true }
  } catch (e) { return failure(e) }
}

const itemPatch = z.object({
  flow: z.string().trim().max(400, 'flow 太长了').optional(),
  themeId: z.string().max(40).optional(),
})

export async function updateSetlistItem(setlistId: string, itemId: string, patch: z.input<typeof itemPatch>): Promise<ActionResult> {
  try {
    const data = itemPatch.parse(patch)
    if (data.themeId && !themeIds.has(data.themeId)) return { ok: false, message: '未知主题' }
    const { orgId } = await getCurrentContext()
    const db = await getDb()
    const owns = await db.select({ id: wsSetlists.id }).from(wsSetlists).where(and(eq(wsSetlists.id, setlistId), eq(wsSetlists.orgId, orgId))).limit(1)
    if (!owns[0]) return { ok: false, message: '歌单不存在' }
    await db.update(wsSetlistItems).set(data).where(and(eq(wsSetlistItems.id, itemId), eq(wsSetlistItems.setlistId, setlistId)))
    await touch(setlistId)
    return { ok: true }
  } catch (e) { return failure(e) }
}

/** 应用到所有歌 — one theme across the whole service. */
export async function setSetlistTheme(setlistId: string, themeId: string): Promise<ActionResult> {
  try {
    if (!themeIds.has(themeId)) return { ok: false, message: '未知主题' }
    const { orgId } = await getCurrentContext()
    const db = await getDb()
    const owns = await db.select({ id: wsSetlists.id }).from(wsSetlists).where(and(eq(wsSetlists.id, setlistId), eq(wsSetlists.orgId, orgId))).limit(1)
    if (!owns[0]) return { ok: false, message: '歌单不存在' }
    await db.update(wsSetlistItems).set({ themeId }).where(eq(wsSetlistItems.setlistId, setlistId))
    await touch(setlistId)
    return { ok: true }
  } catch (e) { return failure(e) }
}

const settingsPatch = z.object({
  linesPerSlide: z.union([z.literal(1), z.literal(2), z.literal(4)]).optional(),
  bigText: z.boolean().optional(),
  pinyin: z.boolean().optional(),
  titleSlides: z.boolean().optional(),
  blankBetween: z.boolean().optional(),
})

export async function updateSetlistSettings(setlistId: string, patch: z.input<typeof settingsPatch>): Promise<ActionResult> {
  try {
    const data = settingsPatch.parse(patch)
    const { orgId } = await getCurrentContext()
    const db = await getDb()
    await db
      .update(wsSetlists)
      .set({ settings: sql`${wsSetlists.settings} || ${JSON.stringify(data)}::jsonb`, updatedAt: new Date() })
      .where(and(eq(wsSetlists.id, setlistId), eq(wsSetlists.orgId, orgId)))
    return { ok: true }
  } catch (e) { return failure(e) }
}

/* --------------------------------------------------------------- export */

/**
 * Build the whole service into one deck and keep the record, so it shows up
 * under 最近的敬拜. The bytes are rendered in the browser from the returned
 * deck — the themes' background images never travel through the server.
 */
export async function saveSetlistDeck(setlistId: string): Promise<ActionResult<{ deckId: string; deck: SlideDeck; titles: string[] }>> {
  try {
    const { orgId } = await getCurrentContext()
    const defaultThemeId = await getDefaultThemeId()
    const view = await loadSetlist(setlistId, orgId, defaultThemeId)
    if (!view) return { ok: false, message: '歌单不存在' }
    if (view.songs.length === 0) return { ok: false, message: '歌单里还没有歌' }

    const s = view.settings
    const deck = buildDeck({
      songs: view.songs.map((x) => x.song),
      flows: Object.fromEntries(view.songs.map((x) => [x.song.id, x.flow.join(' ')])),
      themes: Object.fromEntries(view.songs.map((x) => [x.song.id, x.themeId])),
      themeId: view.songs[0]!.themeId,
      linesPerSlide: s.linesPerSlide,
      bigText: s.bigText,
      pinyin: s.pinyin,
      titleSlides: s.titleSlides,
      blankBetweenSongs: s.blankBetween,
    })

    const db = await getDb()
    const deckId = `deck_${nanoid(10)}`
    const titles = view.songs.map((x) => x.song.title)
    await db.insert(wsDecks).values({
      id: deckId, orgId, setlistId, songId: null, themeId: deck.themeId,
      deck, flows: deck.meta.flows, titles,
    })
    await touch(setlistId)
    return { ok: true, deckId, deck, titles }
  } catch (e) { return failure(e) }
}
