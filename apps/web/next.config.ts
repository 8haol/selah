import type { NextConfig } from 'next'
const nextConfig: NextConfig = {
  transpilePackages: ['@selah/slide-engine'],
  serverExternalPackages: ['@electric-sql/pglite'],
}
export default nextConfig
