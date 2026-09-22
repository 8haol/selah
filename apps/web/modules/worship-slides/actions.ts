'use server'

import { and, desc, eq, ilike, isNull, inArray } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { getDb } from '@/db/client'
import { wsSongs, wsDecks, wsSetlists, wsSetlistItems, type SongRow, type DeckRow } from '@/db/schema'
import { getCurrentContext } from '@/core/context'
import { buildSearchKey } from './search'
import { rowToSong } from './song-row'
import { parseLyrics, parseFlow, expandFlow, buildDeck, FlowError, type Song } from '@selah/slide-engine'

const songInputSchema = z.object({
  title: z.string().trim().min(1, '请填写歌名').max(120),
  titleEn: z.string().trim().max(120).optional().or(z.literal('')),
  artist: z.string().trim().max(120).optional().or(z.literal('')),
  key: z.string().trim().max(12).optional().or(z.literal('')),
  lyricsText: z.string().min(1, '请粘贴歌词'),
  defaultFlow: z.string().trim().default(''),
  pinyinOverrides: z.record(z.string(), z.string()).default({}),
  createdByName: z.string().trim().max(60).optional().or(z.literal('')),
})
export type SongInput = z.input<typeof songInputSchema>

function prepare(input: SongInput) {
  const data = songInputSchema.parse(input)
  const sections = parseLyrics(data.lyricsText)
  if (sections.length === 0) throw new Error('没有识别到任何歌词段落')
  const song: Song = { id: 'tmp', title: data.title, sections, pinyinOverrides: data.pinyinOverrides, defaultFlow: '' }
  const flowInput = data.defaultFlow || sections.map((s) => s.id).join(' ')
  try { expandFlow(song, flowInput) } catch (e) { if (e instanceof FlowError) throw new Error(e.message); throw e }
  return {
    title: data.title, titleEn: data.titleEn || null, artist: data.artist || null, key: data.key || null,
    sections, pinyinOverrides: data.pinyinOverrides, defaultFlow: parseFlow(flowInput).join(' '),
    searchKey: buildSearchKey({ title: data.title, titleEn: data.titleEn, artist: data.artist }),
    createdByName: data.createdByName || null,
  }
}

export async function listSongs(query?: string): Promise<SongRow[]> {
  const { orgId } = await getCurrentContext()
  const db = await getDb()
  const q = query?.trim().toLowerCase().replace(/\s+/g, '')
  const where = q
    ? and(eq(wsSongs.orgId, orgId), isNull(wsSongs.deletedAt), ilike(wsSongs.searchKey, `%${q}%`))
    : and(eq(wsSongs.orgId, orgId), isNull(wsSongs.deletedAt))
  return db.select().from(wsSongs).where(where).orderBy(desc(wsSongs.updatedAt)).limit(200)
}

export async function getSong(id: string): Promise<SongRow | null> {
  const { orgId } = await getCurrentContext()
  const db = await getDb()
  const rows = await db.select().from(wsSongs).where(and(eq(wsSongs.id, id), eq(wsSongs.orgId, orgId), isNull(wsSongs.deletedAt))).limit(1)
  return rows[0] ?? null
}

export async function createSong(input: SongInput): Promise<{ id: string }> {
  const { orgId } = await getCurrentContext()
  const db = await getDb()
  const id = `song_${nanoid(10)}`
  await db.insert(wsSongs).values({ id, orgId, ...prepare(input) })
  return { id }
}

export async function updateSong(id: string, input: SongInput): Promise<void> {
  const { orgId } = await getCurrentContext()
  const db = await getDb()
  await db.update(wsSongs).set({ ...prepare(input), updatedAt: new Date() }).where(and(eq(wsSongs.id, id), eq(wsSongs.orgId, orgId)))
}

export async function deleteSong(id: string): Promise<void> {
  const { orgId } = await getCurrentContext()
  const db = await getDb()
  await db.update(wsSongs).set({ deletedAt: new Date() }).where(and(eq(wsSongs.id, id), eq(wsSongs.orgId, orgId)))
}

export async function saveDeck(input: { songIds: string[]; flows: Record<string, string>; themeId: string; title?: string; serviceDate?: string; generatedByName?: string }): Promise<{ deckId: string }> {
  const { orgId } = await getCurrentContext()
  const db = await getDb()
  const rows = await db.select().from(wsSongs).where(and(eq(wsSongs.orgId, orgId), inArray(wsSongs.id, input.songIds)))
  const byId = new Map(rows.map((r) => [r.id, r]))
  const songs = input.songIds.map((id) => { const r = byId.get(id); if (!r) throw new Error(`歌曲不存在：${id}`); return rowToSong(r) })
  let deck
  try { deck = buildDeck({ songs, flows: input.flows, themeId: input.themeId }) } catch (e) { if (e instanceof FlowError) throw new Error(e.message); throw e }
  const deckId = `deck_${nanoid(10)}`
  let setlistId: string | null = null
  if (songs.length > 1) {
    setlistId = `set_${nanoid(10)}`
    await db.insert(wsSetlists).values({ id: setlistId, orgId, title: input.title ?? `${input.serviceDate ?? deck.meta.generatedAt.slice(0, 10)} 敬拜`, serviceDate: input.serviceDate ?? null, createdByName: input.generatedByName ?? null })
    await db.insert(wsSetlistItems).values(songs.map((s, i) => ({ id: `si_${nanoid(10)}`, setlistId: setlistId!, songId: s.id, position: i, flow: deck.meta.flows[s.id] ?? '' })))
  }
  await db.insert(wsDecks).values({
    id: deckId, orgId, setlistId, songId: songs.length === 1 ? songs[0]!.id : null, themeId: input.themeId,
    deck, flows: deck.meta.flows, titles: songs.map((s) => s.title), generatedByName: input.generatedByName ?? null,
  })
  return { deckId }
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
