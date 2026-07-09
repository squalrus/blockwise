export type ThemePreference = "light" | "dark" | "system";

// Keep this key in sync with the inline pre-hydration script in layout.tsx,
// which can't import this module and duplicates the read/apply logic in
// plain JS to avoid a flash of the wrong theme.
const THEME_KEY = "blockwise_theme";

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(THEME_KEY);
  return stored === "light" || stored === "dark" ? stored : "system";
}

export function applyThemePreference(preference: ThemePreference): void {
  if (preference === "system") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = preference;
  }
}

export function setThemePreference(preference: ThemePreference): void {
  if (preference === "system") {
    window.localStorage.removeItem(THEME_KEY);
  } else {
    window.localStorage.setItem(THEME_KEY, preference);
  }
  applyThemePreference(preference);
}
