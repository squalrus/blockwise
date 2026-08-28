import type { MonitoringRepository } from "../monitoring/repository";
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
    return this.timed("searchPlaces", () => this.inner.searchPlaces(params));
  }

  async searchText(params: GeoapifySearchTextParams): Promise<GeoapifyPlace[]> {
    return this.timed("searchText", () => this.inner.searchText(params));
  }

  async getPlaceDetails(placeId: string): Promise<GeoapifyPlaceDetails> {
    return this.timed("getPlaceDetails", () => this.inner.getPlaceDetails(placeId));
  }

  private async timed<T>(
    endpoint: "searchPlaces" | "searchText" | "getPlaceDetails",
    fn: () => Promise<T>
  ): Promise<T> {
    const startedAt = Date.now();
    try {
      const result = await fn();
      this.log(endpoint, true, Date.now() - startedAt, null);
      return result;
    } catch (err) {
      this.log(endpoint, false, Date.now() - startedAt, err instanceof Error ? err.message : String(err));
      throw err;
    }
  }

  private log(
    endpoint: "searchPlaces" | "searchText" | "getPlaceDetails",
    success: boolean,
    durationMs: number,
    errorMessage: string | null
  ): void {
    this.getRepository()
      .logPlacesApiCall({ endpoint, success, durationMs, errorMessage })
      .catch(() => {
        // Best-effort only, mirrors installErrorLogging/requestLoggingMiddleware.
      });
  }
}
