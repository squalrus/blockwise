"use client";

import { useEffect, useState } from "react";
import type { Coupon, VenueDashboardSummary } from "@blockwise/types";
import { MushroomLoader } from "@blockwise/ui";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { useBusinessAdmin } from "../BusinessAdminContext";
import { CouponForm } from "../CouponForm";

type State =
  | { status: "loading" }
  | { status: "ready"; summary: VenueDashboardSummary }
  | { status: "error"; message: string };

// Coupons tab (BACKLOG.md Ref 83), split out of the Overview tab the same
// way the neighborhood-admin Events tab was (Ref 78) -- Overview now only
// carries stat tiles and social links.
export default function BusinessCouponsPage() {
  const { venueId, name } = useBusinessAdmin();
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
        setState({ status: "error", message: "Failed to load coupons" });
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

  function handleCouponCreated(coupon: Coupon) {
    setState((prev) =>
      prev.status === "ready"
        ? { ...prev, summary: { ...prev.summary, coupons: [coupon, ...prev.summary.coupons] } }
        : prev
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
        <h1 className="font-heading text-4xl font-extrabold">Coupons</h1>
        <p className="mt-1 text-[15px] text-body-text">
          Limited-quantity offers for {name}&apos;s followers — unlocked by checking in, redeemed in person.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_1.25fr]">
        <section className="rounded-3xl border border-border bg-card p-6">
          <h2 className="mb-3.5 font-heading text-lg font-extrabold">Post a coupon</h2>
          <CouponForm venueId={venueId} onCreated={handleCouponCreated} />
        </section>

        <section className="rounded-3xl border border-border bg-card p-6">
          <div className="mb-3.5 flex items-baseline gap-2.5">
            <h2 className="font-heading text-lg font-extrabold">Posted</h2>
            <span className="font-mono text-[11px] text-muted">{state.summary.coupons.length} coupons</span>
          </div>
          {state.summary.coupons.length === 0 ? (
            <p className="text-sm text-muted">No coupons yet.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {state.summary.coupons.map((c) => {
                const ended = Date.now() > new Date(c.end_at).getTime();
                const claimed = c.quantity - c.quantity_remaining;
                return (
                  <li
                    key={c.id}
                    className={`rounded-2xl bg-card-alt px-4 py-3 text-sm ${ended ? "opacity-60" : ""}`}
                  >
                    <p className="font-extrabold text-foreground">{c.title}</p>
                    <p className="text-muted">{c.description}</p>
                    {c.terms && <p className="mt-1 text-xs text-muted">{c.terms}</p>}
                    <p className="mt-1 font-mono text-xs text-muted">
                      {claimed} of {c.quantity} claimed · {new Date(c.start_at).toLocaleString()} –{" "}
                      {new Date(c.end_at).toLocaleString()}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
