import path from 'node:path'
import { mkdir } from 'node:fs/promises'
import * as schema from './schema'
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator'
import { migrate as migrateNeon } from 'drizzle-orm/neon-http/migrator'
import type { PgDatabase } from 'drizzle-orm/pg-core'

export type Db = PgDatabase<any, typeof schema>

const MIGRATIONS = path.join(process.cwd(), 'drizzle')

declare global { var __selahDb: Promise<Db> | undefined }

async function create(): Promise<Db> {
  const url = process.env.DATABASE_URL
  if (url) {
    const { neon } = await import('@neondatabase/serverless')
    const { drizzle } = await import('drizzle-orm/neon-http')
    const db = drizzle(neon(url), { schema })
    if (process.env.SELAH_AUTO_MIGRATE === '1') await migrateNeon(db, { migrationsFolder: MIGRATIONS })
    return db as unknown as Db
  }
  const { PGlite } = await import('@electric-sql/pglite')
  const { drizzle } = await import('drizzle-orm/pglite')
  const dataDir = process.env.PGLITE_DIR ?? path.join(process.cwd(), '.data', 'pglite')
  await mkdir(path.dirname(dataDir), { recursive: true })
  const client = new PGlite(dataDir)
  const db = drizzle(client, { schema })
  await migratePglite(db, { migrationsFolder: MIGRATIONS })
  return db as unknown as Db
}

export function getDb(): Promise<Db> {
  if (!globalThis.__selahDb) globalThis.__selahDb = create()
  return globalThis.__selahDb
}
