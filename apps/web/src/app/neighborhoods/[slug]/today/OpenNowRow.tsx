import Link from "next/link";
import type { OpenNowLocation } from "@blockwise/types";
import { MushroomLogo } from "@blockwise/ui";
import { pinColorFor, shapeFor } from "../../../PlaceListItem";

// Same category/"Open now" pill pair as LocationSummaryCard's header row
// (BACKLOG.md Ref 101 redesign), so a place reads the same way here as it
// does on its own detail page -- PlaceListItem's plain subtitle-text row
// doesn't fit that, so this list renders its own shell instead of reusing
// it (PlaceListItem stays as-is for every other venue/POI list in the app).
export function OpenNowRow({ location }: { location: OpenNowLocation }) {
  const isBusiness = location.kind === "business";

  return (
    <Link
      href={`/location/${location.id}`}
      className="flex items-center gap-3 rounded-2xl bg-card-alt px-4 py-3 text-sm"
    >
      <MushroomLogo size={18} shape={shapeFor(location.id)} capColor={pinColorFor(location.id)} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-extrabold text-foreground">{location.name}</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {isBusiness ? (
            location.category_name && (
              <span className="rounded-full bg-brand-amber px-2.5 py-1 text-xs font-extrabold text-ink">
                {location.category_name}
              </span>
            )
          ) : (
            // Purple, matching LocationSummaryCard's own POI pill --
            // deliberately not green, which would clash with a favorited
            // venue's own green favorite-button state elsewhere in the app.
            <span className="rounded-full bg-brand-purple px-2.5 py-1 text-xs font-extrabold text-on-accent">
              Point of interest
            </span>
          )}
          <span className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-extrabold text-muted-strong">
            {location.closes_at ? `Open now · until ${location.closes_at}` : "Open now"}
          </span>
        </div>
      </div>
    </Link>
  );
}
