import { EntityTypeChip } from "../../../EntityTile";
import type { CollectionCardKind } from "./entityKind";

function PersonGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="2" />
      <path
        d="M5 20c1.2-4.2 4.4-6.5 7-6.5s5.8 2.3 7 6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// A collection card's single top-left corner mark: business/POI/neighborhood
// delegate to EntityTile's own EntityTypeChip, and "connection" (a species
// from a neighbor, not a place) gets a matching orange chip with a person
// glyph instead -- kept local to this feature since EntityTile's own
// EntityKind has no "connection" case. There's deliberately no bottom-right
// mirror (the earlier playing-card-style pair): a long source name/location
// name can run underneath that corner and collide with it.
export function CardTypeMark({ kind }: { kind: CollectionCardKind }) {
  if (kind === "connection") {
    return (
      <span className="absolute top-3.5 left-3.5 flex h-[22px] w-[22px] items-center justify-center rounded-full border-[2.5px] border-card bg-brand-orange text-on-accent">
        <PersonGlyph />
      </span>
    );
  }
  return <EntityTypeChip kind={kind} size={22} surfaceClassName="border-card" positionClassName="top-3.5 left-3.5" />;
}
