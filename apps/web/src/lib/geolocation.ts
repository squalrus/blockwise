// Shared by the slide-to-check-in GPS geofence check and any "nearest to me"
// sort/list (BACKLOG.md Ref 23/47) -- one browser geolocation prompt path.
export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10_000,
    });
  });
}
