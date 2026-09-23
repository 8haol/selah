'use server'

import { and, desc, eq, ilike, isNull, inArray } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { getDb } from '@/db/client'
import { wsSongs, wsDecks, wsSetlists, wsSetlistItems, type SongRow, type DeckRow } from '@/db/schema'
import { getCurrentContext } from '@/core/context'
import { buildSearchKey } from './search'
import { rowToSong } from './song-row'
import { parseLyrics, parseFlow, pruneFlow, expandFlow, buildDeck, FlowError, type Song } from '@selah/slide-engine'

const songInputSchema = z.object({
  title: z.string().trim().min(1, '请填写歌名').max(120, '歌名太长了'),
  titleEn: z.string().trim().max(120, '英文名太长了').optional().or(z.literal('')),
  artist: z.string().trim().max(120, '作者太长了').optional().or(z.literal('')),
  key: z.string().trim().max(12, '调性太长了').optional().or(z.literal('')),
  lyricsText: z.string().min(1, '请粘贴歌词').max(50_000, '歌词太长了，请分成多首歌'),
  defaultFlow: z.string().trim().default(''),
  pinyinOverrides: z.record(z.string(), z.string()).default({}),
  createdByName: z.string().trim().max(60, '昵称太长了').optional().or(z.literal('')),
})
export type SongInput = z.input<typeof songInputSchema>

const deckInputSchema = z.object({
  songIds: z.array(z.string().min(1)).min(1, '请至少选择一首歌').max(20, '一次最多 20 首歌'),
  flows: z.record(z.string(), z.string().max(400, 'flow 太长了')),
  themeId: z.string().min(1, '请选择一个主题').max(40, '主题名太长了'),
  title: z.string().trim().max(120, '标题太长了').optional(),
  serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD').optional(),
  generatedByName: z.string().trim().max(60, '昵称太长了').optional(),
})
export type DeckInput = z.input<typeof deckInputSchema>

/**
 * Server actions never throw at the caller: Next 16 replaces a thrown message
 * with a generic one in production, so the UI would show nothing useful.
 */
export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; message: string }

/** An error whose message was written for the user and is safe to show as-is. */
class UserError extends Error {}

function failure(e: unknown): { ok: false; message: string } {
  if (e instanceof z.ZodError) return { ok: false, message: e.issues[0]?.message ?? '输入有误，请检查后再试' }
  if (e instanceof FlowError || e instanceof UserError) return { ok: false, message: e.message }
  console.error(e)
  return { ok: false, message: '保存失败，请稍后再试' }
}

function prepare(input: SongInput) {
  const data = songInputSchema.parse(input)
  const sections = parseLyrics(data.lyricsText)
  if (sections.length === 0) throw new UserError('没有识别到任何歌词段落')
  const song: Song = { id: 'tmp', title: data.title, sections, pinyinOverrides: data.pinyinOverrides, defaultFlow: '' }
  const flowInput = data.defaultFlow || sections.map((s) => s.id).join(' ')
  expandFlow(song, flowInput)
  return {
    title: data.title, titleEn: data.titleEn || null, artist: data.artist || null, key: data.key || null,
    sections, pinyinOverrides: data.pinyinOverrides, defaultFlow: parseFlow(flowInput).join(' '),
    searchKey: buildSearchKey({ title: data.title, titleEn: data.titleEn, artist: data.artist }),
    createdByName: data.createdByName || null,
  }
}

/** The whole team shares one 歌库, newest edits first. */
export async function listSongs(query?: string): Promise<SongRow[]> {
  const { orgId } = await getCurrentContext()
  const db = await getDb()
  const q = query?.trim().toLowerCase().replace(/\s+/g, '')
  const where = and(
    eq(wsSongs.orgId, orgId),
    isNull(wsSongs.deletedAt),
    q ? ilike(wsSongs.searchKey, `%${q}%`) : undefined,
  )
  return db.select().from(wsSongs).where(where).orderBy(desc(wsSongs.updatedAt)).limit(200)
}

export async function getSong(id: string): Promise<SongRow | null> {
  const { orgId } = await getCurrentContext()
  const db = await getDb()
  const rows = await db.select().from(wsSongs).where(and(eq(wsSongs.id, id), eq(wsSongs.orgId, orgId), isNull(wsSongs.deletedAt))).limit(1)
  return rows[0] ?? null
}

export async function createSong(input: SongInput): Promise<ActionResult<{ id: string }>> {
  try {
    const { orgId } = await getCurrentContext()
    const db = await getDb()
    const id = `song_${nanoid(10)}`
    await db.insert(wsSongs).values({ id, orgId, ...prepare(input) })
    return { ok: true, id }
  } catch (e) { return failure(e) }
}

export async function updateSong(id: string, input: SongInput): Promise<ActionResult> {
  try {
    const { orgId } = await getCurrentContext()
    const db = await getDb()
    await db.update(wsSongs).set({ ...prepare(input), updatedAt: new Date() }).where(and(eq(wsSongs.id, id), eq(wsSongs.orgId, orgId)))
    return { ok: true }
  } catch (e) { return failure(e) }
}

export async function deleteSong(id: string): Promise<ActionResult> {
  try {
    const { orgId } = await getCurrentContext()
    const db = await getDb()
    await db.update(wsSongs).set({ deletedAt: new Date() }).where(and(eq(wsSongs.id, id), eq(wsSongs.orgId, orgId)))
    return { ok: true }
  } catch (e) { return failure(e) }
}

const sectionsSchema = z.array(z.object({
  id: z.string().trim().min(1).max(8),
  lines: z.array(z.string().max(400, '有一行太长了')).max(60, '一段最多 60 行'),
})).min(1, '至少要留一段歌词').max(40, '段落太多了')

