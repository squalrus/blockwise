import type { MonitoringRepository } from "../monitoring/repository";
import type { LatLng } from "./geo";
import type {
  GeoapifyPlace,
  GeoapifyPlaceDetails,
  GeoapifyPlaceDetailsClient,
  GeoapifyPlacesClient,
  GeoapifySearchParams,
  GeoapifySearchTextParams,
  GeoapifyTextSearchClient,
} from "./geoapifyClient";

// Wraps LiveGeoapifyClient (BACKLOG.md Ref 104 follow-up) so every outbound
// call to Geoapify's API gets timed and logged to places_api_call_log,
// without touching LiveGeoapifyClient itself -- mirrors requestLoggingMiddleware's
// decorator approach rather than instrumenting each method inline. Only
// wraps the Live client in app.ts's getPlacesClient(), not
// MockGeoapifyClient, since a mock call never actually hits Geoapify and
// would just be noise on the Monitoring tab.
export class InstrumentedPlacesClient
  implements GeoapifyPlacesClient, GeoapifyPlaceDetailsClient, GeoapifyTextSearchClient
{
  constructor(
    private readonly inner: GeoapifyPlacesClient & GeoapifyPlaceDetailsClient & GeoapifyTextSearchClient,
    private readonly getRepository: () => MonitoringRepository
  ) {}

  async searchPlaces(params: GeoapifySearchParams): Promise<GeoapifyPlace[]> {
    const context = `center: ${params.center.lat.toFixed(4)},${params.center.lng.toFixed(4)} · radius: ${params.radiusMeters}m · ${params.categories.length} categories`;
    return this.timed("searchPlaces", () => this.inner.searchPlaces(params), context);
  }

  async searchText(params: GeoapifySearchTextParams): Promise<GeoapifyPlace[]> {
    const context = `text: "${params.text}"`;
    return this.timed("searchText", () => this.inner.searchText(params), context);
  }

  async reverseGeocode(point: LatLng): Promise<GeoapifyPlace[]> {
    const context = `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
    return this.timed("reverseGeocode", () => this.inner.reverseGeocode(point), context);
  }

  async getPlaceDetails(placeId: string): Promise<GeoapifyPlaceDetails> {
    const context = `placeId: ${placeId}`;
    return this.timed("getPlaceDetails", () => this.inner.getPlaceDetails(placeId), context);
  }

  private async timed<T>(
    endpoint: "searchPlaces" | "searchText" | "reverseGeocode" | "getPlaceDetails",
    fn: () => Promise<T>,
    requestContext: string
  ): Promise<T> {
    const startedAt = Date.now();
    try {
      const result = await fn();
      this.log(endpoint, true, Date.now() - startedAt, null, requestContext);
      return result;
    } catch (err) {
      this.log(endpoint, false, Date.now() - startedAt, err instanceof Error ? err.message : String(err), requestContext);
      throw err;
    }
  }

  private log(
    endpoint: "searchPlaces" | "searchText" | "reverseGeocode" | "getPlaceDetails",
    success: boolean,
    durationMs: number,
    errorMessage: string | null,
    requestContext: string
  ): void {
    this.getRepository()
      .logPlacesApiCall({ endpoint, success, durationMs, errorMessage, requestContext })
      .catch(() => {
        // Best-effort only, mirrors installErrorLogging/requestLoggingMiddleware.
      });
  }
}
