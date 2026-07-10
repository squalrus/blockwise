"use client";

import { useState } from "react";
import type { BusinessClaimContactMethod } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

type Status = { state: "idle" | "submitting" | "submitted" | "error"; message?: string };

// README §5: claim submission is public; verification is manual/admin
// review (see /admin/claims) rather than an automated phone/email OTP flow,
// since no SMS/email provider is wired into this project yet.
export function ClaimBusinessForm({ venueId }: { venueId: string }) {
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [contactMethod, setContactMethod] = useState<BusinessClaimContactMethod>("email");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ state: "submitting" });

    const form = new FormData(e.currentTarget);
    const body = {
      contact_name: String(form.get("contact_name") ?? ""),
      contact_method: contactMethod,
      contact_value: String(form.get("contact_value") ?? ""),
      note: String(form.get("note") ?? "") || undefined,
    };

    try {
      // If signed in (as any account type), attach it -- the API auto-links
      // claimed_by_user_id to whichever account submitted the claim, even if
      // it's still a consumer account at this point (see app.ts), so it
      // shows up in /business once both the claim is approved and the
      // account is promoted to business, in either order.
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl(`/venues/${venueId}/claims`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      const responseBody = await res.json();

      if (res.status === 201) {
        setStatus({ state: "submitted" });
      } else {
        setStatus({ state: "error", message: responseBody.error ?? "Failed to submit claim" });
      }
    } catch {
      setStatus({ state: "error", message: "Failed to submit claim" });
    }
  }

  if (status.state === "submitted") {
    return (
      <div className="rounded-2xl bg-card-alt px-6 py-4 text-sm">
        <p className="font-bold text-foreground">
          Claim submitted — we&apos;ll review it and follow up using the contact info you provided.
        </p>
      </div>
    );
  }

  const fieldClass =
    "rounded-lg border-2 border-border bg-card px-3 py-2.5 text-sm font-bold text-foreground placeholder:text-muted placeholder:font-bold";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 rounded-2xl bg-card-alt px-6 py-4">
      <p className="text-sm font-extrabold text-foreground">Own this business?</p>

      <input name="contact_name" required placeholder="Your name" className={fieldClass} />

      <div className="flex gap-2">
        <select
          value={contactMethod}
          onChange={(e) => setContactMethod(e.target.value as BusinessClaimContactMethod)}
          className={fieldClass}
        >
          <option value="email">Email</option>
          <option value="phone">Phone</option>
          <option value="domain">Business domain</option>
        </select>
        <input
          name="contact_value"
          required
          placeholder={
            contactMethod === "email"
              ? "you@business.com"
              : contactMethod === "phone"
                ? "(555) 555-5555"
                : "yourbusiness.com"
          }
          className={`flex-1 ${fieldClass}`}
        />
      </div>

      <textarea
        name="note"
        placeholder="Anything that helps us confirm ownership (optional)"
        rows={2}
        className={fieldClass}
      />

      <button
        type="submit"
        disabled={status.state === "submitting"}
        className="mt-0.5 rounded-lg bg-brand-purple px-4 py-2.5 text-sm font-extrabold text-on-accent disabled:opacity-50"
      >
        {status.state === "submitting" ? "Submitting…" : "Submit claim"}
      </button>

      {status.state === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>
      )}
    </form>
  );
}
