// Geoapify migration backfill tooling (BACKLOG.md Ref 114 Phase 5,
// apps/web/src/app/admin/super/geoapify-migration) -- every location synced
// before Phase 4's cutover still carries its original Google place ID in
// what's now the geoapify_place_id column. Google's Place IDs (New Places
// API) are recognizable: virtually all begin with "ChIJ". This is a
// migration-specific heuristic, not a general-purpose ID validator -- once
// every location has been reidentified, delete this alongside the rest of
// the disposable migration tooling.
export function isLegacyGooglePlaceId(geoapifyPlaceId: string): boolean {
  return geoapifyPlaceId.startsWith("ChIJ");
}
