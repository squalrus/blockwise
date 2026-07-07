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
  neighborhoodId,
  initialSocialLinks,
  onSaved,
}: {
  neighborhoodId: string;
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
      const res = await fetch(
        clientApiUrl(`/neighborhood-admin/neighborhoods/${neighborhoodId}/social-links`),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ social_links: socialLinks }),
        }
      );
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
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-black/[.08] px-6 py-4 dark:border-white/[.145]"
    >
      {PLATFORMS.map(({ key, label, placeholder }) => (
        <label key={key} className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
          {label}
          <input
            name={key}
            type="url"
            defaultValue={initialSocialLinks[key] ?? ""}
            placeholder={placeholder}
            className="rounded-md border border-black/[.08] px-3 py-2 text-sm text-black dark:border-white/[.145] dark:bg-transparent dark:text-zinc-50"
          />
        </label>
      ))}
      <button
        type="submit"
        disabled={status.state === "submitting"}
        className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {status.state === "submitting" ? "Saving…" : "Save social links"}
      </button>
      {status.state === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>
      )}
    </form>
  );
}
