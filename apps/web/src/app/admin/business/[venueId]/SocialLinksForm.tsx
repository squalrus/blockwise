"use client";

import { useState } from "react";
import type { SocialLinks } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

type Status = { state: "idle" | "submitting" | "error"; message?: string };

const PLATFORMS: { key: keyof SocialLinks; label: string; placeholder: string }[] = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/..." },
  { key: "twitter", label: "Twitter / X", placeholder: "https://x.com/..." },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@..." },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/..." },
  { key: "website", label: "Website", placeholder: "https://..." },
];

export function SocialLinksForm({
  venueId,
  initialSocialLinks,
  onSaved,
}: {
  venueId: string;
  initialSocialLinks: SocialLinks;
  onSaved: (socialLinks: SocialLinks) => void;
}) {
  const [status, setStatus] = useState<Status>({ state: "idle" });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ state: "submitting" });

    const data = new FormData(e.currentTarget);
    const socialLinks: SocialLinks = {};
    for (const { key } of PLATFORMS) {
      const value = String(data.get(key) ?? "").trim();
      if (value) socialLinks[key] = value;
    }

    try {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl(`/business/venues/${venueId}/social-links`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ social_links: socialLinks }),
      });
      const responseBody = await res.json();

      if (res.ok) {
        onSaved(responseBody.social_links ?? {});
        setStatus({ state: "idle" });
      } else {
        setStatus({ state: "error", message: responseBody.error ?? "Failed to save social links" });
      }
    } catch {
      setStatus({ state: "error", message: "Failed to save social links" });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PLATFORMS.map(({ key, label, placeholder }) => (
          <label key={key} className="flex flex-col gap-1.25 text-xs font-extrabold text-muted-strong">
            {label}
            <input
              name={key}
              type="url"
              defaultValue={initialSocialLinks[key] ?? ""}
              placeholder={placeholder}
              className="rounded-lg border border-border bg-card-alt px-3 py-2.5 text-[13px] font-normal text-foreground"
            />
          </label>
        ))}
      </div>
      <button
        type="submit"
        disabled={status.state === "submitting"}
        className="self-start rounded-xl bg-brand-purple px-5 py-2.5 font-heading text-sm font-bold text-on-accent disabled:opacity-50"
      >
        {status.state === "submitting" ? "Saving…" : "Save social links"}
      </button>
      {status.state === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>
      )}
    </form>
  );
}
