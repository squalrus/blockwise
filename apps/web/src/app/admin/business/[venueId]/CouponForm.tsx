"use client";

import { useState } from "react";
import type { Coupon } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

type Status = { state: "idle" | "submitting" | "error"; message?: string };

// Venue coupons (BACKLOG.md Ref 83, replacing AnnouncementForm) -- a claimed
// business posts a limited-quantity, date-ranged offer; followers unlock it
// by checking in, then redeem it in person via slide-to-redeem.
export function CouponForm({
  venueId,
  onCreated,
}: {
  venueId: string;
  onCreated: (coupon: Coupon) => void;
}) {
  const [status, setStatus] = useState<Status>({ state: "idle" });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ state: "submitting" });

    const form = e.currentTarget;
    const data = new FormData(form);
    const startLocal = String(data.get("start_at") ?? "");
    const endLocal = String(data.get("end_at") ?? "");
    const terms = String(data.get("terms") ?? "").trim();
    const body = {
      title: String(data.get("title") ?? ""),
      description: String(data.get("description") ?? ""),
      ...(terms ? { terms } : {}),
      quantity: Number(data.get("quantity") ?? 0),
      // datetime-local inputs give a value with no timezone offset -- new
      // Date() interprets that as local time, which is what the person
      // filling out the form meant (mirrors EventForm).
      start_at: new Date(startLocal).toISOString(),
      end_at: new Date(endLocal).toISOString(),
    };

    try {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl(`/business/venues/${venueId}/coupons`), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const responseBody = await res.json();

      if (res.status === 201) {
        onCreated(responseBody as Coupon);
        setStatus({ state: "idle" });
        form.reset();
      } else {
        setStatus({ state: "error", message: responseBody.error ?? "Failed to create coupon" });
      }
    } catch {
      setStatus({ state: "error", message: "Failed to create coupon" });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 rounded-2xl bg-card-alt p-4">
      <input
        name="title"
        required
        placeholder="Title (e.g. Free coffee)"
        className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
      />
      <textarea
        name="description"
        required
        placeholder="Describe the offer"
        rows={2}
        className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
      />
      <input
        name="terms"
        placeholder="Terms (optional)"
        className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground"
      />
      <label className="flex flex-col gap-1 text-xs font-extrabold text-muted-strong">
        Quantity
        <input
          type="number"
          name="quantity"
          min={1}
          step={1}
          required
          defaultValue={10}
          className="w-24 rounded-lg border border-border bg-card px-3 py-2 text-[12.5px] font-normal text-foreground"
        />
      </label>
      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs font-extrabold text-muted-strong">
          Starts
          <input
            type="datetime-local"
            name="start_at"
            required
            className="rounded-lg border border-border bg-card px-3 py-2 text-[12.5px] font-normal text-foreground"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs font-extrabold text-muted-strong">
          Ends
          <input
            type="datetime-local"
            name="end_at"
            required
            className="rounded-lg border border-border bg-card px-3 py-2 text-[12.5px] font-normal text-foreground"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={status.state === "submitting"}
        className="self-start rounded-xl bg-brand-purple px-5 py-2.5 font-heading text-sm font-bold text-on-accent disabled:opacity-50"
      >
        {status.state === "submitting" ? "Posting…" : "Post coupon"}
      </button>
      {status.state === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>
      )}
    </form>
  );
}
