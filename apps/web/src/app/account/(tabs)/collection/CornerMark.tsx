import type { MushroomShape } from "@blockwise/types";
import { MushroomMark } from "@blockwise/ui";

// A single "playing card" corner index -- a stacked initial letter over a
// tiny solid mushroom glyph, mirroring how a real playing card's rank+suit
// sits in its corner. Absolutely positioned by the caller; `rotated` flips
// it 180deg for the opposite corner (so it reads right-side-up from either
// end of the card, same convention a real card uses). `initial` is omitted
// on the still-unrevealed card back, where there's no species name yet to
// take a letter from. Shared by the grid's CollectionCard/CollectionTile
// (page.tsx) and the detail modal's SpecimenCard.
export function CornerMark({
  initial,
  shape,
  rotated,
  size = 11,
}: {
  initial?: string;
  shape: MushroomShape;
  rotated?: boolean;
  size?: number;
}) {
  return (
    <span
      className={`absolute flex flex-col items-center gap-px ${rotated ? "right-3.5 bottom-3.5 rotate-180" : "top-3.5 left-3.5"}`}
    >
      {initial && (
        <span className="font-heading text-xs leading-none font-extrabold text-foreground">{initial}</span>
      )}
      <span className="opacity-40">
        <MushroomMark shape={shape} cap="var(--foreground)" stalk="var(--foreground)" spotCount={0} size={size} />
      </span>
    </span>
  );
}
