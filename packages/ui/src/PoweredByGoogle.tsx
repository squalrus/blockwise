import { GoogleIcon } from "./GoogleIcon";

// Required wherever Google Places-sourced data (photos, ratings, hours,
// reviews) renders without an accompanying Google Maps JS map -- the map
// widget itself already shows Google's own logo by default, but Places data
// shown on its own (e.g. a venue detail page) needs its own attribution per
// Google Maps Platform terms (BACKLOG.md "Attribution & compliance
// checklist").
export function PoweredByGoogle() {
  return (
    <div className="flex items-center gap-1.5 text-xs font-bold text-muted">
      <GoogleIcon size={12} />
      Powered by Google
    </div>
  );
}
