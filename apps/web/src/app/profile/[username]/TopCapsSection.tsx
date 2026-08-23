import Link from "next/link";
import type { ProfileTopCap } from "@blockwise/types";

// Same rank-1/2/3 medal fill as MushroomField's TopCapsBadges cluster (the
// *forward* direction -- naming a place's own top visitors), so this
// *reverse* lookup (which places rank this profile's owner in their own top
// 3) reads as the same "Top Caps" language rather than a new visual system.
const RANK_BADGE_CLASSES = ["bg-brand-amber", "bg-rank-silver", "bg-rank-bronze"];

// No empty-state message (unlike Badges/Challenges/Neighborhoods below) --
// most profiles won't rank in anyone's top 3, and a "no Top Caps yet"
// callout would read as a demerit for a perfectly normal account rather
// than a highlight reel with nothing to show.
export function TopCapsSection({ topCaps }: { topCaps: ProfileTopCap[] }) {
  if (topCaps.length === 0) return null;

  return (
    <section className="flex flex-col gap-2.5">
      <h2
        className="text-xs font-extrabold tracking-wide text-muted uppercase"
        title="Top Caps — most check-ins in the last 60 days"
      >
        Top Caps
      </h2>
      <ul className="flex flex-col gap-2">
        {topCaps.map((cap) => (
          <li
            key={`${cap.kind}-${cap.id}`}
            className="flex items-center gap-3 rounded-2xl bg-card-alt px-4 py-3.5 text-sm"
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold text-ink ${RANK_BADGE_CLASSES[cap.rank - 1]}`}
            >
              {cap.rank}
            </span>
            <div className="min-w-0 flex-1">
              <Link
                href={cap.kind === "venue" ? `/location/${cap.id}` : `/neighborhoods/${cap.slug}`}
                className="font-extrabold text-foreground hover:text-brand-purple"
              >
                {cap.name}
              </Link>
              <p className="text-xs font-bold text-muted">
                {cap.kind === "venue" ? "Venue" : "Neighborhood"} · {cap.visit_count} check-ins · last 60 days
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
