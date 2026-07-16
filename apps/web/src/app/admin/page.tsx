"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AppUser, ClaimedVenueSummary, NeighborhoodAdminSummary } from "@blockwise/types";
import { MushroomLoader } from "@blockwise/ui";
import { getAccessToken, getCurrentUser, promoteToBusiness } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

type State =
  | { status: "loading" }
  | { status: "signed_out" }
  | { status: "redirecting" }
  | { status: "empty"; user: AppUser }
  | { status: "error"; message: string };

// Single admin entry point (docs/url-map.md refactor, folding the old
// /business and /neighborhood-admin list pages together): an account can
// administer many neighborhoods and/or own many businesses (independent
// AppUser.account_type / is_neighborhood_admin flags), so there's no longer
// a single "your list" page -- this just routes straight into whichever shell
// applies, preferring neighborhoods, and the sidebar's AdminSwitcher is where
// you browse/switch between everything once inside either shell.
export default function AdminLandingPage() {
  const router = useRouter();
  const [state, setState] = useState<State>({ status: "loading" });
  const [promoting, setPromoting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const user: AppUser | null = await getCurrentUser();
      if (cancelled) return;
      if (!user) {
        setState({ status: "signed_out" });
        return;
      }

      const token = await getAccessToken();
      const headers = { Authorization: `Bearer ${token}` };
      const [neighborhoodsRes, venuesRes] = await Promise.all([
        fetch(clientApiUrl("/neighborhood-admin/neighborhoods"), { headers }),
        fetch(clientApiUrl("/business/venues"), { headers }),
      ]);
      if (cancelled) return;

      const neighborhoods: NeighborhoodAdminSummary[] = neighborhoodsRes.ok ? await neighborhoodsRes.json() : [];
      const venues: ClaimedVenueSummary[] = venuesRes.ok ? await venuesRes.json() : [];
      if (cancelled) return;

      if (neighborhoods.length > 0) {
        setState({ status: "redirecting" });
        router.replace(`/admin/neighborhood/${neighborhoods[0].slug}`);
      } else if (venues.length > 0) {
        setState({ status: "redirecting" });
        router.replace(`/admin/business/${venues[0].venue_id}`);
      } else {
        setState({ status: "empty", user });
      }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handlePromote() {
    setPromoting(true);
    try {
      await promoteToBusiness();
      window.location.reload();
    } catch (err) {
      setPromoting(false);
      setState({ status: "error", message: err instanceof Error ? err.message : "Failed to upgrade" });
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-4 font-sans sm:p-16">
      <h1 className="font-heading text-xl font-extrabold text-foreground">Admin</h1>

      {(state.status === "loading" || state.status === "redirecting") && (
        <div className="flex min-h-[50vh] items-center justify-center">
          <MushroomLoader size={72} />
        </div>
      )}

      {state.status === "signed_out" && (
        <p className="text-sm text-muted">
          <a href="/login" className="font-bold text-brand-purple hover:text-brand-orange">
            Log in
          </a>{" "}
          to manage a neighborhood or a claimed business.
        </p>
      )}

      {state.status === "error" && <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>}

      {state.status === "empty" && (
        <div className="flex flex-col gap-4">
          {state.user.is_super_admin ? (
            <p className="text-sm text-muted">
              You aren&apos;t an admin of any neighborhood yet.{" "}
              <a href="/admin/neighborhood/new" className="font-bold text-brand-purple hover:text-brand-orange">
                Create one
              </a>
              .
            </p>
          ) : (
            <p className="text-sm text-muted">
              This account isn&apos;t a neighborhood admin for any neighborhood. Neighborhood creation is
              currently limited to super admins.
            </p>
          )}

          {state.user.account_type === "business" ? (
            <p className="text-sm text-muted">
              No approved business claims yet. Submit a claim from a venue page, signed in as this account,
              and it&apos;ll show up here once an admin approves it.
            </p>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted">
                This account isn&apos;t a business account yet. Upgrade it to claim and manage a venue --
                your check-ins and everything else about the account stay the same.
              </p>
              <button
                type="button"
                onClick={handlePromote}
                disabled={promoting}
                className="rounded-md bg-brand-purple px-4 py-2 text-sm font-bold text-on-accent disabled:opacity-50"
              >
                {promoting ? "Upgrading…" : "Become a business owner"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
