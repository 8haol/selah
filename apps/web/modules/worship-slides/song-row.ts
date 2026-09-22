import type { Song } from '@selah/slide-engine'
import type { SongRow } from '@/db/schema'

export function rowToSong(row: SongRow): Song {
  return {
    id: row.id, title: row.title, titleEn: row.titleEn ?? undefined, artist: row.artist ?? undefined, key: row.key ?? undefined,
    sections: row.sections, pinyinOverrides: row.pinyinOverrides, defaultFlow: row.defaultFlow,
  }
}
