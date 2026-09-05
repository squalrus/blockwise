// Shared by the slide-to-check-in GPS geofence check and any "nearest to me"
// sort/list (BACKLOG.md Ref 23/47) -- one browser geolocation prompt path.
//
// BACKLOG.md Ref 116 item 5: also caches the last fix and dedupes concurrent
// requests, so NearestVenues' proximity-sort lookup and a SlideToCheckIn
// control's own mount-time prefetch (see SlideToCheckIn.tsx) can share one
// GPS round trip instead of each requesting -- and then discarding -- their
// own.
const POSITION_CACHE_MAX_AGE_MS = 30_000;

let cachedPosition: { position: GeolocationPosition; fetchedAt: number } | null = null;
let inflightRequest: Promise<GeolocationPosition> | null = null;

function requestPosition(): Promise<GeolocationPosition> {
  inflightRequest ??= new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10_000,
    });
  })
    .then((position) => {
      cachedPosition = { position, fetchedAt: Date.now() };
      return position;
    })
    .finally(() => {
      inflightRequest = null;
    });
  return inflightRequest;
}

// Starts (or joins an already in-flight) geolocation request. Callers that
// just want a fix and don't care whether it's brand new -- e.g. a proximity
// sort, or a mount-time prefetch kicked off before the user could possibly
// need the result yet -- should use this.
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return requestPosition();
}

// Reuses a still-fresh cached fix instead of starting a new GPS round trip --
// for the actual check-in network call, where a fix from a prefetch that
// completed moments ago is an acceptable trade for not blocking the
// user-perceived check-in latency on a fresh lookup. Falls back to a fresh
// request if the cache is stale or was never populated.
export function getCachedPosition(): Promise<GeolocationPosition> {
  if (cachedPosition && Date.now() - cachedPosition.fetchedAt < POSITION_CACHE_MAX_AGE_MS) {
    return Promise.resolve(cachedPosition.position);
  }
  return requestPosition();
}
