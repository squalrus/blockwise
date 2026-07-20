"use client";

import { useEffect, useState } from "react";
import type { SocialLinks, VenueDashboardSummary } from "@blockwise/types";
import { MushroomLoader } from "@blockwise/ui";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { StatTile, MushroomIcon } from "../../../StatTile";
import { useBusinessAdmin } from "./BusinessAdminContext";
import { SocialLinksForm } from "./SocialLinksForm";

type State =
  | { status: "loading" }
  | { status: "ready"; summary: VenueDashboardSummary }
  | { status: "error"; message: string };

// Overview tab of the business admin shell (BACKLOG.md), restyled to match
// admin/neighborhood/[neighborhoodSlug]/page.tsx's Overview tab. Account-type
// and claim-ownership gating live in layout.tsx now, so this only tracks the
// dashboard-data fetch itself. Coupons and Events split out into their own
// tabs (events/page.tsx, coupons/page.tsx), mirroring the neighborhood-admin
// Events-tab split (BACKLOG.md Ref 78) -- this now only carries stat tiles
// and social links.
export function BusinessVenueDashboard() {
  const { venueId } = useBusinessAdmin();
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl(`/business/venues/${venueId}/dashboard`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cancelled) return;
      if (!res.ok) {
        setState({ status: "error", message: "Failed to load venue dashboard" });
        return;
      }
      setState({ status: "ready", summary: await res.json() });
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      cancelled = true;
    };
  }, [venueId]);

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
        <p className="mt-1 text-[15px] text-body-text">{state.summary.address}</p>
      </div>

      <div className="grid max-w-md grid-cols-2 gap-3.5">
        <StatTile
          icon={<MushroomIcon color="var(--brand-orange)" />}
          label="Followers"
          value={state.summary.follower_count}
          color="var(--brand-orange)"
        />
        <StatTile
          icon={<MushroomIcon color="var(--brand-green)" />}
          label="Check-ins"
          value={state.summary.checkin_count}
          color="var(--brand-green)"
        />
      </div>

      <section className="max-w-xl rounded-3xl border border-border bg-card p-6">
        <h2 className="mb-4 font-heading text-lg font-extrabold">Social links</h2>
        <SocialLinksForm
          venueId={venueId}
          initialSocialLinks={state.summary.social_links}
          onSaved={handleSocialLinksSaved}
        />
      </section>
    </div>
  );
}
