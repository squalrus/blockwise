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
      // If signed in (as any account type), attach it -- the API only acts
      // on this for a business account (auto-linking claimed_by_user_id so
      // it shows up in that account's /business portal); it's a no-op
      // otherwise, so this is safe to send unconditionally.
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
      <div className="rounded-lg border border-black/[.08] px-6 py-4 text-sm dark:border-white/[.145]">
        <p className="text-black dark:text-zinc-50">
          Claim submitted — we&apos;ll review it and follow up using the contact info you provided.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-black/[.08] px-6 py-4 dark:border-white/[.145]"
    >
      <p className="text-sm text-zinc-600 dark:text-zinc-400">Own this business?</p>

      <input
        name="contact_name"
        required
        placeholder="Your name"
        className="rounded-md border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-transparent"
      />

      <div className="flex gap-2">
        <select
          value={contactMethod}
          onChange={(e) => setContactMethod(e.target.value as BusinessClaimContactMethod)}
          className="rounded-md border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-transparent"
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
          className="flex-1 rounded-md border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-transparent"
        />
      </div>

      <textarea
        name="note"
        placeholder="Anything that helps us confirm ownership (optional)"
        rows={2}
        className="rounded-md border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-transparent"
      />

      <button
        type="submit"
        disabled={status.state === "submitting"}
        className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {status.state === "submitting" ? "Submitting…" : "Submit claim"}
      </button>

      {status.state === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>
      )}
    </form>
  );
}