/**
 * Replace a song's lyrics from the setlist editor, where a section is just
 * text. Rebuilding the header form and re-running the parser keeps section
 * ids normalised exactly as the import path produces them.
 */
export async function updateSongSections(songId: string, input: z.input<typeof sectionsSchema>): Promise<ActionResult> {
  try {
    const data = sectionsSchema.parse(input)
    const text = data
      .map((s) => `[${s.id}]\n${s.lines.map((l) => l.trim()).filter(Boolean).join('\n')}`)
      .filter((block) => block.split('\n').length > 1)
      .join('\n\n')
    const sections = parseLyrics(text)
    if (sections.length === 0) throw new UserError('没有识别到任何歌词段落')

    const { orgId } = await getCurrentContext()
    const db = await getDb()
    const rows = await db.select().from(wsSongs).where(and(eq(wsSongs.id, songId), eq(wsSongs.orgId, orgId), isNull(wsSongs.deletedAt))).limit(1)
    const row = rows[0]
    if (!row) throw new UserError('歌曲不存在')

    // a flow token whose section just disappeared would break every later build
    const defaultFlow = pruneFlow({ ...rowToSong(row), sections }, parseFlow(row.defaultFlow || '')).join(' ')

    await db.update(wsSongs)
      .set({ sections, defaultFlow: defaultFlow || sections.map((s) => s.id).join(' '), updatedAt: new Date() })
      .where(and(eq(wsSongs.id, songId), eq(wsSongs.orgId, orgId)))
    return { ok: true }
  } catch (e) { return failure(e) }
}

// a key is one character (every occurrence) or `line|index` (one spot, see spotKey)
const overridesSchema = z.record(z.string().min(1).max(420), z.string().trim().max(12)).refine((o) => Object.keys(o).length <= 500, '改过的拼音太多了')

/** Pin how one character is read in this song — the polyphonic picker. */
export async function updateSongPinyin(songId: string, overrides: z.input<typeof overridesSchema>): Promise<ActionResult> {
  try {
    const pinyinOverrides = overridesSchema.parse(overrides)
    const { orgId } = await getCurrentContext()
    const db = await getDb()
    await db.update(wsSongs).set({ pinyinOverrides, updatedAt: new Date() })
      .where(and(eq(wsSongs.id, songId), eq(wsSongs.orgId, orgId), isNull(wsSongs.deletedAt)))
    return { ok: true }
  } catch (e) { return failure(e) }
}

export async function saveDeck(input: DeckInput): Promise<ActionResult<{ deckId: string }>> {
  try {
    const data = deckInputSchema.parse(input)
    const { orgId } = await getCurrentContext()
    const db = await getDb()
    const rows = await db.select().from(wsSongs).where(and(eq(wsSongs.orgId, orgId), inArray(wsSongs.id, data.songIds)))
    const byId = new Map(rows.map((r) => [r.id, r]))
    const songs = data.songIds.map((id) => { const r = byId.get(id); if (!r) throw new UserError(`歌曲不存在：${id}`); return rowToSong(r) })
    const deck = buildDeck({ songs, flows: data.flows, themeId: data.themeId })
    const deckId = `deck_${nanoid(10)}`
    let setlistId: string | null = null
    if (songs.length > 1) {
      setlistId = `set_${nanoid(10)}`
      await db.insert(wsSetlists).values({ id: setlistId, orgId, title: data.title ?? `${data.serviceDate ?? deck.meta.generatedAt.slice(0, 10)} 敬拜`, serviceDate: data.serviceDate ?? null, createdByName: data.generatedByName ?? null })
      await db.insert(wsSetlistItems).values(songs.map((s, i) => ({ id: `si_${nanoid(10)}`, setlistId: setlistId!, songId: s.id, position: i, flow: deck.meta.flows[s.id] ?? '' })))
    }
    await db.insert(wsDecks).values({
      id: deckId, orgId, setlistId, songId: songs.length === 1 ? songs[0]!.id : null, themeId: data.themeId,
      deck, flows: deck.meta.flows, titles: songs.map((s) => s.title), generatedByName: data.generatedByName ?? null,
    })
    return { ok: true, deckId }
  } catch (e) { return failure(e) }
}

export async function getDeck(id: string): Promise<DeckRow | null> {
  const { orgId } = await getCurrentContext()
  const db = await getDb()
  const rows = await db.select().from(wsDecks).where(and(eq(wsDecks.id, id), eq(wsDecks.orgId, orgId))).limit(1)
  return rows[0] ?? null
}

export async function listDecksForSong(songId: string): Promise<DeckRow[]> {
  const { orgId } = await getCurrentContext()
  const db = await getDb()
  return db.select().from(wsDecks).where(and(eq(wsDecks.orgId, orgId), eq(wsDecks.songId, songId))).orderBy(desc(wsDecks.createdAt)).limit(20)
}

export async function listRecentDecks(limit = 10): Promise<DeckRow[]> {
  const { orgId } = await getCurrentContext()
  const db = await getDb()
  return db.select().from(wsDecks).where(eq(wsDecks.orgId, orgId)).orderBy(desc(wsDecks.createdAt)).limit(limit)
}

/**
 * A deck is a generated snapshot — the setlist and songs it came from stay put,
 * so removing one from 最近的敬拜 loses nothing that can't be generated again.
 */
export async function deleteDeck(id: string): Promise<ActionResult> {
  try {
    const { orgId } = await getCurrentContext()
    const db = await getDb()
    await db.delete(wsDecks).where(and(eq(wsDecks.id, id), eq(wsDecks.orgId, orgId)))
    return { ok: true }
  } catch (e) { return failure(e) }
}
