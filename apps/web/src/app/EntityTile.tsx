// Squircle icon tile shared by LocationSummaryCard (business/POI) and
// NeighborhoodSummaryCard: a colored ring + a small corner "type chip" so the
// three kinds read as distinct from each other and from a person's circular
// avatar at a glance, reusing the same category colors already used for
// pills elsewhere on these cards (business = amber, POI = purple,
// neighborhood = green) rather than introducing a new color mapping.
export type EntityKind = "business" | "poi" | "neighborhood";

const TINT_BG: Record<EntityKind, string> = {
  business: "bg-brand-amber/[0.16]",
  poi: "bg-brand-purple/[0.16]",
  neighborhood: "bg-brand-green/[0.18]",
};

// Also used by CollectionCard (account/(tabs)/collection/page.tsx) to color
// a species card's own outer border by the same convention, without the
// tile's background tint.
export const ENTITY_BORDER_CLASS: Record<EntityKind, string> = {
  business: "border-brand-amber",
  poi: "border-brand-purple",
  neighborhood: "border-brand-green",
};

const CHIP_BG: Record<EntityKind, string> = {
  business: "bg-brand-amber",
  poi: "bg-brand-purple",
  neighborhood: "bg-brand-green",
};

function StorefrontGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 9l1-4h14l1 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 9v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 19v-5h6v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MapPinGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21s6.5-6.6 6.5-11.5A6.5 6.5 0 0 0 5.5 9.5C5.5 14.4 12 21 12 21z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="9.5" r="2.2" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function LeafGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 19c9-1 13-6 14-14-8 1-13 6-14 14z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 18c2.5-3 5-6.5 9-10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const CHIP_GLYPH: Record<EntityKind, () => React.JSX.Element> = {
  business: StorefrontGlyph,
  poi: MapPinGlyph,
  neighborhood: LeafGlyph,
};

// Corner chip, same size/weight as ProfileSummaryCard's "LV N" pill but
// round and icon-only. `surfaceClassName` should match whatever background
// sits just outside the chip (EntityTile's card-alt summary cards vs.
// CollectionCard's card background) so the chip reads as cut into its host
// rather than just stacked on top of it; `positionClassName` defaults to
// EntityTile's bottom-right overlap but CollectionCard positions it fully
// inside the card, where its old CornerMark used to sit.
export function EntityTypeChip({
  kind,
  size = 24,
  surfaceClassName = "border-card-alt",
  positionClassName = "-right-1.5 -bottom-1.5",
}: {
  kind: EntityKind;
  size?: number;
  surfaceClassName?: string;
  positionClassName?: string;
}) {
  const Glyph = CHIP_GLYPH[kind];
  return (
    <span
      className={`absolute flex items-center justify-center rounded-full border-[2.5px] text-on-accent ${positionClassName} ${surfaceClassName} ${CHIP_BG[kind]}`}
      style={{ height: size, width: size }}
    >
      <Glyph />
    </span>
  );
}

export function EntityTile({
  kind,
  size = 60,
  children,
}: {
  kind: EntityKind;
  size?: number;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`relative flex shrink-0 items-center justify-center rounded-2xl border-[3px] ${TINT_BG[kind]} ${ENTITY_BORDER_CLASS[kind]}`}
      style={{ height: size, width: size }}
    >
      {children}
      <EntityTypeChip kind={kind} />
    </span>
  );
}
