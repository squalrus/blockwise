import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // In production, Netlify's own redirect (netlify.toml) sends /api/* to the
  // co-located function before the request ever reaches Next.js, so this
  // rewrite is dead code there. It only matters for local `next dev`, where
  // apps/api runs as a separate process on another port -- without it, a
  // browser-side fetch("/api/...") (see lib/clientApi.ts) would be a
  // cross-origin request with no CORS headers (removed deliberately in
  // v0.3.1 to keep prod same-origin) and would fail.
  async rewrites() {
    const apiUrl = process.env.API_URL ?? process.env.URL ?? "http://localhost:4000";
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
