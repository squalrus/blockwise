"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { BoundaryPreviewReport, CreateNeighborhoodResponse, GeoJsonPolygon } from "@blockwise/types";
import { getAccessToken, getCurrentUser } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { BoundaryMap } from "../BoundaryMap";

type Status = { state: "idle" | "submitting" | "error"; message?: string };
type PreviewStatus = { state: "idle" | "loading" | "error"; message?: string };

// Neighborhood creation is currently super-admin-only (BACKLOG.md) -- the API
// (POST /admin/neighborhoods) already enforces this via superAdminGate, but a
// client-side check here avoids letting a regular admin fill out the whole
// form only to hit a generic 403 on submit.
type AccessCheck = "loading" | "signed_out" | "forbidden" | "allowed";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Onboarding runbook (project plan §12.3 step 1): name/slug/city/state/
// timezone and the drawn boundary are created together in one step, always
// starting in 'onboarding' status -- flipping to 'active' is a separate,
// deliberate action once venue data is clean (not exposed here).
export default function NewNeighborhoodPage() {
  const router = useRouter();
  const [access, setAccess] = useState<AccessCheck>("loading");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [city, setCity] = useState("");
  const [state, setStateField] = useState("");
  const [country, setCountry] = useState("US");
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [polygon, setPolygon] = useState<GeoJsonPolygon | null>(null);
  const [preview, setPreview] = useState<BoundaryPreviewReport | null>(null);
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>({ state: "idle" });
  const [status, setStatus] = useState<Status>({ state: "idle" });

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      const user = await getCurrentUser();
      if (cancelled) return;
      if (!user) {
        setAccess("signed_out");
        return;
      }
      setAccess(user.is_super_admin ? "allowed" : "forbidden");
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkAccess();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugEdited) setSlug(slugify(value));
  }

  async function handlePreview() {
    if (!polygon) return;
    setPreviewStatus({ state: "loading" });
    try {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl("/admin/neighborhoods/preview-boundary"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ boundary_geojson: polygon }),
      });
      const body = await res.json();
      if (!res.ok) {
        setPreviewStatus({ state: "error", message: body.error ?? "Failed to preview boundary" });
        return;
      }
      setPreview(body);
      setPreviewStatus({ state: "idle" });
    } catch {
      setPreviewStatus({ state: "error", message: "Failed to preview boundary" });
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!polygon) return;
    setStatus({ state: "submitting" });

    try {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl("/admin/neighborhoods"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name,
          slug,
          city,
          state,
          country,
          timezone,
          boundary_geojson: polygon,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setStatus({ state: "error", message: body.error ?? "Failed to create neighborhood" });
        return;
      }
      const created: CreateNeighborhoodResponse = body;
      router.push(`/admin/neighborhood/${created.slug}`);
    } catch {
      setStatus({ state: "error", message: "Failed to create neighborhood" });
    }
  }

  const canSubmit = name.trim() && slug.trim() && city.trim() && state.trim() && country.trim() && timezone.trim() && polygon;

  if (access !== "allowed") {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 font-sans sm:p-16">
        <a href="/admin" className="text-sm font-bold text-brand-purple hover:text-brand-orange">
          ← Admin
        </a>
        {access === "loading" && <p className="text-sm text-muted">Loading…</p>}
        {access === "signed_out" && (
          <p className="text-sm text-muted">
            <a href="/login" className="font-bold text-brand-purple hover:text-brand-orange">
              Log in
            </a>{" "}
            with a super admin account to create a neighborhood.
          </p>
        )}
        {access === "forbidden" && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Neighborhood creation is currently limited to super admins.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 font-sans sm:p-16">
      <a href="/admin/neighborhood" className="text-sm font-bold text-brand-purple hover:text-brand-orange">
        ← Neighborhood admin
      </a>

      <h1 className="font-heading text-xl font-extrabold text-foreground">New neighborhood</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-muted">
            Name
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              className="rounded-md border border-border bg-card px-3 py-2 text-foreground"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Slug
            <input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEdited(true);
              }}
              required
              pattern="[a-z0-9-]+"
              className="rounded-md border border-border bg-card px-3 py-2 text-foreground"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            City
            <input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
              className="rounded-md border border-border bg-card px-3 py-2 text-foreground"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            State
            <input
              value={state}
              onChange={(e) => setStateField(e.target.value)}
              required
              className="rounded-md border border-border bg-card px-3 py-2 text-foreground"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Country
            <input
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              required
              className="rounded-md border border-border bg-card px-3 py-2 text-foreground"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-muted">
            Timezone (IANA)
            <input
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              required
              placeholder="America/Los_Angeles"
              className="rounded-md border border-border bg-card px-3 py-2 text-foreground"
            />
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-xs font-extrabold tracking-wide text-muted uppercase">
            Draw the neighborhood boundary
          </h2>
          <p className="text-sm text-muted">
            Pan/zoom to the area, then click to place vertices around the streets that define the
            neighborhood. Drag any vertex to adjust it afterward.
          </p>
          <BoundaryMap
            initialPolygon={null}
            previewCandidates={preview?.candidates}
            onPolygonChange={(next) => {
              setPolygon(next);
              setPreview(null);
            }}
          />
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={handlePreview}
            disabled={!polygon || previewStatus.state === "loading"}
            className="self-start rounded-md border border-border px-4 py-2 text-sm font-bold text-foreground disabled:opacity-50 hover:bg-card-alt"
          >
            {previewStatus.state === "loading" ? "Previewing…" : "Preview venues in this area"}
          </button>
          {previewStatus.state === "error" && (
            <p className="text-sm text-red-600 dark:text-red-400">{previewStatus.message}</p>
          )}
          {preview && (
            <p className="text-sm text-muted">
              Found {preview.candidates.length} venue{preview.candidates.length === 1 ? "" : "s"} in this
              boundary ({preview.tiles_queried} tile{preview.tiles_queried === 1 ? "" : "s"} queried,{" "}
              {preview.api_calls_made} Places API call{preview.api_calls_made === 1 ? "" : "s"}).
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit || status.state === "submitting"}
          className="self-start rounded-md bg-brand-purple px-4 py-2 text-sm font-bold text-on-accent disabled:opacity-50"
        >
          {status.state === "submitting" ? "Creating…" : "Create neighborhood"}
        </button>
        {status.state === "error" && (
          <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>
        )}
      </form>
    </div>
  );
}
