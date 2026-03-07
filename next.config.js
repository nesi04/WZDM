/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: __dirname,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // More stable in synced folders (OneDrive) where cache artifacts can disappear.
      config.cache = false
    }
    return config
  },
}

module.exports = nextConfig
