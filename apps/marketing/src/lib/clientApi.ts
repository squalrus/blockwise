// Browser-side counterpart to next.config.ts's /api rewrite (and, in
// production, netlify.toml's /api proxy to app.tryspored.com) -- mirrors
// apps/web's lib/clientApi.ts so a client component can hit the same-origin
// /api/* path directly with a relative path instead of building an absolute
// cross-site URL.
export function clientApiUrl(path: string): string {
  return `/api${path}`;
}
