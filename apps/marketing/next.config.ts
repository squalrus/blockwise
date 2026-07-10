import type { NextConfig } from "next";

// Marketing is a fully static site (see src/app/page.tsx) with no calls into
// apps/api, so unlike apps/web's next.config.ts there's no /api rewrite to
// wire up here.
const nextConfig: NextConfig = {};

export default nextConfig;
