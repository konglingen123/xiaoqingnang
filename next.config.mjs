/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ['node:sqlite'],
  turbopack: { root: process.cwd() },
}

export default nextConfig
