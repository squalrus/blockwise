import type { NextConfig } from "next";

// Mirrors apps/web's next.config.ts: in production, Netlify's own redirect
// (netlify.toml) proxies /api/* to app.tryspored.com's API before the
// request reaches Next.js, so this rewrite is dead code there. It only
// matters for local `next dev` (apps/api runs as a separate process on
// another port), backing the client error reporter (src/lib/
// reportClientError.ts) -- the only thing this site calls apps/api for.
const nextConfig: NextConfig = {
  async rewrites() {
    const apiUrl = process.env.API_URL ?? "http://localhost:4000";
    return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
  },
};

export default nextConfig;
