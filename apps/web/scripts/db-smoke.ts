import { getDb } from '../db/client'
import { getCurrentContext } from '../core/context'
import { organizations } from '../db/schema'

async function main() {
  const ctx = await getCurrentContext()
  const db = await getDb()
  const rows = await db.select().from(organizations)
  console.log(ctx, rows.map((r) => r.slug))
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
