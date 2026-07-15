// Shared icon-label-over-big-number stat tile (originally module-local to
// admin/neighborhood/[neighborhoodSlug]/page.tsx's Overview tab; extracted so
// admin/business/[venueId]/BusinessVenueDashboard.tsx's Overview can use the
// identical tile instead of its own smaller StatCard.tsx boxes).
export function StatTile({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card px-4.5 py-4">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-extrabold text-muted">{label}</span>
      </div>
      <div className="font-heading text-3xl font-extrabold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

export function MushroomIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 40 40" aria-hidden="true">
      <path d="M4 22 Q4 6 20 6 Q36 6 36 22 Z" fill={color} />
      <rect x="16" y="21" width="8" height="15" rx="4" fill="var(--ink)" />
    </svg>
  );
}
