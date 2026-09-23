import type { NextConfig } from 'next'
const nextConfig: NextConfig = {
  transpilePackages: ['@selah/slide-engine'],
  serverExternalPackages: ['@electric-sql/pglite'],
  // Vercel bundle only: ship the migrations, leave the local-dev PGlite engine behind.
  // `next start` from the repo still finds PGlite, because it runs out of node_modules.
  outputFileTracingIncludes: { '/**': ['./drizzle/**'] },
  outputFileTracingExcludes: {
    '/**': ['./node_modules/@electric-sql/pglite/**', './node_modules/.pnpm/@electric-sql+pglite*/**'],
  },
}
export default nextConfig
