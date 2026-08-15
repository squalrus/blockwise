import { DevComponentsTabs } from "./DevComponentsTabs";

// Internal component library -- not linked from any nav, reachable only by
// knowing the URL. Renders the *exact* components/rows real pages use (e.g.
// PlaceListItem with its `action` slot, the same row NearestVenues renders on
// /checkin) rather than an approximation, so sizing matches the app exactly
// -- no extra grid/wrapper narrower than production. Each card is still
// fully draggable (SlideToCheckIn's dev-only mockResolution prop only swaps
// the network call for a canned outcome once the slide completes), so every
// state can be reviewed by actually sliding rather than loading pre-flipped.
// Split into one route per section (BACKLOG.md) rather than in-page tab
// state, mirroring the neighborhood profile shell -- add a new
// dev/components/<section>/page.tsx whenever a component grows a new visual
// state worth reviewing in isolation.
export default function DevComponentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 p-4 font-sans sm:p-16">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-foreground">Component library</h1>
        <p className="mt-1 text-sm text-muted">
          Internal reference only -- not linked from any nav. Pins components to specific states for review.
        </p>
      </div>

      <DevComponentsTabs />

      {children}
    </div>
  );
}
