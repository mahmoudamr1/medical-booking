import type { NextConfig } from 'next';

// The browser only ever talks to the Next.js origin. /api/* and /sanctum/* are proxied to the
// Laravel API so Sanctum's session cookie is first-party (no third-party cookies, no CORS).
const API_ORIGIN = process.env.API_ORIGIN ?? 'http://localhost:8000';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Lets a verification build run while `next dev` is running without sharing (and corrupting)
  // the dev output: NEXT_DIST_DIR=.next-build npm run build
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${API_ORIGIN}/api/:path*` },
      { source: '/sanctum/:path*', destination: `${API_ORIGIN}/sanctum/:path*` },
    ];
  },
};

export default nextConfig;
