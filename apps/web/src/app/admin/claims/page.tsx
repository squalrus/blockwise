"use client";

import { useEffect, useState } from "react";
import type { BusinessClaim, BusinessClaimStatus } from "@blockwise/types";
import { clientApiUrl } from "@/lib/clientApi";

const TOKEN_STORAGE_KEY = "blockwise_admin_token";

// Internal-only page for reviewing business claims (README §5). Gated by the
// same shared secret the API's requireAdmin middleware checks -- there's no
// real admin auth system yet (see BACKLOG.md's separate admin-portal item),
// so this is a pragmatic MVP: paste the token once, it's kept in
// sessionStorage for the rest of the browser session.
export default function AdminClaimsPage() {
  const [token, setToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [status, setStatus] = useState<BusinessClaimStatus>("pending");
  const [claims, setClaims] = useState<BusinessClaim[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // sessionStorage isn't available during the static prerender of this
    // page, so it can't be read via a useState lazy initializer -- this has
    // to happen post-hydration, in an effect.
    const stored = window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setToken(stored);
  }, []);

  async function loadClaims(activeToken: string, activeStatus: BusinessClaimStatus) {
    setError(null);
    const res = await fetch(clientApiUrl(`/admin/claims?status=${activeStatus}`), {
      headers: { "X-Admin-Token": activeToken },
    });
    if (res.status === 401) {
      setError("Invalid admin token");
      setClaims(null);
      return;
    }
    if (!res.ok) {
      setError("Failed to load claims");
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
    if (token) loadClaims(token, status);
  }, [token, status]);

  function handleTokenSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    window.sessionStorage.setItem(TOKEN_STORAGE_KEY, tokenInput);
    setToken(tokenInput);
  }

  async function handleReview(claimId: string, decision: "approve" | "reject") {
    const res = await fetch(clientApiUrl(`/admin/claims/${claimId}/${decision}`), {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Token": token },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      setError(`Failed to ${decision} claim`);
      return;
    }
    await loadClaims(token, status);
  }

  if (!token) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-16 font-sans">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Admin: claims</h1>
        <form onSubmit={handleTokenSubmit} className="flex flex-col gap-2">
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Admin token"
            className="rounded-md border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-transparent"
          />
          <button
            type="submit"
            className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
          >
            Continue
          </button>
        </form>
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

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

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
