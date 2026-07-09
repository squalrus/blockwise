"use client";

import { useEffect, useState } from "react";
import { getStoredThemePreference, setThemePreference, type ThemePreference } from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

export function ThemeToggle() {
  const [preference, setPreference] = useState<ThemePreference>("system");

  // Reads localStorage on mount rather than during render so this matches
  // the server-rendered "system" markup and only picks up the real stored
  // preference after hydration.
  useEffect(() => {
    setPreference(getStoredThemePreference());
  }, []);

  function choose(value: ThemePreference) {
    setThemePreference(value);
    setPreference(value);
  }

  return (
    <div className="flex items-center gap-1 rounded-full bg-card-alt p-1" role="group" aria-label="Theme">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => choose(option.value)}
          aria-pressed={preference === option.value}
          className={
            preference === option.value
              ? "rounded-full bg-brand-purple px-2.5 py-1 text-xs font-bold text-on-accent"
              : "rounded-full px-2.5 py-1 text-xs font-bold text-muted hover:text-foreground"
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
