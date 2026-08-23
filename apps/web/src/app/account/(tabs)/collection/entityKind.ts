import type { MushroomCollectionEntry } from "@blockwise/types";
import { ENTITY_BORDER_CLASS, type EntityKind } from "../../../EntityTile";

// A card's source type, by the same business/POI/neighborhood convention
// EntityTile uses elsewhere, plus "connection" for a species collected from
// a neighbor (not a place, so it isn't a real EntityKind -- kept local to
// this feature rather than folded into EntityTile's own union, since no
// other page needs a "connection" badge).
export type CollectionCardKind = EntityKind | "connection";

export const CARD_BORDER_CLASS: Record<CollectionCardKind, string> = {
  ...ENTITY_BORDER_CLASS,
  connection: "border-brand-orange",
};

// Null only for a "checkin" whose venue kind couldn't be resolved (a legacy
// row predating the location_kind column) -- that's the sole case left in
// the card's plain, untyped corner-mark/border style.
export function cardKindForEntry(entry: MushroomCollectionEntry): CollectionCardKind | null {
  if (entry.source_type === "neighborhood") return "neighborhood";
  if (entry.source_type === "connection") return "connection";
  if (entry.source_type === "checkin" && entry.location_kind) return entry.location_kind;
  return null;
}
