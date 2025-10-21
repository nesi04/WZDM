// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Disable ESLint during production builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Disable TypeScript errors during build (optional)
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
