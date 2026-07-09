// Landing page stub -- split out from what used to combine this hero with
// the full neighborhoods list and an API health check (BACKLOG.md
// "Neighborhoods on landing page and user profile"). Neighborhood browsing
// now lives at /neighborhoods; this page is a placeholder pending a real
// homepage design.
export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center gap-6 bg-background p-4 font-sans sm:p-16">
      <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground">Spored</h1>

      <div className="flex max-w-xl flex-col items-center gap-2 text-center">
        <p className="text-lg font-extrabold text-foreground">Discover local. Check in. Connect.</p>
        <p className="text-sm text-muted">
          Spored helps you find what&apos;s happening in your neighborhood — browse local
          businesses, check in when you visit, and join challenges as you explore.
        </p>
      </div>

      <a
        href="/neighborhoods"
        className="rounded-full bg-brand-purple px-5 py-2.5 text-sm font-extrabold text-on-accent hover:bg-brand-orange"
      >
        Browse neighborhoods
      </a>
    </div>
  );
}
