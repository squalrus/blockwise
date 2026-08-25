import { ComponentsSubNav } from "./ComponentsSubNav";

// Internal component library (BACKLOG.md) -- moved under the super admin
// shell (was a standalone /dev/components tree reachable only by knowing the
// URL) so it's gated the same as every other super-admin surface rather than
// wide open. Renders the *exact* components/rows real pages use (e.g.
// PlaceListItem with its `action` slot, the same row NearestVenues renders on
// /checkin) rather than an approximation, so sizing matches the app exactly
// -- no extra grid/wrapper narrower than production. Each card is still
// fully draggable (SlideToCheckIn's dev-only mockResolution prop only swaps
// the network call for a canned outcome once the slide completes), so every
// state can be reviewed by actually sliding rather than loading pre-flipped.
// Split into one route per section (BACKLOG.md) rather than in-page tab
// state, mirroring the neighborhood profile shell -- add a new
// admin/super/components/<section>/page.tsx whenever a component grows a new
// visual state worth reviewing in isolation.
export default function ComponentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      <div className="shrink-0 lg:w-56">
        <div className="lg:sticky lg:top-5.5">
          <h1 className="px-2.5 font-heading text-lg font-extrabold tracking-tight text-foreground">Components</h1>
          <p className="mt-1 px-2.5 text-[12px] text-muted">Internal reference only.</p>
          <div className="mt-4">
            <ComponentsSubNav />
          </div>
        </div>
      </div>

      <div className="min-w-0 max-w-2xl flex-1">{children}</div>
    </div>
  );
}
