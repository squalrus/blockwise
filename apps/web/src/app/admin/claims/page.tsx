"use client";

import { useEffect, useState } from "react";
import type { BusinessClaim, BusinessClaimStatus } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

type TokenState = { status: "loading" } | { status: "signed_out" } | { status: "ready"; token: string };

// Internal-only page for reviewing business claims (README §5). Gated by the
// API's requireAdmin middleware, which checks the signed-in account has a
// neighborhood_admin row -- reuses the same session token as every other
// authenticated route (see lib/auth.ts) rather than a separate admin token.
export default function AdminClaimsPage() {
  const [tokenState, setTokenState] = useState<TokenState>({ status: "loading" });
  const [status, setStatus] = useState<BusinessClaimStatus>("pending");
  const [claims, setClaims] = useState<BusinessClaim[] | null>(null);
  const [error, setError] = useState<"unauthorized" | "forbidden" | "failed" | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    getAccessToken().then((token) => setTokenState(token ? { status: "ready", token } : { status: "signed_out" }));
  }, []);

  async function loadClaims(activeToken: string, activeStatus: BusinessClaimStatus) {
    setError(null);
    const res = await fetch(clientApiUrl(`/admin/claims?status=${activeStatus}`), {
      headers: { Authorization: `Bearer ${activeToken}` },
    });
    if (res.status === 401) {
      setError("unauthorized");
      setClaims(null);
      return;
    }
    if (res.status === 403) {
      setError("forbidden");
      setClaims(null);
      return;
    }
    if (!res.ok) {
      setError("failed");
      return;
    }
    setClaims(await res.json());
  }

  useEffect(() => {
    // No data-fetching library (e.g. React Query) is in this app yet -- this
    // is a plain fetch-on-dependency-change effect, which the compiler's
    // stricter set-state-in-effect check flags since loadClaims eventually
    // calls setClaims/setError.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tokenState.status === "ready") loadClaims(tokenState.token, status);
  }, [tokenState, status]);

  async function handleReview(claimId: string, decision: "approve" | "reject") {
    if (tokenState.status !== "ready") return;
    const res = await fetch(clientApiUrl(`/admin/claims/${claimId}/${decision}`), {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenState.token}` },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      setError("failed");
      return;
    }
    await loadClaims(tokenState.token, status);
  }

  if (tokenState.status === "loading") return null;

  if (tokenState.status === "signed_out") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-16 font-sans">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Admin: claims</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          You need to be signed in to view this page.{" "}
          <a href="/login" className="underline">
            Log in
          </a>
        </p>
      </div>
    );
  }

  if (error === "forbidden") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-16 font-sans">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Admin: claims</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          You&apos;re signed in, but your account isn&apos;t a neighborhood admin.
        </p>
      </div>
    );
  }

  if (error === "unauthorized") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-16 font-sans">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Admin: claims</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Your session expired.{" "}
          <a href="/login" className="underline">
            Log in
          </a>{" "}
          again.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 p-16 font-sans">
      <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Admin: business claims</h1>

      <div className="flex gap-2 text-sm">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-md px-3 py-1 ${
              status === s
                ? "bg-black text-white dark:bg-white dark:text-black"
                : "border border-black/[.08] text-black dark:border-white/[.145] dark:text-zinc-50"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {error === "failed" && <p className="text-sm text-red-600 dark:text-red-400">Something went wrong.</p>}

      {claims?.length === 0 && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">No {status} claims.</p>
      )}

      <ul className="flex flex-col gap-2">
        {claims?.map((claim) => (
          <li
            key={claim.id}
            className="rounded-lg border border-black/[.08] px-4 py-3 text-sm dark:border-white/[.145]"
          >
            <p className="font-medium text-black dark:text-zinc-50">{claim.contact_name}</p>
            <p className="text-zinc-600 dark:text-zinc-400">
              {claim.contact_method}: {claim.contact_value}
            </p>
            {claim.note && <p className="mt-1 text-zinc-600 dark:text-zinc-400">{claim.note}</p>}
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
              Venue: {claim.venue_id} · Submitted {new Date(claim.created_at).toLocaleString()}
            </p>
            {claim.status === "pending" && (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => handleReview(claim.id, "approve")}
                  className="rounded-md bg-black px-3 py-1 text-white dark:bg-white dark:text-black"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReview(claim.id, "reject")}
                  className="rounded-md border border-black/[.08] px-3 py-1 text-black dark:border-white/[.145] dark:text-zinc-50"
                >
                  Reject
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
