// The app (apps/web) is a separate domain/deploy from this marketing site,
// so links to it need an absolute URL rather than a relative path.
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
