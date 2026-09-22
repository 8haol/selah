import { getDb } from '@/db/client'
import { organizations, orgModules } from '@/db/schema'

export const DEFAULT_ORG = { id: 'org_ccil_mandarin', slug: 'ccil-mandarin', name: 'CCIL 国语堂' }

let ensured: Promise<void> | null = null
async function ensureDefaultOrg() {
  const db = await getDb()
  await db.insert(organizations).values({ ...DEFAULT_ORG }).onConflictDoNothing()
  await db.insert(orgModules).values({ orgId: DEFAULT_ORG.id, moduleId: 'worship-slides', enabled: true }).onConflictDoNothing()
}

/** Auth seam. Phase 1: everyone is an anonymous member of the default org. */
export async function getCurrentContext(): Promise<{ orgId: string; orgSlug: string; userName: string | null }> {
  if (!ensured) ensured = ensureDefaultOrg().catch((e) => {
    ensured = null
    throw e
  })
  await ensured
  return { orgId: DEFAULT_ORG.id, orgSlug: DEFAULT_ORG.slug, userName: null }
}
