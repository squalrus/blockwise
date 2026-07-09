// Shared big-number-over-label stat card (BACKLOG.md Ref 58), matching the
// box already used for follower/check-in counts on BusinessVenueDashboard.tsx.
export function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg border border-black/[.08] px-4 py-3 dark:border-white/[.145]">
      <p className="text-2xl font-semibold text-black dark:text-zinc-50">{value}</p>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{label}</p>
    </div>
  );
}
