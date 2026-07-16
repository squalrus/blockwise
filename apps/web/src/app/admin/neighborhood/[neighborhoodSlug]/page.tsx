"use client";

import { useEffect, useState } from "react";
import type { NeighborhoodDashboardSummary, NeighborhoodProfile, SocialLinks } from "@blockwise/types";
import { MushroomLoader } from "@blockwise/ui";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { useNeighborhoodAdmin } from "./NeighborhoodAdminContext";
import { DescriptionForm } from "./DescriptionForm";
import { SocialLinksForm } from "./SocialLinksForm";
import { StatTile, MushroomIcon } from "../../../StatTile";

type State =
  | { status: "loading" }
  | { status: "ready"; summary: NeighborhoodDashboardSummary }
  | { status: "error"; message: string };

// Overview tab of the neighborhood-admin dashboard (docs/url-map.md refactor
// -- was the whole of NeighborhoodAdminDashboard.tsx before Business claims
// and Venue categories became sibling tabs; visually redesigned per
// BACKLOG.md Ref 31 "SimCity-style redesign"). Signed-in/forbidden handling
// lives in layout.tsx, which is why this only tracks loading/ready/error.
// Events authoring/calendar-feed sync moved to its own Events tab
// (BACKLOG.md Ref 78, imported Claude Design mockup "Spored Admin") -- this
// page still fetches the same dashboard summary (it carries description/
// social_links too), just no longer renders the events-related fields.
export default function NeighborhoodAdminOverviewPage() {
  const { neighborhoodId, slug } = useNeighborhoodAdmin();
  const [state, setState] = useState<State>({ status: "loading" });
  const [profile, setProfile] = useState<NeighborhoodProfile | null>(null);
  const [pendingClaimCount, setPendingClaimCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const token = await getAccessToken();
      const res = await fetch(
        clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/dashboard`),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (cancelled) return;
      if (!res.ok) {
        setState({ status: "error", message: "Failed to load neighborhood dashboard" });
        return;
      }
      setState({ status: "ready", summary: await res.json() });

      // Reuses the public profile endpoint (venue_count/poi_count/member_count/
      // checkin_count) for the stat tiles below, rather than a new admin-only
      // endpoint just for counts already computed elsewhere.
      fetch(clientApiUrl(`/neighborhoods/${slug}`))
        .then((r) => (r.ok ? r.json() : null))
        .then((p) => {
          if (!cancelled && p) setProfile(p);
        });

      fetch(clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/claims?status=pending`), {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((claims) => {
          if (!cancelled && claims) setPendingClaimCount(claims.length);
        });
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      cancelled = true;
    };
  }, [neighborhoodId, slug]);

  function handleDescriptionSaved(description: string | null) {
    setState((prev) =>
      prev.status === "ready" ? { ...prev, summary: { ...prev.summary, description } } : prev
    );
  }

  function handleSocialLinksSaved(socialLinks: SocialLinks) {
    setState((prev) =>
      prev.status === "ready" ? { ...prev, summary: { ...prev.summary, social_links: socialLinks } } : prev
    );
  }

  if (state.status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <MushroomLoader size={72} />
      </div>
    );
  }
  if (state.status === "error") {
    return <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>;
  }

  return (
    <div className="flex flex-col gap-5.5">
      <div>
        <h1 className="font-heading text-4xl font-extrabold">{state.summary.name}</h1>
        <p className="mt-1 text-[15px] text-body-text">
          The public face of the neighborhood — its story, links, and the people who tend it.
        </p>
      </div>

      {profile && (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          <StatTile
            icon={<MushroomIcon color="var(--brand-orange)" />}
            label="Businesses"
            value={profile.venue_count}
            color="var(--brand-orange)"
          />
          <StatTile
            icon={<MushroomIcon color="var(--brand-green)" />}
            label="Points of interest"
            value={profile.poi_count}
            color="var(--brand-green)"
          />
          <StatTile
            icon={<MushroomIcon color="var(--brand-purple)" />}
            label="Members"
            value={profile.member_count}
            color="var(--brand-purple)"
          />
          <StatTile
            icon={<MushroomIcon color="var(--brand-amber)" />}
            label="Check-ins"
            value={profile.checkin_count}
            color="var(--brand-amber)"
          />
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-5">
          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="mb-3.5 font-heading text-lg font-extrabold">Description</h2>
            <DescriptionForm
              neighborhoodId={neighborhoodId}
              initialDescription={state.summary.description}
              onSaved={handleDescriptionSaved}
            />
          </section>

          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="mb-4 font-heading text-lg font-extrabold">Social links</h2>
            <SocialLinksForm
              neighborhoodId={neighborhoodId}
              initialSocialLinks={state.summary.social_links}
              onSaved={handleSocialLinksSaved}
            />
          </section>
        </div>

        <div className="flex flex-col gap-5">
          <section className="rounded-3xl bg-nav p-5.5 text-nav-foreground">
            <div className="flex items-center gap-2.5">
              <MushroomIcon color="var(--brand-amber)" />
              <h2 className="font-heading text-[17px] font-extrabold">The neighborhood at a glance</h2>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-nav-muted">
              {pendingClaimCount === null ? (
                "Loading…"
              ) : pendingClaimCount > 0 ? (
                <>
                  There {pendingClaimCount === 1 ? "is" : "are"}{" "}
                  <a
                    href={`/admin/neighborhood/${slug}/claims`}
                    className="font-bold text-brand-amber hover:underline"
                  >
                    {pendingClaimCount} waiting claim{pendingClaimCount === 1 ? "" : "s"}
                  </a>{" "}
                  to review.
                </>
              ) : (
                "No pending business claims right now."
              )}{" "}
              Redraw the{" "}
              <a href={`/admin/neighborhood/${slug}/boundary`} className="font-bold text-brand-amber hover:underline">
                boundary
              </a>{" "}
              or curate{" "}
              <a
                href={`/admin/neighborhood/${slug}/locations`}
                className="font-bold text-brand-amber hover:underline"
              >
                locations
              </a>{" "}
              any time, or check the{" "}
              <a href={`/admin/neighborhood/${slug}/events`} className="font-bold text-brand-amber hover:underline">
                events
              </a>{" "}
              tab for what's coming up.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
