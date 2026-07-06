// Browser-side counterpart to lib/api.ts's apiUrl(): that helper resolves an
// absolute URL for server-side fetches (it reads process.env, which isn't
// available in the browser), but client components can just hit the
// same-origin /api/* redirect (netlify.toml) directly with a relative path.
export function clientApiUrl(path: string): string {
  return `/api${path}`;
}
