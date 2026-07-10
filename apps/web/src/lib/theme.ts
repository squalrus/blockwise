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

// The actual light/dark palette in effect right now -- the forced
// `data-theme` override if one is set, otherwise the OS's
// prefers-color-scheme. Non-CSS consumers (e.g. MapView.tsx coloring Google
// Maps markers, which can't use CSS custom properties) need this instead of
// reading prefers-color-scheme directly, which ignores a forced override.
export function getResolvedTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  const forced = document.documentElement.dataset.theme;
  if (forced === "light" || forced === "dark") return forced;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Notifies on both an OS-level scheme change and a same-tab forced-theme
// toggle (ThemeToggle sets data-theme directly with no other event to
// subscribe to) -- either can flip the resolved theme.
export function subscribeToThemeChanges(callback: (theme: "light" | "dark") => void): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const notify = () => callback(getResolvedTheme());
  media.addEventListener("change", notify);

  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  return () => {
    media.removeEventListener("change", notify);
    observer.disconnect();
  };
}
