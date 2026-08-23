import type { MushroomCollectionEntry } from "@blockwise/types";

// The collection grid tile's subtitle and the detail modal's "Found" value
// share this exact text -- source_name alone reads as "found at" for a
// checkin (a place) and, since a neighborhood entry's source_name is a bare
// place-like name too, would otherwise be visually indistinguishable from a
// venue's; "in {name}" reads as membership instead of a visit. "with {name}"
// (connection) was already distinct since a person's name doesn't read as a
// location on its own.
export function sourceLabel(entry: MushroomCollectionEntry): string {
  switch (entry.source_type) {
    case "connection":
      return `with ${entry.source_name}`;
    case "neighborhood":
      return `in ${entry.source_name}`;
    case "checkin":
      return entry.source_name;
  }
}
