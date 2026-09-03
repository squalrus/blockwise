// Required wherever Geoapify Place Details-sourced data (hours, phone,
// website, description) renders without an accompanying map -- the map
// widget itself already attributes Geoapify/OpenStreetMap via MapLibre's
// built-in attribution control, but Places data shown on its own (e.g. a
// venue detail page) needs its own attribution too, per Geoapify's Free
// plan terms (BACKLOG.md Ref 114 Phase 9).
export function PoweredByGeoapify() {
  return (
    <div className="text-xs font-bold text-muted">
      Powered by{" "}
      <a
        href="https://www.geoapify.com/"
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2"
      >
        Geoapify
      </a>{" "}
      | ©{" "}
      <a
        href="https://www.openstreetmap.org/copyright"
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2"
      >
        OpenStreetMap
      </a>{" "}
      contributors
    </div>
  );
}
