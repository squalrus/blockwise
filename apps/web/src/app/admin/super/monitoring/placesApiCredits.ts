// `credits` now arrives already result-count-weighted from Postgres
// (places_api_call_credits(), 20260904020000_places_api_call_log_result_
// count.sql) on every Places API monitoring row, so the only shared bit left
// here is formatting -- no more client-side flat-rate estimate to keep in
// sync across the endpoint tiles, the credits-over-time chart, and the
// free-tier widget.
export function formatCredits(credits: number): string {
  return `${credits.toLocaleString()} credit${credits === 1 ? "" : "s"}`;
}
