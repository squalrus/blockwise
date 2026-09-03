"use client";

import { usePathname } from "next/navigation";
import {
  ERROR_SOURCE_OPTIONS,
  MonitoringProvider,
  RANGE_OPTIONS,
  ROUTE_SCOPE_OPTIONS,
  domainLabel,
  useMonitoring,
} from "./MonitoringContext";

// Super-admin Monitoring section (BACKLOG.md Ref 104): errors (API + web),
// request volume/latency, and outbound Geoapify API calls, rolled on
// Postgres rather than a third-party service. Split across Overview/
// Errors/Performance/Geoapify sub-pages (each its own route under the
// "Monitoring" entry in AdminShell's left nav, see super/layout.tsx's TABS)
// rather than one long scroll -- filters live here, above {children}, so
// they're shared and persist across sub-pages instead of resetting on
// every navigation.
export default function MonitoringLayout({ children }: { children: React.ReactNode }) {
  return (
    <MonitoringProvider>
      <div className="flex flex-col gap-5.5">
        <MonitoringHeader />
        {children}
      </div>
    </MonitoringProvider>
  );
}

// The pathname suffix past "/admin/super/monitoring" for each sub-page --
// used below to render a "Monitoring > Errors" style breadcrumb title
// instead of a bare "Monitoring" on every route, so it's clear which
// sub-page is current. Overview (the "" entry) isn't listed here: it's the
// section root, so its title is just "Monitoring".
const SUB_PAGES: { suffix: string; label: string }[] = [
  { suffix: "/errors", label: "Errors" },
  { suffix: "/performance", label: "API Performance" },
  { suffix: "/places", label: "Geoapify" },
];

function MonitoringHeader() {
  const pathname = usePathname();
  const {
    windowMinutes,
    setWindowMinutes,
    domain,
    setDomain,
    version,
    setVersion,
    routeScope,
    setRouteScope,
    errorSource,
    setErrorSource,
    availableDomains,
    availableVersions,
  } = useMonitoring();
  const currentSubPage = SUB_PAGES.find((p) => pathname.endsWith(p.suffix));

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="font-heading text-4xl font-extrabold">
          {currentSubPage ? (
            <>
              <span className="text-muted">Monitoring</span>
              <span className="mx-2 text-muted">›</span>
              {currentSubPage.label}
            </>
          ) : (
            "Monitoring"
          )}
        </h1>
        <p className="mt-1 text-[15px] text-body-text">
          Errors, request activity, DB query latency, and outbound Geoapify API calls.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Each filter is a "family" of mutually-exclusive pills -- grouped
            into its own rounded-full tray so it's visually obvious which
            pills toggle together, instead of nine pills reading as one flat
            row. */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-extrabold text-muted-strong">Domain:</span>
          <div className="flex gap-1 rounded-full bg-card-alt p-1">
            <button
              type="button"
              onClick={() => setDomain(null)}
              className={`rounded-full px-3.5 py-1.75 text-xs font-extrabold ${
                domain === null ? "bg-foreground text-background" : "text-muted-strong hover:text-foreground"
              }`}
            >
              All domains
            </button>
            {availableDomains.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDomain(d)}
                className={`rounded-full px-3.5 py-1.75 text-xs font-extrabold ${
                  domain === d ? "bg-foreground text-background" : "text-muted-strong hover:text-foreground"
                }`}
              >
                {domainLabel(d)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-extrabold text-muted-strong">Range:</span>
          <div className="flex gap-1 rounded-full bg-card-alt p-1">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.minutes}
                type="button"
                onClick={() => setWindowMinutes(opt.minutes)}
                className={`rounded-full px-3.5 py-1.75 text-xs font-extrabold ${
                  windowMinutes === opt.minutes ? "bg-foreground text-background" : "text-muted-strong hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {/* Route scope only means anything for request_log-derived charts
            (Performance's own content), so it's hidden on every other
            sub-page rather than shown but inert -- lives here rather than in
            performance/page.tsx purely so it gets identical row spacing to
            Domain/Range/Version instead of a separate gap-5.5 page-body gap. */}
        {currentSubPage?.suffix === "/performance" && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-extrabold text-muted-strong">Routes:</span>
            <div className="flex gap-1 rounded-full bg-card-alt p-1">
              <button
                type="button"
                onClick={() => setRouteScope(null)}
                className={`rounded-full px-3.5 py-1.75 text-xs font-extrabold ${
                  routeScope === null ? "bg-foreground text-background" : "text-muted-strong hover:text-foreground"
                }`}
              >
                All
              </button>
              {ROUTE_SCOPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setRouteScope(opt.value)}
                  className={`rounded-full px-3.5 py-1.75 text-xs font-extrabold ${
                    routeScope === opt.value ? "bg-foreground text-background" : "text-muted-strong hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Error source only means anything for error_log-derived charts
            (Errors' own content), so it's hidden on every other sub-page --
            lives here rather than in errors/page.tsx for the same reason as
            Routes above: identical row spacing to Domain/Range/Version.
            ErrorsBySourceStats' tiles still show the full, unfiltered
            breakdown regardless of this pill (see that component). */}
        {currentSubPage?.suffix === "/errors" && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-extrabold text-muted-strong">Source:</span>
            <div className="flex gap-1 rounded-full bg-card-alt p-1">
              <button
                type="button"
                onClick={() => setErrorSource(null)}
                className={`rounded-full px-3.5 py-1.75 text-xs font-extrabold ${
                  errorSource === null ? "bg-foreground text-background" : "text-muted-strong hover:text-foreground"
                }`}
              >
                All
              </button>
              {ERROR_SOURCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setErrorSource(opt.value)}
                  className={`rounded-full px-3.5 py-1.75 text-xs font-extrabold ${
                    errorSource === opt.value ? "bg-foreground text-background" : "text-muted-strong hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {availableVersions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-extrabold text-muted-strong">Version:</span>
            <div className="flex gap-1 rounded-full bg-card-alt p-1">
              <button
                type="button"
                onClick={() => setVersion(null)}
                className={`rounded-full px-3.5 py-1.75 text-xs font-extrabold ${
                  version === null ? "bg-foreground text-background" : "text-muted-strong hover:text-foreground"
                }`}
              >
                All versions
              </button>
              {availableVersions.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setVersion(v)}
                  className={`rounded-full px-3.5 py-1.75 text-xs font-extrabold ${
                    version === v ? "bg-foreground text-background" : "text-muted-strong hover:text-foreground"
                  }`}
                >
                  v{v}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
