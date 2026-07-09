const ACCENT_CLASSES = {
  orange: "text-brand-orange",
  amber: "text-brand-amber",
  green: "text-brand-green",
  purple: "text-brand-purple",
} as const;

export type StatAccent = keyof typeof ACCENT_CLASSES;

// Shared big-number-over-label stat card (BACKLOG.md Ref 58), matching the
// box already used for follower/check-in counts on BusinessVenueDashboard.tsx.
export function StatCard({
  value,
  label,
  accent = "orange",
}: {
  value: number;
  label: string;
  accent?: StatAccent;
}) {
  return (
    <div className="rounded-2xl bg-card-alt px-4 py-3">
      <p className={`font-heading text-2xl font-extrabold ${ACCENT_CLASSES[accent]}`}>{value}</p>
      <p className="text-[11.5px] font-bold text-muted">{label}</p>
    </div>
  );
}
