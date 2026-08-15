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
    <div className="flex h-screen overflow-hidden bg-background font-sans text-foreground">
      {/* ================= SIDEBAR ================= */}
      <div className="flex w-64 shrink-0 flex-col bg-nav px-3.5 pt-4.5 pb-4 text-nav-foreground">
        <div className="px-2 pb-6">
          <h2 className="font-heading text-sm font-extrabold tracking-tight text-nav-foreground">Component library</h2>
          <p className="mt-1 text-[12px] text-nav-muted">
            Internal reference only.
          </p>
        </div>

        <DevComponentsTabs />
      </div>

      {/* ================= CONTENT ================= */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-2xl flex-col gap-8 p-4 font-sans sm:p-16">
          {children}
        </div>
      </div>
    </div>
  );
}
