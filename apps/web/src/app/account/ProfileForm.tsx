"use client";

import { useState } from "react";
import type { AppUser, ProfileVisibility } from "@blockwise/types";
import { getAccessToken } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";

type Status = { state: "idle" | "submitting" | "error"; message?: string };

// BACKLOG.md "User profiles with public or private visibility": self-service
// display name / avatar / visibility edit, private by default -- other users
// only ever see this once the separate "Public user profiles" item builds a
// page that reads it.
export function ProfileForm({
  user,
  onSaved,
}: {
  user: AppUser;
  onSaved: (user: AppUser) => void;
}) {
  const [status, setStatus] = useState<Status>({ state: "idle" });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ state: "submitting" });

    const data = new FormData(e.currentTarget);
    const displayName = String(data.get("display_name") ?? "").trim();
    const avatarUrl = String(data.get("avatar_url") ?? "").trim();
    const visibility = data.get("visibility") as ProfileVisibility;

    try {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl("/me/profile"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          display_name: displayName || null,
          avatar_url: avatarUrl || null,
          visibility,
        }),
      });
      const responseBody = await res.json();

      if (res.ok) {
        onSaved(responseBody);
        setStatus({ state: "idle" });
      } else {
        setStatus({ state: "error", message: responseBody.error ?? "Failed to save profile" });
      }
    } catch {
      setStatus({ state: "error", message: "Failed to save profile" });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-lg border border-black/[.08] px-6 py-4 dark:border-white/[.145]"
    >
      <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
        Display name
        <input
          name="display_name"
          type="text"
          defaultValue={user.display_name ?? ""}
          placeholder="How other users will see you"
          className="rounded-md border border-black/[.08] px-3 py-2 text-sm text-black dark:border-white/[.145] dark:bg-transparent dark:text-zinc-50"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
        Avatar URL
        <input
          name="avatar_url"
          type="url"
          defaultValue={user.avatar_url ?? ""}
          placeholder="https://..."
          className="rounded-md border border-black/[.08] px-3 py-2 text-sm text-black dark:border-white/[.145] dark:bg-transparent dark:text-zinc-50"
        />
      </label>
      <fieldset className="flex flex-col gap-1 text-sm text-zinc-600 dark:text-zinc-400">
        Profile visibility
        <label className="flex items-center gap-2">
          <input type="radio" name="visibility" value="private" defaultChecked={user.visibility === "private"} />
          Private -- hidden from other users
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="visibility" value="public" defaultChecked={user.visibility === "public"} />
          Public -- visible to other users
        </label>
      </fieldset>
      <button
        type="submit"
        disabled={status.state === "submitting"}
        className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {status.state === "submitting" ? "Saving…" : "Save profile"}
      </button>
      {status.state === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>
      )}
    </form>
  );
}
