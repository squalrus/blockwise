import type { Metadata } from "next";
import { CHANGELOG_ENTRIES } from "./entries";

export const metadata: Metadata = {
  title: "Changelog",
  description: "What's new on Spored, one line per release.",
  alternates: { canonical: "/changelog" },
};

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Condensed, user-facing changelog -- one line per shipped version, unlike
// the full bullet-point detail in CHANGELOG.md at the repo root. Linked from
// AccountMenu, so it's reachable from both the regular app header and the
// business/neighborhood admin sidebars (which reuse the same component).
export default function ChangelogPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 bg-background p-4 font-sans sm:p-16">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">Changelog</h1>
        <p className="mt-1 text-sm text-muted">What&apos;s new on Spored, newest first.</p>
      </div>
      <ul className="flex flex-col gap-2">
        {CHANGELOG_ENTRIES.map((entry) => (
          <li key={entry.version} className="flex items-start gap-3 rounded-2xl bg-card-alt px-4 py-3">
            <span className="mt-0.5 shrink-0 rounded-full bg-card px-2.5 py-1 font-mono text-[11px] font-bold text-brand-purple">
              v{entry.version}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-foreground">{entry.summary}</p>
              <p className="mt-0.5 text-xs text-muted">{formatDate(entry.date)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
