import type { NextConfig } from 'next'
import './src/env'

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.userapi.com',
      },
      {
        protocol: 'https',
        hostname: '*.img.avito.st',
      },
    ],
  },
}

export default nextConfig
