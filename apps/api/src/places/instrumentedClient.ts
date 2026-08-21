import type { MonitoringRepository } from "../monitoring/repository";
import type {
  GooglePlacesClient,
  PlaceDetailsClient,
  PlacesTextSearchClient,
  RawGooglePlace,
  RawPlaceDetails,
  PhotoMedia,
  SearchNearbyParams,
  SearchTextParams,
} from "./client";

// Wraps LivePlacesClient (BACKLOG.md Ref 104 follow-up) so every outbound
// call to Google's Places API gets timed and logged to places_api_call_log,
// without touching LivePlacesClient itself -- mirrors requestLoggingMiddleware's
// decorator approach rather than instrumenting each of the 4 methods inline.
// Only wraps the Live client in app.ts's getPlacesClient(), not
// MockPlacesClient, since a mock call never actually hit Google and would
// just be noise on the Monitoring tab.
export class InstrumentedPlacesClient implements GooglePlacesClient, PlaceDetailsClient, PlacesTextSearchClient {
  constructor(
    private readonly inner: GooglePlacesClient & PlaceDetailsClient & PlacesTextSearchClient,
    private readonly getRepository: () => MonitoringRepository
  ) {}

  async searchNearby(params: SearchNearbyParams): Promise<RawGooglePlace[]> {
    return this.timed("searchNearby", () => this.inner.searchNearby(params));
  }

  async searchText(params: SearchTextParams): Promise<RawGooglePlace[]> {
    return this.timed("searchText", () => this.inner.searchText(params));
  }

  async getPlaceDetails(placeId: string): Promise<RawPlaceDetails> {
    return this.timed("getPlaceDetails", () => this.inner.getPlaceDetails(placeId));
  }

  async fetchPhotoMedia(photoReference: string): Promise<PhotoMedia> {
    return this.timed("fetchPhotoMedia", () => this.inner.fetchPhotoMedia(photoReference));
  }

  private async timed<T>(
    endpoint: "searchNearby" | "searchText" | "getPlaceDetails" | "fetchPhotoMedia",
    fn: () => Promise<T>
  ): Promise<T> {
    const startedAt = Date.now();
    try {
      const result = await fn();
      this.log(endpoint, true, Date.now() - startedAt);
      return result;
    } catch (err) {
      this.log(endpoint, false, Date.now() - startedAt);
      throw err;
    }
  }

  private log(endpoint: "searchNearby" | "searchText" | "getPlaceDetails" | "fetchPhotoMedia", success: boolean, durationMs: number): void {
    this.getRepository()
      .logPlacesApiCall({ endpoint, success, durationMs })
      .catch(() => {
        // Best-effort only, mirrors installErrorLogging/requestLoggingMiddleware.
      });
  }
}
