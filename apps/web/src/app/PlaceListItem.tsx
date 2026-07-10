import Link from "next/link";
import type { ReactNode } from "react";
import { MushroomLogo } from "@blockwise/ui";

const PIN_COLORS = ["var(--brand-orange)", "var(--brand-green)", "var(--brand-purple)", "var(--brand-amber)"];

// Deterministic per-id pin color (rather than random) so a place's dot stays
// the same color across renders and between the list and map views.
export function pinColorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return PIN_COLORS[Math.abs(hash) % PIN_COLORS.length];
}

// Shared row style for venue/POI-backed lists across the app (neighborhood
// Venues/POIs tabs, the account page's nearby/favorite venues, and public
// profile check-ins) -- a colored mushroom pin, bold name, and a muted
// subtitle underneath. `action` renders below the row (e.g. a check-in
// button) for the one row that needs it; passing it switches the row from a
// single full-bleed link to a link around just the label so the action's own
// button isn't nested inside an <a>.
export function PlaceListItem({
  href,
  id,
  name,
  subtitle,
  action,
}: {
  href: string;
  id: string;
  name: string;
  subtitle: string;
  action?: ReactNode;
}) {
  const label = (
    <>
      <MushroomLogo size={18} capColor={pinColorFor(id)} />
      <div className="flex flex-col">
        <span className="font-extrabold text-foreground">{name}</span>
        <span className="text-xs font-bold text-muted">{subtitle}</span>
      </div>
    </>
  );

  if (!action) {
    return (
      <Link href={href} className="flex items-center gap-3 rounded-2xl bg-card-alt px-4 py-3 text-sm">
        {label}
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-2.5 rounded-2xl bg-card-alt px-4 py-3.5 text-sm">
      <Link href={href} className="flex items-center gap-3">
        {label}
      </Link>
      {action}
    </div>
  );
}
