import { pgTable, text, timestamp, jsonb, integer, boolean, date, primaryKey, index } from 'drizzle-orm/pg-core'
import type { DeckEdits, LineSpacing, OutlineWeight, SongSection, SlideDeck, TextAnchor } from '@selah/slide-engine'

export const organizations = pgTable('organizations', {
  id: text('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  settings: jsonb('settings').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const orgModules = pgTable('org_modules', {
  orgId: text('org_id').notNull().references(() => organizations.id),
  moduleId: text('module_id').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  settings: jsonb('settings').$type<Record<string, unknown>>().notNull().default({}),
}, (t) => [primaryKey({ columns: [t.orgId, t.moduleId] })])

export const wsSongs = pgTable('ws_songs', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => organizations.id),
  title: text('title').notNull(),
  titleEn: text('title_en'),
  artist: text('artist'),
  key: text('key'),
  sections: jsonb('sections').$type<SongSection[]>().notNull(),
  pinyinOverrides: jsonb('pinyin_overrides').$type<Record<string, string>>().notNull().default({}),
  defaultFlow: text('default_flow').notNull().default(''),
  visibility: text('visibility').notNull().default('org'),
  tags: text('tags').array().notNull().default([]),
  searchKey: text('search_key').notNull().default(''),
  createdByName: text('created_by_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [index('ws_songs_org_idx').on(t.orgId), index('ws_songs_search_idx').on(t.searchKey)])

/** How a whole service projects. One row per setlist; see SETLIST_DEFAULTS. */
export interface SetlistSettings {
  /** 每页行数 */
  linesPerSlide: 1 | 2 | 3 | 4
  /** 字号：大字 */
  bigText: boolean
  /** 显示拼音 */
  pinyin: boolean
  /** 每首歌前加标题页 */
  titleSlides: boolean
  /** 歌与歌之间空白页 */
  blankBetween: boolean
  /** 行间距 */
  lineSpacing: LineSpacing
  /** 字体描边 */
  outline: OutlineWeight
  /** 文字位置: 固定首行 or 每页居中 */
  anchor: TextAnchor
  /** Slides removed, rewritten or added on the 总览 before export. This setlist only. */
  edits?: DeckEdits
}

export const SETLIST_DEFAULTS: SetlistSettings = {
  linesPerSlide: 2, bigText: false, pinyin: true, titleSlides: true, blankBetween: true,
  lineSpacing: 'normal', outline: 'none', anchor: 'top',
}

/** `service` is a Sunday — the newest one is 本周. `draft` is a 制作: any other deck, named freely. */
export type SetlistKind = 'service' | 'draft'

export const wsSetlists = pgTable('ws_setlists', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => organizations.id),
  kind: text('kind').$type<SetlistKind>().notNull().default('service'),
  serviceDate: date('service_date'),
  title: text('title').notNull(),
  settings: jsonb('settings').$type<Partial<SetlistSettings>>().notNull().default({}),
  createdByName: text('created_by_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('ws_setlists_org_idx').on(t.orgId), index('ws_setlists_org_kind_idx').on(t.orgId, t.kind)])

export const wsSetlistItems = pgTable('ws_setlist_items', {
  id: text('id').primaryKey(),
  setlistId: text('setlist_id').notNull().references(() => wsSetlists.id),
  songId: text('song_id').notNull().references(() => wsSongs.id),
  position: integer('position').notNull(),
  flow: text('flow').notNull(),
  /** This song's theme inside this setlist. Null falls back to the org default. */
  themeId: text('theme_id'),
}, (t) => [index('ws_setlist_items_setlist_idx').on(t.setlistId)])

export const wsDecks = pgTable('ws_decks', {
  id: text('id').primaryKey(),
  orgId: text('org_id').notNull().references(() => organizations.id),
  setlistId: text('setlist_id').references(() => wsSetlists.id),
  songId: text('song_id').references(() => wsSongs.id),
  themeId: text('theme_id').notNull(),
  deck: jsonb('deck').$type<SlideDeck>().notNull(),
  flows: jsonb('flows').$type<Record<string, string>>().notNull(),
  titles: text('titles').array().notNull().default([]),
  generatedByName: text('generated_by_name'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('ws_decks_org_idx').on(t.orgId), index('ws_decks_song_idx').on(t.songId)])

export type SongRow = typeof wsSongs.$inferSelect
export type SetlistItemRow = typeof wsSetlistItems.$inferSelect
export type NewSongRow = typeof wsSongs.$inferInsert
export type DeckRow = typeof wsDecks.$inferSelect
export type SetlistRow = typeof wsSetlists.$inferSelect
