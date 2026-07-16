"use client";

import { useState } from "react";
import type { AppUser } from "@blockwise/types";
import { mushroomConfigForUser } from "@blockwise/ui";
import type { MushroomConfig, SpotShape } from "@blockwise/ui";
import { getAccessToken, setCachedUser } from "@/lib/auth";
import { clientApiUrl } from "@/lib/clientApi";
import { MushroomCustomizer } from "./MushroomCustomizer";

type Status = { state: "idle" | "submitting" | "error"; message?: string };

function sameMushroomConfig(a: MushroomConfig | null, b: MushroomConfig | null): boolean {
  if (a === null || b === null) return a === b;
  return (
    a.cap === b.cap &&
    a.stalk === b.stalk &&
    a.spots === b.spots &&
    a.spotCount === b.spotCount &&
    a.spotShape === b.spotShape &&
    a.bg === b.bg
  );
}

// BACKLOG.md Ref 75 "Mushroom avatar customizer" -- its own account/settings
// section (a sibling to Profile, not nested inside it), always shown
// regardless of avatar_style -- a user who currently shows their social
// photo can still shape the mushroom that's waiting for whenever they
// switch. Saves independently of ProfileForm's own submit, via the same
// PATCH /me/profile endpoint but touching only mushroom_customization.
//
// mushroomConfig always holds a complete, renderable combination (seeded
// from the current customization if one exists, else the same auto-assigned
// default Avatar would fall back to) so the preview and swatches never show
// a partial/undefined look; isCustomized alone decides whether saving
// persists that combination or clears back to null.
export function MushroomSection({
  user,
  onSaved,
}: {
  user: AppUser;
  onSaved: (user: AppUser) => void;
}) {
  const [status, setStatus] = useState<Status>({ state: "idle" });
  const [mushroomConfig, setMushroomConfig] = useState<MushroomConfig>(
    user.mushroom_customization
      ? { ...user.mushroom_customization, spotShape: user.mushroom_customization.spotShape as SpotShape }
      : mushroomConfigForUser(user.id)
  );
  const [isCustomized, setIsCustomized] = useState(user.mushroom_customization !== null);

  // Compares what's currently saved (user.mushroom_customization) against
  // what saving right now would send -- gates the save button's third state
  // below, alongside idle/submitting.
  const savedCustomization: MushroomConfig | null = user.mushroom_customization
    ? { ...user.mushroom_customization, spotShape: user.mushroom_customization.spotShape as SpotShape }
    : null;
  const pendingCustomization = isCustomized ? mushroomConfig : null;
  const hasChanges = !sameMushroomConfig(savedCustomization, pendingCustomization);

  function handleChange(next: MushroomConfig) {
    setMushroomConfig(next);
    setIsCustomized(true);
  }

  function handleReset() {
    setMushroomConfig(mushroomConfigForUser(user.id));
    setIsCustomized(false);
  }

  async function handleSave() {
    setStatus({ state: "submitting" });
    try {
      const token = await getAccessToken();
      const res = await fetch(clientApiUrl("/me/profile"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          mushroom_customization: isCustomized ? mushroomConfig : null,
        }),
      });
      const responseBody = await res.json();

      if (res.ok) {
        setCachedUser(responseBody);
        onSaved(responseBody);
        setStatus({ state: "idle" });
      } else {
        setStatus({ state: "error", message: responseBody.error ?? "Failed to save your mushroom" });
      }
    } catch {
      setStatus({ state: "error", message: "Failed to save your mushroom" });
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-card-alt px-6 py-4">
      <MushroomCustomizer
        value={mushroomConfig}
        isCustomized={isCustomized}
        onChange={handleChange}
        onReset={handleReset}
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={status.state === "submitting" || !hasChanges}
        className="self-start rounded-md bg-brand-purple px-4 py-2 text-sm font-bold text-on-accent disabled:opacity-50"
      >
        {status.state === "submitting" ? "Saving…" : hasChanges ? "Save mushroom" : "Saved"}
      </button>
      {status.state === "error" && <p className="text-sm text-red-600 dark:text-red-400">{status.message}</p>}
    </div>
  );
}
