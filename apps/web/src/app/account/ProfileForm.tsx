"use client";

import { useState } from "react";
import type { AppUser, AvatarStyle, ProfileVisibility } from "@blockwise/types";
import { getAccessToken, setCachedUser } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { Avatar } from "../Avatar";

type Status = { state: "idle" | "submitting" | "error"; message?: string };

// BACKLOG.md "User profiles with public or private visibility": self-service
// display name / avatar / visibility edit, public by default -- other users
// can see this the moment a username is set, unless the account switches to
// Private below.
//
// Avatar is a choice, not a free-text URL (BACKLOG.md "Mushroom avatars") --
// letting a user paste any image URL was an explicit-content risk, so the
// only two options are the social photo already on file (from OAuth signup)
// and the account's mushroom. avatar_url itself is never submitted from
// here; PATCH /me/profile no longer accepts it at all. The mushroom preview
// shows whatever's already saved (user.mushroom_customization) -- editing it
// lives in its own account/settings section (MushroomSection.tsx), not here,
// so this form never touches that field.
export function ProfileForm({
  user,
  onSaved,
}: {
  user: AppUser;
  onSaved: (user: AppUser) => void;
}) {
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [avatarStyle, setAvatarStyle] = useState<AvatarStyle>(user.avatar_style);
  const [displayName, setDisplayName] = useState(user.display_name ?? "");
  const [username, setUsername] = useState(user.username ?? "");
  const [visibility, setVisibility] = useState<ProfileVisibility>(user.visibility);
  const label = user.display_name ?? user.username ?? "?";

  // Every field is controlled (rather than read from FormData on submit) so
  // this can compare live values against `user` to tell whether there's
  // anything to save -- gates the submit button's third state below,
  // alongside idle/submitting.
  const hasChanges =
    displayName.trim() !== (user.display_name ?? "") ||
    username.trim() !== (user.username ?? "") ||
    visibility !== user.visibility ||
    avatarStyle !== user.avatar_style;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus({ state: "submitting" });

    try {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl("/me/profile"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          display_name: displayName.trim() || null,
          avatar_style: avatarStyle,
          username: username.trim() || null,
          visibility,
        }),
      });
      const responseBody = await res.json();

      if (res.ok) {
        setCachedUser(responseBody);
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-xl bg-card-alt px-6 py-4">
      {user.visibility === "public" && user.username && (
        <a href={`/profile/${user.username}`} className="self-start text-sm font-bold text-brand-purple hover:text-brand-orange">
          View public profile
        </a>
      )}
      <fieldset className="flex flex-col gap-1.5 text-sm text-muted">
        Avatar
        <div className="flex gap-3">
          <label
            className={`flex flex-1 cursor-pointer flex-col items-center gap-1.5 rounded-lg border px-3 py-2.5 ${
              avatarStyle === "mushroom" ? "border-brand-purple bg-card" : "border-border"
            }`}
          >
            <input
              type="radio"
              name="avatar_style_choice"
              value="mushroom"
              checked={avatarStyle === "mushroom"}
              onChange={() => setAvatarStyle("mushroom")}
              className="sr-only"
            />
            <Avatar
              avatarUrl={null}
              avatarStyle="mushroom"
              mushroomCustomization={user.mushroom_customization}
              seed={user.id}
              label={label}
              size={48}
            />
            <span className="text-xs font-bold text-foreground">Mushroom avatar</span>
          </label>
          <label
            className={`flex flex-1 flex-col items-center gap-1.5 rounded-lg border px-3 py-2.5 ${
              avatarStyle === "social" ? "border-brand-purple bg-card" : "border-border"
            } ${user.avatar_url ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
          >
            <input
              type="radio"
              name="avatar_style_choice"
              value="social"
              checked={avatarStyle === "social"}
              disabled={!user.avatar_url}
              onChange={() => setAvatarStyle("social")}
              className="sr-only"
            />
            <Avatar avatarUrl={user.avatar_url} avatarStyle="social" seed={user.id} label={label} size={48} />
            <span className="text-xs font-bold text-foreground">Social photo</span>
            {!user.avatar_url && <span className="text-[11px] text-muted">None on file</span>}
          </label>
        </div>
      </fieldset>
      <label className="flex flex-col gap-1 text-sm text-muted">
        Display name
        <input
          name="display_name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="How other users will see you"
          className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm text-muted">
        Username
        <input
          name="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="lowercase letters, numbers, _ or -"
          pattern="[a-z0-9_-]{3,30}"
          className="rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"
        />
        <span className="text-xs text-muted">
          Required to make your profile reachable at /profile/:username once public.
        </span>
      </label>
      <fieldset className="flex flex-col gap-1 text-sm text-muted">
        Profile visibility
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="visibility"
            value="public"
            checked={visibility === "public"}
            onChange={() => setVisibility("public")}
          />
          Public -- visible to other users
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="visibility"
            value="private"
            checked={visibility === "private"}
            onChange={() => setVisibility("private")}
          />
          Private -- hidden from other users
        </label>
      </fieldset>
      <button
        type="submit"
        disabled={status.state === "submitting" || !hasChanges}
        className="self-start rounded-md bg-brand-purple px-4 py-2 text-sm font-bold text-on-accent disabled:opacity-50"
      >
        {status.state === "submitting" ? "Saving…" : hasChanges ? "Save profile" : "Saved"}
      </button>
      {status.state === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>
      )}
    </form>
  );
}
