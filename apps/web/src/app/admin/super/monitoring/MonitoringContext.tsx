"use client";

import { Suspense, createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { MonitoringAnalytics } from "@blockwise/types";
import { MushroomLoader } from "@blockwise/ui";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

// Shorter default window than the neighborhood/venue Analytics tabs (30
// days) -- errors and request volume are noisier day-to-day, so 24h/7d/30d
// is more useful here than 7/30/90. The two short options (5 min / 1 hour)
// exist for watching a live incident play out in near-real-time rather than
// waiting for a day-level bucket to fill in -- everything is tracked in
// minutes (not days) so those fit the same RANGE_OPTIONS shape as the rest.
export const RANGE_OPTIONS = [
  { minutes: 5, label: "5 min" },
  { minutes: 60, label: "1 hour" },
  { minutes: 1440, label: "24 hours" },
  { minutes: 10080, label: "7 days" },
  { minutes: 43200, label: "30 days" },
];
const DEFAULT_MINUTES = 10080;
const RANGE_MINUTES = RANGE_OPTIONS.map((opt) => opt.minutes);

export type StatusClass = "2xx" | "3xx" | "4xx" | "5xx";
const STATUS_CLASSES: StatusClass[] = ["2xx", "3xx", "4xx", "5xx"];

// Friendly labels for the domains this project actually uses today --
// anything else (a future dev.tryspored.com, or an unrecognized value)
// still renders fine as its raw hostname, so a new deployment shows up
// automatically the first time it logs something, no code change needed.
const DOMAIN_LABELS: Record<string, string> = {
  "app.tryspored.com": "Production",
  localhost: "Local",
};

export function domainLabel(domain: string): string {
  return DOMAIN_LABELS[domain] ?? domain;
}

type State =
  | { status: "loading" }
  | { status: "ready"; analytics: MonitoringAnalytics }
  | { status: "error"; message: string };

interface MonitoringContextValue {
  state: State;
  windowMinutes: number;
  setWindowMinutes: (minutes: number) => void;
  domain: string | null;
  setDomain: (domain: string | null) => void;
  version: string | null;
  setVersion: (version: string | null) => void;
  statusClass: StatusClass | null;
  setStatusClass: (statusClass: StatusClass | null) => void;
  availableDomains: string[];
  availableVersions: string[];
}

const MonitoringContext = createContext<MonitoringContextValue | null>(null);

export function useMonitoring(): MonitoringContextValue {
  const ctx = useContext(MonitoringContext);
  if (!ctx) throw new Error("useMonitoring must be used within a MonitoringProvider");
  return ctx;
}

// Owns the Monitoring section's filters (window/domain/version/status class)
// and the one get_monitoring_analytics fetch that backs every sub-page
// (Overview/Performance/Geoapify) -- mounted once in layout.tsx above
// {children}, so switching between sub-pages re-renders only the page body,
// not a fresh fetch or a filter reset. Mirrors the single-RPC-per-section
// pattern the pages themselves already followed before the split.
export function MonitoringProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center">
          <MushroomLoader size={72} />
        </div>
      }
    >
      <MonitoringProviderInner>{children}</MonitoringProviderInner>
    </Suspense>
  );
}

function MonitoringProviderInner({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Filters are mirrored to the URL (below) so a refresh or a shared link
  // keeps the same view -- read the starting values once from whatever was
  // already in the query string.
  const initialMinutesParam = Number(searchParams.get("minutes"));
  const [windowMinutes, setWindowMinutes] = useState(
    RANGE_MINUTES.includes(initialMinutesParam) ? initialMinutesParam : DEFAULT_MINUTES
  );
  // null = "All domains" -- the safe default. Historical rows logged before
  // this filter existed have domain = NULL (no backfill), and the RPC's
  // `domain is null or domain = p_domain` filter only matches an exact
  // domain when one is selected, so defaulting to a specific domain (e.g.
  // "Production") would silently hide every pre-migration row on first
  // load, which read as data loss. "Production" is one click away.
  const [domain, setDomain] = useState<string | null>(searchParams.get("domain"));
  // null = "All versions" -- unlike domain, there's no reason to default
  // away from "all" here (a version spike is exactly as interesting on prod
  // as anywhere else, and defaulting to "latest" would hide the very
  // regression a rollback investigation needs to see).
  const [version, setVersion] = useState<string | null>(searchParams.get("version"));
  // Set by clicking a Status codes tile on the Overview page -- filters the
  // "Recent requests" table there to just that family instead of adding a
  // second row of filter pills that would just repeat the same four values.
  const initialStatusClassParam = searchParams.get("status_class");
  const [statusClass, setStatusClass] = useState<StatusClass | null>(
    STATUS_CLASSES.includes(initialStatusClassParam as StatusClass) ? (initialStatusClassParam as StatusClass) : null
  );
  const [state, setState] = useState<State>({ status: "loading" });
  // Kept separate from `state` so the domain/version pickers' pills don't
  // disappear during a loading flicker between filter changes -- only ever
  // grows (a domain/version that logged something once stays choosable).
  const [availableDomains, setAvailableDomains] = useState<string[]>([]);
  const [availableVersions, setAvailableVersions] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState((prev) => (prev.status === "ready" ? prev : { status: "loading" }));
      const token = await getAccessToken();
      const params = new URLSearchParams({ minutes: String(windowMinutes) });
      if (domain) params.set("domain", domain);
      if (version) params.set("version", version);
      if (statusClass) params.set("status_class", statusClass);
      const res = await fetch(clientApiUrl(`/admin/monitoring/analytics?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cancelled) return;
      if (!res.ok) {
        setState({ status: "error", message: "Failed to load monitoring analytics" });
        return;
      }
      const analytics = await res.json();
      setState({ status: "ready", analytics });
      setAvailableDomains(analytics.available_domains);
      setAvailableVersions(analytics.available_versions);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [windowMinutes, domain, version, statusClass]);

  // Keep the URL in sync with the filters (replace, not push, so clicking
  // through pills doesn't spam browser history) -- default values are
  // omitted from the query string to keep shared/bookmarked links clean.
  // `pathname` tracks whichever sub-page is current, so switching between
  // Overview/Errors/Performance/Geoapify carries the filters along.
  useEffect(() => {
    const params = new URLSearchParams();
    if (windowMinutes !== DEFAULT_MINUTES) params.set("minutes", String(windowMinutes));
    if (domain) params.set("domain", domain);
    if (version) params.set("version", version);
    if (statusClass) params.set("status_class", statusClass);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [windowMinutes, domain, version, statusClass, pathname, router]);

  const value: MonitoringContextValue = {
    state,
    windowMinutes,
    setWindowMinutes,
    domain,
    setDomain,
    version,
    setVersion,
    statusClass,
    setStatusClass,
    availableDomains,
    availableVersions,
  };

  return <MonitoringContext.Provider value={value}>{children}</MonitoringContext.Provider>;
}

// Renders the loading spinner / error message / ready state so each
// sub-page doesn't repeat that three-way switch -- pass a render function
// that only has to handle the "ready" case.
export function MonitoringData({ children }: { children: (analytics: MonitoringAnalytics) => React.ReactNode }) {
  const { state } = useMonitoring();

  if (state.status === "loading") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <MushroomLoader size={72} />
      </div>
    );
  }

  if (state.status === "error") {
    return <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>;
  }

  return <>{children(state.analytics)}</>;
}
