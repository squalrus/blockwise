// In production the two apps are one same-origin Netlify site (netlify.toml),
// so the API is only reachable through the /api/* redirect to the co-located
// function -- `process.env.URL` is Netlify's own auto-injected production
// site URL, set on every deploy with no dashboard configuration needed.
// Locally (npm run dev, port 4000), apps/api's own middleware strips a
// leading /api the same way the redirect's target does, so /api/* resolves
// correctly against both. Mirrors the pattern already used in app/page.tsx.
const API_URL = process.env.API_URL ?? process.env.URL ?? "http://localhost:4000";

export function apiUrl(path: string): string {
  return `${API_URL}/api${path}`;
}
